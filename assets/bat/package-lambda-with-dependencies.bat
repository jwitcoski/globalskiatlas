@echo off
echo Creating Lambda deployment packages with dependencies...

set REGION=us-east-1
set ACCOUNT_ID=298043721974
set CODE_BUCKET=winter-sports-code-bucket

REM Create a temporary directory for packaging
if not exist package mkdir package
cd package

REM Install dependencies locally
echo Installing dependencies...
python -m pip install requests -t .

REM ==================== PACKAGING STEP1_QUERY_OSM ====================
echo Packaging step1_query_osm Lambda...
copy ..\assets\Lambda\Python\step1_query_osm.py .
echo Creating deployment package...
powershell -Command "Get-ChildItem -Recurse | Compress-Archive -DestinationPath step1_query_osm.zip -Force"
aws s3 cp step1_query_osm.zip s3://%CODE_BUCKET%/step1_query_osm.zip

REM Update Lambda function
echo Updating step1_query_osm Lambda...
aws lambda update-function-code --function-name step1_query_osm --s3-bucket %CODE_BUCKET% --s3-key step1_query_osm.zip --region %REGION%

REM ==================== PACKAGING PROCESS_RESORT_QUEUE ====================
echo Packaging process_resort_queue Lambda...
copy ..\assets\Lambda\Python\process_resort_queue.py .
echo Creating deployment package...
powershell -Command "Get-ChildItem -Recurse | Compress-Archive -DestinationPath process_resort_queue.zip -Force"
aws s3 cp process_resort_queue.zip s3://%CODE_BUCKET%/process_resort_queue.zip

REM Update Lambda function
echo Updating process_resort_queue Lambda...
aws lambda update-function-code --function-name process_resort_queue --s3-bucket %CODE_BUCKET% --s3-key process_resort_queue.zip --region %REGION%

REM ==================== PACKAGING PROCESS_RESORT_QUEUE_WORKER ====================
echo Packaging process_resort_queue_worker Lambda...
copy ..\assets\Lambda\Python\process_resort_queue_worker.py .
echo Creating deployment package...
powershell -Command "Get-ChildItem -Recurse | Compress-Archive -DestinationPath process_resort_queue_worker.zip -Force"
aws s3 cp process_resort_queue_worker.zip s3://%CODE_BUCKET%/process_resort_queue_worker.zip

REM Update Lambda function
echo Updating process_resort_queue_worker Lambda...
aws lambda update-function-code --function-name process_resort_queue_worker --s3-bucket %CODE_BUCKET% --s3-key process_resort_queue_worker.zip --region %REGION%

REM Clean up
cd ..
echo Cleaning up...
rmdir /s /q package

echo ==============================================
echo Deployment packages created with dependencies.
echo ==============================================
echo After Lambda updates complete, run fix-lambda-handlers.bat to ensure handlers are set correctly.
echo Then set up your Step Function in the AWS Console using the provided JSON definition. 