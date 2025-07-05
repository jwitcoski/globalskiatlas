import json
import boto3
import time
import traceback
from datetime import datetime, timedelta

# Initialize clients
sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('WinterSportsResorts')
lambda_client = boto3.client('lambda')

# Maximum execution time (to avoid Lambda timeout)
MAX_EXECUTION_TIME_SECONDS = 700  # Lambda max is 15 minutes, but we'll stop earlier to be safe

def lambda_handler(event, context):
    """
    Worker to process winter sports resorts from SQS queue
    """
    queue_url = event.get('queueUrl')
    start_time = event.get('startTime')
    
    if not queue_url:
        print("No queue URL provided")
        return {
            'statusCode': 400,
            'error': 'No queue URL provided'
        }
    
    print(f"Worker starting to process resorts from queue: {queue_url}")
    
    # Set reasonable limits to prevent infinite loops
    max_messages_per_invocation = 10
    max_processing_time = 240  # seconds (4 minutes to stay within Lambda limit)
    
    processed_count = 0
    start_processing = time.time()
    
    try:
        # Process up to max_messages_per_invocation or until approaching timeout
        while processed_count < max_messages_per_invocation and (time.time() - start_processing) < max_processing_time:
            # Try to get messages from the queue
            response = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=1,
                VisibilityTimeout=60
            )
            
            messages = response.get('Messages', [])
            if not messages:
                print("No more messages in queue or long polling timeout reached")
                break
            
            for message in messages:
                receipt_handle = message['ReceiptHandle']
                
                try:
                    # Parse the message and process the resort
                    resort_data = json.loads(message['Body'])
                    process_resort(resort_data)
                    
                    # Delete the message from the queue after successful processing
                    sqs.delete_message(
                        QueueUrl=queue_url,
                        ReceiptHandle=receipt_handle
                    )
                    
                    processed_count += 1
                    
                except Exception as e:
                    print(f"Error processing resort: {str(e)}")
                    traceback.print_exc()
                    # Return the message to the queue for retry
                    
        # Queue remaining time check
        remaining_time = context.get_remaining_time_in_millis() / 1000
        
        # If there's still work to do and we have time, invoke another worker
        if remaining_time < 30:  # If less than 30 seconds remaining
            response = sqs.get_queue_attributes(
                QueueUrl=queue_url,
                AttributeNames=['ApproximateNumberOfMessages']
            )
            
            messages_left = int(response['Attributes']['ApproximateNumberOfMessages'])
            
            if messages_left > 0:
                print(f"Still {messages_left} messages to process. Invoking another worker.")
                lambda_client.invoke(
                    FunctionName='process_resort_queue_worker',
                    InvocationType='Event',  # Asynchronous invocation
                    Payload=json.dumps({
                        'queueUrl': queue_url,
                        'startTime': datetime.now().isoformat()
                    })
                )
        
        return {
            'statusCode': 200,
            'processed': processed_count,
            'executionTimeSeconds': time.time() - start_processing
        }
        
    except Exception as e:
        print(f"Worker error processing queue: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'error': f'Worker error processing queue: {str(e)}'
        }

def process_resort(resort_data):
    """Process a single resort and save to DynamoDB"""
    print(f"Processing resort: {resort_data.get('name', 'Unknown')}")
    
    # Add timestamp for tracking
    resort_data['processed_timestamp'] = datetime.now().isoformat()
    
    # Save to DynamoDB
    table.put_item(Item=resort_data)
    
    # Simulate some processing time
    time.sleep(0.2) 