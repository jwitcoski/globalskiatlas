@echo off
setlocal enabledelayedexpansion

set REGION=us-east-1
set ACCOUNT_ID=298043721974
set STEP_FUNCTION_ARN=arn:aws:states:%REGION%:%ACCOUNT_ID%:stateMachine:WinterSportsProcessing

echo Updating Step Function with complete definition...

REM Create definition file from the complete definition
echo {> step-function-definition.json
echo   "Comment": "Winter Sports Resort Processing Workflow",>> step-function-definition.json
echo   "StartAt": "Initialize_Parameters",>> step-function-definition.json
echo   "States": {>> step-function-definition.json
echo     "Initialize_Parameters": {>> step-function-definition.json
echo       "Type": "Pass",>> step-function-definition.json
echo       "Comment": "Initialize parameters with defaults",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "input.$": "$",>> step-function-definition.json
echo         "defaults": {>> step-function-definition.json
echo           "country": "US",>> step-function-definition.json
echo           "resort_name": "",>> step-function-definition.json
echo           "params": {>> step-function-definition.json
echo             "limit": 50>> step-function-definition.json
echo           }>> step-function-definition.json
echo         }>> step-function-definition.json
echo       },>> step-function-definition.json
echo       "Next": "Set_Country">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Set_Country": {>> step-function-definition.json
echo       "Type": "Choice",>> step-function-definition.json
echo       "Choices": [>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.input.country",>> step-function-definition.json
echo           "IsPresent": true,>> step-function-definition.json
echo           "Next": "Set_Resort_Name">> step-function-definition.json
echo         }>> step-function-definition.json
echo       ],>> step-function-definition.json
echo       "Default": "Set_Default_Country">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Set_Default_Country": {>> step-function-definition.json
echo       "Type": "Pass",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "input": {>> step-function-definition.json
echo           "country.$": "$.defaults.country",>> step-function-definition.json
echo           "resort_name.$": "$.input.resort_name">> step-function-definition.json
echo         },>> step-function-definition.json
echo         "defaults.$": "$.defaults">> step-function-definition.json
echo       },>> step-function-definition.json
echo       "Next": "Set_Resort_Name">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Set_Resort_Name": {>> step-function-definition.json
echo       "Type": "Choice",>> step-function-definition.json
echo       "Choices": [>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.input.resort_name",>> step-function-definition.json
echo           "IsPresent": true,>> step-function-definition.json
echo           "Next": "Prepare_Query">> step-function-definition.json
echo         }>> step-function-definition.json
echo       ],>> step-function-definition.json
echo       "Default": "Set_Empty_Resort_Name">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Set_Empty_Resort_Name": {>> step-function-definition.json
echo       "Type": "Pass",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "input": {>> step-function-definition.json
echo           "country.$": "$.input.country",>> step-function-definition.json
echo           "resort_name.$": "$.defaults.resort_name">> step-function-definition.json
echo         },>> step-function-definition.json
echo         "defaults.$": "$.defaults">> step-function-definition.json
echo       },>> step-function-definition.json
echo       "Next": "Prepare_Query">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Prepare_Query": {>> step-function-definition.json
echo       "Type": "Pass",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "country.$": "$.input.country",>> step-function-definition.json
echo         "resort_name.$": "$.input.resort_name",>> step-function-definition.json
echo         "params.$": "$.defaults.params">> step-function-definition.json
echo       },>> step-function-definition.json
echo       "Next": "Query_OSM">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Query_OSM": {>> step-function-definition.json
echo       "Type": "Task",>> step-function-definition.json
echo       "Resource": "arn:aws:states:::lambda:invoke",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "FunctionName": "step1_query_osm",>> step-function-definition.json
echo         "Payload": {>> step-function-definition.json
echo           "country.$": "$.country",>> step-function-definition.json
echo           "resort_name.$": "$.resort_name">> step-function-definition.json
echo         }>> step-function-definition.json
echo       },>> step-function-definition.json
echo       "ResultPath": "$.queryResult",>> step-function-definition.json
echo       "Next": "Check_Elements_Exist">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Check_Elements_Exist": {>> step-function-definition.json
echo       "Type": "Choice",>> step-function-definition.json
echo       "Choices": [>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.queryResult.Payload.total",>> step-function-definition.json
echo           "IsPresent": false,>> step-function-definition.json
echo           "Next": "No_Results_Found">> step-function-definition.json
echo         },>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.queryResult.Payload.total",>> step-function-definition.json
echo           "NumericEquals": 0,>> step-function-definition.json
echo           "Next": "No_Results_Found">> step-function-definition.json
echo         },>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.queryResult.Payload.queueUrl",>> step-function-definition.json
echo           "IsPresent": true,>> step-function-definition.json
echo           "Next": "Start_Queue_Processing">> step-function-definition.json
echo         }>> step-function-definition.json
echo       ],>> step-function-definition.json
echo       "Default": "No_Results_Found">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Start_Queue_Processing": {>> step-function-definition.json
echo       "Type": "Task",>> step-function-definition.json
echo       "Resource": "arn:aws:states:::lambda:invoke",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "FunctionName": "process_resort_queue",>> step-function-definition.json
echo         "Payload": {>> step-function-definition.json
echo           "queueUrl.$": "$.queryResult.Payload.queueUrl",>> step-function-definition.json
echo           "totalResorts.$": "$.queryResult.Payload.total">> step-function-definition.json
echo         }>> step-function-definition.json
echo       },>> step-function-definition.json
echo       "ResultPath": "$.queueResult",>> step-function-definition.json
echo       "Next": "Wait_For_Processing">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Wait_For_Processing": {>> step-function-definition.json
echo       "Type": "Wait",>> step-function-definition.json
echo       "Seconds": 10,>> step-function-definition.json
echo       "Next": "Check_Queue_Status">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Check_Queue_Status": {>> step-function-definition.json
echo       "Type": "Task",>> step-function-definition.json
echo       "Resource": "arn:aws:states:::lambda:invoke",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "FunctionName": "check_queue_status",>> step-function-definition.json
echo         "Payload": {>> step-function-definition.json
echo           "queueUrl.$": "$.queryResult.Payload.queueUrl">> step-function-definition.json
echo         }>> step-function-definition.json
echo       },>> step-function-definition.json
echo       "ResultPath": "$.queueStatus",>> step-function-definition.json
echo       "Next": "Evaluate_Queue_Status">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Evaluate_Queue_Status": {>> step-function-definition.json
echo       "Type": "Choice",>> step-function-definition.json
echo       "Choices": [>> step-function-definition.json
echo         {>> step-function-definition.json
echo           "Variable": "$.queueStatus.Payload.isEmpty",>> step-function-definition.json
echo           "BooleanEquals": true,>> step-function-definition.json
echo           "Next": "Export_Results">> step-function-definition.json
echo         }>> step-function-definition.json
echo       ],>> step-function-definition.json
echo       "Default": "Wait_For_Processing">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Export_Results": {>> step-function-definition.json
echo       "Type": "Task",>> step-function-definition.json
echo       "Resource": "arn:aws:states:::lambda:invoke",>> step-function-definition.json
echo       "Parameters": {>> step-function-definition.json
echo         "FunctionName": "step4_download_resort_data",>> step-function-definition.json
echo         "Payload": {>> step-function-definition.json
echo           "country.$": "$.country",>> step-function-definition.json
echo           "resort_name.$": "$.resort_name",>> step-function-definition.json
echo           "processed_count.$": "$.queueStatus.Payload.processedCount">> step-function-definition.json
echo         }>> step-function-definition.json
echo       },>> step-function-definition.json
echo       "ResultPath": "$.exportResult",>> step-function-definition.json
echo       "Next": "Success">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "No_Results_Found": {>> step-function-definition.json
echo       "Type": "Fail",>> step-function-definition.json
echo       "Error": "NoResultsFound",>> step-function-definition.json
echo       "Cause": "No winter sports areas found for the given parameters">> step-function-definition.json
echo     },>> step-function-definition.json
echo     "Success": {>> step-function-definition.json
echo       "Type": "Succeed">> step-function-definition.json
echo     }>> step-function-definition.json
echo   }>> step-function-definition.json
echo }>> step-function-definition.json

REM Update the Step Function with the new definition
aws stepfunctions update-state-machine ^
    --state-machine-arn %STEP_FUNCTION_ARN% ^
    --definition file://step-function-definition.json

REM Clean up
del step-function-definition.json

echo Done!
echo Step Function updated successfully with queue processing steps. 