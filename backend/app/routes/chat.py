"""
Chat Routes - Conversational interface for code Q&A (RAG-enabled)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

from app.services.llm_service import LLMService
from app.services.embedding_service import get_embedding_service

router = APIRouter()

# Conversation history storage (in-memory, resets on restart)
conversations: Dict[str, List[Dict]] = {}


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[Dict]] = None
    context: Optional[dict] = None
    job_id: Optional[str] = None   # links request to the RAG vector index


@router.post("/")
async def chat(request: ChatRequest):
    """
    Send a message and get an AI response (SSE stream).
    Retrieves relevant code chunks from the vector index when job_id is provided.
    """
    conv_id = request.conversation_id or "default"
    if conv_id not in conversations:
        conversations[conv_id] = []

    conversations[conv_id].append({"role": "user", "content": request.message})

    async def generate_response():
        llm = LLMService()
        retrieved_chunks = await _retrieve_chunks(request.message, request.job_id)
        full_response = ""

        async for chunk in llm.chat_stream(
            message=request.message,
            history=conversations[conv_id][:-1],
            context=request.context,
            retrieved_chunks=retrieved_chunks,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        conversations[conv_id].append({"role": "assistant", "content": full_response})
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate_response(), media_type="text/event-stream")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat responses as plain text chunks (used by ChatPanel).
    RAG retrieval runs before the LLM call when job_id is supplied.
    """
    async def generate():
        try:
            llm = LLMService()
            retrieved_chunks = await _retrieve_chunks(request.message, request.job_id)
            history = request.history or []

            async for chunk in llm.chat_stream(
                message=request.message,
                history=history,
                context=request.context,
                retrieved_chunks=retrieved_chunks,
            ):
                yield chunk

        except Exception as e:
            yield f"\n\n❌ Error: {str(e)}"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history/{conversation_id}")
async def get_history(conversation_id: str):
    if conversation_id not in conversations:
        return {"messages": []}
    return {"messages": conversations[conversation_id]}


@router.delete("/history/{conversation_id}")
async def clear_history(conversation_id: str):
    if conversation_id in conversations:
        del conversations[conversation_id]
    return {"status": "cleared"}


# ------------------------------------------------------------------
# Internal helper
# ------------------------------------------------------------------

async def _retrieve_chunks(message: str, job_id: Optional[str]) -> List[Dict]:
    """Return top-5 RAG chunks for message if a job_id index exists, else []."""
    if not job_id:
        return []
    try:
        embedder = get_embedding_service()
        return await embedder.retrieve(message, job_id, top_k=5)
    except Exception as e:
        print(f"RAG retrieval failed: {e}")
        return []
