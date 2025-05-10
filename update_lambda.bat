@echo off
echo Updating Lambda function with modified getResortSelectorData.py...

REM Create a temporary directory for packaging
mkdir temp_package
echo Created temporary packaging directory.

REM Copy the Python file to the temp directory
copy assets\Lambda\Python\getResortSelectorData.py temp_package\
echo Copied Python file to packaging directory.

REM Change to the temp directory and zip the file
cd temp_package
echo Creating deployment package...
powershell Compress-Archive -Path getResortSelectorData.py -DestinationPath lambda_package.zip -Force

REM Upload the zip to Lambda
echo Uploading to AWS Lambda...
aws lambda update-function-code --function-name resort-selector-function --zip-file fileb://lambda_package.zip

REM Check if the update was successful
if %ERRORLEVEL% EQU 0 (
    echo Lambda function updated successfully!
) else (
    echo Error updating Lambda function. Check AWS CLI configuration and permissions.
)

REM Clean up
cd ..
echo Cleaning up temporary files...
rmdir /s /q temp_package
echo Temporary files removed.

echo Done! 