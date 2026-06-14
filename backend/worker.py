import asyncio
from typing import Callable
from config import MAX_CONCURRENCY

async def run_single(semaphore: asyncio.Semaphore, task_fn: Callable, **kwargs) -> dict:
    async with semaphore:
        try:
            result = await asyncio.wait_for(task_fn(**kwargs), timeout=30.0)
            return {"status": "success", "result": result, **kwargs}
        except asyncio.TimeoutError:
            return {"status": "error", "error": "timeout", **kwargs}
        except Exception as e:
            return {"status": "error", "error": str(e), **kwargs}

async def run_batch(task_fn: Callable, tasks: list[dict]) -> list[dict]:
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    coros = [run_single(semaphore, task_fn, **t) for t in tasks]
    return await asyncio.gather(*coros)
