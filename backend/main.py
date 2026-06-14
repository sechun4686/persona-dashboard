import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ExperimentInput
from orchestrator import async_run

# S3 저장은 선택 — AWS 미설정 시 건너뜀
try:
    from s3_storage import save_results as _s3_save
    _S3_ENABLED = True
except Exception:
    _S3_ENABLED = False

app = FastAPI(title="Experiment API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "s3": _S3_ENABLED}

@app.post("/run-experiment")
async def run_experiment(request: ExperimentInput):
    try:
        result = await async_run(request.model_dump())
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        if _S3_ENABLED:
            try:
                s3_key = _s3_save(request.experiment_title, result)
                result["s3_key"] = s3_key
            except Exception as e:
                result["s3_key"] = None
                print(f"[main] S3 저장 실패 (무시): {e}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
