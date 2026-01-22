"""
LogicLens Backend - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routes import analyze, chat, generate

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="LogicLens API",
    description="AI-powered code intelligence platform",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "LogicLens API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true"
    }
