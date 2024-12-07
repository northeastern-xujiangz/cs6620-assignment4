import json
import boto3
import time
import os

# Initialize clients
sqs_client = boto3.client('sqs')
logs_client = boto3.client('logs')
s3 = boto3.client("s3")
db = boto3.client("dynamodb")

# Environment variables
bucket_name = os.environ.get('BUCKET_NAME')
table_name = os.environ.get('TABLE_NAME')
queue_url = os.environ.get('SQS_QUEUE_URL')

# Initialize statistics metric
total_size = 0
object_number = 0

def get_object_size_from_logs(object_name):

    # Query CloudWatch Logs to retrieve the size of an object from its creation event.

    try:
        response = logs_client.filter_log_events(
            logGroupName='sizetracking-lambda-log-group',
            filterPattern=f'{{ $.object_name = "{object_name}" }}'
        )
        for event in response.get('events', []):
            log_message = json.loads(event['message'])
            if log_message.get('object_name') == object_name and 'size_delta' in log_message:
                return log_message['size_delta']
    except Exception as e:
        print(f"Error querying logs for object size: {str(e)}")
    return None

def process_sqs_message(message_body):

    # Process a single SQS message containing S3 event data.

    s3_event = json.loads(message_body)['Records'][0]
    event_name = s3_event['eventName']
    bucket_name = s3_event['s3']['bucket']['name']
    object_key = s3_event['s3']['object']['key']

    ts = time.time()

    if event_name.startswith("ObjectCreated"):
        # For object creation, log the size directly from the event
        size = s3_event['s3']['object'].get('size', 0)
        total_size += size
        object_number += 1
    elif event_name.startswith("ObjectRemoved"):
        # For object deletion, query logs to find the size
        size = get_object_size_from_logs(object_key)
        if size is not None:
            total_size -= size
            object_number -= 1
        else:
            print(f"Size of deleted object {object_key} could not be determined.")
    else:
        print(f"Unhandled S3 event type: {event_name}")

    response = db.put_item(
        TableName = table_name,
        Item={
            "BucketName": {"S": bucket_name},
            "TimeStamp": {"S": str(ts)},
            "ObjectNumber": {"N": str(object_number)},
            "TotalSize": {"N": str(total_size)},
        },
        ReturnConsumedCapacity='TOTAL',
    )
    print(response)

def lambda_handler(event, context):
    print(event)

    try:
        while True:
            # Receive messages from SQS
            response = sqs_client.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=10
            )
            messages = response.get('Messages', [])
            
            if not messages:
                break  # Exit loop if no messages

            for message in messages:
                message_body = message['Body']
                
                # Parse the message body as JSON
                message_data = json.loads(message_body)
                # Check if the message contains the "Records" key
                if "Records" in message_data:
                    for record in message_data["Records"]:
                        # Check if the event source is "aws:s3"
                        if record.get("eventSource") == "aws:s3":
                            process_sqs_message(message_body)

                # Delete message from the queue after processing
                sqs_client.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
    except Exception as e:
        print(f"Error processing messages: {str(e)}")

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
