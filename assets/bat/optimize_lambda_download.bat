@echo off
setlocal enabledelayedexpansion

echo === Optimizing step4_download_resort_data Lambda ===

set FUNCTION_NAME=step4_download_resort_data
set MEMORY_SIZE=1536
set TIMEOUT=300

REM Create a temporary directory
set TEMP_DIR=%TEMP%\lambda_optimize
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

REM Copy the function code
copy assets\Lambda\Python\%FUNCTION_NAME%.py %TEMP_DIR%\%FUNCTION_NAME%.py

REM Update the code to add request timeout and optimization
echo Updating Lambda code with timeout and optimization...
(
echo import json
echo import boto3
echo import requests
echo from datetime import datetime
echo import time
echo 
echo # Initialize clients
echo dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
echo table = dynamodb.Table('SkiResorts')
echo s3 = boto3.client('s3', region_name='us-east-1')
echo S3_BUCKET = 'winter-sports-geojson'
echo 
echo # Constants
echo REQUEST_TIMEOUT = 25  # Timeout for Overpass API requests in seconds
echo MAX_AREA = 0.01       # Maximum area in square degrees before splitting
echo 
echo def lambda_handler(event, context):
echo     """
echo     Download detailed OSM data within resort boundary and store in S3.
echo     
echo     Expected input:
echo     - enriched_resort: Resort data enriched in step 3
echo     - remaining_elements: Any remaining elements to process in the workflow
echo     """
echo     print("Starting detailed resort data download")
echo     
echo     # Get the enriched resort from the previous step
echo     enriched_resort = event.get('enriched_resort')
echo     remaining_elements = event.get('remaining_elements', [])
echo     
echo     if not enriched_resort:
echo         return {
echo             'statusCode': 400,
echo             'error': 'No enriched resort provided'
echo         }
echo     
echo     resort_id = enriched_resort.get('resort_id')
echo     resort_name = enriched_resort.get('resort_name')
echo     element = enriched_resort.get('element')
echo     
echo     if not all([resort_id, resort_name, element]):
echo         return {
echo             'statusCode': 400,
echo             'error': 'Missing required resort information'
echo         }
echo     
echo     try:
echo         print(f"Downloading detailed OSM data for {resort_name}")
echo         
echo         # Extract the resort boundary
echo         boundary = extract_geometry(element)
echo         
echo         # Get the bounding box of the resort
echo         if boundary['type'] == 'Polygon' and boundary['coordinates']:
echo             coords = boundary['coordinates'][0]
echo             minlon = min(p[0] for p in coords)
echo             minlat = min(p[1] for p in coords)
echo             maxlon = max(p[0] for p in coords)
echo             maxlat = max(p[1] for p in coords)
echo         else:
echo             # Fallback to bounds from the element
echo             bounds = element.get('bounds', {})
echo             minlon = bounds.get('minlon', 0)
echo             minlat = bounds.get('minlat', 0)
echo             maxlon = bounds.get('maxlon', 0)
echo             maxlat = bounds.get('maxlat', 0)
echo         
echo         print(f"Resort boundary bounding box: {minlon},{minlat},{maxlon},{maxlat}")
echo         
echo         # Check if the area is too large and needs to be split
echo         area = (maxlon - minlon) * (maxlat - minlat)
echo         if area > MAX_AREA:
echo             print(f"Large area detected ({area:.6f} sq degrees), splitting into smaller queries")
echo             osm_data = download_large_area(minlon, minlat, maxlon, maxlat)
echo         else:
echo             print(f"Downloading all OSM data within {resort_name} boundary")
echo             osm_data = download_osm_data(minlon, minlat, maxlon, maxlat)
echo         
echo         if not osm_data or not osm_data.get('elements'):
echo             print(f"No OSM data retrieved for {resort_name}")
echo             return {
echo                 'statusCode': 404,
echo                 'error': f'No OSM data found for {resort_name}'
echo             }
echo         
echo         # Convert OSM data to GeoJSON
echo         geojson = create_geojson(osm_data, resort_name)
echo         
echo         # Save GeoJSON to S3
echo         s3_key = f"{resort_id}.geojson"
echo         s3.put_object(
echo             Bucket=S3_BUCKET,
echo             Key=s3_key,
echo             Body=json.dumps(geojson),
echo             ContentType='application/json'
echo         )
echo         
echo         print(f"Saved GeoJSON to S3 bucket {S3_BUCKET}/{s3_key}")
echo         
echo         # Update DynamoDB record with S3 location
echo         table.update_item(
echo             Key={'resortId': resort_id},
echo             UpdateExpression="set detailedDataS3Key = :s, lastUpdated = :t",
echo             ExpressionAttributeValues={
echo                 ':s': s3_key,
echo                 ':t': datetime.now().isoformat()
echo             }
echo         )
echo         
echo         return {
echo             'statusCode': 200,
echo             'completed_resort': {
echo                 'resort_id': resort_id,
echo                 'resort_name': resort_name,
echo                 's3_key': s3_key
echo             },
echo             'remaining_elements': remaining_elements,
echo             'message': 'All elements processed successfully'
echo         }
echo         
echo     except Exception as e:
echo         print(f"Error downloading detailed resort data: {str(e)}")
echo         return {
echo             'statusCode': 500,
echo             'error': f'Error processing {resort_name}: {str(e)}'
echo         }
echo 
echo def download_large_area(minlon, minlat, maxlon, maxlat):
echo     """Download data for large areas by splitting into smaller chunks"""
echo     print("Splitting large area into smaller queries")
echo     
echo     # Calculate middle points to divide the area into 4 quadrants
echo     midlon = (minlon + maxlon) / 2
echo     midlat = (minlat + maxlat) / 2
echo     
echo     # Download data for each quadrant
echo     quadrants = [
echo         (minlon, minlat, midlon, midlat),  # Southwest
echo         (midlon, minlat, maxlon, midlat),  # Southeast
echo         (minlon, midlat, midlon, maxlat),  # Northwest
echo         (midlon, midlat, maxlon, maxlat)   # Northeast
echo     ]
echo     
echo     # Combined results
echo     combined_data = {"elements": []}
echo     
echo     # Process each quadrant
echo     for i, (qminlon, qminlat, qmaxlon, qmaxlat) in enumerate(quadrants):
echo         print(f"Downloading quadrant {i+1}/4: {qminlon},{qminlat},{qmaxlon},{qmaxlat}")
echo         
echo         # Calculate area of this quadrant
echo         q_area = (qmaxlon - qminlon) * (qmaxlat - qminlat)
echo         
echo         # Recursively split if still too large
echo         if q_area > MAX_AREA:
echo             q_data = download_large_area(qminlon, qminlat, qmaxlon, qmaxlat)
echo         else:
echo             q_data = download_osm_data(qminlon, qminlat, qmaxlon, qmaxlat)
echo         
echo         if q_data and 'elements' in q_data:
echo             # Deduplicate elements by ID
echo             existing_ids = {e['id'] for e in combined_data['elements'] if 'id' in e}
echo             for elem in q_data['elements']:
echo                 if 'id' in elem and elem['id'] not in existing_ids:
echo                     combined_data['elements'].append(elem)
echo                     existing_ids.add(elem['id'])
echo     
echo     return combined_data
echo 
echo def download_osm_data(minlon, minlat, maxlon, maxlat):
echo     """Download OSM data within a bounding box using Overpass API"""
echo     print(f"Sending request to Overpass API for area: {minlon},{minlat},{maxlon},{maxlat}")
echo     
echo     # Construct the Overpass API query for winter sports areas
echo     overpass_url = "https://overpass-api.de/api/interpreter"
echo     overpass_query = f"""
echo     [out:json][timeout:25];
echo     (
echo       node({minlat},{minlon},{maxlat},{maxlon});
echo       way({minlat},{minlon},{maxlat},{maxlon});
echo       relation({minlat},{minlon},{maxlat},{maxlon});
echo     );
echo     out body;
echo     >;
echo     out skel qt;
echo     """
echo     
echo     try:
echo         # Add retries with exponential backoff
echo         max_retries = 3
echo         retry_delay = 2  # seconds
echo         
echo         for attempt in range(max_retries):
echo             try:
echo                 response = requests.post(
echo                     overpass_url, 
echo                     data={"data": overpass_query},
echo                     timeout=REQUEST_TIMEOUT
echo                 )
echo                 
echo                 if response.status_code == 200:
echo                     return response.json()
echo                 elif response.status_code == 429 or response.status_code >= 500:
echo                     # Rate limit or server error, retry
echo                     if attempt < max_retries - 1:
echo                         wait_time = retry_delay * (2 ** attempt)
echo                         print(f"Request failed with status {response.status_code}, retrying in {wait_time}s...")
echo                         time.sleep(wait_time)
echo                     else:
echo                         print(f"Request failed after {max_retries} attempts: {response.status_code}")
echo                         break
echo                 else:
echo                     print(f"Overpass API returned error: {response.status_code}")
echo                     break
echo                     
echo             except requests.exceptions.Timeout:
echo                 if attempt < max_retries - 1:
echo                     wait_time = retry_delay * (2 ** attempt)
echo                     print(f"Request timed out, retrying in {wait_time}s...")
echo                     time.sleep(wait_time)
echo                 else:
echo                     print(f"Request timed out after {max_retries} attempts")
echo         
echo         return {"elements": []}
echo         
echo     except Exception as e:
echo         print(f"Error in Overpass API request: {str(e)}")
echo         return {"elements": []}
echo 
echo def create_geojson(osm_data, resort_name):
echo     """Convert OSM data to GeoJSON format"""
echo     features = []
echo     
echo     # Process each element to create GeoJSON features
echo     for element in osm_data.get('elements', []):
echo         element_type = element.get('type')
echo         element_id = element.get('id')
echo         
echo         # Skip elements without type or id
echo         if not element_type or not element_id:
echo             continue
echo         
echo         # Create a GeoJSON feature
echo         try:
echo             geometry = None
echo             properties = {
echo                 'id': element_id,
echo                 'type': element_type
echo             }
echo             
echo             # Add all tags to properties
echo             if 'tags' in element:
echo                 for key, value in element['tags'].items():
echo                     properties[key] = value
echo             
echo             # Create geometry based on element type
echo             if element_type == 'node':
echo                 if 'lat' in element and 'lon' in element:
echo                     geometry = {
echo                         'type': 'Point',
echo                         'coordinates': [element['lon'], element['lat']]
echo                     }
echo             elif element_type == 'way':
echo                 if 'nodes' in element:
echo                     # We need to find coordinates for each node
echo                     coords = []
echo                     node_map = {n['id']: [n['lon'], n['lat']] for n in osm_data['elements'] if n['type'] == 'node'}
echo                     
echo                     for node_id in element['nodes']:
echo                         if node_id in node_map:
echo                             coords.append(node_map[node_id])
echo                     
echo                     if coords:
echo                         # Check if it's a closed way (polygon)
echo                         if coords[0] == coords[-1] and len(coords) > 3:
echo                             geometry = {
echo                                 'type': 'Polygon',
echo                                 'coordinates': [coords]
echo                             }
echo                         else:
echo                             geometry = {
echo                                 'type': 'LineString',
echo                                 'coordinates': coords
echo                             }
echo             
echo             # Only add features with valid geometry
echo             if geometry:
echo                 features.append({
echo                     'type': 'Feature',
echo                     'id': f"{element_type}/{element_id}",
echo                     'properties': properties,
echo                     'geometry': geometry
echo                 })
echo                 
echo         except Exception as e:
echo             print(f"Error creating feature for {element_type}/{element_id}: {str(e)}")
echo     
echo     # Create GeoJSON feature collection
echo     return {
echo         'type': 'FeatureCollection',
echo         'name': resort_name,
echo         'features': features
echo     }
echo 
echo # Extract geometry function from existing code
echo def extract_geometry(element):
echo     """Extract GeoJSON geometry from an OSM element"""
echo     if element['type'] == 'node':
echo         return {
echo             'type': 'Point',
echo             'coordinates': [element.get('lon'), element.get('lat')]
echo         }
echo     elif element['type'] == 'way' and 'geometry' in element:
echo         # Extract coordinates
echo         coords = []
echo         for point in element['geometry']:
echo             coords.append([point.get('lon'), point.get('lat')])
echo         
echo         # Check if it's a closed way (polygon)
echo         if coords and len(coords) > 2 and coords[0][0] == coords[-1][0] and coords[0][1] == coords[-1][1]:
echo             return {
echo                 'type': 'Polygon',
echo                 'coordinates': [coords]
echo             }
echo         else:
echo             return {
echo                 'type': 'LineString',
echo                 'coordinates': coords
echo             }
echo     elif element['type'] == 'relation':
echo         # For relations, we'd need to process members
echo         # This is a simplified approach for relations
echo         if 'bounds' in element:
echo             bounds = element['bounds']
echo             return {
echo                 'type': 'Polygon',
echo                 'coordinates': [[
echo                     [bounds['minlon'], bounds['minlat']],
echo                     [bounds['maxlon'], bounds['minlat']],
echo                     [bounds['maxlon'], bounds['maxlat']],
echo                     [bounds['minlon'], bounds['maxlat']],
echo                     [bounds['minlon'], bounds['minlat']]
echo                 ]]
echo             }
echo     
echo     # Default if we can't extract geometry
echo     print(f"Unable to extract proper geometry for {element['type']} {element['id']}")
echo     return {
echo         'type': 'Point',
echo         'coordinates': [0, 0]
echo     }
) > %TEMP_DIR%\%FUNCTION_NAME%.py

REM Change to the temp directory
cd %TEMP_DIR%

REM Install required packages
echo Installing required packages...
pip install requests -t .

REM Create the deployment package
echo Creating deployment package...
powershell Compress-Archive -Path * -DestinationPath lambda_package.zip -Force

REM Update the Lambda function code
echo Updating Lambda function code...
aws lambda update-function-code --function-name %FUNCTION_NAME% --zip-file fileb://lambda_package.zip

REM Update Lambda configuration
echo Updating Lambda configuration with more resources...
aws lambda update-function-configuration ^
  --function-name %FUNCTION_NAME% ^
  --memory-size %MEMORY_SIZE% ^
  --timeout %TIMEOUT%

echo === Lambda optimization complete ===
echo Memory: %MEMORY_SIZE% MB
echo Timeout: %TIMEOUT% seconds
echo Added features:
echo - Area splitting for large regions
echo - Request timeouts and retries
echo - Better error handling
echo - Deduplication of elements

REM Clean up
cd %~dp0
rmdir /s /q %TEMP_DIR%

pause 