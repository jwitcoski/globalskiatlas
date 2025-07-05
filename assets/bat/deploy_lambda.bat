@echo off
setlocal enabledelayedexpansion

REM Set the Lambda function name
set FUNCTION_NAME=step3_enrich_resort

REM Create a temporary directory
set TEMP_DIR=%TEMP%\lambda_deploy
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

echo === Deploying %FUNCTION_NAME% with dependencies ===

REM Copy the function code to temp directory
copy assets\Lambda\Python\%FUNCTION_NAME%.py %TEMP_DIR%\lambda_function.py

REM Change to the temp directory
cd %TEMP_DIR%

REM Install the required packages
echo Installing required packages...
pip install requests -t .

REM Create the deployment package
echo Creating deployment package...
powershell Compress-Archive -Path * -DestinationPath lambda_package.zip -Force

REM Update the Lambda function
echo Updating Lambda function...
aws lambda update-function-code --function-name %FUNCTION_NAME% --zip-file fileb://lambda_package.zip

echo === Deployment complete ===
echo Function %FUNCTION_NAME% has been updated with required dependencies

REM Clean up
cd %~dp0
rmdir /s /q %TEMP_DIR%

echo Done. 