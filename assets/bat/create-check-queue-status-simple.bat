@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1
set ROLE_NAME=WinterSportsLambdaRole
set ACCOUNT_ID=298043721974

echo Creating check_queue_status Lambda function...

REM Create lambda function directory right in the current folder
echo Creating Lambda function files in current directory...
md lambda_temp 2>nul

REM Create Python file directly
echo import json > lambda_temp\lambda_function.py
echo import boto3 >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo def lambda_handler(event, context): >> lambda_temp\lambda_function.py
echo     queue_url = event['queueUrl'] >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     sqs = boto3.client('sqs') >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     # Get queue attributes to check messages >> lambda_temp\lambda_function.py
echo     response = sqs.get_queue_attributes( >> lambda_temp\lambda_function.py
echo         QueueUrl=queue_url, >> lambda_temp\lambda_function.py
echo         AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'] >> lambda_temp\lambda_function.py
echo     ) >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     visible = int(response['Attributes']['ApproximateNumberOfMessages']) >> lambda_temp\lambda_function.py
echo     in_flight = int(response['Attributes']['ApproximateNumberOfMessagesNotVisible']) >> lambda_temp\lambda_function.py
echo     total_remaining = visible + in_flight >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     # Get processed count from DynamoDB (count of items) >> lambda_temp\lambda_function.py
echo     dynamodb = boto3.resource('dynamodb') >> lambda_temp\lambda_function.py
echo     table = dynamodb.Table('WinterSportsResorts') >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     # Only count items created in this run >> lambda_temp\lambda_function.py
echo     processed_count = table.scan( >> lambda_temp\lambda_function.py
echo         Select='COUNT' >> lambda_temp\lambda_function.py
echo     )['Count'] >> lambda_temp\lambda_function.py
echo. >> lambda_temp\lambda_function.py
echo     return { >> lambda_temp\lambda_function.py
echo         'isEmpty': total_remaining == 0, >> lambda_temp\lambda_function.py
echo         'messagesRemaining': total_remaining, >> lambda_temp\lambda_function.py
echo         'processedCount': processed_count >> lambda_temp\lambda_function.py
echo     } >> lambda_temp\lambda_function.py

REM Verify file was created
echo Checking if lambda_function.py was created...
if not exist lambda_temp\lambda_function.py (
    echo Failed to create Python file. Aborting.
    exit /b 1
)

REM Create ZIP file
echo Creating ZIP file...
cd lambda_temp
powershell -Command "Compress-Archive -Force -Path .\lambda_function.py -DestinationPath .\lambda_function.zip"
cd ..

REM Verify the zip file exists
if not exist lambda_temp\lambda_function.zip (
    echo Failed to create ZIP file. Aborting.
    exit /b 1
)

REM Create Lambda function
echo Creating Lambda function...
aws lambda create-function ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --runtime python3.9 ^
    --handler lambda_function.lambda_handler ^
    --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% ^
    --zip-file fileb://lambda_temp/lambda_function.zip ^
    --timeout 60 ^
    --memory-size 256

echo Waiting for Lambda function to be ready...
timeout /t 10

REM Attach policies to the Lambda function
echo Attaching policies to the Lambda function...
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

REM Test the Lambda function
echo Testing Lambda function...
echo { > test-event.json
echo   "queueUrl": "https://sqs.us-east-1.amazonaws.com/298043721974/winter-sports-processing-queue" >> test-event.json
echo } >> test-event.json

aws lambda invoke ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --payload file://test-event.json ^
    response.json

echo Lambda function test result:
type response.json

REM Clean up
del test-event.json
del response.json
rmdir /s /q lambda_temp

echo Done!
echo Lambda function check_queue_status created and tested successfully.
echo The Step Function already references this Lambda function. 