"""
Embedding Service - Build and query a vector index for RAG
Uses ChromaDB's built-in DefaultEmbeddingFunction (onnxruntime, ~23 MB ONNX model).
No PyTorch / sentence-transformers required.
"""
import asyncio
from typing import Dict, List

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

_CHUNK_LINES = 60
_CHUNK_OVERLAP = 10

# Reuse a single ChromaDB client and embedding function for the process lifetime
_client = None
_embed_fn = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path="./chroma_db")
    return _client


def _get_embed_fn() -> DefaultEmbeddingFunction:
    global _embed_fn
    if _embed_fn is None:
        # Downloads all-MiniLM-L6-v2 as ONNX (~23 MB) on first call, then cached
        _embed_fn = DefaultEmbeddingFunction()
    return _embed_fn


# Kept for backwards-compat with routes that call get_embedding_service()
def get_embedding_service() -> "EmbeddingService":
    return EmbeddingService()


class EmbeddingService:

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def build_index(self, code_data: Dict, job_id: str) -> None:
        """
        Chunk every source file, embed with ChromaDB's built-in function,
        and persist to ./chroma_db/ keyed by job_id.
        """
        collection_name = _safe_name(job_id)
        client = _get_client()
        embed_fn = _get_embed_fn()

        # Drop stale index for this job if it exists
        try:
            await asyncio.to_thread(client.delete_collection, collection_name)
        except Exception:
            pass

        collection = await asyncio.to_thread(
            client.create_collection,
            collection_name,
            embedding_function=embed_fn,
        )

        documents: List[str] = []
        metadatas: List[Dict] = []
        ids: List[str] = []

        for file in code_data.get("files", []):
            for idx, chunk in enumerate(self._chunk_file(file["content"], file["path"])):
                documents.append(chunk)
                metadatas.append({"file_path": file["path"], "language": file["language"]})
                ids.append(f"{job_id}-{file['path']}-{idx}")

        if not documents:
            return

        # ChromaDB embeds automatically when no embeddings= are passed
        batch = 100
        for i in range(0, len(documents), batch):
            await asyncio.to_thread(
                collection.add,
                documents=documents[i : i + batch],
                metadatas=metadatas[i : i + batch],
                ids=ids[i : i + batch],
            )

    async def retrieve(self, query: str, job_id: str, top_k: int = 5) -> List[Dict]:
        """
        Return top_k most semantically similar code chunks for query.
        Returns [] if no index exists for this job_id.
        """
        collection_name = _safe_name(job_id)
        client = _get_client()
        embed_fn = _get_embed_fn()

        try:
            collection = await asyncio.to_thread(
                client.get_collection,
                collection_name,
                embedding_function=embed_fn,
            )
        except Exception:
            return []

        count = await asyncio.to_thread(collection.count)
        if count == 0:
            return []

        results = await asyncio.to_thread(
            collection.query,
            query_texts=[query],
            n_results=min(top_k, count),
        )

        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            chunks.append({
                "content": doc,
                "file_path": results["metadatas"][0][i]["file_path"],
                "language": results["metadatas"][0][i]["language"],
            })
        return chunks

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _chunk_file(self, content: str, file_path: str) -> List[str]:
        lines = content.splitlines()
        if not lines:
            return []

        step = _CHUNK_LINES - _CHUNK_OVERLAP
        chunks = []
        start = 0
        while start < len(lines):
            end = start + _CHUNK_LINES
            body = "\n".join(lines[start:end])
            chunks.append(f"# {file_path}\n{body}")
            if end >= len(lines):
                break
            start += step
        return chunks


def _safe_name(job_id: str) -> str:
    """ChromaDB names: alphanumeric + hyphens, 3–63 chars, no leading/trailing hyphen."""
    safe = "".join(c if c.isalnum() else "-" for c in job_id)
    safe = safe.strip("-")[:63]
    return safe.ljust(3, "0")
