import json
import boto3
import os
import requests
from datetime import datetime
import time

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SkiResorts')

def lambda_handler(event, context):
    """
    Download winter_sports data from OpenStreetMap and store in DynamoDB.
    
    Parameters in event:
    - country: Optional country name to filter results
    - resort_name: Optional resort name to fetch a specific resort
    """
    print("Starting OSM winter_sports data download")
    
    country = event.get('country')
    resort_name = event.get('resort_name')
    
    # Debugging options - consider removing in production
    if event.get('check_account'):
        sts_client = boto3.client('sts')
        account_id = sts_client.get_caller_identity()["Account"]
        return {
            'statusCode': 200,
            'body': json.dumps({
                'lambda_account_id': account_id,
                'dynamodb_account_id': '298043721974',
                'table_name': 'SkiResorts',
                'region': 'us-east-1'
            })
        }
    
    # Test DynamoDB connection - consider removing in production
    if event.get('test_dynamodb'):
        try:
            test_item = {
                'resortId': 'test-resort',
                'resortName': 'Test Resort',
                'country': 'Test Country',
                'province': 'Test Province',
                'geoData': '{}',
                'lastUpdated': datetime.now().isoformat()
            }
            response = table.put_item(Item=test_item)
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Successfully wrote test item to DynamoDB',
                    'response': str(response)
                })
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': str(e)
                })
            }
    
    # Build the Overpass query
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Create appropriate query based on parameters
    if resort_name:
        print(f"Fetching data for specific resort: {resort_name}")
        overpass_query = f"""
        [out:json][timeout:60];
        (
          way["landuse"="winter_sports"]["name"~"{resort_name}",i];
          relation["landuse"="winter_sports"]["name"~"{resort_name}",i];
        );
        out body geom;
        """
    elif country:
        print(f"Fetching winter_sports areas in country: {country}")
        overpass_query = f"""
        [out:json][timeout:90];
        area["name"="{country}"]["admin_level"~"2|4"];
        (
          way(area)["landuse"="winter_sports"];
          relation(area)["landuse"="winter_sports"];
        );
        out body geom;
        """
    else:
        print("Fetching all winter_sports areas globally")
        overpass_query = """
        [out:json][timeout:90];
        (
          way["landuse"="winter_sports"];
          relation["landuse"="winter_sports"];
        );
        out body geom;
        """
    
    try:
        # Execute the query
        print(f"Sending request to Overpass API")
        response = requests.get(overpass_url, params={'data': overpass_query})
        response.raise_for_status()  # Raise exception for bad requests
        
        data = response.json()
        elements = data.get('elements', [])
        
        if not elements:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'No winter_sports areas found',
                    'query': overpass_query
                })
            }
        
        print(f"Found {len(elements)} winter_sports areas")
        processed_count = 0
        
        # Process each element
        for element in elements:
            try:
                process_and_store_data(element)
                processed_count += 1
            except Exception as e:
                print(f"Error processing element {element.get('id')}: {str(e)}")
                continue
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully processed {processed_count} out of {len(elements)} winter_sports areas'
            })
        }
    
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Overpass API: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Error connecting to Overpass API: {str(e)}'
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Unexpected error: {str(e)}'
            })
        }

def process_and_store_data(element):
    """Process OSM element and store in DynamoDB"""
    element_id = element.get('id')
    element_type = element.get('type')
    tags = element.get('tags', {})
    
    resort_name = tags.get('name', f"Unnamed Resort {element_id}")
    print(f"Processing {element_type} {element_id}: {resort_name}")
    
    try:
        # Create a unique ID for the resort
        resort_id = resort_name.lower().replace(' ', '-').replace("'", '').replace('"', '').replace(',', '')
        
        # Extract GeoJSON
        geojson = extract_geojson(element)
        
        # Extract administrative information
        admin_data = extract_administrative_data(element)
        
        # Get coordinates from geojson
        coords = None
        if 'features' in geojson and len(geojson['features']) > 0:
            geometry = geojson['features'][0].get('geometry', {})
            if geometry.get('type') == 'Point':
                coords = geometry.get('coordinates')
            elif geometry.get('type') == 'Polygon' and geometry.get('coordinates'):
                # Use first point of polygon
                coords = geometry['coordinates'][0][0]
        
        # If coordinates available and admin data is unknown, try to determine from coordinates
        if coords and (admin_data['country'] == 'unknown' or admin_data['province'] == 'unknown'):
            location_data = determine_location(coords)
            
            # Only use coordinate-based data if tag-based data is unknown
            if admin_data['country'] == 'unknown':
                admin_data['country'] = location_data['country']
            if admin_data['province'] == 'unknown':
                admin_data['province'] = location_data['province']
        
        # Store in DynamoDB
        print(f"Attempting to write resort {resort_name} to DynamoDB")
        item = {
            'resortId': resort_id,
            'resortName': resort_name,
            'country': admin_data['country'],
            'province': admin_data['province'],
            'geoData': json.dumps(geojson),
            'lastUpdated': datetime.now().isoformat()
        }
        
        print(f"Item to write: {json.dumps(item)}")
        
        try:
            response = table.put_item(Item=item)
            print(f"DynamoDB response: {response}")
        except Exception as db_error:
            print(f"DynamoDB error: {str(db_error)}")
            print(f"Error type: {type(db_error).__name__}")
            # Continue processing other resorts
        
        print(f"Processed resort: {resort_name}")
        return True
    
    except Exception as e:
        print(f"Error processing resort {resort_name}: {str(e)}")
        return False

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
