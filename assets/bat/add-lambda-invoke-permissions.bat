@echo off
echo Adding Lambda invoke permissions...

set OSM_ROLE_NAME=WinterSportsOSMLambdaRole
set REGULAR_ROLE_NAME=WinterSportsLambdaRole

REM Attach correct Lambda invoke policy
echo Attaching Lambda invoke policy...
aws iam attach-role-policy --role-name %OSM_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole
aws iam attach-role-policy --role-name %REGULAR_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole

echo Permissions updated. Now testing the Lambda function...

REM Create test event JSON
echo {
echo   "country": "",
echo   "resort_name": "Zermatt"
echo } > test-event.json

REM Wait a bit for permissions to propagate
echo Waiting 10 seconds for permissions to propagate...
timeout /t 10

REM Invoke Lambda function with test event
echo Invoking step1_query_osm Lambda...
aws lambda invoke --function-name step1_query_osm --payload file://test-event.json response.json --region us-east-1

REM Check response
echo.
echo Response:
type response.json
echo.

REM Clean up
del test-event.json
del response.json

echo.
echo If the function executed successfully, you can now create the Step Function in the AWS Console.
echo Use the JSON definition I provided earlier for the Step Function workflow.
echo.
echo To test the Step Function, use this input:
echo {
echo   "country": "",
echo   "resort_name": "Zermatt"
echo } 