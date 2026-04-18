"""
Embedding Service - Build and query a vector index for RAG with reranking.

Retrieval pipeline:
  1. Bi-encoder dense retrieval (top-N candidates from ChromaDB)
  2. Cross-encoder reranker scores (query, chunk) pairs jointly for precision
  3. Return top-k after reranking

Backend: fastembed (ONNX runtime). No PyTorch, ~200 MB install vs 2 GB for
sentence-transformers, and 2-3x faster on CPU.

Models (configurable via env):
  - EMBED_MODEL   (default: BAAI/bge-small-en-v1.5)
                  small general-purpose bi-encoder, 384-dim, ~130 MB ONNX
  - RERANK_MODEL  (default: Xenova/ms-marco-MiniLM-L-6-v2)
                  ~90 MB ONNX cross-encoder

Flags:
  - ENABLE_RAG=false     — skip RAG entirely; chat stuffs analysis JSON instead
  - ENABLE_RERANK=false  — skip reranking (faster, lower precision)

First startup downloads both ONNX models once (~220 MB) into the fastembed
cache. Subsequent runs are instant.
"""
import asyncio
import logging
import os
from pathlib import PurePosixPath
from typing import Dict, List

logger = logging.getLogger(__name__)

_RAG_ENABLED = os.getenv("ENABLE_RAG", "true").lower() not in ("false", "0", "no")
_RERANK_ENABLED = os.getenv("ENABLE_RERANK", "true").lower() not in ("false", "0", "no")

_EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-small-en-v1.5")
_RERANK_MODEL = os.getenv("RERANK_MODEL", "Xenova/ms-marco-MiniLM-L-6-v2")

if _RAG_ENABLED:
    import chromadb

_CHUNK_LINES = 60
_CHUNK_OVERLAP = 10
_CANDIDATE_K = 20  # number pulled from ChromaDB before reranking to top_k
_MAX_CHARS_PER_FILE = 500_000  # skip files larger than this (minified bundles, data dumps)

# Extensions that slip past code_parser but aren't useful for retrieval.
_JUNK_EXTENSIONS = {
    ".map",      # source maps
    ".lock",     # generic lock files
    ".log",
    ".snap",     # jest snapshots
    ".csv", ".tsv",
    ".ipynb",    # notebooks are huge JSON blobs
}

# Filename substrings that indicate generated/minified content.
_JUNK_NAME_PATTERNS = (
    ".min.",        # .min.js, .min.css
    ".bundle.",     # .bundle.js
    ".chunk.",
    "-lock.",       # package-lock, yarn.lock variants
    "vendor.",
)

# Process-lifetime singletons
_client = None
_embed_fn = None
_reranker = None


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.EphemeralClient()
    return _client


class _FastEmbedEmbedding:
    """ChromaDB-compatible embedding function wrapping fastembed."""

    def __init__(self, model_name: str):
        from fastembed import TextEmbedding
        logger.info("Loading embedding model: %s (first run will download ONNX)", model_name)
        self.model = TextEmbedding(model_name=model_name)
        self._name = model_name

    def name(self) -> str:
        return self._name

    def __call__(self, input):
        # fastembed.embed returns a generator of numpy arrays
        return [vec.tolist() for vec in self.model.embed(list(input))]


def _get_embed_fn():
    global _embed_fn
    if _embed_fn is None:
        _embed_fn = _FastEmbedEmbedding(_EMBED_MODEL)
    return _embed_fn


def _get_reranker():
    global _reranker
    if _reranker is None and _RERANK_ENABLED:
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        logger.info("Loading reranker: %s (first run will download ONNX)", _RERANK_MODEL)
        _reranker = TextCrossEncoder(model_name=_RERANK_MODEL)
    return _reranker


def get_embedding_service() -> "EmbeddingService":
    return EmbeddingService()


def _is_junk_file(file: Dict) -> bool:
    """Filter files that code_parser lets through but aren't worth embedding."""
    path = file.get("path", "")
    content = file.get("content", "") or ""

    if len(content) > _MAX_CHARS_PER_FILE:
        return True

    name = PurePosixPath(path.replace("\\", "/")).name.lower()

    for ext in _JUNK_EXTENSIONS:
        if name.endswith(ext):
            return True

    for pat in _JUNK_NAME_PATTERNS:
        if pat in name:
            return True

    return False


class EmbeddingService:

    async def build_index(self, code_data: Dict, job_id: str) -> None:
        """Chunk every source file, embed, and persist to an ephemeral Chroma collection keyed by job_id."""
        if not _RAG_ENABLED:
            return

        collection_name = _safe_name(job_id)
        client = _get_client()
        embed_fn = _get_embed_fn()

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

        all_files = code_data.get("files", [])
        kept_files = [f for f in all_files if not _is_junk_file(f)]
        skipped = len(all_files) - len(kept_files)
        if skipped:
            logger.info("Embedding index: skipped %d junk/oversized files", skipped)

        for file in kept_files:
            for idx, chunk in enumerate(self._chunk_file(file["content"], file["path"])):
                documents.append(chunk)
                metadatas.append({"file_path": file["path"], "language": file["language"]})
                ids.append(f"{job_id}-{file['path']}-{idx}")

        if not documents:
            return

        batch = 128
        for i in range(0, len(documents), batch):
            await asyncio.to_thread(
                collection.add,
                documents=documents[i : i + batch],
                metadatas=metadatas[i : i + batch],
                ids=ids[i : i + batch],
            )

    async def retrieve(self, query: str, job_id: str, top_k: int = 5) -> List[Dict]:
        """Return top_k chunks after dense retrieval + optional cross-encoder rerank."""
        if not _RAG_ENABLED:
            return []

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

        candidate_k = min(_CANDIDATE_K if _RERANK_ENABLED else top_k, count)
        results = await asyncio.to_thread(
            collection.query,
            query_texts=[query],
            n_results=candidate_k,
        )

        candidates = [
            {
                "content": doc,
                "file_path": results["metadatas"][0][i]["file_path"],
                "language": results["metadatas"][0][i]["language"],
            }
            for i, doc in enumerate(results["documents"][0])
        ]

        if not _RERANK_ENABLED or len(candidates) <= top_k:
            return candidates[:top_k]

        reranker = _get_reranker()
        if reranker is None:
            return candidates[:top_k]

        try:
            docs = [c["content"] for c in candidates]
            scores = await asyncio.to_thread(lambda: list(reranker.rerank(query, docs)))
            ranked = sorted(zip(scores, candidates), key=lambda x: float(x[0]), reverse=True)
            return [c for _, c in ranked[:top_k]]
        except Exception:
            logger.exception("Reranker failed; falling back to bi-encoder order")
            return candidates[:top_k]

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
    """ChromaDB names: alphanumeric + hyphens, 3-63 chars, no leading/trailing hyphen."""
    safe = "".join(c if c.isalnum() else "-" for c in job_id)
    safe = safe.strip("-")[:63]
    return safe.ljust(3, "0")
