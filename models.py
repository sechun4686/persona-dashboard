from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ── 입력 구조 (ExperimentInput) ──────────────────────

class Question(BaseModel):
    question_id: int
    question_content: str
    question_type: str  # "주관식" or "객관식"
    options: list[str] = []

class Image(BaseModel):
    image_id: int
    label: str
    url: str

class Filters(BaseModel):
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
    questions: list[Question]
    images: list[Image] = []
    filters: Optional[Filters] = None
    n: int = 100

# ── 출력 구조 (ExperimentResult) ─────────────────────

class PersonaResult(BaseModel):
    persona_uuid: str
    sex: str
    age: int
    province: str
    district: str
    occupation: str
    education_level: str
    marital_status: str

class Response(BaseModel):
    persona_uuid: str
    question_id: int
    image_id: Optional[int] = None
    response: Optional[str] = None
    selected_option: Optional[str] = None
    rag_context_used: Optional[str] = None

class ExperimentResult(BaseModel):
    experiment_title: str
    experiment_type: str
    n_requested: int
    n_collected: int
    completed_at: datetime
    personas: list[PersonaResult]
    responses: list[Response]
