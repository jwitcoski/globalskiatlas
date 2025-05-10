@echo off
echo Creating AWS Lambda Layer for dependencies...

set REGION=us-east-1
set ACCOUNT_ID=298043721974
set CODE_BUCKET=winter-sports-code-bucket

REM Create temporary directories
mkdir layer-build
cd layer-build
mkdir python

REM Download pre-packaged requests library
echo Downloading pre-packaged requests library...
curl -L https://files.pythonhosted.org/packages/d6/3e/02dae6725f5d7147250a02f4a64b1e93a06313a98eedacc1d307048d65d5/requests-2.29.0-py3-none-any.whl -o requests.whl
powershell -Command "Expand-Archive -Path requests.whl -DestinationPath python -Force"

REM Create layer zip package
echo Creating layer zip package...
powershell -Command "Compress-Archive -Path python -DestinationPath requests-layer.zip -Force"

REM Upload to S3
aws s3 cp requests-layer.zip s3://%CODE_BUCKET%/requests-layer.zip

REM Create or update Lambda layer
echo Creating Lambda layer...
aws lambda publish-layer-version --layer-name requests-layer --description "Python requests library" --content S3Bucket=%CODE_BUCKET%,S3Key=requests-layer.zip --compatible-runtimes python3.9 --region %REGION%

REM Clean up
cd ..
rmdir /s /q layer-build

echo ====================================
echo Layer published. Now updating Lambda functions to use the layer...
echo ====================================

REM Get the latest layer version ARN
aws lambda list-layer-versions --layer-name requests-layer --query "LayerVersions[0].LayerVersionArn" --output text > layer-arn.txt
set /p LAYER_ARN=<layer-arn.txt
del layer-arn.txt

echo Layer ARN: %LAYER_ARN%

REM Update Lambda functions to use the layer
echo Updating step1_query_osm to use the layer...
aws lambda update-function-configuration --function-name step1_query_osm --layers %LAYER_ARN% --region %REGION%

echo Updating process_resort_queue to use the layer...
aws lambda update-function-configuration --function-name process_resort_queue --layers %LAYER_ARN% --region %REGION%

echo Updating process_resort_queue_worker to use the layer...
aws lambda update-function-configuration --function-name process_resort_queue_worker --layers %LAYER_ARN% --region %REGION%

echo ==============================================
echo All Lambda functions updated to use the layer.
echo ==============================================
echo After Lambda updates complete, run fix-lambda-handlers.bat to ensure handlers are set correctly.
echo Then set up your Step Function in the AWS Console using the provided JSON definition. 