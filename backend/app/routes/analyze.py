"""
Analysis Routes - Repository analysis and documentation generation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional
import asyncio
import json
import uuid
import traceback

from app.services.code_parser import CodeParser
from app.services.llm_service import LLMService
from app.services.embedding_service import get_embedding_service
from app.models.schemas import AnalysisRequest, AnalysisResponse

router = APIRouter()

# In-memory job storage (replace with Redis/DB in production)
analysis_jobs = {}


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
    
    job_id = str(uuid.uuid4())
    analysis_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "results": None,
        "error": None
    }
    
    # Start analysis in background
    background_tasks.add_task(
        run_analysis,
        job_id,
        request.repo_url,
        request.local_path
    )
    
    return {"job_id": job_id, "status": "started"}


async def run_analysis(job_id: str, repo_url: Optional[str], local_path: Optional[str]):
    """Background task to run the actual analysis"""
    try:
        analysis_jobs[job_id]["status"] = "running"
        print(f"\n▶ Job {job_id}: starting analysis for {repo_url or local_path}")

        # Step 1: Clone/load repository
        analysis_jobs[job_id]["progress"] = 10
        parser = CodeParser()

        if repo_url:
            code_files = await parser.clone_and_parse(repo_url)
        else:
            code_files = await parser.parse_local(local_path)

        print(f"  ✔ Parsed {code_files['file_count']} files, {code_files['total_lines']} lines, languages: {code_files['languages']}")
        if code_files['file_count'] == 0:
            raise ValueError(
                "No supported source files found in this repository. "
                "LogicLens supports: .py .js .ts .tsx .jsx .java .go .rs .cpp .c .cs .rb .php"
            )

        # Step 2: Build RAG vector index from source files
        analysis_jobs[job_id]["progress"] = 25
        embedder = get_embedding_service()
        await embedder.build_index(code_files, job_id)
        print("  ✔ Embedding index built")

        analysis_jobs[job_id]["progress"] = 30

        # Step 2: Analyze with LLM
        llm = LLMService()
        print(f"  ▶ Calling LLM ({llm.provider}) for codebase analysis...")
        analysis = await llm.analyze_codebase(code_files)
        print(f"  ✔ Analysis done. Keys: {list(analysis.keys()) if isinstance(analysis, dict) else type(analysis)}")

        analysis_jobs[job_id]["progress"] = 70

        # Step 3: Generate documentation
        print("  ▶ Generating documentation...")
        documentation = await llm.generate_documentation(analysis)

        analysis_jobs[job_id]["progress"] = 90

        # Step 4: Generate diagrams
        print("  ▶ Generating diagrams...")
        diagrams = await llm.generate_diagrams(analysis)
        
        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["results"] = {
            "analysis": analysis,
            "documentation": documentation,
            "diagrams": diagrams,
        }
        
    except Exception as e:
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["error"] = str(e)
        print(f"\n❌ Analysis job {job_id} FAILED:")
        traceback.print_exc()


@router.get("/status/{job_id}")
async def get_analysis_status(job_id: str):
    """Get the status of an analysis job"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return analysis_jobs[job_id]


@router.get("/stream/{job_id}")
async def stream_analysis(job_id: str):
    """Stream analysis progress using Server-Sent Events"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    async def event_generator():
        while True:
            job = analysis_jobs.get(job_id, {})
            data = json.dumps({
                "status": job.get("status"),
                "progress": job.get("progress", 0),
                "error": job.get("error")
            })
            yield f"data: {data}\n\n"
            
            if job.get("status") in ["completed", "failed"]:
                break
            
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@router.get("/results/{job_id}")
async def get_results(job_id: str):
    """Get the full results of a completed analysis"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = analysis_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job status: {job['status']}")

    try:
        # Explicit serialization so we get a clear error instead of a silent 500
        serialized = json.dumps(job["results"])
        return JSONResponse(content=json.loads(serialized))
    except Exception as e:
        print(f"\n❌ Results serialization failed for job {job_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Results serialization error: {str(e)}")
