@echo off
setlocal enabledelayedexpansion

:: Configuration variables
set REGION=us-east-1
set BUCKET_NAME=winter-sports-geojson
set DYNAMODB_TABLE=SkiResorts
set PROJECT_NAME=WinterSportsOSM
set LAMBDA_ROLE_NAME=%PROJECT_NAME%LambdaRole
set STEP_FUNCTION_ROLE_NAME=%PROJECT_NAME%StepFunctionRole
set PYTHON_DIR=C:\Users\jwitc\Documents\globalskiatlas\assets\Lambda\Python
set TEMP_DIR=%TEMP%\lambda_deploy

:: Create temp directory for zip files
if not exist %TEMP_DIR% mkdir %TEMP_DIR%

echo === Deploying Winter Sports OSM Processing Solution ===
echo Region: %REGION%

:: Get account ID
for /f "tokens=*" %%a in ('aws sts get-caller-identity --query "Account" --output text') do set ACCOUNT_ID=%%a
echo Account: %ACCOUNT_ID%

:: Create S3 bucket if it doesn't exist
aws s3api head-bucket --bucket %BUCKET_NAME% 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating S3 bucket: %BUCKET_NAME%
    aws s3api create-bucket --bucket %BUCKET_NAME% --region %REGION%
    aws s3api put-bucket-encryption --bucket %BUCKET_NAME% --server-side-encryption-configuration "{\"Rules\": [{\"ApplyServerSideEncryptionByDefault\": {\"SSEAlgorithm\": \"AES256\"}}]}"
)

:: Create DynamoDB table if it doesn't exist
aws dynamodb describe-table --table-name %DYNAMODB_TABLE% 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating DynamoDB table: %DYNAMODB_TABLE%
    aws dynamodb create-table ^
        --table-name %DYNAMODB_TABLE% ^
        --attribute-definitions AttributeName=resortId,AttributeType=S ^
        --key-schema AttributeName=resortId,KeyType=HASH ^
        --billing-mode PAY_PER_REQUEST ^
        --region %REGION%
)

:: Create Lambda execution role
echo Creating IAM role for Lambda functions...
aws iam get-role --role-name %LAMBDA_ROLE_NAME% --query "Role.Arn" --output text 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating Lambda execution role: %LAMBDA_ROLE_NAME%
    
    :: Create trust policy file
    echo {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]} > %TEMP_DIR%\trust-policy.json
    
    :: Create role
    aws iam create-role --role-name %LAMBDA_ROLE_NAME% ^
        --assume-role-policy-document file://%TEMP_DIR%\trust-policy.json
    
    :: Attach policies to Lambda role
    aws iam attach-role-policy --role-name %LAMBDA_ROLE_NAME% ^
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    aws iam attach-role-policy --role-name %LAMBDA_ROLE_NAME% ^
        --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
    aws iam attach-role-policy --role-name %LAMBDA_ROLE_NAME% ^
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
    
    :: Wait for role to propagate
    echo Waiting for IAM role to propagate...
    timeout /t 10 /nobreak > nul
)

:: Get Lambda role ARN
for /f "tokens=*" %%a in ('aws iam get-role --role-name %LAMBDA_ROLE_NAME% --query "Role.Arn" --output text') do set LAMBDA_ROLE_ARN=%%a
echo Lambda execution role ARN: %LAMBDA_ROLE_ARN%

:: Create Step Functions execution role
echo Creating IAM role for Step Functions...
aws iam get-role --role-name %STEP_FUNCTION_ROLE_NAME% --query "Role.Arn" --output text 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating Step Functions execution role: %STEP_FUNCTION_ROLE_NAME%
    
    :: Create trust policy file
    echo {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"states.amazonaws.com"},"Action":"sts:AssumeRole"}]} > %TEMP_DIR%\sf-trust-policy.json
    
    :: Create role
    aws iam create-role --role-name %STEP_FUNCTION_ROLE_NAME% ^
        --assume-role-policy-document file://%TEMP_DIR%\sf-trust-policy.json
    
    :: Create custom policy file for Step Functions to invoke Lambda
    echo {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["lambda:InvokeFunction"],"Resource":"arn:aws:lambda:%REGION%:%ACCOUNT_ID%:function:*"}]} > %TEMP_DIR%\sf-policy.json
    
    :: Attach policy
    aws iam put-role-policy --role-name %STEP_FUNCTION_ROLE_NAME% ^
        --policy-name "StepFunctionsLambdaInvoke" ^
        --policy-document file://%TEMP_DIR%\sf-policy.json
    
    :: Wait for role to propagate
    echo Waiting for IAM role to propagate...
    timeout /t 10 /nobreak > nul
)

