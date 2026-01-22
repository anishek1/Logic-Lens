"""
Chat Routes - Conversational interface for code Q&A
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
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
    context: Optional[dict] = None  # Analysis context if available


@router.post("/")
async def chat(request: ChatRequest):
    """
    Send a message and get AI response.
    Streams the response for real-time display.
    """
    # Get or create conversation
    conv_id = request.conversation_id or "default"
    if conv_id not in conversations:
        conversations[conv_id] = []
    
    # Add user message
    conversations[conv_id].append({
        "role": "user",
        "content": request.message
    })
    
    async def generate_response():
        llm = LLMService()
        full_response = ""
        
        async for chunk in llm.chat_stream(
            message=request.message,
            history=conversations[conv_id][:-1],  # Exclude current message
            context=request.context
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        
        # Save assistant response
        conversations[conv_id].append({
            "role": "assistant", 
            "content": full_response
        })
        
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream"
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
