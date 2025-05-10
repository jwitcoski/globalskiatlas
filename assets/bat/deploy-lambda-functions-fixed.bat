@echo off
echo Starting Winter Sports Resort Processing Deployment...

REM Set variables
set REGION=us-east-1
set ACCOUNT_ID=298043721974
set CODE_BUCKET=winter-sports-code-bucket
set QUEUE_NAME=winter-sports-processing-queue
set ROLE_NAME=WinterSportsLambdaRole

REM Create S3 bucket if not exists
echo Creating S3 code bucket if it doesn't exist...
aws s3api create-bucket --bucket %CODE_BUCKET% --region %REGION% --create-bucket-configuration LocationConstraint=%REGION%

REM Package Lambda function code - using PowerShell for zipping instead of 7z
echo Packaging Lambda functions...
if not exist deploy mkdir deploy

REM ==================== FIXING STEP 1 LAMBDA ====================
REM Fix step1_query_osm Lambda - PRESERVING THE ORIGINAL FILENAME
echo Fixing step1_query_osm Lambda...
copy assets\Lambda\Python\step1_query_osm.py deploy\step1_query_osm.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\step1_query_osm.py -DestinationPath deploy\step1_query_osm.zip -Force"
aws s3 cp deploy\step1_query_osm.zip s3://%CODE_BUCKET%/step1_query_osm.zip
del deploy\step1_query_osm.py

REM Update step1_query_osm Lambda - updating both code and handler
echo Updating step1_query_osm Lambda...
aws lambda update-function-code --function-name step1_query_osm --s3-bucket %CODE_BUCKET% --s3-key step1_query_osm.zip --region %REGION%
aws lambda update-function-configuration --function-name step1_query_osm --handler step1_query_osm.lambda_handler --region %REGION%

REM ==================== CREATING PROCESS QUEUE LAMBDA ====================
REM Prepare and create process_resort_queue Lambda
echo Creating process_resort_queue Lambda...
copy assets\Lambda\Python\process_resort_queue.py deploy\process_resort_queue.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\process_resort_queue.py -DestinationPath deploy\process_resort_queue.zip -Force"
aws s3 cp deploy\process_resort_queue.zip s3://%CODE_BUCKET%/process_resort_queue.zip
del deploy\process_resort_queue.py

REM Check if function already exists
aws lambda get-function --function-name process_resort_queue --region %REGION% > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Creating new process_resort_queue Lambda function...
  aws lambda create-function --function-name process_resort_queue --runtime python3.9 --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% --handler process_resort_queue.lambda_handler --code S3Bucket=%CODE_BUCKET%,S3Key=process_resort_queue.zip --timeout 900 --memory-size 256 --region %REGION%
) else (
  echo Updating existing process_resort_queue Lambda function...
  aws lambda update-function-code --function-name process_resort_queue --s3-bucket %CODE_BUCKET% --s3-key process_resort_queue.zip --region %REGION%
  aws lambda update-function-configuration --function-name process_resort_queue --handler process_resort_queue.lambda_handler --region %REGION%
)

REM ==================== CREATING WORKER LAMBDA ====================
REM Prepare and create process_resort_queue_worker Lambda
echo Creating process_resort_queue_worker Lambda...
copy assets\Lambda\Python\process_resort_queue_worker.py deploy\process_resort_queue_worker.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\process_resort_queue_worker.py -DestinationPath deploy\process_resort_queue_worker.zip -Force"
aws s3 cp deploy\process_resort_queue_worker.zip s3://%CODE_BUCKET%/process_resort_queue_worker.zip
del deploy\process_resort_queue_worker.py

REM Check if function already exists
aws lambda get-function --function-name process_resort_queue_worker --region %REGION% > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Creating new process_resort_queue_worker Lambda function...
  aws lambda create-function --function-name process_resort_queue_worker --runtime python3.9 --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% --handler process_resort_queue_worker.lambda_handler --code S3Bucket=%CODE_BUCKET%,S3Key=process_resort_queue_worker.zip --timeout 900 --memory-size 512 --region %REGION%
) else (
  echo Updating existing process_resort_queue_worker Lambda function...
  aws lambda update-function-code --function-name process_resort_queue_worker --s3-bucket %CODE_BUCKET% --s3-key process_resort_queue_worker.zip --region %REGION%
  aws lambda update-function-configuration --function-name process_resort_queue_worker --handler process_resort_queue_worker.lambda_handler --region %REGION%
)

REM Clean up deployment files
echo Cleaning up temporary files...
rmdir /s /q deploy

echo Deployment completed! 