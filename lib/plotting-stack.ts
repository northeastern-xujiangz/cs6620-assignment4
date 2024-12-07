import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export interface PlottingProps extends cdk.StackProps {
    bucketName: string;
    tableName: string;
}

export class PlottingStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: PlottingProps) {
    super(scope, id, props);

    // Import the existing S3 bucket using its name
    const bucket = s3.Bucket.fromBucketName(this, 'S3Bucket', props.bucketName);
    // Import the existing DynamoDB table using its name
    const table = dynamodb.Table.fromTableName(this, 'DynamodbTable', props.tableName);

    const matplotLayerArn = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-matplotlib:11';
    // Reference the layer by ARN
    const matplotLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'MatplotLayer', matplotLayerArn);

    const numpyLayerArn = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-numpy:10';
    // Reference the layer by ARN
    const numpyLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'NumpyLayer', numpyLayerArn);

    const plotting = new lambda.Function(this, 'Plotting', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'plotting_lambda.lambda_handler',
            code: lambda.Code.fromAsset('resources/lambda_code/plotting_lambda.zip'),
            timeout: cdk.Duration.minutes(1),
            functionName: 'plotting',
            layers: [matplotLayer, numpyLayer],
            environment: { 
                'BUCKET_NAME': props.bucketName,
                'TABLE_NAME': props.tableName,
            }
          });

    plotting.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:*'],
            effect: iam.Effect.ALLOW,
            resources: [ table.tableArn, table.tableArn+'/*' ],
    }))
    plotting.addToRolePolicy(new iam.PolicyStatement({
            actions: ['s3:*'],
            effect: iam.Effect.ALLOW,
            resources: [ bucket.bucketArn, bucket.bucketArn+'/*' ],
    }))
    table.grantFullAccess(plotting);
    bucket.grantRead(plotting);


    // Create a REST API that routes all requests to the Lambda function
    const plottingApi = new apigateway.LambdaRestApi(this, 'plottingApi', {
      restApiName: 'plottingAPI',
      handler: plotting,
      proxy: true, // Automatically map all resources and methods to the Lambda function
      description: 'API Gateway with Plotting Lambda backend',
    });
    /*
    const test = apigateway.root.addResource('plotting');
    test.addMethod('GET', new apigateway.LambdaIntegration(plotting));
    */
    this.apiUrl = plottingApi.url;
    
  }
}
