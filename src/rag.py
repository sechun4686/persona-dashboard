from opensearchpy import OpenSearch
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv

load_dotenv()

OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST", "localhost")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT", 9200))
INDEX_NAME = "personas"
MODEL_NAME = "jhgan/ko-sroberta-multitask"

_model = None
_client = None

def get_model():
    global _model
    if _model is None:
        print("모델 로딩 중...")
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def get_client():
    global _client
    if _client is None:
        _client = OpenSearch(
            hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
            http_compress=True,
            use_ssl=False,
            verify_certs=False
        )
    return _client


def build_query_text(persona: dict, question: dict) -> str:
    """페르소나 요약 + 질문 텍스트를 합쳐서 쿼리 문자열 생성"""
    age = persona.get('age') or ''
    sex = persona.get('sex') or ''
    persona_summary = " ".join(filter(None, [
        f"{age}세 {sex}",
        persona.get('occupation') or '',
        persona.get('province') or '',
        persona.get('education_level') or '',
        persona.get('persona') or '',
        persona.get('hobbies_and_interests') or '',
    ]))
    question_text = question.get("content") or question.get("question_content", "")
    return f"{persona_summary} {question_text}"


def fetch_rag_context(persona: dict, question: dict, k: int = 3) -> list:
    """
    현재 페르소나 + 질문을 기반으로 유사한 페르소나 k개를 검색해서 반환.
    오케스트레이터에서 build_prompts 전에 호출됨.

    Args:
        persona: 현재 페르소나 dict (uuid 포함)
        question: {"type"/"question_type": "주관식"/"객관식", "content"/"question_content": "...", "options": [...]}
        k: 검색할 유사 페르소나 수

    Returns:
        유사 페르소나 list (각 항목은 persona dict, embedding 필드 제외됨)
    """
    model = get_model()
    client = get_client()

    query_text = build_query_text(persona, question)
    query_vector = model.encode(query_text).tolist()

    # kNN 검색 + 자기 자신 제외
    query_body = {
        "size": k + 1,  # 자기 자신이 나올 수 있으니 1개 여유
        "query": {
            "knn": {
                "embedding": {
                    "vector": query_vector,
                    "k": k + 1
                }
            }
        },
        "_source": {"excludes": ["embedding"]}  # 임베딩 벡터는 응답에서 제외
    }

    response = client.search(index=INDEX_NAME, body=query_body)
    hits = response["hits"]["hits"]

    current_uuid = persona.get("uuid")
    results = []
    for hit in hits:
        if hit["_source"].get("uuid") == current_uuid:
            continue
        results.append(hit["_source"])
        if len(results) >= k:
            break

    return results


def fetch_rag_context_with_filter(persona: dict, question: dict, k: int = 3) -> list:
    """
    유사 페르소나 검색 시 인구통계 필터 추가 버전.
    같은 성별 + 비슷한 연령대(±10세) 내에서 검색.
    더 타겟팅된 컨텍스트가 필요할 때 사용.
    """
    model = get_model()
    client = get_client()

    query_text = build_query_text(persona, question)
    query_vector = model.encode(query_text).tolist()

    age = persona.get("age")
    sex = persona.get("sex")

    filters = []
    if sex:
        filters.append({"term": {"sex": sex}})
    if age:
        filters.append({"range": {"age": {"gte": age - 10, "lte": age + 10}}})

    query_body = {
        "size": k + 5,
        "query": {
            "bool": {
                "must": [
                    {
                        "knn": {
                            "embedding": {
                                "vector": query_vector,
                                "k": k + 5
                            }
                        }
                    }
                ],
                "filter": filters
            }
        },
        "_source": {"excludes": ["embedding"]}
    }

    response = client.search(index=INDEX_NAME, body=query_body)
    hits = response["hits"]["hits"]

    current_uuid = persona.get("uuid")
    results = []
    for hit in hits:
        if hit["_source"].get("uuid") == current_uuid:
            continue
        results.append(hit["_source"])
        if len(results) >= k:
            break

    return results
