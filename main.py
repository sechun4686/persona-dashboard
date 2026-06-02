import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ExperimentInput, ExperimentResult
from worker import run_batch
from s3_storage import save_results
from config import LUXIA_API_KEY, LUXIA_API_URL
from orchestrator import async_run

app = FastAPI(title="Experiment API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def llm_call(persona_id: str, messages: list) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            LUXIA_API_URL,
            headers={
                "apikey": LUXIA_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "model": "luxia3-llm-32b-0731",
                "messages": messages,
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/run-experiment")
async def run_experiment(request: ExperimentInput):
    try:
        result = await async_run(request.model_dump())
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        s3_key = save_results(request.experiment_title, result)
        result["s3_key"] = s3_key
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
