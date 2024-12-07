import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';

interface CloudWatchStackProps extends cdk.StackProps {
  logGroupName: string; // Log group name for the Logging Lambda
  cleanerLambda: lambda.IFunction; // Cleaner Lambda function
}

export class CloudWatchStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CloudWatchStackProps) {
    super(scope, id, props);

    const { logGroupName, cleanerLambda } = props;

    // Create a metric filter for extracting size_delta from Logging Lambda logs
    const loggingLambdaLogGroup = logs.LogGroup.fromLogGroupName(this, 'LogGroup', logGroupName);
    new logs.MetricFilter(this, 'SizeDeltaMetricFilter', {
      logGroup: loggingLambdaLogGroup,
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      filterPattern: logs.FilterPattern.exists('$.size_delta'), // Check existence of size_delta field
      metricValue: '$.size_delta', // Extract the size_delta field
    });

    // Define the CloudWatch metric
    const totalObjectSizeMetric = new cloudwatch.Metric({
      namespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      statistic: 'Sum', // Use the sum of all size_delta values
      period: cdk.Duration.minutes(30), // Adjust the evaluation period as required
    });

    // Create a CloudWatch alarm based on the TotalObjectSize metric
    const alarm = new cloudwatch.Alarm(this, 'TotalObjectSizeAlarm', {
      metric: totalObjectSizeMetric,
      threshold: 20, // Set the alarm threshold to 20 bytes
      evaluationPeriods: 1, // Alarm fires after one evaluation period
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmName: 'TotalObjectSizeAlarm',
    });

    // Set up the alarm action to trigger the Cleaner Lambda
    alarm.addAlarmAction(new cloudwatchActions.LambdaAction(cleanerLambda));
  }
}
