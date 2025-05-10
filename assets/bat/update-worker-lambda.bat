@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1
set FUNCTION_NAME=process_resort_queue_worker

echo Updating %FUNCTION_NAME% Lambda function...

REM Create temporary directory for deployment
mkdir lambda_temp 2>nul
cd lambda_temp

REM Write the updated Lambda code to a file
echo import json > lambda_function.py
echo import boto3 >> lambda_function.py
echo import time >> lambda_function.py
echo import traceback >> lambda_function.py
echo from datetime import datetime, timedelta >> lambda_function.py
echo. >> lambda_function.py
echo # Initialize clients >> lambda_function.py
echo sqs = boto3.client('sqs') >> lambda_function.py
echo dynamodb = boto3.resource('dynamodb') >> lambda_function.py
echo table = dynamodb.Table('WinterSportsResorts') >> lambda_function.py
echo. >> lambda_function.py
echo def lambda_handler(event, context): >> lambda_function.py
echo     """Worker to process winter sports resorts from SQS queue""" >> lambda_function.py
echo     queue_url = event.get('queueUrl') >> lambda_function.py
echo     start_time = event.get('startTime') >> lambda_function.py
echo. >> lambda_function.py
echo     if not queue_url: >> lambda_function.py
echo         print("No queue URL provided") >> lambda_function.py
echo         return { >> lambda_function.py
echo             'statusCode': 400, >> lambda_function.py
echo             'error': 'No queue URL provided' >> lambda_function.py
echo         } >> lambda_function.py
echo. >> lambda_function.py
echo     print(f"Worker starting to process resorts from queue: {queue_url}") >> lambda_function.py
echo. >> lambda_function.py
echo     # Set reasonable limits to prevent infinite loops >> lambda_function.py
echo     max_messages_per_invocation = 10 >> lambda_function.py
echo     max_processing_time = 240  # seconds (4 minutes to stay within Lambda limit) >> lambda_function.py
echo. >> lambda_function.py
echo     processed_count = 0 >> lambda_function.py
echo     start_processing = time.time() >> lambda_function.py
echo. >> lambda_function.py
echo     try: >> lambda_function.py
echo         # Process up to max_messages_per_invocation or until approaching timeout >> lambda_function.py
echo         while processed_count ^< max_messages_per_invocation and (time.time() - start_processing) ^< max_processing_time: >> lambda_function.py
echo             # Try to get messages from the queue >> lambda_function.py
echo             response = sqs.receive_message( >> lambda_function.py
echo                 QueueUrl=queue_url, >> lambda_function.py
echo                 MaxNumberOfMessages=1, >> lambda_function.py
echo                 WaitTimeSeconds=1, >> lambda_function.py
echo                 VisibilityTimeout=60 >> lambda_function.py
echo             ) >> lambda_function.py
echo. >> lambda_function.py
echo             messages = response.get('Messages', []) >> lambda_function.py
echo             if not messages: >> lambda_function.py
echo                 print("No more messages in queue or long polling timeout reached") >> lambda_function.py
echo                 break >> lambda_function.py
echo. >> lambda_function.py
echo             for message in messages: >> lambda_function.py
echo                 receipt_handle = message['ReceiptHandle'] >> lambda_function.py
echo. >> lambda_function.py
echo                 try: >> lambda_function.py
echo                     # Parse the message and process the resort >> lambda_function.py
echo                     resort_data = json.loads(message['Body']) >> lambda_function.py
echo                     process_resort(resort_data) >> lambda_function.py
echo. >> lambda_function.py
echo                     # Delete the message from the queue after successful processing >> lambda_function.py
echo                     sqs.delete_message( >> lambda_function.py
echo                         QueueUrl=queue_url, >> lambda_function.py
echo                         ReceiptHandle=receipt_handle >> lambda_function.py
echo                     ) >> lambda_function.py
echo. >> lambda_function.py
echo                     processed_count += 1 >> lambda_function.py
echo. >> lambda_function.py
echo                 except Exception as e: >> lambda_function.py
echo                     print(f"Error processing resort: {str(e)}") >> lambda_function.py
echo                     traceback.print_exc() >> lambda_function.py
echo                     # Return the message to the queue for retry >> lambda_function.py
echo. >> lambda_function.py
echo         # Queue remaining time check >> lambda_function.py
echo         remaining_time = context.get_remaining_time_in_millis() / 1000 >> lambda_function.py
echo. >> lambda_function.py
echo         # If there's still work to do and we have time, invoke another worker >> lambda_function.py
echo         if remaining_time ^< 30:  # If less than 30 seconds remaining >> lambda_function.py
echo             response = sqs.get_queue_attributes( >> lambda_function.py
echo                 QueueUrl=queue_url, >> lambda_function.py
echo                 AttributeNames=['ApproximateNumberOfMessages'] >> lambda_function.py
echo             ) >> lambda_function.py
echo. >> lambda_function.py
echo             messages_left = int(response['Attributes']['ApproximateNumberOfMessages']) >> lambda_function.py
echo. >> lambda_function.py
echo             if messages_left ^> 0: >> lambda_function.py
echo                 print(f"Still {messages_left} messages to process. Invoking another worker.") >> lambda_function.py
echo                 lambda_client = boto3.client('lambda') >> lambda_function.py
echo                 lambda_client.invoke( >> lambda_function.py
echo                     FunctionName='process_resort_queue_worker', >> lambda_function.py
echo                     InvocationType='Event',  # Asynchronous invocation >> lambda_function.py
echo                     Payload=json.dumps({ >> lambda_function.py
echo                         'queueUrl': queue_url, >> lambda_function.py
echo                         'startTime': datetime.now().isoformat() >> lambda_function.py
echo                     }) >> lambda_function.py
echo                 ) >> lambda_function.py
echo. >> lambda_function.py
echo         return { >> lambda_function.py
echo             'statusCode': 200, >> lambda_function.py
echo             'processed': processed_count, >> lambda_function.py
echo             'executionTimeSeconds': time.time() - start_processing >> lambda_function.py
echo         } >> lambda_function.py
echo. >> lambda_function.py
echo     except Exception as e: >> lambda_function.py
echo         print(f"Worker error processing queue: {str(e)}") >> lambda_function.py
echo         traceback.print_exc() >> lambda_function.py
echo         return { >> lambda_function.py
echo             'statusCode': 500, >> lambda_function.py
echo             'error': f'Worker error processing queue: {str(e)}' >> lambda_function.py
echo         } >> lambda_function.py
echo. >> lambda_function.py
echo def process_resort(resort_data): >> lambda_function.py
echo     """Process a single resort and save to DynamoDB""" >> lambda_function.py
echo     print(f"Processing resort: {resort_data.get('name', 'Unknown')}") >> lambda_function.py
echo. >> lambda_function.py
echo     # Add timestamp for tracking >> lambda_function.py
echo     resort_data['processed_timestamp'] = datetime.now().isoformat() >> lambda_function.py
echo. >> lambda_function.py
echo     # Save to DynamoDB >> lambda_function.py
echo     table.put_item(Item=resort_data) >> lambda_function.py
echo. >> lambda_function.py
echo     # Simulate some processing time >> lambda_function.py
echo     time.sleep(0.2) >> lambda_function.py

REM Create ZIP file
echo Creating ZIP file...
powershell -Command "Compress-Archive -Force -Path .\lambda_function.py -DestinationPath .\lambda_function.zip"

REM Verify the zip file exists
if not exist lambda_function.zip (
    echo Failed to create ZIP file. Aborting.
    cd ..
    exit /b 1
)

REM Update the Lambda function
echo Updating Lambda function code...
aws lambda update-function-code ^
    --region %REGION% ^
    --function-name %FUNCTION_NAME% ^
    --zip-file fileb://lambda_function.zip

REM Clean up
cd ..
rmdir /s /q lambda_temp

echo Done!
echo Lambda function %FUNCTION_NAME% updated successfully. 