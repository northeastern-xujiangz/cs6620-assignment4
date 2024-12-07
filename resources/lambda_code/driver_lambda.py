import json
import boto3
import time
import requests
import os


def lambda_handler(event, context):
    # Initialize the S3 client
    s3 = boto3.client('s3')

    # Specify the bucket name
    #bucket_name = 'testbucketa2'
    bucket_name = os.environ.get('BUCKET_NAME')

    # 1. Create object `assignment1.txt` with content "Empty Assignment 1"
    s3.put_object(Bucket=bucket_name, Key='assignment1.txt', Body='Empty Assignment 1')
    print("Created object 'assignment1.txt' with content 'Empty Assignment 1'")

    # Sleep for 2 seconds
    time.sleep(2)

    # 2. Update object `assignment2.txt` by updating its content to "Empty Assignment 2222222222"
    s3.put_object(Bucket=bucket_name, Key='assignment2.txt', Body='Empty Assignment 2222222222')
    print("Updated object 'assignment2.txt' with content 'Empty Assignment 2222222222'")

    # Sleep for 2 seconds
    time.sleep(2)

    # 3. Create object `assignment3.txt` with content "33"
    s3.put_object(Bucket=bucket_name, Key='assignment3.txt', Body='33')
    print("Created object 'assignment3.txt' with content '33'")

    # Sleep for a final 2 seconds
    time.sleep(2)

    # Call REST API of plotting lambda
    #api_url = "https://ayx2ckyd05.execute-api.us-east-1.amazonaws.com/Test"
    api_url = os.environ.get('API_URL')
    response = requests.get(api_url)
    response.json()
    print(response)

    print("All operations completed.")

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
