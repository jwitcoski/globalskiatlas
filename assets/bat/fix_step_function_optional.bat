@echo off
setlocal enabledelayedexpansion

echo === Fixing Step Function Parameters ===

set REGION=us-east-1
set TEMP_DIR=%TEMP%\step_function_fix
set STATE_MACHINE_NAME=WinterSportsProcessing

if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

REM Get the existing Step Function definition
echo Retrieving existing Step Function...
aws stepfunctions list-state-machines > %TEMP_DIR%\state_machines.json

REM Use PowerShell to parse the JSON and find our state machine
powershell -Command "Get-Content '%TEMP_DIR%\state_machines.json' | ConvertFrom-Json | ForEach-Object { $_.stateMachines } | Where-Object { $_.name -eq '%STATE_MACHINE_NAME%' } | ForEach-Object { $_.stateMachineArn } | Set-Content '%TEMP_DIR%\arn.txt'"

set /p STATE_MACHINE_ARN=<%TEMP_DIR%\arn.txt
if not defined STATE_MACHINE_ARN (
    echo State machine %STATE_MACHINE_NAME% not found!
    goto :cleanup
)

echo Found state machine: !STATE_MACHINE_ARN!

REM Create an updated state machine definition with fixed parameter handling
echo Creating updated state machine definition...
(
echo {
echo   "Comment": "Winter Sports Resort Processing Workflow",
echo   "StartAt": "Merge_Parameters",
echo   "States": {
echo     "Merge_Parameters": {
echo       "Type": "Pass",
echo       "Comment": "Merge input parameters with defaults",
echo       "Parameters": {
echo         "country": "US",
echo         "resort_name.$": "$.resort_name",
echo         "params": {
echo           "limit": 50
echo         }
echo       },
echo       "ResultPath": "$",
echo       "Next": "Query_OSM"
echo     },
echo     "Query_OSM": {
echo       "Type": "Task",
echo       "Resource": "arn:aws:states:::lambda:invoke",
echo       "Parameters": {
echo         "FunctionName": "step1_query_osm",
echo         "Payload": {
echo           "country.$": "$.country",
echo           "resort_name.$": "$.resort_name"
echo         }
echo       },
echo       "ResultPath": "$.queryResult",
echo       "Next": "Check_Elements_Exist"
echo     },
echo     "Check_Elements_Exist": {
echo       "Type": "Choice",
echo       "Choices": [
echo         {
echo           "Variable": "$.queryResult.Payload.elements",
echo           "IsPresent": false,
echo           "Next": "No_Results_Found"
echo         },
echo         {
echo           "Variable": "$.queryResult.Payload.elements",
echo           "StringEquals": "[]",
echo           "Next": "No_Results_Found"
echo         },
echo         {
echo           "Variable": "$.queryResult.Payload.elements[0]",
echo           "IsPresent": true,
echo           "Next": "Process_Resort"
echo         }
echo       ],
echo       "Default": "No_Results_Found"
echo     },
echo     "No_Results_Found": {
echo       "Type": "Fail",
echo       "Error": "NoResultsFound",
echo       "Cause": "No winter sports areas found for the given parameters"
echo     },
echo     "Process_Resort": {
echo       "Type": "Task",
echo       "Resource": "arn:aws:states:::lambda:invoke",
echo       "Parameters": {
echo         "FunctionName": "step2_process_resort",
echo         "Payload": {
echo           "elements.$": "$.queryResult.Payload.elements"
echo         }
echo       },
echo       "ResultPath": "$.processResult",
echo       "Next": "Enrich_Resort"
echo     },
echo     "Enrich_Resort": {
echo       "Type": "Task",
echo       "Resource": "arn:aws:states:::lambda:invoke",
echo       "Parameters": {
echo         "FunctionName": "step3_enrich_resort",
echo         "Payload": {
echo           "processed_resort.$": "$.processResult.Payload.processed_resort",
echo           "remaining_elements.$": "$.processResult.Payload.remaining_elements"
echo         }
echo       },
echo       "ResultPath": "$.enrichResult",
echo       "Next": "Download_Resort_Data"
echo     },
echo     "Download_Resort_Data": {
echo       "Type": "Task",
echo       "Resource": "arn:aws:states:::lambda:invoke",
echo       "Parameters": {
echo         "FunctionName": "step4_download_resort_data",
echo         "Payload": {
echo           "enriched_resort.$": "$.enrichResult.Payload.enriched_resort",
echo           "remaining_elements.$": "$.enrichResult.Payload.remaining_elements"
echo         }
echo       },
echo       "ResultPath": "$.downloadResult",
echo       "Next": "Check_More_Elements"
echo     },
echo     "Check_More_Elements": {
echo       "Type": "Choice",
echo       "Choices": [
echo         {
echo           "Variable": "$.downloadResult.Payload.remaining_elements",
echo           "IsPresent": true,
echo           "Next": "Process_Next_Resort"
echo         }
echo       ],
echo       "Default": "Success"
echo     },
echo     "Process_Next_Resort": {
echo       "Type": "Task",
echo       "Resource": "arn:aws:states:::lambda:invoke",
echo       "Parameters": {
echo         "FunctionName": "step2_process_resort",
echo         "Payload": {
echo           "elements.$": "$.downloadResult.Payload.remaining_elements"
echo         }
echo       },
echo       "ResultPath": "$.processResult",
echo       "Next": "Enrich_Resort"
echo     },
echo     "Success": {
echo       "Type": "Succeed"
echo     }
echo   }
echo }
) > %TEMP_DIR%\state_machine.json

REM Update the state machine with the new definition
echo Updating Step Function definition...
aws stepfunctions update-state-machine --state-machine-arn !STATE_MACHINE_ARN! --definition file://%TEMP_DIR%\state_machine.json

echo Step Function updated successfully!
echo.
echo To run the Step Function with just a resort name, use:
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"resort_name\":\"Whitetail Resort\"}"
echo.
echo To run with both parameters, use:
echo aws stepfunctions start-execution --state-machine-arn !STATE_MACHINE_ARN! --input "{\"country\":\"Switzerland\",\"resort_name\":\"Verbier\"}"
echo.

:cleanup
REM Clean up
rmdir /s /q %TEMP_DIR%

pause 