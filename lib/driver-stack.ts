import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface DriverProps extends cdk.StackProps {
    bucketName: string;
    apiUrl: string;
}

export class DriverStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DriverProps) {
    super(scope, id, props);

    // Import the existing S3 bucket using its name
    const bucket = s3.Bucket.fromBucketName(this, 'S3Bucket', props.bucketName);

    const requestsLayerArn = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p312-requests:9';
    // Reference the layer by ARN
    const requestsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'RequestsLayer', requestsLayerArn);

    const driver = new lambda.Function(this, 'Driver', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'driver_lambda.lambda_handler',
            code: lambda.Code.fromAsset('resources/lambda_code/driver_lambda.zip'),
            timeout: cdk.Duration.minutes(1),
            functionName: 'driver',
            layers: [requestsLayer],
            environment: {
                'API_URL': props.apiUrl,
                'BUCKET_NAME': props.bucketName,
            }
          });

    driver.addToRolePolicy(new iam.PolicyStatement({
            actions: ['s3:*'],
            effect: iam.Effect.ALLOW,
            resources: [ bucket.bucketArn, bucket.bucketArn+'/*' ],
    }))
    bucket.grantRead(driver);

  }
}
