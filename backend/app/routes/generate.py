"""
Generate Routes - Diagram and documentation generation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum

from app.services.llm_service import LLMService
from app.services.diagram_service import DiagramService

router = APIRouter()


class DiagramType(str, Enum):
    CLASS = "class"
    FLOWCHART = "flowchart"
    SEQUENCE = "sequence"
    ENTITY_RELATIONSHIP = "er"


class DiagramRequest(BaseModel):
    """Request for diagram generation"""
    analysis: dict  # The code analysis results
    diagram_type: DiagramType
    

class DocumentationRequest(BaseModel):
    """Request for documentation generation"""
    analysis: dict
    format: Literal["markdown", "html"] = "markdown"


@router.post("/diagram")
async def generate_diagram(request: DiagramRequest):
    """
    Generate a Mermaid diagram from analysis results.
    Returns Mermaid syntax that can be rendered in the browser.
    """
    try:
        diagram_service = DiagramService()
        mermaid_code = await diagram_service.generate(
            analysis=request.analysis,
            diagram_type=request.diagram_type.value
        )
        
        return {
            "diagram_type": request.diagram_type,
            "mermaid": mermaid_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documentation")
async def generate_documentation(request: DocumentationRequest):
    """
    Generate documentation from analysis results.
    """
    try:
        llm = LLMService()
        docs = await llm.generate_documentation(request.analysis)
        
        return {
            "format": request.format,
            "content": docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/readme")
async def generate_readme(request: DocumentationRequest):
    """
    Generate a README.md file from analysis.
    """
    try:
        llm = LLMService()
        readme = await llm.generate_readme(request.analysis)
        
        return {
            "filename": "README.md",
            "content": readme
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
