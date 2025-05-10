@echo off
echo Starting Winter Sports Resort Processing Deployment...

REM Set variables - UPDATE THESE WITH YOUR ACTUAL VALUES
set REGION=us-east-1
set ACCOUNT_ID=298043721974
set CODE_BUCKET=winter-sports-code-bucket
set QUEUE_NAME=winter-sports-processing-queue
set ROLE_NAME=WinterSportsLambdaRole

REM Create S3 bucket if not exists
echo Creating S3 code bucket if it doesn't exist...
aws s3api create-bucket --bucket %CODE_BUCKET% --region %REGION%

REM Create SQS queue
echo Creating SQS queue: %QUEUE_NAME%...
aws sqs create-queue --queue-name %QUEUE_NAME% --region %REGION%

REM Set the queue attributes properly - fixed URL format
set QUEUE_URL=https://sqs.%REGION%.amazonaws.com/%ACCOUNT_ID%/%QUEUE_NAME%
echo Setting queue attributes for: %QUEUE_URL%
aws sqs set-queue-attributes --queue-url %QUEUE_URL% --attributes "{\"VisibilityTimeout\":\"900\"}" --region %REGION%

REM Create IAM role for Lambda
echo Creating IAM role for Lambda functions...
aws iam create-role --role-name %ROLE_NAME% --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"

REM Attach basic Lambda execution role
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

REM Create SQS access policy - fixed JSON formatting
echo Creating SQS access policy...
aws iam put-role-policy --role-name %ROLE_NAME% --policy-name SQSAccessPolicy --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"sqs:*\"],\"Resource\":\"arn:aws:sqs:%REGION%:%ACCOUNT_ID%:%QUEUE_NAME%\"}]}"

REM Create DynamoDB access policy - fixed JSON formatting
echo Creating DynamoDB access policy...
aws iam put-role-policy --role-name %ROLE_NAME% --policy-name DynamoDBAccessPolicy --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"dynamodb:*\"],\"Resource\":\"arn:aws:dynamodb:%REGION%:%ACCOUNT_ID%:table/SkiResorts\"}]}"

REM Create S3 access policy - fixed JSON formatting
echo Creating S3 access policy...
aws iam put-role-policy --role-name %ROLE_NAME% --policy-name S3AccessPolicy --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:*\"],\"Resource\":[\"arn:aws:s3:::winter-sports-geojson/*\",\"arn:aws:s3:::winter-sports-geojson\"]}]}"

REM Create Lambda invoke policy - fixed JSON formatting
echo Creating Lambda invoke policy...
aws iam put-role-policy --role-name %ROLE_NAME% --policy-name LambdaInvokePolicy --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"lambda:InvokeFunction\"],\"Resource\":\"*\"}]}"

REM Wait for IAM role to propagate
echo Waiting for IAM role to propagate...
timeout /t 10

REM Package Lambda function code - using PowerShell for zipping instead of 7z
echo Packaging Lambda functions...
if not exist deploy mkdir deploy

REM Prepare and upload step1_query_osm Lambda
echo Preparing step1_query_osm Lambda...
copy assets\Lambda\Python\step1_query_osm.py deploy\lambda_function.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\lambda_function.py -DestinationPath deploy\step1_query_osm.zip -Force"
aws s3 cp deploy\step1_query_osm.zip s3://%CODE_BUCKET%/step1_query_osm.zip
del deploy\lambda_function.py

REM Update step1_query_osm Lambda
echo Updating step1_query_osm Lambda...
aws lambda update-function-code --function-name step1_query_osm --s3-bucket %CODE_BUCKET% --s3-key step1_query_osm.zip --region %REGION%

REM Prepare and create process_resort_queue Lambda
echo Creating process_resort_queue Lambda...
copy assets\Lambda\Python\process_resort_queue.py deploy\lambda_function.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\lambda_function.py -DestinationPath deploy\process_resort_queue.zip -Force"
aws s3 cp deploy\process_resort_queue.zip s3://%CODE_BUCKET%/process_resort_queue.zip
del deploy\lambda_function.py

aws lambda create-function --function-name process_resort_queue --runtime python3.9 --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% --handler lambda_function.lambda_handler --code S3Bucket=%CODE_BUCKET%,S3Key=process_resort_queue.zip --timeout 900 --memory-size 256 --region %REGION%

REM Prepare and create process_resort_queue_worker Lambda
echo Creating process_resort_queue_worker Lambda...
copy assets\Lambda\Python\process_resort_queue_worker.py deploy\lambda_function.py
echo Creating zip file with PowerShell...
powershell -Command "Compress-Archive -Path deploy\lambda_function.py -DestinationPath deploy\process_resort_queue_worker.zip -Force"
aws s3 cp deploy\process_resort_queue_worker.zip s3://%CODE_BUCKET%/process_resort_queue_worker.zip
del deploy\lambda_function.py

aws lambda create-function --function-name process_resort_queue_worker --runtime python3.9 --role arn:aws:iam::%ACCOUNT_ID%:role/%ROLE_NAME% --handler lambda_function.lambda_handler --code S3Bucket=%CODE_BUCKET%,S3Key=process_resort_queue_worker.zip --timeout 900 --memory-size 512 --region %REGION%

REM Clean up deployment files
echo Cleaning up temporary files...
rmdir /s /q deploy

REM Create Lambda Event Source Mapping if needed
rem echo Creating Lambda Event Source Mapping...
rem aws lambda create-event-source-mapping --function-name process_resort_queue_worker --event-source-arn arn:aws:sqs:%REGION%:%ACCOUNT_ID%:%QUEUE_NAME% --batch-size 1

REM Deploy Step Function (requires separate JSON definition file)
echo To deploy the Step Function, use the AWS Console or separate AWS CLI command with the JSON definition file.

echo Deployment completed! 