:: Get Step Functions role ARN
for /f "tokens=*" %%a in ('aws iam get-role --role-name %STEP_FUNCTION_ROLE_NAME% --query "Role.Arn" --output text') do set STEP_FUNCTION_ROLE_ARN=%%a
echo Step Functions execution role ARN: %STEP_FUNCTION_ROLE_ARN%

:: Function to deploy a Lambda
echo Deploying Lambda functions...

:: Install requests package for all Lambdas (since some need it)
echo Installing dependencies...
mkdir %TEMP_DIR%\package
pip install requests -t %TEMP_DIR%\package

:: Deploy each Lambda function
call :deploy_lambda "buildOverpassQueryLambda" "buildOverpassQueryLambda" "Builds Overpass API query for winter sports areas"
call :deploy_lambda "fetchOsmDataLambda" "fetchOsmDataLambda" "Fetches OSM data from Overpass API"
call :deploy_lambda "processElementMetadataLambda" "processElementMetadataLambda" "Processes OSM element metadata"
call :deploy_lambda "determineAdminDataLambda" "determineAdminDataLambda" "Determines administrative information for resort"
call :deploy_lambda "downloadDetailedResortDataLambda" "downloadDetailedResortDataLambda" "Downloads detailed OSM data for resort"
call :deploy_lambda "uploadToS3Lambda" "uploadToS3Lambda" "Uploads GeoJSON data to S3"
call :deploy_lambda "storeToDynamoDBLambda" "storeToDynamoDBLambda" "Stores resort data in DynamoDB"
call :deploy_lambda "generateSummaryLambda" "generateSummaryLambda" "Generates summary of processing results"

:: Deploy Step Function
echo Deploying Step Function state machine...

