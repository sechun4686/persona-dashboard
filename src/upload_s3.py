import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN")

BUCKET_NAME = "project-deeplearning-2026"
REGION = "us-east-1"
S3_PREFIX = "nemotron-personas/"

def upload_personas_to_s3(input_path="data/personas.jsonl"):
    s3 = boto3.client(
        "s3",
        region_name=REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        aws_session_token=AWS_SESSION_TOKEN
    )

    records = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))

    print(f"{len(records)}개 S3 업로드 시작...")

    for i, record in enumerate(records):
        key = f"{S3_PREFIX}{record['uuid']}.json"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=json.dumps(record, ensure_ascii=False),
            ContentType="application/json"
        )

        if i % 100 == 0:
            print(f"{i}개 업로드 중...")

    print(f"완료: {len(records)}개 → s3://{BUCKET_NAME}/{S3_PREFIX}")

if __name__ == "__main__":
    upload_personas_to_s3()