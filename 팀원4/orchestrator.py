"""
LangGraph 기반 실험 오케스트레이터.

파이프라인:
  validate_input → filter_personas → fetch_rag_contexts
               → build_prompts → run_llm_parallel → collect_results

진입점:
  results = run(raw_input)          # 동기
  results = await async_run(raw_input)  # 비동기 (권장)
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime
from typing import Any, Optional, TypedDict

import aiohttp
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from persona_sampler import sample_personas

# 팀원2, 팀원3 모듈 경로 주입
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, "팀원2"))
sys.path.insert(0, os.path.join(_ROOT, "팀원3", "src"))

from prompts import build_messages                                          # noqa: E402
from postprocess import filter_response_quality, parse_objective_response  # noqa: E402

try:
    from rag import fetch_rag_context as _rag_fetch
    _RAG_AVAILABLE = True
except Exception:
    _RAG_AVAILABLE = False

# LangGraph
from langgraph.graph import END, StateGraph


# ---------------------------------------------------------------------------
# 환경 변수
# ---------------------------------------------------------------------------

LUXIA_API_URL   = os.getenv("LUXIA_API_URL",   "https://bridge.luxiacloud.com/luxia/v1/chat")
LUXIA_API_KEY   = os.getenv("LUXIA_API_KEY",   "")
LUXIA_MODEL     = os.getenv("LUXIA_MODEL",     "luxia3-llm-32b-0731")
MAX_RETRY       = int(os.getenv("LLM_MAX_RETRY", "2"))
REQUEST_TIMEOUT = int(os.getenv("LLM_TIMEOUT_SEC", "60"))


# ---------------------------------------------------------------------------
# 입력 스키마 (Pydantic) — Progress.pdf 기준
# ---------------------------------------------------------------------------

class Question(BaseModel):
    question_id: int
    question_content: str
    question_type: str  # "주관식" | "객관식"
    options: list[str] = Field(default_factory=list)


class Image(BaseModel):
    image_id: int
    label: str
    url: str


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
    service_description: Optional[str] = None
    images: list[Image] = Field(default_factory=list)
    questions: list[Question] = Field(min_length=1)
    filters: PersonaFilters = Field(default_factory=PersonaFilters)
    n: int = Field(default=100, ge=1)


# ---------------------------------------------------------------------------
# 그래프 상태
# ---------------------------------------------------------------------------

class OrchestratorState(TypedDict, total=False):
    raw_input: dict[str, Any]

    # validate_input 이후 파싱된 필드
    experiment_title: str
    experiment_type: str
    service_description: Optional[str]
    images: list[dict]
    questions: list[dict]
    filters: dict[str, Any]
    n: int

    # filter_personas 결과
    personas: list[dict]

    # fetch_rag_contexts 결과: "{uuid}:{question_id}" → 유사 페르소나 목록
    rag_contexts: dict[str, list[dict]]

    # build_prompts 결과: (persona × question) 쌍별 프롬프트
    prompts: list[dict]  # [{"persona_uuid", "question_id", "messages"}]

    # run_llm_parallel 결과
    llm_responses: list[dict]  # [{"persona_uuid", "question_id", "response", "is_valid", "selected_option", "rag_context_used"}]

    # collect_results 최종 출력
    results: dict[str, Any]

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
        "images": [img.model_dump() for img in parsed.images],
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
# 노드 3: fetch_rag_contexts
# ---------------------------------------------------------------------------

async def fetch_rag_contexts(state: OrchestratorState) -> OrchestratorState:
    """
    각 (persona × question) 쌍에 대해 유사 페르소나 RAG 검색을 수행한다.
    OpenSearch 미연결 시 빈 컨텍스트로 계속 진행한다.
    """
    if not _RAG_AVAILABLE:
        print("[fetch_rag_contexts] rag 모듈 없음. 빈 컨텍스트로 진행.")
        return {"rag_contexts": {}}

    personas: list[dict] = state.get("personas", [])
    questions: list[dict] = state.get("questions", [])

    async def _fetch_one(persona: dict, question: dict) -> tuple[str, list]:
        key = f"{persona.get('uuid')}:{question['question_id']}"
        try:
            results = await asyncio.to_thread(_rag_fetch, persona, question)
        except Exception as exc:
            print(f"[fetch_rag_contexts] RAG 실패 ({key}): {exc}")
            results = []
        return key, results

    pairs = await asyncio.gather(*[
        _fetch_one(p, q) for p in personas for q in questions
    ])

    rag_contexts = dict(pairs)
    print(f"[fetch_rag_contexts] {len(rag_contexts)}개 컨텍스트 수집 완료.")
    return {"rag_contexts": rag_contexts}


# ---------------------------------------------------------------------------
# 노드 4: build_prompts
# ---------------------------------------------------------------------------

def build_prompts(state: OrchestratorState) -> OrchestratorState:
    """
    각 (persona × question) 쌍에 대해 팀원2 prompts.build_messages를 호출한다.
    """
    personas: list[dict] = state.get("personas", [])
    questions: list[dict] = state.get("questions", [])

    prompt_list = []
    for persona in personas:
        for question in questions:
            messages = build_messages(persona, question)
            prompt_list.append({
                "persona_uuid": persona.get("uuid"),
                "question_id": question["question_id"],
                "messages": messages,
            })

    print(f"[build_prompts] {len(prompt_list)}개 프롬프트 생성 완료.")
    return {"prompts": prompt_list}


# ---------------------------------------------------------------------------
# 노드 5: run_llm_parallel
# ---------------------------------------------------------------------------

async def run_llm_parallel(state: OrchestratorState) -> OrchestratorState:
    """
    각 (persona × question) 프롬프트를 팀원1 FastAPI 서버에 병렬 전송한다.
    품질 검사(filter_response_quality) 실패 시 MAX_RETRY회 재시도.
    객관식은 parse_objective_response로 선택지를 추출한다.
    """
    prompts: list[dict] = state.get("prompts", [])
    questions_map = {q["question_id"]: q for q in state.get("questions", [])}
    rag_contexts: dict = state.get("rag_contexts", {})

    _timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    _headers = {
        "apikey": LUXIA_API_KEY,
        "Content-Type": "application/json",
    }

    async def _call_api(session: aiohttp.ClientSession, messages: list) -> str | None:
        payload = {"model": LUXIA_MODEL, "messages": messages}
        try:
            async with session.post(
                LUXIA_API_URL, json=payload, headers=_headers, timeout=_timeout
            ) as resp:
                if resp.status != 200:
                    print(f"[run_llm_parallel] API 오류 {resp.status}: {await resp.text()}")
                    return None
                data = await resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as exc:
            print(f"[run_llm_parallel] 호출 실패: {exc}")
            return None

    async def _call_with_retry(session: aiohttp.ClientSession, prompt: dict) -> dict:
        persona_uuid: str = prompt["persona_uuid"]
        question_id: int = prompt["question_id"]
        messages: list = prompt["messages"]
        question = questions_map.get(question_id, {})
        options: list = question.get("options", [])

        rag_docs = rag_contexts.get(f"{persona_uuid}:{question_id}", [])
        rag_context_used = [d.get("uuid") for d in rag_docs] or None

        raw_response = None
        is_valid = False
        for attempt in range(MAX_RETRY + 1):
            raw_response = await _call_api(session, messages)
            if raw_response is None:
                break

            quality = filter_response_quality(raw_response)
            is_valid = quality["is_valid"]
            if is_valid:
                break

            if attempt < MAX_RETRY:
                print(
                    f"[run_llm_parallel] 재시도 {attempt + 1} "
                    f"(uuid={persona_uuid[:8]}, q={question_id}): {quality['issues']}"
                )

        selected_option = None
        if raw_response and question.get("question_type") == "객관식":
            parsed = parse_objective_response(raw_response, options)
            selected_option = parsed.get("selected_option")

        return {
            "persona_uuid": persona_uuid,
            "question_id": question_id,
            "response": raw_response,
            "is_valid": is_valid,
            "selected_option": selected_option,
            "rag_context_used": rag_context_used,
        }

    async with aiohttp.ClientSession() as session:
        responses = list(await asyncio.gather(*[_call_with_retry(session, p) for p in prompts]))

    print(f"[run_llm_parallel] {len(responses)}개 응답 수집 완료.")
    return {"llm_responses": responses}


# ---------------------------------------------------------------------------
# 노드 6: collect_results
# ---------------------------------------------------------------------------

def collect_results(state: OrchestratorState) -> OrchestratorState:
    """
    응답을 취합해 ExperimentResult 구조의 results를 구성한다.
    - personas: 페르소나 인구통계 목록
    - responses: (persona × question) 쌍별 응답 목록
    두 목록은 persona_uuid / question_id로 연결된다.
    """
    personas: list[dict] = state.get("personas", [])
    llm_responses: list[dict] = state.get("llm_responses", [])
    image_ids: list[int] = [img["image_id"] for img in state.get("images", [])]

    personas_out = [
        {
            "persona_uuid": p.get("uuid"),
            "sex": p.get("sex"),
            "age": p.get("age"),
            "province": p.get("province"),
            "district": p.get("district"),
            "occupation": p.get("occupation"),
            "education_level": p.get("education_level"),
            "marital_status": p.get("marital_status"),
        }
        for p in personas
    ]

    responses_out = [
        {
            "persona_uuid": r["persona_uuid"],
            "question_id": r["question_id"],
            "image_ids": image_ids,
            "response": r["response"],
            "selected_option": r.get("selected_option"),
            "rag_context_used": r.get("rag_context_used"),
        }
        for r in llm_responses
    ]

    results: dict[str, Any] = {
        "experiment_title": state.get("experiment_title"),
        "experiment_type": state.get("experiment_type"),
        "n_requested": state.get("n"),
        "n_collected": len(personas_out),
        "completed_at": datetime.now().isoformat(),
        "personas": personas_out,
        "responses": responses_out,
    }

    print(
        f"[collect_results] 완료: 페르소나 {len(personas_out)}명, "
        f"응답 {len(responses_out)}건."
    )
    return {"results": results}


# ---------------------------------------------------------------------------
# 그래프 조립
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    graph = StateGraph(OrchestratorState)

    graph.add_node("validate_input", validate_input)
    graph.add_node("filter_personas", filter_personas)
    graph.add_node("fetch_rag_contexts", fetch_rag_contexts)
    graph.add_node("build_prompts", build_prompts)
    graph.add_node("run_llm_parallel", run_llm_parallel)
    graph.add_node("collect_results", collect_results)

    graph.set_entry_point("validate_input")

    graph.add_conditional_edges(
        "validate_input",
        _should_continue,
        {"ok": "filter_personas", "error": END},
    )

    graph.add_edge("filter_personas", "fetch_rag_contexts")
    graph.add_edge("fetch_rag_contexts", "build_prompts")
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
    final_state: OrchestratorState = await compiled.ainvoke({"raw_input": raw_input})

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

    results = run(sample_input)
    import json as _json
    print(_json.dumps(results, ensure_ascii=False, indent=2))
