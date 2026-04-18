"""
LogicLens Backend - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routes import analyze, chat, generate

load_dotenv()

app = FastAPI(
    title="LogicLens API",
    description="AI-powered code intelligence platform",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,    # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["Chat"])
app.include_router(generate.router,prefix="/api/generate",tags=["Generate"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "llm_provider": os.getenv("LLM_PROVIDER", "groq"),
        "groq_configured":   bool(os.getenv("GROQ_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "LogicLens API", "version": "2.0.0"}
