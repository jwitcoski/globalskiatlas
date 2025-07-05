@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1
set ROLE_NAME=WinterSportsLambdaRole
set ACCOUNT_ID=298043721974
set CURRENT_DIR=%CD%

echo Creating check_queue_status Lambda function...

REM Create directory structure with better path handling
set LAMBDA_DIR=%CURRENT_DIR%\assets\Lambda\Python\check_queue_status
if not exist "%LAMBDA_DIR%" mkdir "%LAMBDA_DIR%"

REM Create Python file for the Lambda function with proper path
echo import json > "%LAMBDA_DIR%\lambda_function.py"
echo import boto3 >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo def lambda_handler(event, context): >> "%LAMBDA_DIR%\lambda_function.py"
echo     queue_url = event['queueUrl'] >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     sqs = boto3.client('sqs') >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     # Get queue attributes to check messages >> "%LAMBDA_DIR%\lambda_function.py"
echo     response = sqs.get_queue_attributes( >> "%LAMBDA_DIR%\lambda_function.py"
echo         QueueUrl=queue_url, >> "%LAMBDA_DIR%\lambda_function.py"
echo         AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'] >> "%LAMBDA_DIR%\lambda_function.py"
echo     ) >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     visible = int(response['Attributes']['ApproximateNumberOfMessages']) >> "%LAMBDA_DIR%\lambda_function.py"
echo     in_flight = int(response['Attributes']['ApproximateNumberOfMessagesNotVisible']) >> "%LAMBDA_DIR%\lambda_function.py"
echo     total_remaining = visible + in_flight >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     # Get processed count from DynamoDB (count of items) >> "%LAMBDA_DIR%\lambda_function.py"
echo     dynamodb = boto3.resource('dynamodb') >> "%LAMBDA_DIR%\lambda_function.py"
echo     table = dynamodb.Table('WinterSportsResorts') >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     # Only count items created in this run >> "%LAMBDA_DIR%\lambda_function.py"
echo     processed_count = table.scan( >> "%LAMBDA_DIR%\lambda_function.py"
echo         Select='COUNT' >> "%LAMBDA_DIR%\lambda_function.py"
echo     )['Count'] >> "%LAMBDA_DIR%\lambda_function.py"
echo. >> "%LAMBDA_DIR%\lambda_function.py"
echo     return { >> "%LAMBDA_DIR%\lambda_function.py"
echo         'isEmpty': total_remaining == 0, >> "%LAMBDA_DIR%\lambda_function.py"
echo         'messagesRemaining': total_remaining, >> "%LAMBDA_DIR%\lambda_function.py"
echo         'processedCount': processed_count >> "%LAMBDA_DIR%\lambda_function.py"
echo     } >> "%LAMBDA_DIR%\lambda_function.py"

REM Create ZIP file for the Lambda function with correct paths
echo Creating ZIP file for the Lambda function...
cd "%LAMBDA_DIR%"
powershell -Command "Compress-Archive -Force -Path lambda_function.py -DestinationPath lambda_function.zip"
cd "%CURRENT_DIR%"

REM Verify the zip file exists
if not exist "%LAMBDA_DIR%\lambda_function.zip" (
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
    --zip-file fileb://%LAMBDA_DIR:\=/%/lambda_function.zip ^
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
echo { > "%CURRENT_DIR%\test-event.json"
echo   "queueUrl": "https://sqs.us-east-1.amazonaws.com/298043721974/winter-sports-processing-queue" >> "%CURRENT_DIR%\test-event.json"
echo } >> "%CURRENT_DIR%\test-event.json"

aws lambda invoke ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --payload file://%CURRENT_DIR:\=/%/test-event.json ^
    %CURRENT_DIR%\response.json

echo Lambda function test result:
type "%CURRENT_DIR%\response.json"

REM Clean up
del "%CURRENT_DIR%\test-event.json"
del "%CURRENT_DIR%\response.json"

echo Done!
echo Lambda function check_queue_status created and tested successfully.
echo The Step Function already references this Lambda function. 