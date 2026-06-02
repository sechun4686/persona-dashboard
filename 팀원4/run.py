"""
실험 실행 진입점.
입력값을 수정한 뒤 실행:
    python run.py
결과는 results/ 폴더에 JSON으로 저장됩니다.
"""

import json
import os
from datetime import datetime

from orchestrator import run

# ---------------------------------------------------------------------------
# 실험 입력 — 여기를 수정하세요
# ---------------------------------------------------------------------------

INPUT = {
    "experiment_title": "가계부 앱 사전조사",
    "experiment_type": "사전조사",
    "service_description": "20-30대 타겟 가계부 앱",
    "images": [],
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

# ---------------------------------------------------------------------------
# 실행
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"실험 시작: {INPUT['experiment_title']}")
    print(f"페르소나 {INPUT['n']}명 × 질문 {len(INPUT['questions'])}개 = "
          f"응답 {INPUT['n'] * len(INPUT['questions'])}건 예상\n")

    results = run(INPUT)

    if "error" in results:
        print(f"\n[오류] {results['error']}")
    else:
        # 결과 저장
        os.makedirs("results", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"results/{timestamp}_{INPUT['experiment_title']}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print(f"\n완료: 페르소나 {results['n_collected']}명, "
              f"응답 {len(results['responses'])}건")
        print(f"저장 위치: {filename}")
