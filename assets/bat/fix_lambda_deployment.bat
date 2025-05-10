@echo off
setlocal enabledelayedexpansion

REM Set the Lambda function name
set FUNCTION_NAME=step3_enrich_resort

REM Create a temporary directory
set TEMP_DIR=%TEMP%\lambda_deploy
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

echo === Deploying %FUNCTION_NAME% with dependencies ===

REM Copy the function code to temp directory - KEEP ORIGINAL FILENAME
copy assets\Lambda\Python\%FUNCTION_NAME%.py %TEMP_DIR%\%FUNCTION_NAME%.py

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

REM Ensure handler is correctly set
echo Setting correct Lambda handler...
aws lambda update-function-configuration --function-name %FUNCTION_NAME% --handler %FUNCTION_NAME%.lambda_handler

echo === Deployment complete ===
echo Function %FUNCTION_NAME% has been updated with required dependencies

REM Clean up
cd %~dp0
rmdir /s /q %TEMP_DIR%

echo Done. 