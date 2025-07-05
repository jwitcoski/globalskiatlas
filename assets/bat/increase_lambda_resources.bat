@echo off
setlocal enabledelayedexpansion

echo === Increasing Lambda Resources for step4_download_resort_data ===

set FUNCTION_NAME=step4_download_resort_data
set MEMORY_SIZE=1024
set TIMEOUT=30

REM Update Lambda configuration
echo Updating Lambda configuration with more memory and longer timeout...
aws lambda update-function-configuration ^
  --function-name %FUNCTION_NAME% ^
  --memory-size %MEMORY_SIZE% ^
  --timeout %TIMEOUT%

echo Lambda resources updated:
echo - Memory: %MEMORY_SIZE% MB
echo - Timeout: %TIMEOUT% seconds

echo.
echo === You may also need to optimize the download code ===
echo If the issue persists, we'll need to modify the Lambda code to:
echo 1. Use smaller area queries
echo 2. Implement pagination for large areas
echo 3. Add better error handling

pause 