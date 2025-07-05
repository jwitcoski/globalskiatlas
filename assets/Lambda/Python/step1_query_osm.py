import json
import boto3
import requests
import uuid
from datetime import datetime

# Initialize clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SkiResorts')
sqs = boto3.client('sqs')
QUEUE_NAME = 'winter-sports-processing-queue'

def lambda_handler(event, context):
    """
    Download winter_sports data from OpenStreetMap.
    
    Parameters in event:
    - country: Optional country name to filter results
    - resort_name: Optional resort name to fetch a specific resort
    """
    print("Starting OSM winter_sports data download")
    
    country = event.get('country')
    resort_name = event.get('resort_name')
    
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
        print("Sending request to Overpass API")
        response = requests.get(overpass_url, params={'data': overpass_query})
        response.raise_for_status()
        
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
        
        # If too many elements or processing a country, use queue
        if len(elements) > 10 or (country and not resort_name):
            # Get or create queue
            try:
                queue_url = sqs.get_queue_url(QueueName=QUEUE_NAME)['QueueUrl']
            except sqs.exceptions.QueueDoesNotExist:
                queue_url = sqs.create_queue(QueueName=QUEUE_NAME)['QueueUrl']
            
            # Add elements to queue in batches (10 at a time to avoid SQS message size limits)
            batch_size = 10
            for i in range(0, len(elements), batch_size):
                batch = elements[i:i+batch_size]
                
                # Send a batch message with multiple elements
                sqs.send_message(
                    QueueUrl=queue_url,
                    MessageBody=json.dumps({
                        'elements': batch,
                        'country': country,
                        'resort_name': resort_name,
                        'batch_id': str(uuid.uuid4())
                    })
                )
            
            print(f"Added {len(elements)} elements to SQS queue for processing")
            
            return {
                'statusCode': 200,
                'queueUrl': queue_url,
                'total': len(elements),
                'message': f'Added {len(elements)} winter_sports areas to processing queue'
            }
        
        # For a small number of elements, return directly
        return {
            'statusCode': 200,
            'elements': elements,
            'total': len(elements),
            'message': f'Successfully found {len(elements)} winter_sports areas'
        }
    
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Overpass API: {str(e)}")
        return {
            'statusCode': 500,
            'error': f'Error connecting to Overpass API: {str(e)}'
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'error': f'Unexpected error: {str(e)}'
        } 