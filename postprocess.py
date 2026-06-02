"""
LUXIA 응답 후처리 함수 모음
- filter_response_quality: 응답 품질 검사 (한자/AI leak 감지)
- parse_objective_response: 객관식 응답에서 선택지 추출
"""
import re

CJK_PATTERN = re.compile(r'[\u4e00-\u9fff]+')

# 영문(라틴 알파벳) leak 감지 패턴
# 한국어 문장 안에 끼어든 2글자 이상의 연속 라틴 알파벳을 잡음
# 단, 약어성 영문은 통과시킴 (AI_LEAK_KEYWORDS에서 별도 처리)
LATIN_LEAK_PATTERN = re.compile(r'[가-힣][a-zA-Z]{2,}|[a-zA-Z]{2,}[가-힣]')


AI_LEAK_KEYWORDS = [
    "AI", "인공지능", "언어모델", "LLM", "챗봇",
]


def filter_response_quality(response: str) -> dict:
    """LUXIA 응답 품질 검사"""
    issues = []
    
    # 1. 한자 leak
    cjk_matches = CJK_PATTERN.findall(response)
    if cjk_matches:
        issues.append(f"한자 노출: {cjk_matches}")
    
    # 2. 영문 leak (한국어 단어 안에 끼어든 라틴 알파벳)
    latin_matches = LATIN_LEAK_PATTERN.findall(response)
    if latin_matches:
        issues.append(f"영문 노출: {latin_matches}")
    
    # 3. AI 정체성 노출
    for keyword in AI_LEAK_KEYWORDS:
        if keyword.lower() in response.lower():
            issues.append(f"AI 정체성 노출: '{keyword}'")
            break
    
    # 4. 길이
    if len(response) < 10:
        issues.append("응답 너무 짧음 (10자 미만)")
    if len(response) > 500:
        issues.append("응답 너무 길음 (500자 초과)")
    
    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
        "cleaned": response,
    }


def parse_objective_response(response: str, options: list) -> dict:
    """객관식 응답에서 선택지 추출"""
    for opt in options:
        if opt in response:
            return {
                "selected_option": opt,
                "match_method": "exact",
                "raw_response": response,
            }
    
    num_match = re.search(r'(\d+)\s*[번\.\)]', response)
    if num_match:
        idx = int(num_match.group(1)) - 1
        if 0 <= idx < len(options):
            return {
                "selected_option": options[idx],
                "match_method": "number",
                "raw_response": response,
            }
    
    return {
        "selected_option": None,
        "match_method": "none",
        "raw_response": response,
    }
