import json
import boto3
import requests
from datetime import datetime

# Initialize clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SkiResorts')
s3 = boto3.client('s3', region_name='us-east-1')
S3_BUCKET = 'winter-sports-geojson'

def lambda_handler(event, context):
    """
    Download detailed OSM data within resort boundary and store in S3.
    
    Expected input:
    - enriched_resort: Resort data enriched in step 3
    - remaining_elements: Any remaining elements to process in the workflow
    """
    print("Starting detailed resort data download")
    
    # Get the enriched resort from the previous step
    enriched_resort = event.get('enriched_resort')
    remaining_elements = event.get('remaining_elements', [])
    
    if not enriched_resort:
        return {
            'statusCode': 400,
            'error': 'No enriched resort provided'
        }
    
    resort_id = enriched_resort.get('resort_id')
    resort_name = enriched_resort.get('resort_name')
    element = enriched_resort.get('element')
    
    if not all([resort_id, resort_name, element]):
        return {
            'statusCode': 400,
            'error': 'Missing required resort information'
        }
    
    try:
        print(f"Downloading detailed OSM data for {resort_name}")
        
        # Extract geometry to check if it's a polygon
        geometry = extract_geometry(element)
        
        s3_key = None
        if geometry['type'] == 'Polygon':
            # Download all OSM data within resort boundary
            resort_geojson = download_resort_osm_data(element, resort_name)
            
            if resort_geojson:
                # Upload GeoJSON to S3
                s3_key = f"{resort_id}.geojson"
                upload_to_s3(resort_geojson, s3_key)
                print(f"Uploaded detailed resort data to S3: {s3_key}")
                
                # Update DynamoDB with S3 reference
                if s3_key:
                    response = table.update_item(
                        Key={'resortId': resort_id},
                        UpdateExpression="set detailedDataS3Key = :s, lastUpdated = :t",
                        ExpressionAttributeValues={
                            ':s': s3_key,
                            ':t': datetime.now().isoformat()
                        },
                        ReturnValues="UPDATED_NEW"
                    )
                    print(f"DynamoDB update response: {response}")
        else:
            print(f"Resort {resort_name} doesn't have polygon geometry, skipping detailed data download")
        
        # Check if there are more elements to process
        if remaining_elements:
            # Pass first element and rest to next iteration
            next_element = remaining_elements[0]
            next_remaining = remaining_elements[1:] if len(remaining_elements) > 1 else []
            
            return {
                'statusCode': 200,
                'next_element': next_element,
                'remaining_elements': next_remaining,
                'completed_resort': {
                    'resort_id': resort_id,
                    'resort_name': resort_name,
                    's3_key': s3_key
                },
                'message': f'Successfully processed {resort_name}, moving to next element'
            }
        else:
            # All elements processed
            return {
                'statusCode': 200,
                'completed_resort': {
                    'resort_id': resort_id,
                    'resort_name': resort_name,
                    's3_key': s3_key
                },
                'message': 'All elements processed successfully'
            }
    
    except Exception as e:
        print(f"Error downloading data for resort {resort_name}: {str(e)}")
        return {
            'statusCode': 500,
            'error': f'Error downloading resort data: {str(e)}'
        }

