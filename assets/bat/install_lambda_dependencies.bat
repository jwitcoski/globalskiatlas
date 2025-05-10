@echo off
setlocal

echo === Installing Lambda Dependencies ===

REM Set the Lambda function name
set FUNCTION_NAME=step3_enrich_resort

REM Create a temporary directory
set TEMP_DIR=%TEMP%\lambda_dependencies
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

REM Copy the function code to temp directory
copy assets\Lambda\Python\%FUNCTION_NAME%.py %TEMP_DIR%\

REM Change to the temp directory
cd %TEMP_DIR%

REM Create a directory for the dependencies
mkdir package

REM Install the required packages
echo Installing required packages...
pip install requests -t package\

REM Create the deployment package
echo Creating deployment package...
cd package
powershell Compress-Archive -Path * -DestinationPath ..\dependencies.zip
cd ..
powershell Compress-Archive -Path dependencies.zip,%FUNCTION_NAME%.py -DestinationPath lambda_package.zip -Update

REM Update the Lambda function
echo Updating Lambda function...
aws lambda update-function-code --function-name %FUNCTION_NAME% --zip-file fileb://lambda_package.zip

REM Clean up
cd ..
rmdir /s /q %TEMP_DIR%

echo === Lambda dependencies updated ===
echo Function %FUNCTION_NAME% has been updated with required dependencies

pause 