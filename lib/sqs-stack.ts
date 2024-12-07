import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

interface SQSStackProps extends cdk.StackProps {
  snsTopic: sns.ITopic;
}

export class SQSStack extends cdk.Stack {
  public readonly queueLogging: sqs.IQueue;
  public readonly queueTracking: sqs.IQueue;

  constructor(scope: cdk.App, id: string, props: SQSStackProps) {
    super(scope, id, props);

    const { snsTopic } = props;

    // Create an SQS queue
    this.queueLogging = new sqs.Queue(this, 'S3EventQueue', {
      queueName: 'S3EventQueue',
    });
    this.queueTracking = new sqs.Queue(this, 'S3EventQueue', {
      queueName: 'S3EventQueue',
    });

    // Subscribe the SQS queue to the SNS topic
    snsTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.queueLogging, {
        rawMessageDelivery: true, // Ensures raw S3 event payload is sent to SQS
      })
    );
    snsTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.queueTracking, {
        rawMessageDelivery: true, // Ensures raw S3 event payload is sent to SQS
      })
    );
  }
}
