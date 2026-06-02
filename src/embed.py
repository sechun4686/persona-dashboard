from sentence_transformers import SentenceTransformer
import json
import os

MODEL_NAME = "jhgan/ko-sroberta-multitask"

def build_embed_text(record):
    """페르소나의 주요 텍스트 필드를 하나로 합쳐 임베딩용 텍스트 생성"""
    age = record.get('age') or ''
    sex = record.get('sex') or ''
    district = record.get('district') or ''
    occupation = record.get('occupation') or ''
    education = record.get('education_level') or ''

    parts = [
        f"이름 없음, {age}세, {sex}, {district} 거주",
        f"직업: {occupation}",
        f"학력: {education}",
        record.get('persona', ''),
        record.get('professional_persona', ''),
        record.get('cultural_background', ''),
        record.get('hobbies_and_interests', ''),
        record.get('career_goals_and_ambitions', ''),
    ]
    return " ".join([p for p in parts if p])

def embed_personas(input_path="data/personas.jsonl", output_path="data/personas_embedded.jsonl"):
    print("모델 로딩 중...")
    model = SentenceTransformer(MODEL_NAME)

    records = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))

    print(f"{len(records)}개 임베딩 시작...")
    texts = [build_embed_text(r) for r in records]
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=True)

    os.makedirs("data", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for record, embedding in zip(records, embeddings):
            record["embedding"] = embedding.tolist()
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"완료: {len(records)}개 저장 → {output_path}")

if __name__ == "__main__":
    embed_personas()