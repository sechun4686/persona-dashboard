"""
LangGraph 기반 실험 오케스트레이터.

파이프라인:
  validate_input → filter_personas → fetch_rag_context
               → build_prompts → run_llm_parallel → collect_results

진입점:
  results = run(raw_input)          # 동기
  results = await async_run(raw_input)  # 비동기 (권장)
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Optional, TypedDict

from pydantic import BaseModel, Field, ValidationError

from persona_sampler import sample_personas

# LangGraph
from langgraph.graph import END, StateGraph


# ---------------------------------------------------------------------------
# 입력 스키마 (Pydantic)
# ---------------------------------------------------------------------------

class Question(BaseModel):
    type: str                                   # "주관식" | "객관식"
    content: str
    options: list[str] = Field(default_factory=list)


class PersonaFilters(BaseModel):
    sex: Optional[str] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    province: Optional[str] = None
    occupation: Optional[str] = None
    education_level: Optional[str] = None
    marital_status: Optional[str] = None


class ExperimentInput(BaseModel):
    experiment_title: str
    experiment_type: str
    service_description: str
    image_urls: list[str] = Field(default_factory=list)  # 서비스 소개 이미지
    questions: list[Question] = Field(min_length=1)
    filters: PersonaFilters = Field(default_factory=PersonaFilters)
    n: int = Field(default=100, ge=1)


# ---------------------------------------------------------------------------
# 그래프 상태
# ---------------------------------------------------------------------------

class OrchestratorState(TypedDict, total=False):
    # 원본 입력
    raw_input: dict[str, Any]

    # validate_input 이후 파싱된 필드
    experiment_title: str
    experiment_type: str
    service_description: str
    image_urls: list[str]
    questions: list[dict]
    filters: dict[str, Any]
    n: int

    # filter_personas 결과
    personas: list[dict]

    # fetch_rag_context 결과 (TODO: 팀원 3이 채울 예정)
    rag_context: dict[str, Any]

    # build_prompts 결과 (TODO: 팀원 2가 채울 예정)
    prompts: list[dict]

    # run_llm_parallel 결과 (TODO: LUXIA API 연결)
    llm_responses: list[dict]

    # collect_results 최종 출력
    results: dict[str, Any]

    # 에러 메시지 (None이면 정상)
    error: Optional[str]


# ---------------------------------------------------------------------------
# 노드 1: validate_input
# ---------------------------------------------------------------------------

def validate_input(state: OrchestratorState) -> OrchestratorState:
    """입력 유효성 검증. 실패 시 error를 세팅하고 파이프라인을 조기 종료한다."""
    raw = state.get("raw_input", {})
    try:
        parsed = ExperimentInput.model_validate(raw)
    except ValidationError as exc:
        return {"error": f"[validate_input] 입력 오류:\n{exc}"}

    return {
        "experiment_title": parsed.experiment_title,
        "experiment_type": parsed.experiment_type,
        "service_description": parsed.service_description,
        "image_urls": parsed.image_urls,
        "questions": [q.model_dump() for q in parsed.questions],
        "filters": parsed.filters.model_dump(exclude_none=True),
        "n": parsed.n,
        "error": None,
    }


def _should_continue(state: OrchestratorState) -> str:
    """validate_input 후 에러 유무로 다음 노드를 결정한다."""
    return "error" if state.get("error") else "ok"


# ---------------------------------------------------------------------------
# 노드 2: filter_personas
# ---------------------------------------------------------------------------

def filter_personas(state: OrchestratorState) -> OrchestratorState:
    """persona_sampler.sample_personas를 호출해 조건에 맞는 페르소나를 샘플링한다."""
    filters: dict[str, Any] = state.get("filters", {})
    n: int = state.get("n", 100)

    try:
        personas: list[dict] = sample_personas(
            sex=filters.get("sex"),
            age_min=filters.get("age_min"),
            age_max=filters.get("age_max"),
            province=filters.get("province"),
            occupation=filters.get("occupation"),
            education_level=filters.get("education_level"),
            marital_status=filters.get("marital_status"),
            n=n,
            as_records=True,
        )
    except (ValueError, RuntimeError) as exc:
        return {"error": f"[filter_personas] {exc}"}

    print(f"[filter_personas] {len(personas)}명 페르소나 확보.")
    return {"personas": personas}


# ---------------------------------------------------------------------------
# 노드 3: fetch_rag_context
# TODO: 팀원 3이 채울 예정 (12주차)
# ---------------------------------------------------------------------------

def fetch_rag_context(state: OrchestratorState) -> OrchestratorState:
    """
    실험 주제와 서비스 설명을 바탕으로 RAG 컨텍스트를 조회한다.

    TODO: 팀원 3이 채울 예정
      - 벡터 DB 또는 문서 검색 연동
      - state["service_description"], state["questions"]를 쿼리로 활용
      - 반환: {"rag_context": {"documents": [...], "summary": "..."}}
    """
    # 현재는 빈 컨텍스트 반환
    return {"rag_context": {}}


# ---------------------------------------------------------------------------
# 노드 4: build_prompts
# TODO: 팀원 2가 채울 예정 (12주차)
# ---------------------------------------------------------------------------

def build_prompts(state: OrchestratorState) -> OrchestratorState:
    """
    페르소나와 RAG 컨텍스트를 결합해 각 페르소나별 프롬프트를 생성한다.

    TODO: 팀원 2가 채울 예정
      - state["personas"], state["questions"], state["rag_context"] 활용
      - 주관식/객관식 질문 유형에 맞는 프롬프트 포맷 적용
      - 반환: {"prompts": [{"persona_uuid": ..., "messages": [...]}]}
    """
    personas: list[dict] = state.get("personas", [])

    # 빈 껍데기: 페르소나 수만큼 플레이스홀더 생성
    prompts = [
        {"persona_uuid": p.get("uuid"), "messages": []}
        for p in personas
    ]
    return {"prompts": prompts}


# ---------------------------------------------------------------------------
# 노드 5: run_llm_parallel
# TODO: 12주차에 LUXIA API 연결 예정
# ---------------------------------------------------------------------------

async def run_llm_parallel(state: OrchestratorState) -> OrchestratorState:
    """
    각 페르소나 프롬프트를 LLM에 병렬로 전송하고 응답을 수집한다.

    TODO: LUXIA API 연결 예정 (12주차)
      - call_llm() 내부에 실제 API 호출 로직 구현
      - 응답 파싱, 재시도 로직, 토큰 사용량 기록 추가
    """
    personas: list[dict] = state.get("personas", [])
    prompts: list[dict] = state.get("prompts", [])

    async def call_llm(persona: dict, prompt: dict) -> dict:
        """
        TODO: LUXIA API 호출로 교체
          response = await luxia_client.chat(messages=prompt["messages"])
          return {"persona_uuid": persona["uuid"], "response": response.text}
        """
        # 빈 껍데기: None 반환
        await asyncio.sleep(0)  # 실제 API 호출 자리
        return {
            "persona_uuid": persona.get("uuid"),
            "response": None,
        }

    tasks = [
        call_llm(persona, prompt)
        for persona, prompt in zip(personas, prompts)
    ]
    responses = list(await asyncio.gather(*tasks))

    print(f"[run_llm_parallel] {len(responses)}개 응답 수집 완료.")
    return {"llm_responses": responses}


# ---------------------------------------------------------------------------
# 노드 6: collect_results
# ---------------------------------------------------------------------------

def collect_results(state: OrchestratorState) -> OrchestratorState:
    """응답을 취합해 최종 results 딕셔너리를 구성한다."""
    responses: list[dict] = state.get("llm_responses", [])
    personas: list[dict] = state.get("personas", [])

    uuid_to_persona = {p.get("uuid"): p for p in personas}

    collected = []
    for resp in responses:
        uuid = resp.get("persona_uuid")
        persona = uuid_to_persona.get(uuid, {})
        collected.append({
            "persona_uuid": uuid,
            "sex": persona.get("sex"),
            "age": persona.get("age"),
            "province": persona.get("province"),
            "occupation": persona.get("occupation"),
            "response": resp.get("response"),
        })

    results: dict[str, Any] = {
        "experiment_title": state.get("experiment_title"),
        "experiment_type": state.get("experiment_type"),
        "n_requested": state.get("n"),
        "n_collected": len(collected),
        "responses": collected,
        "completed_at": datetime.now().isoformat(),
    }

    print(f"[collect_results] 완료: {len(collected)}건.")
    return {"results": results}


# ---------------------------------------------------------------------------
# 그래프 조립
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    graph = StateGraph(OrchestratorState)

    graph.add_node("validate_input", validate_input)
    graph.add_node("filter_personas", filter_personas)
    graph.add_node("fetch_rag_context", fetch_rag_context)
    graph.add_node("build_prompts", build_prompts)
    graph.add_node("run_llm_parallel", run_llm_parallel)
    graph.add_node("collect_results", collect_results)

    graph.set_entry_point("validate_input")

    # validate_input 후: 에러면 END, 정상이면 다음 노드
    graph.add_conditional_edges(
        "validate_input",
        _should_continue,
        {"ok": "filter_personas", "error": END},
    )

    graph.add_edge("filter_personas", "fetch_rag_context")
    graph.add_edge("fetch_rag_context", "build_prompts")
    graph.add_edge("build_prompts", "run_llm_parallel")
    graph.add_edge("run_llm_parallel", "collect_results")
    graph.add_edge("collect_results", END)

    return graph


# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

async def async_run(raw_input: dict[str, Any]) -> dict[str, Any]:
    """비동기 진입점. run_llm_parallel이 async이므로 ainvoke를 사용한다."""
    compiled = _build_graph().compile()
    final_state: OrchestratorState = await compiled.ainvoke(
        {"raw_input": raw_input}
    )

    if final_state.get("error"):
        return {"error": final_state["error"]}
    return final_state.get("results", {})


def run(raw_input: dict[str, Any]) -> dict[str, Any]:
    """동기 진입점. 내부적으로 asyncio.run으로 비동기 그래프를 실행한다."""
    return asyncio.run(async_run(raw_input))


# ---------------------------------------------------------------------------
# 직접 실행 예시
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample_input = {
        "experiment_title": "가계부 앱 사전조사",
        "experiment_type": "사전조사",
        "service_description": "20-30대 타겟 가계부 앱",
        "questions": [
            {
                "type": "주관식",
                "content": "가계부 앱 써본 적 있나요?",
            },
            {
                "type": "객관식",
                "content": "월 얼마까지 낼 의향이 있나요?",
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

    results = run(sample_input)
    import json
    print(json.dumps(results, ensure_ascii=False, indent=2))
