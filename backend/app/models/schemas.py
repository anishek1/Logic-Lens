"""
Pydantic Schemas for API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class AnalysisRequest(BaseModel):
    """Request to analyze a repository"""
    repo_url: Optional[str] = None
    local_path: Optional[str] = None


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisProgress(BaseModel):
    """Progress update for analysis"""
    status: AnalysisStatus
    progress: int  # 0-100
    message: Optional[str] = None


class OnboardingGuide(BaseModel):
    """Week-1 onboarding guide generated alongside analysis"""
    quick_start: List[str] = []
    files_to_read_first: List[Dict[str, Any]] = []
    conventions: List[str] = []
    tech_debt_vs_design: List[Dict[str, str]] = []
    gotchas: List[str] = []
    week1_checklist: List[str] = []


class AnalysisResponse(BaseModel):
    """Complete analysis response"""
    overview: str
    purpose: str
    architecture: Dict[str, Any]
    technologies: Dict[str, List[str]]
    key_files: List[Dict[str, str]]
    entry_points: List[str]
    dependencies: List[str]
    strengths: List[str]
    improvements: List[str]
    complexity: str
    onboarding_guide: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    """A chat message"""
    role: str  # "user" or "assistant"
    content: str


class DiagramResponse(BaseModel):
    """Generated diagram response"""
    diagram_type: str
    mermaid: str


class DocumentationResponse(BaseModel):
    """Generated documentation"""
    format: str
    content: str
