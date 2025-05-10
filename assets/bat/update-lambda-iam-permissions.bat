@echo off
echo Updating IAM permissions for Lambda functions...

set ROLE_NAME=WinterSportsOSMLambdaRole
set REGION=us-east-1
set ACCOUNT_ID=298043721974

REM Create SQS full access policy - properly escaped JSON
echo Creating SQS access policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "sqs:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > sqs-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name SQSFullAccess --policy-document file://sqs-policy.json

REM Create DynamoDB access policy
echo Creating DynamoDB access policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "dynamodb:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > dynamodb-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name DynamoDBFullAccess --policy-document file://dynamodb-policy.json

REM Create S3 access policy
echo Creating S3 access policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "s3:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > s3-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name S3FullAccess --policy-document file://s3-policy.json

REM Create Lambda invoke policy
echo Creating Lambda invoke policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "lambda:InvokeFunction",
echo       "Resource": "*"
echo     }
echo   ]
echo } > lambda-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name LambdaInvokeAccess --policy-document file://lambda-policy.json

REM Clean up policy files
del sqs-policy.json
del dynamodb-policy.json
del s3-policy.json
del lambda-policy.json

echo ===================================================
echo IAM permissions updated. Now updating regular Lambda role...
echo ===================================================

REM Update regular WinterSportsLambdaRole with the same permissions
set ROLE_NAME=WinterSportsLambdaRole

REM Create SQS full access policy
echo Creating SQS access policy for %ROLE_NAME%...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "sqs:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > sqs-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name SQSFullAccess --policy-document file://sqs-policy.json

REM Create DynamoDB access policy
echo Creating DynamoDB access policy for %ROLE_NAME%...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "dynamodb:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > dynamodb-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name DynamoDBFullAccess --policy-document file://dynamodb-policy.json

REM Create S3 access policy
echo Creating S3 access policy for %ROLE_NAME%...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "s3:*",
echo       "Resource": "*"
echo     }
echo   ]
echo } > s3-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name S3FullAccess --policy-document file://s3-policy.json

REM Create Lambda invoke policy
echo Creating Lambda invoke policy for %ROLE_NAME%...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": "lambda:InvokeFunction",
echo       "Resource": "*"
echo     }
echo   ]
echo } > lambda-policy.json

aws iam put-role-policy --role-name %ROLE_NAME% --policy-name LambdaInvokeAccess --policy-document file://lambda-policy.json

REM Clean up policy files
del sqs-policy.json
del dynamodb-policy.json
del s3-policy.json
del lambda-policy.json

echo Permissions updated for both Lambda roles. Wait a few minutes for permissions to propagate.
echo Then run the test-lambda-function.bat script again. 