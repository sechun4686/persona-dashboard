"""
응답 분석: 임베딩 → K-means 군집화 → LLM 군집 레이블 → 다양성 지표 계산
"""
import asyncio
import math
from collections import Counter

import numpy as np

_EMBED_MODEL = None


def _get_embed_model():
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        from sentence_transformers import SentenceTransformer
        _EMBED_MODEL = SentenceTransformer("jhgan/ko-sroberta-multitask")
    return _EMBED_MODEL


def choose_k(n_valid: int) -> int:
    if n_valid < 5:
        return 1
    if n_valid < 15:
        return 2
    if n_valid < 30:
        return 3
    return 4


def embed_and_cluster(texts: list[str], k: int) -> tuple[list[int], np.ndarray]:
    from sklearn.cluster import KMeans

    model = _get_embed_model()
    emb = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    if k == 1:
        return [0] * len(texts), emb
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(emb).tolist()
    return labels, emb


def compute_diversity(embeddings: np.ndarray, cluster_ids: list[int]) -> dict:
    from itertools import combinations

    num_clusters = len(set(cluster_ids))
    cluster_set = sorted(set(cluster_ids))

    centroids = []
    for cid in cluster_set:
        idxs = [i for i, c in enumerate(cluster_ids) if c == cid]
        c = embeddings[idxs].mean(axis=0)
        c = c / (np.linalg.norm(c) + 1e-9)
        centroids.append(c)

    if len(centroids) < 2:
        sem_div = 0.0
    else:
        dists = [
            1.0 - float(np.dot(centroids[a], centroids[b]))
            for a, b in combinations(range(len(centroids)), 2)
        ]
        sem_div = round(float(np.mean(dists)) * 100, 1)

    n = len(cluster_ids)
    if num_clusters <= 1:
        entropy_score = 0.0
    else:
        counts = Counter(cluster_ids)
        probs = [counts[cid] / n for cid in counts]
        shannon = -sum(p * math.log(p) for p in probs if p > 0)
        entropy_score = round(shannon / math.log(num_clusters) * 100, 1)

    return {
        "semantic_diversity_score": sem_div,
        "opinion_distribution_score": entropy_score,
        "cluster_count": num_clusters,
    }


async def generate_cluster_labels(
    cluster_groups: dict,
    call_llm_fn,
    experiment_title: str = "",
) -> dict:
    """각 군집에 LLM으로 5-8자 레이블 생성. 실패 시 키워드 기반 fallback."""

    async def _label_one(cid: int) -> tuple[int, str]:
        texts = cluster_groups[cid]
        sample_text = "\n".join(f"- {t[:120]}" for t in texts[:3])
        messages = [
            {
                "role": "system",
                "content": (
                    "당신은 사용자 리서치 전문가입니다. "
                    "주어진 응답들의 공통 의견 패턴 이름을 5-8자 한국어 명사구로만 답하세요. "
                    "설명 없이 군집 이름만 출력하세요."
                ),
            },
            {
                "role": "user",
                "content": f"실험: {experiment_title}\n군집 이름 (5-8자 한국어):\n{sample_text}",
            },
        ]
        label = await call_llm_fn(messages)
        if label and 2 <= len(label.strip()) <= 20:
            return cid, label.strip()
        return cid, _keyword_fallback_label(cluster_groups[cid], cid)

    results = await asyncio.gather(*[_label_one(cid) for cid in sorted(cluster_groups)])
    return dict(results)


def _keyword_fallback_label(texts: list[str], cid: int) -> str:
    stopwords = {
        "이", "가", "을", "를", "은", "는", "에", "의", "도", "로", "와", "과",
        "그", "저", "우리", "제", "것", "수", "더", "도", "만", "또",
    }
    freq: Counter = Counter()
    for t in texts:
        for w in t.split():
            w = w.strip(".,?!\"'…()[]")
            if len(w) >= 2 and w not in stopwords:
                freq[w] += 1
    top = [w for w, _ in freq.most_common(2)]
    if top:
        label = top[0]
        return (label[:6] + " 그룹") if len(label) <= 4 else label[:8]
    return f"의견 그룹 {cid + 1}"
