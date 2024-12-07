import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface LambdaStackProps extends cdk.StackProps {
  queue: sqs.IQueue;
  bucketName: string;
  logGroupName: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly cleanerLambda: lambda.IFunction;
  public readonly logGroupName: string;

  constructor(scope: cdk.App, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { queue, bucketName, logGroupName } = props;
    const bucket = s3.Bucket.fromBucketName(this, 'S3Bucket', bucketName);

    this.logGroupName = logGroupName;

    // Logging Lambda
    const loggingLambda = new lambda.Function(this, 'LoggingLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'logging_lambda.handler',
      code: lambda.Code.fromAsset('resources/lambda_code/lambdas/logging_lambda.zip'),
      timeout: cdk.Duration.minutes(1),
      functionName: 'logging',
      environment: {
        SQS_QUEUE_URL: queue.queueUrl,
        LOG_GROUP_NAME: logGroupName,
      },
    });

    // Grant permissions for Logging Lambda to access SQS and CloudWatch Logs
    queue.grantConsumeMessages(loggingLambda);
    loggingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['logs:FilterLogEvents'],
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:${logGroupName}:*`],
      })
    );

    // Cleaner Lambda
    this.cleanerLambda = new lambda.Function(this, 'CleanerLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'cleaner_lambda.handler',
      code: lambda.Code.fromAsset('resources/lambda_code/lambdas/cleaner_lambda.zip'),
      timeout: cdk.Duration.minutes(1),
      functionName: 'cleaner',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Grant permissions for Cleaner Lambda to access S3
    bucket.grantReadWrite(this.cleanerLambda);
  }
}
