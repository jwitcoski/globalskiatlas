import json
import boto3
import time
import traceback
from datetime import datetime

# Initialize clients
sqs = boto3.client('sqs')
s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    """
    Process winter sports resorts from SQS queue
    """
    queue_url = event.get('queueUrl')
    if not queue_url:
        return {
            'statusCode': 400,
            'error': 'No queue URL provided'
        }
    
    print(f"Starting to process resorts from queue: {queue_url}")
    
    try:
        # Start a worker Lambda that will continue processing the queue
        response = lambda_client.invoke(
            FunctionName='process_resort_queue_worker',
            InvocationType='Event',  # Asynchronous invocation
            Payload=json.dumps({
                'queueUrl': queue_url,
                'startTime': datetime.now().isoformat()
            })
        )
        
        return {
            'statusCode': 200,
            'message': f'Started processing queue {queue_url}',
            'invocationResponse': str(response)
        }
    except Exception as e:
        print(f"Error starting queue processing: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'error': f'Error starting queue processing: {str(e)}'
        } 