import json
import boto3
from datetime import datetime

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SkiResorts')

def lambda_handler(event, context):
    """
    Process a winter sports element and store basic info in DynamoDB.
    """
    # Get the element to process from the event
    elements = event.get('elements', [])
    
    if not elements:
        return {
            'statusCode': 400,
            'error': 'No elements provided for processing'
        }
    
    # We can process a single element or batch, depending on setup
    # For this example, let's process a single element
    element = elements[0]  # For batch processing, you'd loop through elements
    remaining_elements = elements[1:] if len(elements) > 1 else []
    
    try:
        # Process the element
        element_id = element.get('id')
        element_type = element.get('type')
        tags = element.get('tags', {})
        
        resort_name = tags.get('name', f"Unnamed Resort {element_id}")
        print(f"Processing {element_type} {element_id}: {resort_name}")
        
        # Create a unique ID for the resort
        resort_id = resort_name.lower().replace(' ', '-').replace("'", '').replace('"', '').replace(',', '')
        
        # Extract GeoJSON
        geojson = extract_geojson(element)
        
        # Store in DynamoDB (only basic data at this stage)
        item = {
            'resortId': resort_id,
            'resortName': resort_name,
            'country': 'pending',  # Will be set in next step
            'province': 'pending', # Will be set in next step
            'geoData': json.dumps(geojson),
            'lastUpdated': datetime.now().isoformat()
        }
        
        print(f"Writing basic data for resort {resort_name} to DynamoDB")
        table.put_item(Item=item)
        
        # Return the processed element and remaining elements for next steps
        return {
            'statusCode': 200,
            'processed_resort': {
                'resort_id': resort_id,
                'resort_name': resort_name,
                'element': element
            },
            'remaining_elements': remaining_elements,
            'message': f'Successfully processed basic data for {resort_name}'
        }
    
    except Exception as e:
        print(f"Error processing resort: {str(e)}")
        return {
            'statusCode': 500,
            'error': f'Error processing resort: {str(e)}'
        }

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