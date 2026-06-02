from datasets import load_dataset
import json
import os

# 필요한 필드만 선택
FIELDS = [
    "uuid",
    # 인구통계
    "sex", "age", "marital_status", "military_status",
    "family_type", "housing_type", "education_level",
    "bachelors_field", "occupation", "district", "province",
    # 서술형 페르소나
    "persona", "professional_persona", "sports_persona",
    "arts_persona", "travel_persona", "culinary_persona",
    "family_persona", "cultural_background",
    # 라이프스타일
    "skills_and_expertise", "hobbies_and_interests",
    "career_goals_and_ambitions"
]

def parse_nemotron(sample_size=1000):
    print("데이터셋 로딩 중...")
    dataset = load_dataset(
        "nvidia/Nemotron-Personas-Korea",
        streaming=True,
        split="train"
    )

    records = []
    for i, row in enumerate(dataset):
        if i >= sample_size:
            break

        # 존재하는 필드만 추출
        record = {k: row.get(k, None) for k in FIELDS if k in row}
        records.append(record)

        if i % 100 == 0:
            print(f"{i}개 처리 중...")

    # data 폴더에 저장
    os.makedirs("data", exist_ok=True)
    output_path = "data/personas.jsonl"
    with open(output_path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"완료: {len(records)}개 저장 → {output_path}")
    return records

if __name__ == "__main__":
    parse_nemotron(sample_size=1000)

