"""
LogicLens Backend - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pathlib import Path
import os

from app.routes import analyze, chat, generate

load_dotenv()

app = FastAPI(
    title="LogicLens API",
    description="AI-powered code intelligence platform",
    version="2.0.0",
    # Hide docs in production
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ─────────────────────────────────────────────────────
# In production Railway serves everything from one origin so
# CORS isn't strictly needed, but kept for local dev flexibility.
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten to allowed_origins once you have a custom domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (must be registered BEFORE StaticFiles mount) ─
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["Chat"])
app.include_router(generate.router,prefix="/api/generate",tags=["Generate"])


@app.get("/api/health")
async def health_check():
    """Railway health check + basic status"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "llm_provider": os.getenv("LLM_PROVIDER", "groq"),
        "groq_configured":   bool(os.getenv("GROQ_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


# ── Serve React frontend (production) ───────────────────────
# In the Docker image the built frontend lands at /app/frontend/dist.
# Locally this path won't exist so FastAPI falls back to dev mode
# (Vite dev server proxies /api → localhost:8000).
_frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    # Mount LAST — catch-all so every non-API path serves index.html
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="static")
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "service": "LogicLens API", "version": "2.0.0",
                "note": "Frontend not built — run `npm run build` in /frontend"}
