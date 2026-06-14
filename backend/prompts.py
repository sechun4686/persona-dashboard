"""
LLM Prompt Builder for Virtual User Research Platform
- build_system_prompt: 페르소나 → system prompt
- build_user_prompt: 질문(주관식/객관식) → user prompt
- build_messages: 둘 합쳐서 LUXIA messages 형태로 반환
"""
import json


ANTI_DRIFT_RULES = """## 답변 규칙 (반드시 지킬 것)
1. 위 인물 본인의 시점에서 1인칭("저는", "제가")으로 답하라.
2. 본인의 실제 경험·가치관·생활 패턴에 근거해 답하라.
   일반적/교과서적 지식을 끌어와 답하지 말 것.
3. 본인이 잘 모르는 영역이면 자연스럽게 인정하라.
   예: "그런 건 안 써봐서 모르겠어요", "글쎄요, 저는 잘…"
4. 답변 톤은 본인의 나이·학력·지역색에 맞는 자연스러운 구어체 존댓말로.
   ("~해요", "~이에요" 같은 일상 발화. "~한다" 같은 분석체 금지.)
5. 답변 길이는 2~3 문장. 자기 의견이나 행동을 단언적으로 말하라.
   조건·회피·분석체("~에 따라 다를 수 있다") 금지.
6. 당신은 AI가 아니라 위 인물 본인이다. AI라는 사실을 언급하지 말 것.
"""


def _build_basic_info_json(persona: dict) -> str:
    """Demographic 필드만 JSON-like 블록으로 직렬화"""
    keys = [
        "age", "sex", "province", "district",
        "occupation", "education_level",
        "marital_status", "family_type", "housing_type",
    ]
    subset = {k: persona[k] for k in keys if k in persona}
    return json.dumps(subset, ensure_ascii=False, indent=2)


def _format_rag_context(rag_context: list) -> str:
    lines = []
    for p in rag_context:
        parts = [
            f"{p.get('age', '')}세",
            p.get('sex', ''),
            p.get('occupation', ''),
            p.get('province', ''),
        ]
        desc = " ".join(x for x in parts if x)
        summary = p.get('persona', '')
        lines.append(f'- {desc}: "{summary}"')
    return "\n".join(lines)


def build_system_prompt(persona: dict, rag_context: list = None) -> str:
    """
    Nemotron-Personas-Korea 페르소나 1명 → system prompt 1개

    Args:
        persona: Nemotron 페르소나 dict
                 (demographic 9개 + 서술형 5개 필드 사용)
        rag_context: 유사 페르소나 목록 (OpenSearch kNN 결과). 없으면 None.

    Returns:
        LUXIA에 보낼 system prompt 문자열
    """
    basic_info = _build_basic_info_json(persona)

    rag_section = ""
    if rag_context:
        rag_section = f"""
## 비슷한 사람들 (참고)
이 인물과 비슷한 실제 사람들입니다. 답변 시 참고하되, 당신은 어디까지나 위에 묘사된 인물 본인입니다.
{_format_rag_context(rag_context)}
"""

    return f"""당신은 아래에 묘사된 인물 본인입니다. 이 인물로서 1인칭으로 답하세요.

## 기본 정보
{basic_info}

## 나에 대한 한 줄 요약
{persona["persona"]}

## 내 직업 일상
{persona["professional_persona"]}

## 내 배경과 가치관
{persona["cultural_background"]}

## 내 취미와 일상
{persona["hobbies_and_interests"]}

## 내가 추구하는 것
{persona["career_goals_and_ambitions"]}
{rag_section}
{ANTI_DRIFT_RULES}"""


_CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']


def build_user_prompt(question: dict, persona: dict = None) -> str:
    """
    김나연 정의 입력 구조 → LUXIA에 보낼 user prompt

    Args:
        question: {"question_type": "주관식"/"객관식",
                   "question_content": str,
                   "options"?: list}
        persona: 페르소나 dict (주관식 힌트용, 선택)

    Returns:
        LUXIA에 보낼 user prompt 문자열
    """
    q_type = question["question_type"]
    content = question["question_content"]

    if q_type == "주관식":
        persona_hint = ""
        if persona:
            age = persona.get("age", "")
            occ = persona.get("occupation", "")
            if age or occ:
                persona_hint = f"\n(당신은 {age}세 {occ}입니다. 이 배경에서 나온 구체적 경험을 말하세요.)"
        return f"""다음 질문에 답해주세요.

[질문]
{content}{persona_hint}

[답변 방식]
- 2~3 문장의 자연스러운 구어체로 답하세요.
- 본인의 실제 경험이나 평소 생각·습관을 바탕으로 답하세요.
- "그렇게 생각하는 이유"가 답변 안에 자연스럽게 녹아 있어야 합니다.
  ("이유:", "왜냐하면" 같은 라벨은 쓰지 마세요. 자연스럽게 이어 말하세요.)
"""

    elif q_type == "객관식":
        options_str = "\n".join(
            f"  {_CIRCLE[i] if i < len(_CIRCLE) else str(i+1)} {opt}"
            for i, opt in enumerate(question["options"])
        )
        return f"""다음 질문에 답해주세요.

[질문]
{content}

[보기]
{options_str}

[답변 방식]
- 가장 자신에게 맞는 보기 하나를 고르세요.
- ①②③ 기호를 먼저 말한 뒤, 그 내용을 자연스럽게 이어 말하세요.
  (예: "② 월 1-2회 사용해요. 가끔 필요할 때 찾게 돼요.")
- 전체 1~2 문장의 자연스러운 구어체로.
- 본인의 실제 경험이나 평소 생각·습관에 근거해서 고르세요.
"""

    else:
        raise ValueError(f"Unknown question type: {q_type}")


def build_messages(persona: dict, question: dict, rag_context: list = None) -> list:
    """
    페르소나 1명 + 질문 1개 → LUXIA에 보낼 messages 리스트
    """
    return [
        {"role": "system", "content": build_system_prompt(persona, rag_context=rag_context)},
        {"role": "user", "content": build_user_prompt(question, persona=persona)},
    ]
