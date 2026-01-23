"""
Chat Routes - Conversational interface for code Q&A
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

from app.services.llm_service import LLMService

router = APIRouter()

# Conversation history storage (in-memory, replace with DB)
conversations = {}


class ChatMessage(BaseModel):
    """A single chat message"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Chat request payload"""
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[Dict]] = None
    context: Optional[dict] = None


@router.post("/")
async def chat(request: ChatRequest):
    """
    Send a message and get AI response.
    Streams the response for real-time display.
    """
    conv_id = request.conversation_id or "default"
    if conv_id not in conversations:
        conversations[conv_id] = []
    
    conversations[conv_id].append({
        "role": "user",
        "content": request.message
    })
    
    async def generate_response():
        llm = LLMService()
        full_response = ""
        
        async for chunk in llm.chat_stream(
            message=request.message,
            history=conversations[conv_id][:-1],
            context=request.context
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        
        conversations[conv_id].append({
            "role": "assistant", 
            "content": full_response
        })
        
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream"
    )


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat responses directly without SSE wrapper.
    Returns raw text chunks for simpler frontend consumption.
    """
    async def generate():
        try:
            llm = LLMService()
            
            history = request.history or []
            
            async for chunk in llm.chat_stream(
                message=request.message,
                history=history,
                context=request.context
            ):
                yield chunk
                
        except Exception as e:
            yield f"\n\n❌ Error: {str(e)}"
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/history/{conversation_id}")
async def get_history(conversation_id: str):
    """Get conversation history"""
    if conversation_id not in conversations:
        return {"messages": []}
    
    return {"messages": conversations[conversation_id]}


@router.delete("/history/{conversation_id}")
async def clear_history(conversation_id: str):
    """Clear conversation history"""
    if conversation_id in conversations:
        del conversations[conversation_id]
    
    return {"status": "cleared"}
