@echo off
echo Waiting for Lambda functions to be ready and updating handlers...

set REGION=us-east-1

echo Checking Lambda functions status...

:CheckStep1
echo Checking if step1_query_osm is ready...
timeout /t 5
aws lambda get-function --function-name step1_query_osm --query "Configuration.LastUpdateStatus" --output text --region %REGION% > status.txt
set /p STATUS=<status.txt
del status.txt
echo Function step1_query_osm status: %STATUS%

if "%STATUS%"=="Successful" (
  echo Updating step1_query_osm handler...
  aws lambda update-function-configuration --function-name step1_query_osm --handler step1_query_osm.lambda_handler --region %REGION%
) else if "%STATUS%"=="Failed" (
  echo WARNING: Function update failed. Will try to update handler anyway.
  aws lambda update-function-configuration --function-name step1_query_osm --handler step1_query_osm.lambda_handler --region %REGION%
) else (
  echo Function is still updating. Waiting...
  goto CheckStep1
)

:CheckQueue
echo Checking if process_resort_queue is ready...
timeout /t 5
aws lambda get-function --function-name process_resort_queue --query "Configuration.LastUpdateStatus" --output text --region %REGION% > status.txt
set /p STATUS=<status.txt
del status.txt
echo Function process_resort_queue status: %STATUS%

if "%STATUS%"=="Successful" (
  echo Updating process_resort_queue handler...
  aws lambda update-function-configuration --function-name process_resort_queue --handler process_resort_queue.lambda_handler --region %REGION%
) else if "%STATUS%"=="Failed" (
  echo WARNING: Function update failed. Will try to update handler anyway.
  aws lambda update-function-configuration --function-name process_resort_queue --handler process_resort_queue.lambda_handler --region %REGION%
) else (
  echo Function is still updating. Waiting...
  goto CheckQueue
)

:CheckWorker
echo Checking if process_resort_queue_worker is ready...
timeout /t 5
aws lambda get-function --function-name process_resort_queue_worker --query "Configuration.LastUpdateStatus" --output text --region %REGION% > status.txt
set /p STATUS=<status.txt
del status.txt
echo Function process_resort_queue_worker status: %STATUS%

if "%STATUS%"=="Successful" (
  echo Updating process_resort_queue_worker handler...
  aws lambda update-function-configuration --function-name process_resort_queue_worker --handler process_resort_queue_worker.lambda_handler --region %REGION%
) else if "%STATUS%"=="Failed" (
  echo WARNING: Function update failed. Will try to update handler anyway.
  aws lambda update-function-configuration --function-name process_resort_queue_worker --handler process_resort_queue_worker.lambda_handler --region %REGION%
) else (
  echo Function is still updating. Waiting...
  goto CheckWorker
)

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