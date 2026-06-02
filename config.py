from dotenv import load_dotenv
import os

load_dotenv()

# S3 설정
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "project-deeplearning-2026")
S3_RESULTS_PREFIX = os.getenv("S3_RESULTS_PREFIX", "results/")

# 서버 설정
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "10"))
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# LLM 설정
LUXIA_API_KEY = os.getenv("LUXIA_API_KEY", "")
LUXIA_API_URL = os.getenv("LUXIA_API_URL", "")

OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST", "http://localhost:9200")
