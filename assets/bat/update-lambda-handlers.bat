@echo off
echo Waiting for Lambda functions to be ready and updating handlers...

set REGION=us-east-1

REM Function to check Lambda update status and update handler
:UpdateLambdaHandler
echo Checking if %1 is ready for handler update...
set READY=false

:CheckLoop
timeout /t 5
aws lambda get-function --function-name %1 --query "Configuration.LastUpdateStatus" --output text --region %REGION% > status.txt
set /p STATUS=<status.txt
del status.txt

echo Function %1 status: %STATUS%
if "%STATUS%"=="Successful" (
  set READY=true
) else if "%STATUS%"=="Failed" (
  echo WARNING: Function update failed. Will try to update handler anyway.
  set READY=true
) else (
  echo Function %1 is still updating. Waiting...
  goto CheckLoop
)

if "%READY%"=="true" (
  echo Updating %1 handler to %2...
  aws lambda update-function-configuration --function-name %1 --handler %2 --region %REGION%
  echo Handler update initiated for %1
)
goto :eof

REM Update each Lambda function handler
call :UpdateLambdaHandler step1_query_osm step1_query_osm.lambda_handler
call :UpdateLambdaHandler process_resort_queue process_resort_queue.lambda_handler
call :UpdateLambdaHandler process_resort_queue_worker process_resort_queue_worker.lambda_handler

echo Handler updates complete!
echo.
echo Next steps:
echo 1. Create or update your Step Function in the AWS Console
echo 2. Test with a single resort to verify functionality
echo 3. Then try with larger datasets

echo.
echo To test a single resort, run the Step Function with:
echo {
echo   "country": "",
echo   "resort_name": "Ski Resort Name"
echo }

echo.
echo To test a country, run with:
echo {
echo   "country": "Switzerland",
echo   "resort_name": ""
echo } 