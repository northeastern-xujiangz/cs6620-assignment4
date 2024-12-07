import json
import boto3
import time
import matplotlib.pyplot as plt
import numpy as np
import io
import os
from datetime import datetime, timedelta


def lambda_handler(event, context):
    print(event)

    db = boto3.client("dynamodb")
    #bucket_name = 'testbucketa2'
    #table_name = 'S3-object-size-history'
    bucket_name = os.environ.get('BUCKET_NAME')
    table_name = os.environ.get('TABLE_NAME')

    # Get the change of bucket size of TestBucket in the last 10 seconds
    time_interval = 10
    ts_start = time.time() - time_interval
    response = db.query(
        TableName = table_name,
        KeyConditionExpression = '#bn = :bucketname AND #tsp >= :ts',
        ExpressionAttributeNames={
            '#bn': 'BucketName',
            '#tsp': 'TimeStamp'
        },
        ExpressionAttributeValues={
            ':bucketname': {'S': bucket_name},
            ':ts': {'S': str(ts_start)}
        },
        ScanIndexForward=True,  # order from min to max
        ProjectionExpression='#tsp, TotalSize'
    )
    items = response.get('Items', [])
    size_history = ''
    timestamp_list = []
    totalsize_list = []
    for item in items:
        timestamp = datetime.fromtimestamp(float(item['TimeStamp']['S'])).strftime('%H:%M:%S')
        totalsize = int(item['TotalSize']['N'])
        size_history += f'{timestamp}: {totalsize}, '
        timestamp_list.append(timestamp)
        totalsize_list.append(totalsize)

    # Get the historical maximum size of bucket
    max_size = 0
    response = db.query(
        TableName = table_name,
        IndexName = 'size-index',
        # KeyConditionExpression=boto3.dynamodb.conditions.Key('BucketName').eq('testbucketa2'),
        KeyConditionExpression='BucketName = :bucketname',
        ExpressionAttributeValues={
            ':bucketname': {'S': bucket_name}
        },
        ScanIndexForward=False,  # order from max to min
        Limit=1,  # only return one item
        ProjectionExpression='TotalSize'
    )
    if 'Items' in response:
        max_size = int(response['Items'][0]['TotalSize']['N'])

    # Plots the change of bucket size of TestBucket in the last 10 seconds
    plt.figure(figsize=(10, 6))
    xpoints = np.array(timestamp_list)
    ypoints = np.array(totalsize_list)
    # Plot bucket sizes over time
    plt.plot(xpoints, ypoints, label='Bucket Size Over Time', marker='o')
    # Plot the max size line
    plt.axhline(y=max_size, color='r', linestyle='--', label=f'Max Size: {max_size} bytes')
    # Set y axis to log value
    # plt.yscale('log')
    # plt.yscale('symlog')
    # Add text for every point
    for i, (x_val, y_val) in enumerate(zip(xpoints, ypoints)):
        plt.text(x_val, y_val, f'({x_val}, {y_val})', fontsize=10, ha='right', va='bottom')
    # Labeling the axes
    plt.xlabel('Timestamp')
    plt.ylabel('Bucket Size (bytes)')
    # Adding title and legend
    plt.title(f'Change in Bucket Size for {bucket_name} Over the Last 10 Seconds')
    plt.legend()

    # Rotate timestamps on the x-axis for better readability
    plt.xticks(rotation=45)

    # Show the plot
    plt.tight_layout()
    # plt.show()

    img_data = io.BytesIO()
    plt.savefig(img_data, format='png')
    img_data.seek(0)

    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)
    bucket.put_object(Body=img_data, ContentType='image/png', Key='plot.png')

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps(
            f'Current time is: {time.time()}, The max size is :{max_size}, size history is: {size_history}')
    }
