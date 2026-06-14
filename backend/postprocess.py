"""
LUXIA 응답 후처리 함수 모음
- filter_response_quality: 주관식 품질 검사 (한자/AI leak/길이)
- parse_objective_response_robust: 5단계 객관식 파싱
- classify_failure_reason: 실패 원인 분류
"""
import re
from collections import Counter

CJK_PATTERN = re.compile(r'[一-鿿]+')
LATIN_LEAK_PATTERN = re.compile(r'[가-힣][a-zA-Z]{2,}|[a-zA-Z]{2,}[가-힣]')
CIRCLE_NUMS = {'①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8}

AI_LEAK_KEYWORDS = ["AI", "인공지능", "언어모델", "LLM", "챗봇", "ChatGPT", "GPT"]


# ---------------------------------------------------------------------------
# 주관식 품질 검사 (기존 함수 유지 — 주관식 전용)
# ---------------------------------------------------------------------------

def filter_response_quality(response: str) -> dict:
    """주관식 응답 품질 검사."""
    issues = []

    cjk_matches = CJK_PATTERN.findall(response)
    if cjk_matches:
        issues.append(f"한자 노출: {cjk_matches}")

    latin_matches = LATIN_LEAK_PATTERN.findall(response)
    if latin_matches:
        issues.append(f"영문 노출: {latin_matches}")

    for keyword in AI_LEAK_KEYWORDS:
        if keyword.lower() in response.lower():
            issues.append(f"AI 정체성 노출: '{keyword}'")
            break

    if len(response) < 10:
        issues.append("응답 너무 짧음 (10자 미만)")
    if len(response) > 800:   # 500→800 완화
        issues.append("응답 너무 길음 (800자 초과)")

    reason = None
    if issues:
        if any("한자" in i for i in issues):
            reason = "quality_cjk"
        elif any("AI" in i for i in issues):
            reason = "quality_ai_leak"
        elif any("짧음" in i for i in issues):
            reason = "quality_too_short"
        elif any("길음" in i for i in issues):
            reason = "quality_too_long"
        else:
            reason = "quality_filter_failed"

    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
        "cleaned": response,
        "failure_reason": reason,
    }


# ---------------------------------------------------------------------------
# 5단계 객관식 파싱 (robust)
# ---------------------------------------------------------------------------

def parse_objective_response_robust(response: str, options: list) -> dict:
    """
    5단계 순서로 객관식 보기를 탐지한다.
      1. ①②③④⑤ 기호
      2. 숫자 + 번/./)/번호
      3. 보기 텍스트 exact match
      4. 보기 텍스트 partial match (단어 절반 이상 포함)
      5. 키워드 빈도 기반 fallback
    """
    if not response or not options:
        return {"selected_option": None, "match_method": "none", "raw_response": response}

    resp = response.strip()

    # 1. 원문자 기호 ① ② …
    for sym, idx_1based in CIRCLE_NUMS.items():
        if sym in resp:
            idx = idx_1based - 1
            if 0 <= idx < len(options):
                return {
                    "selected_option": options[idx],
                    "match_method": "circle_symbol",
                    "raw_response": response,
                }

    # 2. 숫자 + 번 / . / ) / 번호 패턴
    num_match = re.search(r'(?<!\d)([1-9])\s*(?:번|\.|\))', resp)
    if num_match:
        idx = int(num_match.group(1)) - 1
        if 0 <= idx < len(options):
            return {
                "selected_option": options[idx],
                "match_method": "number_suffix",
                "raw_response": response,
            }
    # 문장 맨 앞 단독 숫자
    standalone = re.match(r'^([1-9])[\s\.,]', resp)
    if standalone:
        idx = int(standalone.group(1)) - 1
        if 0 <= idx < len(options):
            return {
                "selected_option": options[idx],
                "match_method": "number_start",
                "raw_response": response,
            }

    # 3. 보기 텍스트 exact match
    for opt in options:
        if opt in resp:
            return {
                "selected_option": opt,
                "match_method": "exact",
                "raw_response": response,
            }

    # 4. 단어 기반 partial match (보기 단어의 절반 이상 포함)
    stopwords = {"이", "가", "을", "를", "은", "는", "에", "의", "도", "로", "와", "과", "및", "또는", "또한"}
    for opt in options:
        opt_words = [w for w in opt.split() if w not in stopwords and len(w) >= 2]
        if not opt_words:
            continue
        matched = sum(1 for w in opt_words if w in resp)
        if matched >= max(1, len(opt_words) // 2):
            return {
                "selected_option": opt,
                "match_method": "partial_word",
                "raw_response": response,
            }

    # 5. 키워드 빈도 fallback — 응답 단어와 가장 많이 겹치는 보기
    resp_words = set(w.strip(".,?!\"'…()[]") for w in resp.split() if len(w) >= 2)
    best_opt, best_score = None, 0
    for opt in options:
        opt_words = set(w for w in opt.split() if w not in stopwords and len(w) >= 2)
        score = len(resp_words & opt_words)
        if score > best_score:
            best_score, best_opt = score, opt

    if best_score > 0:
        return {
            "selected_option": best_opt,
            "match_method": "keyword_fallback",
            "raw_response": response,
        }

    return {"selected_option": None, "match_method": "none", "raw_response": response}


# ---------------------------------------------------------------------------
# 하위호환 래퍼 (기존 코드가 parse_objective_response를 import할 경우 대비)
# ---------------------------------------------------------------------------

def parse_objective_response(response: str, options: list) -> dict:
    return parse_objective_response_robust(response, options)
