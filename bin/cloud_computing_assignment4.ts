#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { SizeTrackingStack } from '../lib/sizetracking-stack';
import { PlottingStack } from '../lib/plotting-stack';
import { DriverStack } from '../lib/driver-stack';
import { SNSStack } from '../lib/sns-stack';
import { SQSStack } from '../lib/sqs-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { CloudWatchStack } from '../lib/cloudwatch-stack';

const app = new cdk.App();

const storageStack = new StorageStack(app, 'StorageStack', {});

const plottingStack = new PlottingStack(app, 'PlottingStack', {
    bucketName: storageStack.bucketName,
    tableName: storageStack.tableName
});

new DriverStack(app, 'DriverStack', {
    bucketName: storageStack.bucketName,
    apiUrl: plottingStack.apiUrl
});

// Create the SNS stack, passing the bucket from the S3 stack
const snsStack = new SNSStack(app, 'SNSStack', {
  bucketName: storageStack.bucketName,
});

// Create the SQS stack, passing the topic from the SNS stack
const sqsStack = new SQSStack(app, 'SQSStack', {
  snsTopic: snsStack.topic,
});

new SizeTrackingStack(app, 'SizeTrackingStack', {
  queue: sqsStack.queueTracking,
  bucketName: storageStack.bucketName,
  tableName: storageStack.tableName
});

// Create the Lambda stack, passing the queue from the SQS stack and the bucket
const lambdaStack = new LambdaStack(app, 'LambdaStack', {
  queue: sqsStack.queueLogging,
  bucketName: storageStack.bucketName,
  logGroupName: 'logging-lambda-log-group',
});

// Create the CloudWatch stack, passing necessary references from previous stacks
const cloudWatchStack = new CloudWatchStack(app, 'CloudWatchStack', {
  logGroupName: lambdaStack.logGroupName,
  cleanerLambda: lambdaStack.cleanerLambda, // Pass the Cleaner Lambda function
});