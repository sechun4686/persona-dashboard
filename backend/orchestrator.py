"""
LangGraph 기반 실험 오케스트레이터.

파이프라인:
  validate_input → filter_personas → fetch_rag_contexts
               → build_prompts → run_llm_parallel → collect_results → analyze_responses

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

_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _ROOT)
sys.path.insert(0, os.path.join(_ROOT, "team3", "src"))

from prompts import build_messages
from postprocess import (
    filter_response_quality,
    parse_objective_response_robust,
    parse_objective_response,   # 하위호환
)

try:
    from rag import fetch_rag_context as _rag_fetch
    _RAG_AVAILABLE = True
except Exception:
    _RAG_AVAILABLE = False

from langgraph.graph import END, StateGraph


# ---------------------------------------------------------------------------
# 환경 변수
# ---------------------------------------------------------------------------

LUXIA_API_URL   = os.getenv("LUXIA_API_URL",   "https://bridge.luxiacloud.com/luxia/v1/chat")
LUXIA_API_KEY   = os.getenv("LUXIA_API_KEY",   "")
LUXIA_MODEL     = os.getenv("LUXIA_MODEL",     "luxia3-llm-32b-0731")
MAX_RETRY       = int(os.getenv("LLM_MAX_RETRY", "2"))
REQUEST_TIMEOUT = int(os.getenv("LLM_TIMEOUT_SEC", "60"))

REPLACEMENT_BUFFER = 15  # 대체 페르소나 예비 샘플 수


# ---------------------------------------------------------------------------
# 공통 LLM 호출 함수 (모듈 레벨)
# ---------------------------------------------------------------------------

async def _call_api(session: aiohttp.ClientSession, messages: list) -> str | None:
    headers = {"apikey": LUXIA_API_KEY, "Content-Type": "application/json"}
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    payload = {"model": LUXIA_MODEL, "messages": messages}
    try:
        async with session.post(
            LUXIA_API_URL, json=payload, headers=headers, timeout=timeout
        ) as resp:
            if resp.status != 200:
                print(f"[LLM] API 오류 {resp.status}: {await resp.text()}")
                return None
            data = await resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as exc:
        print(f"[LLM] 호출 실패: {exc}")
        return None


_OBJECTIVE_TYPES = {"객관식", "objective", "multiple_choice"}
_SUBJECTIVE_TYPES = {"주관식", "subjective", "open_ended"}


async def _call_with_retry(
    session: aiohttp.ClientSession,
    prompt: dict,
    questions_map: dict,
    rag_contexts: dict,
) -> dict:
    """
    LLM 호출 + 문항 유형별 재시도.
    - 객관식: selected_option 파싱 성공 = valid (품질 필터 미적용)
    - 주관식: filter_response_quality 통과 = valid
    반환: {"response_entry": dict, "retry_count": int}
    """
    persona_uuid: str = prompt["persona_uuid"]
    question_id: int = prompt["question_id"]
    messages: list = prompt["messages"]
    question = questions_map.get(question_id, {})
    options: list = question.get("options", [])
    question_type: str = question.get("question_type", "주관식")
    is_objective = question_type in _OBJECTIVE_TYPES

    rag_docs = rag_contexts.get(f"{persona_uuid}:{question_id}", [])
    rag_context_used = [d.get("uuid") for d in rag_docs] or None

    raw_response = None
    is_valid = False
    selected_option = None
    failure_reason = "api_timeout"
    retry_count = 0

    for attempt in range(MAX_RETRY + 1):
        raw_response = await _call_api(session, messages)

        if raw_response is None:
            failure_reason = "api_timeout"
            if attempt < MAX_RETRY:
                retry_count += 1
                print(f"[LLM] API 실패 재시도 {attempt+1}/{MAX_RETRY} "
                      f"(uuid={persona_uuid[:8]}, q={question_id})")
            continue

        if not raw_response.strip():
            failure_reason = "empty_response"
            if attempt < MAX_RETRY:
                retry_count += 1
            continue

        if is_objective:
            # 객관식: 품질 필터 없이 파싱 성공 여부로만 판정
            parsed = parse_objective_response_robust(raw_response, options)
            selected_option = parsed.get("selected_option")
            if selected_option:
                is_valid = True
                failure_reason = None
                break
            failure_reason = "objective_parse_failed"
            if attempt < MAX_RETRY:
                retry_count += 1
                print(f"[LLM] 객관식 파싱 실패 재시도 {attempt+1}/{MAX_RETRY} "
                      f"(uuid={persona_uuid[:8]}, q={question_id}, "
                      f"method={parsed.get('match_method')})")
        else:
            # 주관식: 품질 필터 적용
            quality = filter_response_quality(raw_response)
            if quality["is_valid"]:
                is_valid = True
                failure_reason = None
                break
            failure_reason = quality.get("failure_reason", "quality_filter_failed")
            if attempt < MAX_RETRY:
                retry_count += 1
                print(f"[LLM] 품질 불합격 재시도 {attempt+1}/{MAX_RETRY} "
                      f"(uuid={persona_uuid[:8]}): {quality['issues']}")

    return {
        "response_entry": {
            "persona_uuid": persona_uuid,
            "question_id": question_id,
            "question_type": question_type,
            "image_ids": [],
            "response": raw_response if is_valid else None,
            "failed_response": raw_response if not is_valid else None,
            "selected_option": selected_option if is_valid else None,
            "rag_context_used": rag_context_used,
            "is_valid": is_valid,
            "failure_reason": failure_reason,
        },
        "retry_count": retry_count,
    }


# ---------------------------------------------------------------------------
# 입력 스키마 (Pydantic)
# ---------------------------------------------------------------------------

class Question(BaseModel):
    question_id: int
    question_content: str
    question_type: str
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
    ground_truth: Optional[dict] = None


# ---------------------------------------------------------------------------
# 그래프 상태
# ---------------------------------------------------------------------------

class OrchestratorState(TypedDict, total=False):
    raw_input: dict[str, Any]

    experiment_title: str
    experiment_type: str
    service_description: Optional[str]
    images: list[dict]
    questions: list[dict]
    filters: dict[str, Any]
    n: int
    ground_truth: Optional[dict]

    personas: list[dict]
    spare_personas: list[dict]

    rag_contexts: dict[str, list[dict]]
    prompts: list[dict]

    llm_responses: list[dict]
    retry_count: int
    replacement_count: int
    failed_response_count: int
    spare_personas_used: list[dict]

    results: dict[str, Any]
    error: Optional[str]


# ---------------------------------------------------------------------------
# 노드 1: validate_input
# ---------------------------------------------------------------------------

def validate_input(state: OrchestratorState) -> OrchestratorState:
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
        "ground_truth": parsed.ground_truth,
        "error": None,
    }


def _should_continue(state: OrchestratorState) -> str:
    return "error" if state.get("error") else "ok"


# ---------------------------------------------------------------------------
# 노드 2: filter_personas
# ---------------------------------------------------------------------------

def filter_personas(state: OrchestratorState) -> OrchestratorState:
    filters: dict[str, Any] = state.get("filters", {})
    n: int = state.get("n", 100)

    def _do_sample(n_target: int) -> list[dict]:
        return sample_personas(
            sex=filters.get("sex"),
            age_min=filters.get("age_min"),
            age_max=filters.get("age_max"),
            province=filters.get("province"),
            occupation=filters.get("occupation"),
            education_level=filters.get("education_level"),
            marital_status=filters.get("marital_status"),
            n=n_target,
            as_records=True,
        )

    # 대체 샘플 확보 시도 (버퍼 = min(REPLACEMENT_BUFFER, n//4 이상 3 이상))
    buffer = min(REPLACEMENT_BUFFER, max(3, n // 4))
    try:
        all_personas = _do_sample(n + buffer)
        personas = all_personas[:n]
        spare_personas = all_personas[n:]
        print(f"[filter_personas] {len(personas)}명 확보, 예비 {len(spare_personas)}명.")
    except RuntimeError:
        # 필터 조건이 엄격해 버퍼 확보 불가 → n만 샘플링
        try:
            personas = _do_sample(n)
            spare_personas = []
            print(f"[filter_personas] {len(personas)}명 확보 (예비 없음).")
        except (ValueError, RuntimeError) as exc:
            return {"error": f"[filter_personas] {exc}"}
    except (ValueError, RuntimeError) as exc:
        return {"error": f"[filter_personas] {exc}"}

    return {"personas": personas, "spare_personas": spare_personas}


# ---------------------------------------------------------------------------
# 노드 3: fetch_rag_contexts
# ---------------------------------------------------------------------------

async def fetch_rag_contexts(state: OrchestratorState) -> OrchestratorState:
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
    personas: list[dict] = state.get("personas", [])
    questions: list[dict] = state.get("questions", [])
    rag_contexts: dict = state.get("rag_contexts", {})

    prompt_list = []
    for persona in personas:
        for question in questions:
            key = f"{persona.get('uuid')}:{question['question_id']}"
            rag_context = rag_contexts.get(key) or None
            messages = build_messages(persona, question, rag_context=rag_context)
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
    prompts: list[dict] = state.get("prompts", [])
    spare_personas: list[dict] = state.get("spare_personas", [])
    questions: list[dict] = state.get("questions", [])
    questions_map = {q["question_id"]: q for q in questions}
    rag_contexts: dict = state.get("rag_contexts", {})

    total_retry_count = 0

    async with aiohttp.ClientSession() as session:

        # ── 주 배치 실행 ──
        raw_results = await asyncio.gather(*[
            _call_with_retry(session, p, questions_map, rag_contexts)
            for p in prompts
        ])
        responses: list[dict] = []
        for r in raw_results:
            responses.append(r["response_entry"])
            total_retry_count += r["retry_count"]

        # ── 대체 페르소나 실행 ──
        # 주관식 문항 기준으로 대체 트리거 (분석에 쓰이는 핵심 문항)
        subj_q = next(
            (q for q in questions if q.get("question_type") in _SUBJECTIVE_TYPES),
            questions[0] if questions else {},
        )
        subj_q_id = subj_q.get("question_id", 0)
        failed_uuids = {
            r["persona_uuid"]
            for r in responses
            if r["question_id"] == subj_q_id and not r["is_valid"]
        }

        replacement_count = 0
        spare_personas_used: list[dict] = []
        spare_iter = iter(spare_personas)

        for failed_uuid in failed_uuids:
            spare = next(spare_iter, None)
            if spare is None:
                break
            spare_uuid = spare.get("uuid")

            # 대체 페르소나 프롬프트 빌드 & 실행
            spare_prompts = [
                {
                    "persona_uuid": spare_uuid,
                    "question_id": q["question_id"],
                    "messages": build_messages(spare, q, rag_context=None),
                }
                for q in questions
            ]
            spare_results = await asyncio.gather(*[
                _call_with_retry(session, sp, questions_map, rag_contexts)
                for sp in spare_prompts
            ])
            for r in spare_results:
                total_retry_count += r["retry_count"]

            spare_responses = [r["response_entry"] for r in spare_results]
            primary_spare = next(
                (r for r in spare_responses if r["question_id"] == subj_q_id), None
            )

            if primary_spare and primary_spare["is_valid"]:
                responses = [r for r in responses if r["persona_uuid"] != failed_uuid]
                responses.extend(spare_responses)
                spare_personas_used.append(spare)
                replacement_count += 1
                print(f"[run_llm_parallel] 대체 성공: {failed_uuid[:8]} → {spare_uuid[:8]}")

    failed_count = sum(
        1 for r in responses
        if r["question_id"] == subj_q_id and not r["is_valid"]
    )
    print(
        f"[run_llm_parallel] 완료: 재시도 {total_retry_count}회, "
        f"대체 {replacement_count}명, 주관식 최종 실패 {failed_count}명."
    )
    return {
        "llm_responses": responses,
        "retry_count": total_retry_count,
        "replacement_count": replacement_count,
        "failed_response_count": failed_count,
        "spare_personas_used": spare_personas_used,
    }


# ---------------------------------------------------------------------------
# 노드 6: collect_results
# ---------------------------------------------------------------------------

def collect_results(state: OrchestratorState) -> OrchestratorState:
    from collections import defaultdict

    personas: list[dict] = state.get("personas", []) + state.get("spare_personas_used", [])
    llm_responses: list[dict] = state.get("llm_responses", [])
    questions: list[dict] = state.get("questions", [])
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

    # 유효 응답만 responses에 포함 (is_valid=True인 것만)
    responses_out = [
        {
            "persona_uuid": r["persona_uuid"],
            "question_id": r["question_id"],
            "question_type": r.get("question_type", "주관식"),
            "image_ids": image_ids,
            "response": r["response"],
            "selected_option": r.get("selected_option"),
            "is_valid": True,
            "rag_context_used": r.get("rag_context_used"),
        }
        for r in llm_responses
        if r.get("is_valid") and r.get("response") and str(r["response"]).strip()
    ]

    # ── 문항별 통계 ──
    q_map = {q["question_id"]: q for q in questions}
    question_stats = []
    for q in questions:
        qid = q["question_id"]
        q_resp = [r for r in llm_responses if r["question_id"] == qid]
        valid_c = sum(1 for r in q_resp if r.get("is_valid"))
        question_stats.append({
            "question_id": qid,
            "question_type": q.get("question_type", "주관식"),
            "valid_response_count": valid_c,
            "failed_response_count": len(q_resp) - valid_c,
        })

    # ── 모든 문항 완료 페르소나 수 ──
    all_q_ids = {q["question_id"] for q in questions}
    persona_valid_qs: dict = defaultdict(set)
    for r in llm_responses:
        if r.get("is_valid"):
            persona_valid_qs[r["persona_uuid"]].add(r["question_id"])
    all_completed = sum(
        1 for valid_qs in persona_valid_qs.values()
        if all_q_ids <= valid_qs
    )

    # ── 실패 원인 집계 ──
    failure_reasons: dict = defaultdict(int)
    for r in llm_responses:
        if not r.get("is_valid") and r.get("failure_reason"):
            failure_reasons[r["failure_reason"]] += 1

    # 주관식 기준 valid_response_count (backward compat)
    subj_q = next((q for q in questions if q.get("question_type") in _SUBJECTIVE_TYPES), questions[0] if questions else {})
    subj_q_id = subj_q.get("question_id", 0) if subj_q else 0
    subj_valid = sum(1 for r in llm_responses if r.get("is_valid") and r["question_id"] == subj_q_id)

    # ── 객관식 선택지 분포 계산 ──
    objective_distributions: dict = {}
    for q in questions:
        if q.get("question_type") not in _OBJECTIVE_TYPES:
            continue
        qid = q["question_id"]
        q_valid = [r for r in llm_responses if r["question_id"] == qid and r.get("is_valid")]
        opts = q.get("options", [])
        opt_counts = {opt: 0 for opt in opts}
        for r in q_valid:
            sel = r.get("selected_option")
            if sel in opt_counts:
                opt_counts[sel] += 1
        total_valid = sum(opt_counts.values())
        objective_distributions[str(qid)] = {
            "question_id": qid,
            "question_content": q.get("question_content", ""),
            "options": [
                {
                    "option": opt,
                    "count": cnt,
                    "percentage": round(cnt / total_valid * 100, 1) if total_valid > 0 else 0.0,
                }
                for opt, cnt in opt_counts.items()
            ],
            "total_valid": total_valid,
        }

    results: dict[str, Any] = {
        "experiment_title": state.get("experiment_title"),
        "experiment_type": state.get("experiment_type"),
        "n_requested": state.get("n"),
        "n_collected": len(state.get("personas", [])),
        "all_questions_completed_count": all_completed,
        "valid_response_count": subj_valid,
        "failed_response_count": state.get("failed_response_count", 0),
        "retry_count": state.get("retry_count", 0),
        "replacement_count": state.get("replacement_count", 0),
        "question_stats": question_stats,
        "failure_reasons": dict(failure_reasons),
        "completed_at": datetime.now().isoformat(),
        "personas": personas_out,
        "responses": responses_out,
        "questions": questions,
        "objective_distributions": objective_distributions,
        "ground_truth": state.get("ground_truth"),
    }

    print(
        f"[collect_results] 완료: 페르소나 {len(personas_out)}명, "
        f"전체 완료 {all_completed}명, 주관식 유효 {subj_valid}건, "
        f"실패원인={dict(failure_reasons)}"
    )
    return {"results": results}


# ---------------------------------------------------------------------------
# 노드 7: analyze_responses  (K-means + 레이블 + 다양성)
# ---------------------------------------------------------------------------

async def analyze_responses(state: OrchestratorState) -> OrchestratorState:
    from analyze import choose_k, embed_and_cluster, compute_diversity, generate_cluster_labels

    results: dict = dict(state.get("results", {}))
    responses: list[dict] = results.get("responses", [])
    experiment_title: str = state.get("experiment_title", "")
    questions: list[dict] = state.get("questions", [])

    # 주관식 문항을 K-means 기준으로 사용; 없으면 첫 번째 문항
    subj_q = next(
        (q for q in questions if q.get("question_type") in _SUBJECTIVE_TYPES),
        questions[0] if questions else {},
    )
    primary_q_id = subj_q.get("question_id", 0) if subj_q else 0
    results["primary_question_id"] = primary_q_id

    # 유효 응답 (is_valid=True이고 해당 문항)
    valid_responses = [
        r for r in responses
        if r.get("question_id") == primary_q_id
        and r.get("is_valid", True)   # 이미 collect_results에서 필터됨
        and r.get("response")
        and str(r["response"]).strip()
    ]

    n_valid = len(valid_responses)
    print(f"[analyze_responses] 유효 응답 {n_valid}개 분석 시작.")

    if n_valid == 0:
        results["diversity_metrics"] = {
            "semantic_diversity_score": 0.0,
            "opinion_distribution_score": 0.0,
            "cluster_count": 0,
        }
        results["cluster_cards"] = []
        return {"results": results}

    # ── 임베딩 + K-means ──
    texts = [r["response"] for r in valid_responses]
    k = choose_k(n_valid)
    print(f"[analyze_responses] K-means k={k} 실행 중...")
    cluster_ids, embeddings = embed_and_cluster(texts, k)

    # 군집별 응답 그룹핑
    cluster_groups: dict[int, list[str]] = {}
    for i, r in enumerate(valid_responses):
        cid = cluster_ids[i]
        cluster_groups.setdefault(cid, []).append(r["response"])

    # ── LLM 군집 레이블 생성 ──
    print(f"[analyze_responses] 군집 레이블 생성 중 ({k}개)...")
    async with aiohttp.ClientSession() as session:
        async def _llm_for_label(messages: list) -> str | None:
            return await _call_api(session, messages)

        cluster_labels = await generate_cluster_labels(
            cluster_groups, _llm_for_label, experiment_title
        )
    print(f"[analyze_responses] 레이블: {cluster_labels}")

    # ── 응답에 cluster 정보 추가 ──
    uuid_to_cluster: dict[str, int] = {}
    for i, r in enumerate(valid_responses):
        uuid_to_cluster[r["persona_uuid"]] = cluster_ids[i]

    for r in responses:
        if r["question_id"] == primary_q_id and r["persona_uuid"] in uuid_to_cluster:
            cid = uuid_to_cluster[r["persona_uuid"]]
            r["cluster"] = cid
            r["cluster_summary"] = cluster_labels.get(cid, f"의견 그룹 {cid + 1}")

    results["responses"] = responses

    # ── 다양성 지표 ──
    diversity = compute_diversity(embeddings, cluster_ids)
    results["diversity_metrics"] = diversity
    print(f"[analyze_responses] 다양성 지표: {diversity}")

    # ── cluster_cards 생성 ──
    total = n_valid
    persona_map = {p["persona_uuid"]: p for p in results.get("personas", [])}
    cluster_cards = []
    for cid in sorted(cluster_groups):
        label = cluster_labels.get(cid, f"의견 그룹 {cid + 1}")
        items = [r for r in valid_responses if uuid_to_cluster.get(r["persona_uuid"]) == cid]
        count = len(items)
        rep_resp = items[0] if items else {}
        rep_persona = persona_map.get(rep_resp.get("persona_uuid", ""), {})
        cluster_cards.append({
            "cluster_id": cid,
            "cluster_name": label,
            "ratio": count / total,
            "count": count,
            "summary": f"응답 패턴 기반 '{label}' 그룹입니다.",
            "keywords": [],
            "representative_quote": (rep_resp.get("response") or "")[:200],
            "representative_persona": {
                "age": rep_persona.get("age", "?"),
                "gender": "여" if rep_persona.get("sex") == "여자" else "남" if rep_persona.get("sex") == "남자" else "?",
                "region": rep_persona.get("province", "?"),
                "occupation": rep_persona.get("occupation", "?"),
            } if rep_persona else None,
        })
    results["cluster_cards"] = cluster_cards

    return {"results": results}


# ---------------------------------------------------------------------------
# 그래프 조립
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    graph = StateGraph(OrchestratorState)

    graph.add_node("validate_input",    validate_input)
    graph.add_node("filter_personas",   filter_personas)
    graph.add_node("fetch_rag_contexts", fetch_rag_contexts)
    graph.add_node("build_prompts",     build_prompts)
    graph.add_node("run_llm_parallel",  run_llm_parallel)
    graph.add_node("collect_results",   collect_results)
    graph.add_node("analyze_responses", analyze_responses)

    graph.set_entry_point("validate_input")

    graph.add_conditional_edges(
        "validate_input",
        _should_continue,
        {"ok": "filter_personas", "error": END},
    )

    graph.add_edge("filter_personas",    "fetch_rag_contexts")
    graph.add_edge("fetch_rag_contexts", "build_prompts")
    graph.add_edge("build_prompts",      "run_llm_parallel")
    graph.add_edge("run_llm_parallel",   "collect_results")
    graph.add_edge("collect_results",    "analyze_responses")
    graph.add_edge("analyze_responses",  END)

    return graph


# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

async def async_run(raw_input: dict[str, Any]) -> dict[str, Any]:
    compiled = _build_graph().compile()
    final_state: OrchestratorState = await compiled.ainvoke({"raw_input": raw_input})

    if final_state.get("error"):
        return {"error": final_state["error"]}
    return final_state.get("results", {})


def run(raw_input: dict[str, Any]) -> dict[str, Any]:
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
        ],
        "filters": {},
        "n": 5,
    }

    results = run(sample_input)
    import json as _json
    print(_json.dumps(results, ensure_ascii=False, indent=2))
