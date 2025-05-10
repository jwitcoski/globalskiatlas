import json
import boto3
import requests
import time
from datetime import datetime

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SkiResorts')

def lambda_handler(event, context):
    """
    Enrich resort data by determining country and province.
    
    Expected input:
    - processed_resort: Resort data processed in step 2
    - remaining_elements: Any remaining elements to process in the workflow
    """
    print("Starting resort location enrichment process")
    
    # Get the processed resort from the previous step
    processed_resort = event.get('processed_resort')
    remaining_elements = event.get('remaining_elements', [])
    
    if not processed_resort:
        return {
            'statusCode': 400,
            'error': 'No processed resort provided'
        }
    
    resort_id = processed_resort.get('resort_id')
    resort_name = processed_resort.get('resort_name')
    element = processed_resort.get('element')
    
    if not all([resort_id, resort_name, element]):
        return {
            'statusCode': 400,
            'error': 'Missing required resort information'
        }
    
    try:
        print(f"Enriching location data for {resort_name}")
        
        # Extract administrative information from element tags
        admin_data = extract_administrative_data(element)
        
        # If we couldn't determine from tags, try using coordinates
        if admin_data['country'] == 'unknown' or admin_data['province'] == 'unknown':
            # Extract GeoJSON to get coordinates
            geojson = extract_geojson(element)
            coords = extract_coordinates_from_geojson(geojson)
            
            if coords:
                # Determine location based on coordinates
                location_data = determine_location(coords)
                
                # Only use coordinate-based data if tag-based data is unknown
                if admin_data['country'] == 'unknown':
                    admin_data['country'] = location_data['country']
                if admin_data['province'] == 'unknown':
                    admin_data['province'] = location_data['province']
        
        print(f"Location determined: {admin_data['country']}, {admin_data['province']}")
        
        # Update the resort in DynamoDB with country and province
        response = table.update_item(
            Key={'resortId': resort_id},
            UpdateExpression="set country = :c, province = :p, lastUpdated = :t",
            ExpressionAttributeValues={
                ':c': admin_data['country'],
                ':p': admin_data['province'],
                ':t': datetime.now().isoformat()
            },
            ReturnValues="UPDATED_NEW"
        )
        
        print(f"DynamoDB update response: {response}")
        
        # Pass the enriched resort data to the next step
        return {
            'statusCode': 200,
            'enriched_resort': {
                'resort_id': resort_id,
                'resort_name': resort_name,
                'country': admin_data['country'],
                'province': admin_data['province'],
                'element': element
            },
            'remaining_elements': remaining_elements,
            'message': f'Successfully enriched location data for {resort_name}'
        }
    
    except Exception as e:
        print(f"Error enriching resort {resort_name}: {str(e)}")
        return {
            'statusCode': 500,
            'error': f'Error enriching resort: {str(e)}'
        }

def extract_administrative_data(element):
    """Extract country and province/state/territory from element tags"""
    tags = element.get('tags', {})
    
    # Try to get administrative information from tags
    country = tags.get('addr:country')
    province = tags.get('addr:province') or tags.get('addr:state')
    
    # Try to extract from admin boundary references if available
    if not country or not province:
        for tag_key, tag_value in tags.items():
            # Check for admin boundaries in tags
            if tag_key.startswith('is_in:') and 'country' in tag_key:
                country = tag_value
            elif tag_key.startswith('is_in:') and any(x in tag_key for x in ['province', 'state', 'territory']):
                province = tag_value
    
    return {
        'country': country or 'unknown',
        'province': province or 'unknown'
    }

def determine_location(coordinates):
    """Determine location information based on coordinates using Nominatim"""
    if not coordinates or len(coordinates) < 2:
        return {'country': 'unknown', 'province': 'unknown'}
    
    lon, lat = coordinates  # GeoJSON format is [longitude, latitude]
    
    # Be nice to the Nominatim server - add delay to avoid rate limiting
    time.sleep(1)
    
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        headers = {"User-Agent": "SkiResortMapper/1.0"}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            
            # Different countries have different admin levels
            province = (address.get('state') or 
                      address.get('province') or 
                      address.get('county') or 
                      address.get('region') or
                      'unknown')
            
            return {
                'country': address.get('country', 'unknown'),
                'province': province
            }
        else:
            print(f"Geocoding API returned status code {response.status_code}")
    except Exception as e:
        print(f"Geocoding error: {str(e)}")
    
    return {'country': 'unknown', 'province': 'unknown'}

def extract_geojson(element):
    """Extract GeoJSON from OSM element"""
    element_id = element.get('id')
    element_type = element.get('type')
    tags = element.get('tags', {})
    
    # Create GeoJSON feature
    feature = {
        'type': 'Feature',
        'id': f"{element_type}/{element_id}",
        'properties': {
            'osm_id': element_id,
            'osm_type': element_type
        },
        'geometry': extract_geometry(element)
    }
    
    # Add all tags to properties
    for key, value in tags.items():
        feature['properties'][key] = value
    
    # Create GeoJSON feature collection
    return {
        'type': 'FeatureCollection',
        'features': [feature]
    }

def extract_geometry(element):
    """Extract GeoJSON geometry from an OSM element"""
    if element['type'] == 'node':
        return {
            'type': 'Point',
            'coordinates': [element.get('lon'), element.get('lat')]
        }
    elif element['type'] == 'way' and 'geometry' in element:
        # Extract coordinates
        coords = []
        for point in element['geometry']:
            coords.append([point.get('lon'), point.get('lat')])
        
        # Check if it's a closed way (polygon)
        if coords and len(coords) > 2 and coords[0][0] == coords[-1][0] and coords[0][1] == coords[-1][1]:
            return {
                'type': 'Polygon',
                'coordinates': [coords]
            }
        else:
            return {
                'type': 'LineString',
                'coordinates': coords
            }
    elif element['type'] == 'relation':
        # For relations, we'd need to process members
        # This is a simplified approach for relations
        if 'bounds' in element:
            bounds = element['bounds']
            return {
                'type': 'Polygon',
                'coordinates': [[
                    [bounds['minlon'], bounds['minlat']],
                    [bounds['maxlon'], bounds['minlat']],
                    [bounds['maxlon'], bounds['maxlat']],
                    [bounds['minlon'], bounds['maxlat']],
                    [bounds['minlon'], bounds['minlat']]
                ]]
            }
    
    # Default if we can't extract geometry
    print(f"Unable to extract proper geometry for {element['type']} {element['id']}")
    return {
        'type': 'Point',
        'coordinates': [0, 0]
    }

def extract_coordinates_from_geojson(geojson):
    """Extract representative coordinates from GeoJSON"""
    try:
        if 'features' in geojson and len(geojson['features']) > 0:
            geometry = geojson['features'][0].get('geometry', {})
            
            if geometry.get('type') == 'Point':
                return geometry.get('coordinates')
            elif geometry.get('type') == 'Polygon' and geometry.get('coordinates'):
                # Use first point of polygon
                return geometry['coordinates'][0][0]
            elif geometry.get('type') == 'LineString' and geometry.get('coordinates'):
                # Use first point of line
                return geometry['coordinates'][0]
    except Exception as e:
        print(f"Error extracting coordinates from GeoJSON: {str(e)}")
    
    return None 