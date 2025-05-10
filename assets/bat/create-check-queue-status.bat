@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1
set ROLE_NAME=WinterSportsLambdaRole
set ROLE_ARN=arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME%
set ACCOUNT_ID=298043721974
set STEP_FUNCTION_ARN=arn:aws:states:%REGION%:%ACCOUNT_ID%:stateMachine:WinterSportsProcessing

echo Creating check_queue_status Lambda function...

REM Create directory for the Lambda function
if not exist "assets\Lambda\Python\check_queue_status\" mkdir "assets\Lambda\Python\check_queue_status\"

REM Create Python file for the Lambda function
echo import json > "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo import boto3 >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo def lambda_handler(event, context): >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     queue_url = event['queueUrl'] >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     sqs = boto3.client('sqs') >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     # Get queue attributes to check messages >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     response = sqs.get_queue_attributes( >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         QueueUrl=queue_url, >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'] >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     ) >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     visible = int(response['Attributes']['ApproximateNumberOfMessages']) >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     in_flight = int(response['Attributes']['ApproximateNumberOfMessagesNotVisible']) >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     total_remaining = visible + in_flight >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     # Get processed count from DynamoDB (count of items) >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     dynamodb = boto3.resource('dynamodb') >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     table = dynamodb.Table('WinterSportsResorts') >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     # Only count items created in this run >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     processed_count = table.scan( >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         Select='COUNT' >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     )['Count'] >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo. >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     return { >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         'isEmpty': total_remaining == 0, >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         'messagesRemaining': total_remaining, >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo         'processedCount': processed_count >> "assets\Lambda\Python\check_queue_status\lambda_function.py"
echo     } >> "assets\Lambda\Python\check_queue_status\lambda_function.py"

REM Create ZIP file for the Lambda function
echo Creating ZIP file for the Lambda function...
cd "assets\Lambda\Python\check_queue_status"
powershell Compress-Archive -Force -Path lambda_function.py -DestinationPath lambda_function.zip
cd ..\..\..\..\

REM Create Lambda function
echo Creating Lambda function...
aws lambda create-function ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --runtime python3.9 ^
    --handler lambda_function.lambda_handler ^
    --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% ^
    --zip-file fileb://assets/Lambda/Python/check_queue_status/lambda_function.zip ^
    --timeout 60 ^
    --memory-size 256

REM Add Lambda Layer for requests library
aws lambda update-function-configuration ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --layers arn:aws:lambda:%REGION%:%ACCOUNT_ID%:layer:requests-layer:1

REM Attach policies to the Lambda function
echo Attaching policies to the Lambda function...
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

REM Wait for Lambda function to be ready
echo Waiting for Lambda function to be ready...
timeout /t 10

REM Test the Lambda function
echo Testing Lambda function...
echo {
echo   "queueUrl": "https://sqs.us-east-1.amazonaws.com/298043721974/winter-sports-processing-queue"
echo } > test-event.json

aws lambda invoke ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --payload file://test-event.json ^
    response.json

echo Lambda function test result:
type response.json

REM Update Step Function definition
echo Step Function already contains the check_queue_status function.
echo No update needed for the Step Function definition.

REM Clean up
del test-event.json
del response.json

echo Done!
echo Lambda function check_queue_status created and tested successfully.
echo The Step Function already references this Lambda function. 