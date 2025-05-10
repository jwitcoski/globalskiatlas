@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1

echo Testing check_queue_status Lambda function...

REM Create test JSON payload
echo {> test-event.json
echo   "queueUrl": "https://sqs.us-east-1.amazonaws.com/298043721974/winter-sports-processing-queue">> test-event.json
echo }>> test-event.json

REM Invoke Lambda with proper format
aws lambda invoke ^
    --region %REGION% ^
    --function-name check_queue_status ^
    --cli-binary-format raw-in-base64-out ^
    --payload file://test-event.json ^
    response.json

echo Lambda function test result:
type response.json

REM Clean up
del test-event.json
del response.json

echo Done! 