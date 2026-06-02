"""
orchestrator.py + persona_sampler.py 통합 테스트.

실행:
    pytest test_orchestrator.py -v

의존 패키지:
    pip install pytest pytest-asyncio
"""

import pytest
from unittest.mock import patch

from orchestrator import async_run


# ---------------------------------------------------------------------------
# 공통 픽스처 / 상수
# ---------------------------------------------------------------------------

FAKE_PERSONAS = [
    {
        "uuid": f"uuid-{i:04d}",
        "sex": "여자",
        "age": 20 + i,
        "province": "서울",
        "district": f"서울-강남구",
        "occupation": "사무원",
        "education_level": "4년제 대학교",
        "marital_status": "미혼",
        "persona": f"서울에 사는 {20 + i}세 여성 직장인입니다.",
        "professional_persona": "사무직 종사자입니다.",
        "cultural_background": "서울 출신입니다.",
        "hobbies_and_interests": "독서와 운동을 즐깁니다.",
        "career_goals_and_ambitions": "커리어 발전을 목표로 합니다.",
    }
    for i in range(10)
]

BASE_INPUT = {
    "experiment_title": "가계부 앱 사전조사",
    "experiment_type": "사전조사",
    "service_description": "20-30대 타겟 가계부 앱",
    "questions": [
        {
            "question_id": 0,
            "question_type": "주관식",
            "question_content": "가계부 앱 써본 적 있나요?",
            "options": [],
        },
        {
            "question_id": 1,
            "question_type": "객관식",
            "question_content": "월 얼마까지 낼 의향이 있나요?",
            "options": ["무료만", "5000원", "10000원", "그 이상"],
        },
    ],
    "filters": {
        "sex": "여자",
        "age_min": 20,
        "age_max": 35,
        "province": "서울",
    },
    "n": 10,
}


@pytest.fixture
def mock_sampler():
    """sample_personas를 가짜 데이터로 교체하는 픽스처."""
    with patch("orchestrator.sample_personas", return_value=FAKE_PERSONAS) as mock:
        yield mock


# ---------------------------------------------------------------------------
# 1. test_valid_input
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_valid_input(mock_sampler):
    """정상 입력으로 파이프라인 전체가 끝까지 실행되는지 확인한다."""
    result = await async_run(BASE_INPUT)

    assert "error" not in result, f"예상치 못한 에러: {result.get('error')}"

    assert "experiment_title" in result
    assert "n_collected" in result
    assert "personas" in result
    assert "responses" in result

    assert result["experiment_title"] == BASE_INPUT["experiment_title"]
    assert result["n_collected"] == len(FAKE_PERSONAS)

    # responses = personas × questions 수
    n_questions = len(BASE_INPUT["questions"])
    assert len(result["responses"]) == len(FAKE_PERSONAS) * n_questions


# ---------------------------------------------------------------------------
# 2. test_invalid_input
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_input():
    """잘못된 입력에 대해 error가 반환되는지 확인한다."""
    no_questions_input = {**BASE_INPUT, "questions": []}
    result = await async_run(no_questions_input)
    assert "error" in result, "questions가 비었을 때 error가 반환돼야 합니다."

    bad_sex_input = {**BASE_INPUT, "filters": {"sex": "외계인"}}
    with patch(
        "orchestrator.sample_personas",
        side_effect=ValueError("sex는 {'남자', '여자'} 중 하나여야 합니다."),
    ):
        result = await async_run(bad_sex_input)
    assert "error" in result, "잘못된 sex 값일 때 error가 반환돼야 합니다."


# ---------------------------------------------------------------------------
# 3. test_filter_personas
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_personas(mock_sampler):
    """필터 조건이 sample_personas에 올바르게 전달되는지 확인한다."""
    filters = {"sex": "여자", "age_min": 20, "age_max": 35, "province": "서울"}
    result = await async_run({**BASE_INPUT, "filters": filters})

    mock_sampler.assert_called_once_with(
        sex="여자",
        age_min=20,
        age_max=35,
        province="서울",
        occupation=None,
        education_level=None,
        marital_status=None,
        n=BASE_INPUT["n"],
        as_records=True,
    )

    # 반환된 personas가 필터 조건을 만족하는지 확인
    for persona in result["personas"]:
        assert persona["sex"] == "여자", f"sex 불일치: {persona['sex']}"
        assert persona["province"] == "서울", f"province 불일치: {persona['province']}"
        assert 20 <= persona["age"] <= 35, f"age 범위 초과: {persona['age']}"


# ---------------------------------------------------------------------------
# 4. test_persona_not_enough
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_persona_not_enough():
    """조건을 만족하는 페르소나가 부족할 때 error가 반환되는지 확인한다."""
    impossible_input = {
        **BASE_INPUT,
        "filters": {"sex": "여자", "age_min": 95, "province": "세종"},
        "n": 1000,
    }

    with patch(
        "orchestrator.sample_personas",
        side_effect=RuntimeError(
            "조건을 만족하는 페르소나가 3개뿐입니다 (요청: 1000개)."
        ),
    ):
        result = await async_run(impossible_input)

    assert "error" in result, "페르소나 부족 시 error가 반환돼야 합니다."
    assert "1000" in result["error"] or "부족" in result["error"] or "3" in result["error"]


# ---------------------------------------------------------------------------
# 5. test_collect_results
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_collect_results(mock_sampler):
    """personas/responses 각 항목에 필수 필드가 모두 포함됐는지 확인한다."""
    result = await async_run(BASE_INPUT)

    assert "personas" in result and len(result["personas"]) > 0
    assert "responses" in result and len(result["responses"]) > 0

    persona_keys = {"persona_uuid", "sex", "age", "province", "occupation"}
    for p in result["personas"]:
        missing = persona_keys - p.keys()
        assert not missing, f"personas 필수 필드 누락: {missing}"

    response_keys = {"persona_uuid", "question_id", "image_ids", "response", "selected_option", "rag_context_used"}
    for r in result["responses"]:
        missing = response_keys - r.keys()
        assert not missing, f"responses 필수 필드 누락: {missing}"
