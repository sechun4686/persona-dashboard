"""
Persona sampler for nvidia/Nemotron-Personas-Korea (HuggingFace).

Usage:
    from persona_sampler import sample_personas

    df = sample_personas(
        sex="여자",
        age_min=20,
        age_max=35,
        province="서울",
        occupation="사무원",      # 부분 일치
        education_level="4년제 대학교",
        n=50,
    )
"""

from __future__ import annotations

import random
from typing import Optional

import pandas as pd
from datasets import load_dataset


# ---------------------------------------------------------------------------
# 유효 값 상수 (필터 검증용)
# ---------------------------------------------------------------------------

VALID_SEX = {"남자", "여자"}

VALID_EDUCATION_LEVELS = {
    "무학",
    "초등학교",
    "중학교",
    "고등학교",
    "2~3년제 전문대학",
    "4년제 대학교",
    "대학원",
    "해당없음",
}

VALID_MARITAL_STATUSES = {"미혼", "배우자있음", "사별", "이혼"}

VALID_PROVINCES = {
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충청북", "충청남", "전북", "전라남",
    "경상북", "경상남", "제주",
}


# ---------------------------------------------------------------------------
# 핵심 함수
# ---------------------------------------------------------------------------

def sample_personas(
    *,
    sex: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    province: Optional[str] = None,
    occupation: Optional[str] = None,
    education_level: Optional[str] = None,
    marital_status: Optional[str] = None,
    n: int = 100,
    streaming: bool = True,
    seed: Optional[int] = None,
    as_records: bool = False,
) -> "pd.DataFrame | list[dict]":
    """HuggingFace의 Nemotron-Personas-Korea에서 조건에 맞는 페르소나를 샘플링한다.

    Args:
        sex: "남자" 또는 "여자". None이면 전체.
        age_min: 최소 나이 (포함). None이면 제한 없음.
        age_max: 최대 나이 (포함). None이면 제한 없음.
        province: 광역시도명 (예: "서울", "부산"). None이면 전체.
        occupation: 직업 키워드. 부분 일치로 검색. None이면 전체.
        education_level: 정확한 학력 문자열. None이면 전체.
        marital_status: "미혼", "배우자있음", "사별", "이혼" 중 하나. None이면 전체.
        n: 반환할 샘플 수. 기본값 100.
        streaming: True면 스트리밍 모드로 데이터셋 로드(메모리 절약).
        seed: 재현성을 위한 랜덤 시드.
        as_records: True면 list[dict] 반환, False면 DataFrame 반환(기본값).

    Returns:
        필터링 후 n개를 샘플링한 DataFrame 또는 list[dict].

    Raises:
        ValueError: 유효하지 않은 필터 값이 주어진 경우.
        RuntimeError: 조건을 만족하는 데이터가 n개 미만인 경우.
    """
    _validate_args(sex, province, education_level, marital_status, n)

    if seed is not None:
        random.seed(seed)

    print(f"[persona_sampler] 데이터셋 로딩 중 (streaming={streaming}) ...")
    dataset = load_dataset(
        "nvidia/Nemotron-Personas-Korea",
        split="train",
        streaming=streaming,
    )

    filters = _build_filters(sex, age_min, age_max, province, occupation, education_level, marital_status)

    if streaming:
        rows = _collect_streaming(dataset, filters, n, seed)
    else:
        rows = _collect_in_memory(dataset, filters, n, seed)

    if len(rows) < n:
        raise RuntimeError(
            f"조건을 만족하는 페르소나가 {len(rows)}개뿐입니다 (요청: {n}개). "
            "필터 조건을 완화하거나 n을 줄여주세요."
        )

    result = rows[:n]
    print(f"[persona_sampler] 완료: {len(result)}개 반환.")
    if as_records:
        return result
    return pd.DataFrame(result)


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

def _validate_args(
    sex: Optional[str],
    province: Optional[str],
    education_level: Optional[str],
    marital_status: Optional[str],
    n: int,
) -> None:
    if sex is not None and sex not in VALID_SEX:
        raise ValueError(f"sex는 {VALID_SEX} 중 하나여야 합니다. 받은 값: {sex!r}")
    if province is not None and province not in VALID_PROVINCES:
        raise ValueError(
            f"province는 {sorted(VALID_PROVINCES)} 중 하나여야 합니다. 받은 값: {province!r}"
        )
    if education_level is not None and education_level not in VALID_EDUCATION_LEVELS:
        raise ValueError(
            f"education_level은 {sorted(VALID_EDUCATION_LEVELS)} 중 하나여야 합니다. "
            f"받은 값: {education_level!r}"
        )
    if marital_status is not None and marital_status not in VALID_MARITAL_STATUSES:
        raise ValueError(
            f"marital_status는 {sorted(VALID_MARITAL_STATUSES)} 중 하나여야 합니다. "
            f"받은 값: {marital_status!r}"
        )
    if n <= 0:
        raise ValueError(f"n은 1 이상이어야 합니다. 받은 값: {n}")


