from opensearchpy import OpenSearch, helpers
import json
import os
from dotenv import load_dotenv

load_dotenv()

OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST", "localhost")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT", 9200))
INDEX_NAME = "personas"

KEYWORD_FIELDS = [
    "uuid", "sex", "marital_status", "military_status",
    "family_type", "housing_type", "education_level",
    "bachelors_field", "occupation", "district", "province"
]

TEXT_FIELDS = [
    "persona", "professional_persona", "sports_persona",
    "arts_persona", "travel_persona", "culinary_persona",
    "family_persona", "cultural_background",
    "skills_and_expertise", "hobbies_and_interests",
    "career_goals_and_ambitions"
]

INDEX_MAPPING = {
    "settings": {
        "index": {
            "knn": True,
            "knn.algo_param.ef_search": 100
        }
    },
    "mappings": {
        "properties": {
            "embedding": {
                "type": "knn_vector",
                "dimension": 768,
                "method": {
                    "name": "hnsw",
                    "space_type": "cosinesimil",
                    "engine": "nmslib"
                }
            },
            "age": {"type": "integer"},
            **{f: {"type": "keyword"} for f in KEYWORD_FIELDS},
            **{f: {"type": "text"} for f in TEXT_FIELDS}
        }
    }
}


def get_client():
    return OpenSearch(
        hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
        http_compress=True,
        use_ssl=False,
        verify_certs=False
    )


def create_index(client):
    if client.indices.exists(index=INDEX_NAME):
        answer = input(f"인덱스 '{INDEX_NAME}' 이미 존재합니다. 삭제하고 재생성할까요? (yes/no): ")
        if answer.strip().lower() != "yes":
            print("취소됨.")
            return False
        client.indices.delete(index=INDEX_NAME)

    client.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
    print(f"인덱스 '{INDEX_NAME}' 생성 완료")
    return True


def load_records(input_path="data/personas_embedded.jsonl"):
    records = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    return records


def bulk_index(client, records):
    actions = []
    for r in records:
        actions.append({
            "_index": INDEX_NAME,
            "_id": r["uuid"],
            "_source": r
        })

    success, failed = helpers.bulk(client, actions, stats_only=True)
    print(f"업로드 완료: {success}개 성공, {failed}개 실패")


def main():
    client = get_client()

    print("OpenSearch 연결 확인 중...")
    info = client.info()
    print(f"OpenSearch 버전: {info['version']['number']}")

    if not create_index(client):
        return

    print("데이터 로딩 중...")
    records = load_records()
    print(f"{len(records)}개 레코드 로드 완료")

    print("인덱싱 시작...")
    bulk_index(client, records)

    client.indices.refresh(index=INDEX_NAME)
    count = client.count(index=INDEX_NAME)["count"]
    print(f"인덱스 내 총 문서 수: {count}")


if __name__ == "__main__":
    main()
