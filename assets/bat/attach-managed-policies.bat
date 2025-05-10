@echo off
echo Attaching AWS managed policies to Lambda roles...

set OSM_ROLE_NAME=WinterSportsOSMLambdaRole
set REGULAR_ROLE_NAME=WinterSportsLambdaRole
set REGION=us-east-1

REM Attach managed policies to OSM role
echo Attaching policies to %OSM_ROLE_NAME%...
aws iam attach-role-policy --role-name %OSM_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name %OSM_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name %OSM_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name %OSM_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AWSLambdaRole

REM Attach managed policies to regular role
echo Attaching policies to %REGULAR_ROLE_NAME%...
aws iam attach-role-policy --role-name %REGULAR_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name %REGULAR_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name %REGULAR_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name %REGULAR_ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/AWSLambdaRole

echo Permissions updated for both Lambda roles. Wait a few minutes for permissions to propagate.

REM Create SQS queue for processing
echo Creating SQS queue for processing...
aws sqs create-queue --queue-name winter-sports-processing-queue --region %REGION%

REM Create DynamoDB table for resorts
echo Creating DynamoDB table for resorts...
aws dynamodb create-table --table-name WinterSportsResorts --attribute-definitions AttributeName=ResortId,AttributeType=S --key-schema AttributeName=ResortId,KeyType=HASH --billing-mode PAY_PER_REQUEST --region %REGION%

echo Setup complete. Now wait a few minutes for permissions to propagate.
echo Then run the test-lambda-function.bat script again to test the Lambda function. 