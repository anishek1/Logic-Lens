"""
Analysis Routes - Repository analysis and documentation generation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import logging
import time
import uuid
import traceback

from app.services.code_parser import CodeParser
from app.services.llm_service import LLMService
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory job storage — resets on restart.
# Access must go through _jobs_lock since multiple SSE clients and the
# background task all touch the dict concurrently.
analysis_jobs: dict = {}
_jobs_lock = asyncio.Lock()

# Cap how long a single analysis can run. Prevents a hung LLM or massive
# repo clone from leaving a task alive forever.
ANALYSIS_TIMEOUT_SECONDS = 30 * 60

# Drop completed/failed jobs after this many seconds so the dict does not
# grow unbounded across long-lived sessions.
JOB_TTL_SECONDS = 2 * 60 * 60


async def _set_job(job_id: str, **fields) -> None:
    async with _jobs_lock:
        job = analysis_jobs.get(job_id)
        if job is not None:
            job.update(fields)


async def _get_job_snapshot(job_id: str) -> Optional[dict]:
    async with _jobs_lock:
        job = analysis_jobs.get(job_id)
        return dict(job) if job is not None else None


async def _prune_expired_jobs() -> None:
    now = time.time()
    async with _jobs_lock:
        expired = [
            jid for jid, j in analysis_jobs.items()
            if j.get("status") in ("completed", "failed")
            and now - j.get("finished_at", now) > JOB_TTL_SECONDS
        ]
        for jid in expired:
            analysis_jobs.pop(jid, None)


class RepoInput(BaseModel):
    """Input for repository analysis"""
    repo_url: Optional[str] = None
    local_path: Optional[str] = None
    

@router.post("/", response_model=dict)
async def start_analysis(request: RepoInput, background_tasks: BackgroundTasks):
    """
    Start a new code analysis job.
    Returns a job_id that can be used to stream results.
    """
    if not request.repo_url and not request.local_path:
        raise HTTPException(status_code=400, detail="Provide repo_url or local_path")

    await _prune_expired_jobs()

    job_id = str(uuid.uuid4())
    async with _jobs_lock:
        analysis_jobs[job_id] = {
            "status": "pending",
            "progress": 0,
            "results": None,
            "error": None,
            "started_at": time.time(),
            "finished_at": None,
        }

    background_tasks.add_task(
        _run_analysis_with_timeout,
        job_id,
        request.repo_url,
        request.local_path,
    )

    return {"job_id": job_id, "status": "started"}


async def _run_analysis_with_timeout(
    job_id: str, repo_url: Optional[str], local_path: Optional[str]
):
    try:
        await asyncio.wait_for(
            run_analysis(job_id, repo_url, local_path),
            timeout=ANALYSIS_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.error("Job %s exceeded %ds timeout", job_id, ANALYSIS_TIMEOUT_SECONDS)
        await _set_job(
            job_id,
            status="failed",
            error=f"Analysis timed out after {ANALYSIS_TIMEOUT_SECONDS // 60} minutes",
            finished_at=time.time(),
        )


async def run_analysis(job_id: str, repo_url: Optional[str], local_path: Optional[str]):
    """Background task to run the actual analysis"""
    try:
        await _set_job(job_id, status="running")
        logger.info("Job %s: starting analysis for %s", job_id, repo_url or local_path)

        await _set_job(job_id, progress=10)
        parser = CodeParser()

        if repo_url:
            code_files = await parser.clone_and_parse(repo_url)
        else:
            code_files = await parser.parse_local(local_path)

        logger.info(
            "Job %s: parsed %d files, %d lines, languages: %s",
            job_id, code_files['file_count'], code_files['total_lines'], code_files['languages'],
        )
        if code_files['file_count'] == 0:
            raise ValueError(
                "No supported source files found in this repository. "
                "LogicLens supports: .py .js .ts .tsx .jsx .java .go .rs .cpp .c .cs .rb .php"
            )

        await _set_job(job_id, progress=25)
        embedder = get_embedding_service()
        await embedder.build_index(code_files, job_id)
        logger.info("Job %s: embedding index built", job_id)

        await _set_job(job_id, progress=30)

        llm = LLMService()
        logger.info("Job %s: calling LLM (%s) for codebase analysis", job_id, llm.provider)
        analysis = await llm.analyze_codebase(code_files)

        await _set_job(job_id, progress=70)

        logger.info("Job %s: generating documentation", job_id)
        documentation = await llm.generate_documentation(analysis)

        await _set_job(job_id, progress=90)

        logger.info("Job %s: generating diagrams", job_id)
        diagrams = await llm.generate_diagrams(analysis)

        await _set_job(
            job_id,
            progress=100,
            status="completed",
            finished_at=time.time(),
            results={
                "analysis": analysis,
                "documentation": documentation,
                "diagrams": diagrams,
            },
        )

    except Exception as e:
        logger.exception("Job %s: analysis failed", job_id)
        await _set_job(
            job_id,
            status="failed",
            error=str(e),
            finished_at=time.time(),
        )


@router.get("/status/{job_id}")
async def get_analysis_status(job_id: str):
    """Get the status of an analysis job"""
    job = await _get_job_snapshot(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/stream/{job_id}")
async def stream_analysis(job_id: str):
    """Stream analysis progress using Server-Sent Events"""
    if await _get_job_snapshot(job_id) is None:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        while True:
            job = await _get_job_snapshot(job_id) or {}
            data = json.dumps({
                "status": job.get("status"),
                "progress": job.get("progress", 0),
                "error": job.get("error"),
            })
            yield f"data: {data}\n\n"

            if job.get("status") in ("completed", "failed"):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/results/{job_id}")
async def get_results(job_id: str):
    """Get the full results of a completed analysis"""
    job = await _get_job_snapshot(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job status: {job['status']}")

    try:
        serialized = json.dumps(job["results"])
        return JSONResponse(content=json.loads(serialized))
    except Exception as e:
        logger.exception("Job %s: results serialization failed", job_id)
        raise HTTPException(status_code=500, detail=f"Results serialization error: {str(e)}")
