import boto3
import json
from datetime import datetime
from config import S3_BUCKET_NAME, S3_RESULTS_PREFIX

s3 = boto3.client('s3')

def save_results(experiment_id: str, results: list[dict]) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    key = f"{S3_RESULTS_PREFIX}{experiment_id}_{timestamp}.json"

    data = {
        "experiment_id": experiment_id,
        "timestamp": timestamp,
        "total": len(results),
        "success_count": sum(1 for r in results if r["status"] == "success"),
        "error_count": sum(1 for r in results if r["status"] == "error"),
        "results": results
    }

    s3.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=key,
        Body=json.dumps(data, ensure_ascii=False, indent=2),
        ContentType="application/json"
    )

    print(f"S3 저장 완료: s3://{S3_BUCKET_NAME}/{key}")
    return key

def load_results(s3_key: str) -> dict:
    response = s3.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
    data = json.loads(response['Body'].read().decode('utf-8'))
    return data

def list_results(experiment_id: str = None) -> list[str]:
    prefix = S3_RESULTS_PREFIX
    if experiment_id:
        prefix = f"{S3_RESULTS_PREFIX}{experiment_id}"

    response = s3.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=prefix)

    if 'Contents' not in response:
        return []

    return [obj['Key'] for obj in response['Contents']]
