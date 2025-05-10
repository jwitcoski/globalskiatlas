@echo off
setlocal enabledelayedexpansion

:: Configuration variables
set REGION=us-east-1
set BUCKET_NAME=winter-sports-geojson
set DYNAMODB_TABLE=SkiResorts
set PROJECT_NAME=WinterSportsOSM
set LAMBDA_ROLE_NAME=%PROJECT_NAME%LambdaRole
set STEP_FUNCTION_ROLE_NAME=%PROJECT_NAME%StepFunctionRole
set PYTHON_DIR=assets\Lambda\Python
set TEMP_DIR=%TEMP%\lambda_deploy

:: Create temp directory for zip files
if not exist %TEMP_DIR% mkdir %TEMP_DIR%

echo === Deploying Winter Sports OSM Processing Step Function ===
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

:: Install requests package for all Lambdas
echo Installing dependencies...
mkdir %TEMP_DIR%\package
pip install requests -t %TEMP_DIR%\package

:: Deploy each Lambda function
::call :deploy_lambda "step1_query_osm" "step1_query_osm" "Downloads winter sports data from OpenStreetMap"
::call :deploy_lambda "step2_process_resort" "step2_process_resort" "Processes resort basic info and stores in DynamoDB"
::call :deploy_lambda "step3_enrich_resort" "step3_enrich_resort" "Enriches resort with country and province data"
::call :deploy_lambda "step4_download_resort_data" "step4_download_resort_data" "Downloads detailed resort data and stores in S3"

:: Deploy Step Function
echo Deploying Step Function state machine...

:: Save state machine definition to a file
echo {^
  "Comment": "Winter Sports OSM Processing Workflow",^
  "StartAt": "Initialize",^
  "States": {^
    "Initialize": {^
      "Type": "Pass",^
      "Result": {},^
      "ResultPath": "$.params",^
      "Next": "Merge_Parameters"^
    },^
    "Merge_Parameters": {^
      "Type": "Pass",^
      "Parameters": {^
        "combined": {^
          "country.$": "$.country",^
          "resort_name.$": "$.resort_name"^
        }^
      },^
      "ResultPath": "$.merged",^
      "Next": "Query_OSM"^
    },^
    "Query_OSM": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "step1_query_osm",^
        "Payload.$": "$.merged.combined"^
      },^
      "ResultPath": "$.queryResult",^
      "Next": "Check_Elements_Exist"^
    },^
    "Check_Elements_Exist": {^
      "Type": "Choice",^
      "Choices": [^
        {^
          "Variable": "$.queryResult.total",^
          "NumericEquals": 0,^
          "Next": "No_Elements_Found"^
        }^
      ],^
      "Default": "Process_First_Element"^
    },^
    "No_Elements_Found": {^
      "Type": "Pass",^
      "End": true,^
      "Result": {^
        "statusCode": 200,^
        "message": "No winter_sports areas found with the given criteria"^
      }^
    },^
    "Process_First_Element": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "step2_process_resort",^
        "Payload": {^
          "elements.$": "$.queryResult.elements"^
        }^
      },^
      "ResultPath": "$.processResult",^
      "Next": "Enrich_Resort"^
    },^
    "Enrich_Resort": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "step3_enrich_resort",^
        "Payload": {^
          "processed_resort.$": "$.processResult.processed_resort",^
          "remaining_elements.$": "$.processResult.remaining_elements"^
        }^
      },^
      "ResultPath": "$.enrichResult",^
      "Next": "Download_Resort_Data"^
    },^
    "Download_Resort_Data": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "step4_download_resort_data",^
        "Payload": {^
          "enriched_resort.$": "$.enrichResult.enriched_resort",^
          "remaining_elements.$": "$.enrichResult.remaining_elements"^
        }^
      },^
      "ResultPath": "$.downloadResult",^
      "Next": "Check_More_Elements"^
    },^
    "Check_More_Elements": {^
      "Type": "Choice",^
      "Choices": [^
        {^
          "Variable": "$.downloadResult.remaining_elements",^
          "IsPresent": true,^
          "Next": "Has_More_Elements"^
        }^
      ],^
      "Default": "Workflow_Complete"^
    },^
    "Has_More_Elements": {^
      "Type": "Choice",^
      "Choices": [^
        {^
          "Variable": "$.downloadResult.remaining_elements[0]",^
          "IsPresent": true,^
          "Next": "Process_Next_Element"^
        }^
      ],^
      "Default": "Workflow_Complete"^
    },^
    "Process_Next_Element": {^
      "Type": "Task",^
      "Resource": "arn:aws:states:::lambda:invoke",^
      "Parameters": {^
        "FunctionName": "step2_process_resort",^
        "Payload": {^
          "elements.$": "$.downloadResult.remaining_elements"^
        }^
      },^
      "ResultPath": "$.processResult",^
      "Next": "Enrich_Resort"^
    },^
    "Workflow_Complete": {^
      "Type": "Pass",^
      "End": true,^
      "Result": {^
        "statusCode": 200,^
        "message": "Winter sports data processing complete",^
        "processed_count.$": "$.queryResult.total",^
        "last_processed.$": "$.downloadResult.completed_resort.resort_name"^
      }^
    }^
  }^
} > %TEMP_DIR%\step_function_def.json

:: Create or update Step Function state machine
set STATE_MACHINE_NAME=WinterSportsProcessing

:: First check if state machine exists and get ARN
echo Checking for existing state machine: %STATE_MACHINE_NAME%
aws stepfunctions list-state-machines > %TEMP_DIR%\state_machines.json

:: Parse JSON to find ARN - more reliable method
findstr /C:"%STATE_MACHINE_NAME%" %TEMP_DIR%\state_machines.json > nul
if %ERRORLEVEL% EQU 0 (
    :: Extract the ARN using PowerShell for reliable JSON parsing
    for /f "tokens=*" %%a in ('powershell -Command "(Get-Content '%TEMP_DIR%\state_machines.json' | ConvertFrom-Json).stateMachines | Where-Object { $_.name -eq '%STATE_MACHINE_NAME%' } | Select-Object -ExpandProperty stateMachineArn"') do set STATE_MACHINE_ARN=%%a
    
    echo Found existing state machine: !STATE_MACHINE_ARN!
    echo Updating Step Function state machine...
    
    aws stepfunctions update-state-machine ^
        --state-machine-arn !STATE_MACHINE_ARN! ^
        --definition file://%TEMP_DIR%\step_function_def.json ^
        --role-arn %STEP_FUNCTION_ROLE_ARN%
) else (
    echo Creating new Step Function state machine: %STATE_MACHINE_NAME%
    for /f "tokens=*" %%a in ('aws stepfunctions create-state-machine ^
        --name %STATE_MACHINE_NAME% ^
        --definition file://%TEMP_DIR%\step_function_def.json ^
        --role-arn %STEP_FUNCTION_ROLE_ARN% ^
        --query stateMachineArn ^
        --output text') do set STATE_MACHINE_ARN=%%a
)

echo Step Function state machine ARN: !STATE_MACHINE_ARN!

:: Clean up temporary files
rmdir /s /q %TEMP_DIR%

echo === Deployment Complete ===
echo To start the workflow, use the following AWS CLI command:
echo.
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"resort_name\":\"Whitetail Resort\"}"
echo.
echo Or to process by country:
echo.
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"country\":\"Switzerland\"}"

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
        --timeout 300 ^
        --memory-size 512 ^
        --zip-file fileb://%TEMP_DIR%\%FUNCTION_NAME%.zip ^
        --region %REGION%
)

goto :eof 