import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface SizeTrackingProps extends cdk.StackProps {
  queue: sqs.IQueue;
  bucketName: string;
  tableName: string;
}

export class SizeTrackingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SizeTrackingProps) {
    super(scope, id, props);

    const { queue } = props;
    // Import the existing S3 bucket using its name
    const bucket = s3.Bucket.fromBucketName(this, 'S3Bucket', props.bucketName);
    // Import the existing DynamoDB table using its name
    const table = dynamodb.Table.fromTableName(this, 'DynamodbTable', props.tableName);

    const sizetracking = new lambda.Function(this, 'SizeTracking', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'size-tracking_lambda.lambda_handler',
            code: lambda.Code.fromAsset('resources/lambda_code/size-tracking_lambda.zip'),
            timeout: cdk.Duration.minutes(1),
            functionName: 'sizetracking',
            environment: { 
                'BUCKET_NAME': props.bucketName,
                'TABLE_NAME': props.tableName,
                'SQS_QUEUE_URL': queue.queueUrl,
            }
          });

    sizetracking.addToRolePolicy(new iam.PolicyStatement({
            actions: ['s3:*'],
            effect: iam.Effect.ALLOW,
            resources: [ bucket.bucketArn, bucket.bucketArn+'/*' ],
    }))
    sizetracking.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:*'],
            effect: iam.Effect.ALLOW,
            resources: [ table.tableArn ],
    }))

    bucket.grantRead(sizetracking);
    table.grantFullAccess(sizetracking);
    // Add S3 bucket event notifications to trigger the Lambda function
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED, // Trigger on object creation
      new s3n.LambdaDestination(sizetracking)
    );

    bucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED, // Trigger on object deletion
      new s3n.LambdaDestination(sizetracking)
    );

    // Grant permissions for SizeTracking Lambda to access SQS
    queue.grantConsumeMessages(sizetracking);
  }
}