def _build_filters(
    sex: Optional[str],
    age_min: Optional[int],
    age_max: Optional[int],
    province: Optional[str],
    occupation: Optional[str],
    education_level: Optional[str],
    marital_status: Optional[str],
) -> list:
    """각 필터 조건을 (field, op, value) 튜플 리스트로 빌드한다."""
    filters = []
    if sex is not None:
        filters.append(("sex", "eq", sex))
    if age_min is not None:
        filters.append(("age", "gte", age_min))
    if age_max is not None:
        filters.append(("age", "lte", age_max))
    if province is not None:
        filters.append(("province", "eq", province))
    if occupation is not None:
        filters.append(("occupation", "contains", occupation))
    if education_level is not None:
        filters.append(("education_level", "eq", education_level))
    if marital_status is not None:
        filters.append(("marital_status", "eq", marital_status))
    return filters


def _matches(row: dict, filters: list) -> bool:
    for field, op, value in filters:
        cell = row.get(field)
        if cell is None:
            return False
        if op == "eq" and cell != value:
            return False
        if op == "gte" and cell < value:
            return False
        if op == "lte" and cell > value:
            return False
        if op == "contains" and value not in str(cell):
            return False
    return True


def _collect_streaming(dataset, filters: list, n: int, seed: Optional[int]) -> list:
    """
    스트리밍 모드: reservoir sampling으로 메모리 O(n)에 수집.
    전체 데이터를 다 훑지 않고 n개가 충분히 쌓이면 조기 종료하는 옵션도 제공.
    단, 무작위성이 필요하면 reservoir sampling을 사용한다.
    """
    if seed is not None:
        # 재현 가능한 reservoir sampling
        reservoir: list = []
        k = 0  # 조건 만족한 항목 누적 수
        for row in dataset:
            if not _matches(row, filters):
                continue
            k += 1
            if len(reservoir) < n:
                reservoir.append(dict(row))
            else:
                # reservoir sampling: 점점 낮은 확률로 교체
                j = random.randint(0, k - 1)
                if j < n:
                    reservoir[j] = dict(row)
            if k % 50_000 == 0:
                print(f"  ... 검토 {k:,}개 (확보 {min(len(reservoir), n)}개)")
        return reservoir
    else:
        # 시드 없이 빠른 수집: n개 확보 즉시 종료
        collected: list = []
        checked = 0
        for row in dataset:
            checked += 1
            if not _matches(row, filters):
                continue
            collected.append(dict(row))
            if len(collected) == n:
                break
            if len(collected) % 10_000 == 0:
                print(f"  ... 확보 {len(collected):,}개 (검토 {checked:,}개)")
        return collected


def _collect_in_memory(dataset, filters: list, n: int, seed: Optional[int]) -> list:
    """비스트리밍 모드: 전체 로드 후 필터링 → 샘플링."""
    df = dataset.to_pandas()
    mask = pd.Series([True] * len(df))
    for field, op, value in filters:
        if op == "eq":
            mask &= df[field] == value
        elif op == "gte":
            mask &= df[field] >= value
        elif op == "lte":
            mask &= df[field] <= value
        elif op == "contains":
            mask &= df[field].astype(str).str.contains(value, na=False)
    filtered = df[mask]
    if len(filtered) <= n:
        return filtered.to_dict("records")
    return filtered.sample(n=n, random_state=seed).to_dict("records")


# ---------------------------------------------------------------------------
# CLI 진입점
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Nemotron-Personas-Korea 샘플러")
    parser.add_argument("--sex", choices=["남자", "여자"])
    parser.add_argument("--age-min", type=int)
    parser.add_argument("--age-max", type=int)
    parser.add_argument("--province")
    parser.add_argument("--occupation")
    parser.add_argument("--education-level")
    parser.add_argument("--marital-status", choices=sorted(VALID_MARITAL_STATUSES))
    parser.add_argument("-n", type=int, default=100)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--no-streaming", action="store_true")
    parser.add_argument("--output", default="personas.csv", help="저장 경로 (csv 또는 json)")
    args = parser.parse_args()

    df = sample_personas(
        sex=args.sex,
        age_min=args.age_min,
        age_max=args.age_max,
        province=args.province,
        occupation=args.occupation,
        education_level=args.education_level,
        marital_status=args.marital_status,
        n=args.n,
        streaming=not args.no_streaming,
        seed=args.seed,
    )
    assert isinstance(df, pd.DataFrame)

    if args.output.endswith(".json"):
        df.to_json(args.output, orient="records", force_ascii=False, indent=2)
    else:
        df.to_csv(args.output, index=False, encoding="utf-8-sig")

    print(f"저장 완료: {args.output}")
    print(df[["uuid", "sex", "age", "province", "occupation", "education_level", "marital_status", "persona"]].head())
