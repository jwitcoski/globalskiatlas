@echo off
echo Testing Lambda function with requests library...

set REGION=us-east-1
set TEST_FUNCTION=step1_query_osm

REM Create test event JSON
echo {
echo   "country": "",
echo   "resort_name": "Zermatt"
echo } > test-event.json

REM Invoke Lambda function with test event
echo Invoking %TEST_FUNCTION% Lambda...
aws lambda invoke --function-name %TEST_FUNCTION% --payload file://test-event.json response.json --region %REGION%

REM Check response
echo Response:
type response.json

REM Clean up
del test-event.json
del response.json

echo Test complete. 