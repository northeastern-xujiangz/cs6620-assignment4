import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class StorageStack extends cdk.Stack {
  public readonly bucketName: string;
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CloudComputingAssignment3Queue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const bucket = new s3.Bucket(this, 'testbucketa2', {
      bucketName: 'testbucketa2',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.bucketName = bucket.bucketName;

    const table = new dynamodb.TableV2(this, 'S3ObjectSizeHistoryTable', {
      tableName: 'S3-object-size-history',
      partitionKey: {
        name: 'BucketName',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'TimeStamp',
        type: dynamodb.AttributeType.STRING,
      },
      localSecondaryIndexes: [
        {
          indexName: 'size-index',
          sortKey: {
            name: 'TotalSize',
            type: dynamodb.AttributeType.NUMBER,
          },
        },
      ],
    });
    this.tableName = table.tableName;
    
  }
}