:: Save state machine definition to a file
echo {^
  "Comment": "Winter Sports OSM Data Processing Workflow",^
  "StartAt": "InitializeParameters",^
  "States": {^
    "InitializeParameters": {^
      "Type": "Pass",^
      "InputPath": "$",^
      "ResultPath": "$.config",^
      "Parameters": {^
        "country": "$.country",^
        "resort_name": "$.resort_name",^
        "batchSize": 20,^
        "s3Bucket": "winter-sports-geojson",^
        "dynamodbTable": "SkiResorts"^
      },^
      "Next": "BuildOverpassQuery"^
    },^
    "BuildOverpassQuery": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "buildOverpassQueryLambda",^
        "Payload": {^
          "country.$": "$.config.country",^
          "resort_name.$": "$.config.resort_name"^
        }^
      },^
      "ResultPath": "$.overpassQuery",^
      "Next": "FetchOsmData"^
    },^
    "FetchOsmData": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "fetchOsmDataLambda",^
        "Payload": {^
          "overpassQuery.$": "$.overpassQuery.Payload.query"^
        }^
      },^
      "ResultPath": "$.osmData",^
      "Next": "CheckIfElementsExist"^
    },^
    "CheckIfElementsExist": {^
      "Type": "Choice",^
      "Choices": [^
        {^
          "Variable": "$.osmData.Payload.elementCount",^
          "NumericEquals": 0,^
          "Next": "NoElementsFound"^
        }^
      ],^
      "Default": "ProcessElements"^
    },^
    "NoElementsFound": {^
      "Type": "Pass",^
      "End": true,^
      "Result": {^
        "statusCode": 200,^
        "body": {^
          "message": "No winter_sports areas found with the given criteria"^
        }^
      }^
    },^
    "ProcessElements": {^
      "Type": "Map",^
      "ItemsPath": "$.osmData.Payload.elements",^
      "MaxConcurrency": 10,^
      "ResultPath": "$.processResults",^
      "Parameters": {^
        "element.$": "$$.Map.Item.Value",^
        "config.$": "$.config"^
      },^
      "Iterator": {^
        "StartAt": "ProcessElementMetadata",^
        "States": {^
          "ProcessElementMetadata": {^
            "Type": "Task",^
            "Resource": "arn:aws:states:::lambda:invoke",^
            "Parameters": {^
              "FunctionName": "processElementMetadataLambda",^
              "Payload": {^
                "element.$": "$.element"^
              }^
            },^
            "ResultPath": "$.metadata",^
            "Next": "DetermineAdministrativeData"^
          },^
          "DetermineAdministrativeData": {^
            "Type": "Task",^
            "Resource": "arn:aws:states:::lambda:invoke",^
            "Parameters": {^
              "FunctionName": "determineAdminDataLambda",^
              "Payload": {^
                "element.$": "$.element",^
                "metadata.$": "$.metadata.Payload"^
              }^
            },^
            "ResultPath": "$.adminData",^
            "Next": "CheckIfPolygonExists"^
          },^
          "CheckIfPolygonExists": {^
            "Type": "Choice",^
            "Choices": [^
              {^
                "Variable": "$.metadata.Payload.hasPolygon",^
                "BooleanEquals": true,^
                "Next": "DownloadDetailedResortData"^
              }^
            ],^
            "Default": "StoreToDynamoDB"^
          },^
          "DownloadDetailedResortData": {^
            "Type": "Task",^
            "Resource": "arn:aws:states:::lambda:invoke",^
            "Parameters": {^
              "FunctionName": "downloadDetailedResortDataLambda",^
              "Payload": {^
                "element.$": "$.element",^
                "metadata.$": "$.metadata.Payload",^
                "resortName.$": "$.metadata.Payload.resortName"^
              }^
            },^
            "ResultPath": "$.detailedData",^
            "Retry": [^
              {^
                "ErrorEquals": ["States.TaskFailed"],^
                "IntervalSeconds": 10,^
                "MaxAttempts": 3,^
                "BackoffRate": 2.0^
              }^
            ],^
            "Catch": [^
              {^
                "ErrorEquals": ["States.ALL"],^
                "ResultPath": "$.error",^
                "Next": "StoreToDynamoDB"^
              }^
            ],^
            "Next": "UploadToS3"^
          },^
          "UploadToS3": {^
            "Type": "Task",^
            "Resource": "arn:aws:states:::lambda:invoke",^
            "Parameters": {^
              "FunctionName": "uploadToS3Lambda",^
              "Payload": {^
                "resortId.$": "$.metadata.Payload.resortId",^
                "detailedData.$": "$.detailedData.Payload.geojson",^
                "s3Bucket.$": "$.config.s3Bucket"^
              }^
            },^
            "ResultPath": "$.s3Result",^
            "Retry": [^
              {^
                "ErrorEquals": ["States.TaskFailed"],^
                "IntervalSeconds": 3,^
                "MaxAttempts": 2,^
                "BackoffRate": 1.5^
              }^
            ],^
            "Catch": [^
              {^
                "ErrorEquals": ["States.ALL"],^
                "ResultPath": "$.error",^
                "Next": "StoreToDynamoDB"^
              }^
            ],^
            "Next": "StoreToDynamoDB"^
          },^
          "StoreToDynamoDB": {^
            "Type": "Task",^
            "Resource": "arn:aws:states:::lambda:invoke",^
            "Parameters": {^
              "FunctionName": "storeToDynamoDBLambda",^
              "Payload": {^
                "metadata.$": "$.metadata.Payload",^
                "adminData.$": "$.adminData.Payload",^
                "s3Key.$": "$.s3Result.Payload.s3Key",^
                "tableName.$": "$.config.dynamodbTable",^
                "hasDetailedData.$": "$.metadata.Payload.hasPolygon"^
              }^
            },^
            "ResultPath": "$.dbResult",^
            "Retry": [^
              {^
                "ErrorEquals": ["States.TaskFailed"],^
                "IntervalSeconds": 1,^
                "MaxAttempts": 3,^
                "BackoffRate": 2.0^
              }^
            ],^
            "End": true^
          }^
        }^
      },^
      "Next": "GenerateSummary"^
    },^
    "GenerateSummary": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "generateSummaryLambda",^
        "Payload": {^
          "processResults.$": "$.processResults"^
        }^
      },^
      "ResultPath": "$.summary",^
      "End": true^
    }^
  }^
} > %TEMP_DIR%\step_function_def.json

