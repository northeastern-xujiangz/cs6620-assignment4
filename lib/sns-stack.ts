import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

interface SNSStackProps extends cdk.StackProps {
  bucketName: string;
}

export class SNSStack extends cdk.Stack {
  public readonly topic: sns.ITopic;

  constructor(scope: cdk.App, id: string, props: SNSStackProps) {
    super(scope, id, props);

    const { bucketName } = props;
    const bucket = s3.Bucket.fromBucketName(this, 'S3Bucket', bucketName);

    // Create an SNS topic
    this.topic = new sns.Topic(this, 'S3EventTopic', {
      topicName: 'S3EventTopic',
    });

    // Add bucket notification to send events to the SNS topic
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(this.topic)
    );

    bucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.SnsDestination(this.topic)
    );
  }
}
