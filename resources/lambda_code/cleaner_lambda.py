import boto3
import os

# Initialize S3 client
s3 = boto3.client('s3')

# Get the bucket name from environment variables
bucket_name = os.environ['BUCKET_NAME']

def handler(event, context):
    try:
        # List objects in the S3 bucket
        response = s3.list_objects_v2(Bucket=bucket_name)
        if 'Contents' not in response or not response['Contents']:
            print(f"No objects in the bucket {bucket_name} to delete.")
            return
        
        # Find the largest object
        largest_object = max(response['Contents'], key=lambda obj: obj['Size'])
        largest_object_key = largest_object['Key']
        largest_object_size = largest_object['Size']
        
        print(f"Largest object found: {largest_object_key}, size: {largest_object_size} bytes.")
        
        # Delete the largest object
        s3.delete_object(Bucket=bucket_name, Key=largest_object_key)
        print(f"Deleted object {largest_object_key} from bucket {bucket_name}.")
    
    except Exception as e:
        print(f"Error in Cleaner Lambda: {str(e)}")