def download_resort_osm_data(element, resort_name):
    """Download all OSM features within the resort boundary"""
    print(f"Downloading all OSM data within {resort_name} boundary")
    
    try:
        # Extract polygon for the resort
        geometry = extract_geometry(element)
        if geometry['type'] != 'Polygon' or not geometry['coordinates'] or not geometry['coordinates'][0]:
            print("Unable to extract polygon for the resort boundary")
            return None
        
        # Get the polygon coordinates
        polygon = geometry['coordinates'][0]
        
        # Calculate bounding box for the polygon
        lons = [p[0] for p in polygon]
        lats = [p[1] for p in polygon]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        
        print(f"Resort boundary bounding box: {min_lon},{min_lat},{max_lon},{max_lat}")
        
        # Build Overpass query using bounding box
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json][timeout:180];
        (
          node({min_lat},{min_lon},{max_lat},{max_lon});
          way({min_lat},{min_lon},{max_lat},{max_lon});
          relation({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body geom;
        """
        
        # Execute the query
        print(f"Sending request to Overpass API for all features within {resort_name} bounding box")
        response = requests.get(overpass_url, params={'data': overpass_query})
        response.raise_for_status()
        
        data = response.json()
        elements = data.get('elements', [])
        
        if not elements:
            print(f"No OSM elements found within {resort_name} bounding box")
            
            # Try the polygon approach as a fallback
            boundary_str = " ".join([f"{point[0]} {point[1]}" for point in polygon])
            
            overpass_query = f"""
            [out:json][timeout:180];
            (
              node(poly:"{boundary_str}");
              way(poly:"{boundary_str}");
              relation(poly:"{boundary_str}");
            );
            out body geom;
            """
            
            print(f"Trying polygon approach as fallback...")
            response = requests.get(overpass_url, params={'data': overpass_query})
            response.raise_for_status()
            
            data = response.json()
            elements = data.get('elements', [])
            
            if not elements:
                print(f"Still no OSM elements found with polygon approach")
                return None
        
        print(f"Found {len(elements)} OSM elements within {resort_name} area")
        
        # Try to use shapely for spatial filtering if available
        try:
            from shapely.geometry import Polygon, Point, LineString
            
            # Create the resort boundary polygon for clipping
            resort_polygon = Polygon(polygon)
            
            # Function to check if a feature is within or intersects the polygon
            def is_feature_in_polygon(feature):
                geom_type = feature.get('geometry', {}).get('type')
                
                try:
                    # For points, check if within polygon
                    if geom_type == 'Point':
                        coords = feature['geometry']['coordinates']
                        point = Point(coords)
                        return resort_polygon.contains(point)
                    
                    # For lines, check if they intersect the polygon
                    elif geom_type == 'LineString':
                        coords = feature['geometry']['coordinates']
                        line = LineString(coords)
                        return resort_polygon.intersects(line)
                    
                    # For polygons, check if they intersect the polygon
                    elif geom_type == 'Polygon':
                        coords = feature['geometry']['coordinates'][0]
                        poly = Polygon(coords)
                        return resort_polygon.intersects(poly)
                    
                    # Default: include if we can't determine
                    return True
                except Exception as e:
                    print(f"Error checking feature: {str(e)}")
                    return True
            
            print(f"Filtering elements to those truly within the resort polygon...")
            has_shapely = True
        except ImportError:
            print("Shapely not available, skipping geometric filtering. Using bounding box results.")
            is_feature_in_polygon = lambda feature: True
            has_shapely = False
        
        # Convert all elements to GeoJSON
        features = []
        for el in elements:
            try:
                feature = {
                    'type': 'Feature',
                    'id': f"{el.get('type')}/{el.get('id')}",
                    'properties': {
                        'osm_id': el.get('id'),
                        'osm_type': el.get('type')
                    },
                    'geometry': extract_geometry(el)
                }
                
                # Add all tags to properties
                for key, value in el.get('tags', {}).items():
                    feature['properties'][key] = value
                
                # Only include the feature if it's within or intersects the polygon
                if is_feature_in_polygon(feature):
                    features.append(feature)
            except Exception as feature_error:
                print(f"Error creating feature for element {el.get('id')}: {str(feature_error)}")
        
        print(f"After filtering: {len(features)} OSM elements included in final GeoJSON")
        
        # Create GeoJSON feature collection
        resort_geojson = {
            'type': 'FeatureCollection',
            'features': features
        }
        
        return resort_geojson
    
    except Exception as e:
        print(f"Error downloading OSM data for {resort_name}: {str(e)}")
        return None

def upload_to_s3(geojson_data, key):
    """Upload GeoJSON data to S3 bucket"""
    try:
        s3.put_object(
            Body=json.dumps(geojson_data),
            Bucket=S3_BUCKET,
            Key=key,
            ContentType='application/json'
        )
        print(f"Successfully uploaded {key} to S3 bucket {S3_BUCKET}")
        return True
    except Exception as e:
        print(f"Error uploading to S3: {str(e)}")
        return False

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