:: Create or update Step Function state machine
set STATE_MACHINE_NAME=%PROJECT_NAME%Workflow
for /f "tokens=*" %%a in ('aws stepfunctions list-state-machines --query "stateMachines[?name==''%STATE_MACHINE_NAME%''].stateMachineArn" --output text 2^>nul') do set STATE_MACHINE_ARN=%%a

if "!STATE_MACHINE_ARN!" == "" (
    echo Creating Step Function state machine: %STATE_MACHINE_NAME%
    for /f "tokens=*" %%a in ('aws stepfunctions create-state-machine ^
        --name %STATE_MACHINE_NAME% ^
        --definition file://%TEMP_DIR%\step_function_def.json ^
        --role-arn %STEP_FUNCTION_ROLE_ARN% ^
        --query stateMachineArn ^
        --output text') do set STATE_MACHINE_ARN=%%a
) else (
    echo Updating Step Function state machine: %STATE_MACHINE_NAME%
    aws stepfunctions update-state-machine ^
        --state-machine-arn !STATE_MACHINE_ARN! ^
        --definition file://%TEMP_DIR%\step_function_def.json ^
        --role-arn %STEP_FUNCTION_ROLE_ARN%
)

echo Step Function state machine ARN: !STATE_MACHINE_ARN!

:: Clean up temporary files
rmdir /s /q %TEMP_DIR%

echo === Deployment Complete ===
echo To start the workflow, use the following AWS CLI command:
echo.
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"country\":\"Switzerland\"}"
echo.
echo Or to process a specific resort:
echo.
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"resort_name\":\"Zermatt\"}"

goto :eof

:deploy_lambda
set FUNCTION_NAME=%~1
set HANDLER=%~2
set DESCRIPTION=%~3
set FILE_PATH=%PYTHON_DIR%\%HANDLER%.py

echo Deploying Lambda function: %FUNCTION_NAME%

:: Create zip file with dependencies
echo Creating deployment package...
mkdir %TEMP_DIR%\%FUNCTION_NAME%
xcopy /s /y %TEMP_DIR%\package\* %TEMP_DIR%\%FUNCTION_NAME%\
copy %FILE_PATH% %TEMP_DIR%\%FUNCTION_NAME%\
cd %TEMP_DIR%\%FUNCTION_NAME%
powershell -command "Compress-Archive -Path * -DestinationPath %TEMP_DIR%\%FUNCTION_NAME%.zip -Force"
cd %~dp0

:: Check if function exists
aws lambda get-function --function-name %FUNCTION_NAME% 2>nul
if %ERRORLEVEL% EQU 0 (
    :: Update existing function
    echo Updating existing Lambda function: %FUNCTION_NAME%
    aws lambda update-function-code ^
        --function-name %FUNCTION_NAME% ^
        --zip-file fileb://%TEMP_DIR%\%FUNCTION_NAME%.zip ^
        --region %REGION%
) else (
    :: Create new function
    echo Creating new Lambda function: %FUNCTION_NAME%
    aws lambda create-function ^
        --function-name %FUNCTION_NAME% ^
        --runtime python3.9 ^
        --role %LAMBDA_ROLE_ARN% ^
        --handler "%HANDLER%.lambda_handler" ^
        --description "%DESCRIPTION%" ^
        --timeout 60 ^
        --memory-size 256 ^
        --zip-file fileb://%TEMP_DIR%\%FUNCTION_NAME%.zip ^
        --region %REGION%
)

goto :eof