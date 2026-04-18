# LogicLens

> AI-powered code intelligence platform — clone any GitHub repo, get instant architecture analysis, auto-generated documentation, interactive Mermaid diagrams, and a RAG-powered chat that searches the actual source code.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Architecture Analysis** | Four parallel LLM sub-calls (overview · architecture · files · insights) — richer output, 3-4× faster than one mega-prompt |
| 📄 | **Auto Documentation** | Generates structured Markdown docs — overview, features, setup, key components |
| 📊 | **Live Diagrams** | Architecture, class diagram, and flowchart generated in parallel with Mermaid.js |
| 💬 | **RAG-Powered Chat** | Two-stage retrieval: bi-encoder pulls 20 candidates, cross-encoder reranks to top-5 before every LLM answer |
| ⚡ | **Real-time Streaming** | SSE progress bar during analysis + word-by-word streamed chat responses |
| 🔒 | **Multi-Provider LLM** | Groq (fast, free) · NVIDIA NIM (large context) · Gemini (cloud) · Ollama (100% local) |

---

## Tech Stack

### Backend
| | Technology |
|---|---|
| Framework | FastAPI (async) + Uvicorn |
| LLM Providers | [Groq](https://console.groq.com) `llama-3.3-70b-versatile` · [NVIDIA NIM](https://build.nvidia.com) (Nemotron / MiniMax / Llama) · Google Gemini · Ollama |
| Embeddings | [fastembed](https://github.com/qdrant/fastembed) (ONNX runtime, no PyTorch) + `BAAI/bge-small-en-v1.5` (384-dim) |
| Reranker | `Xenova/ms-marco-MiniLM-L-6-v2` cross-encoder (ONNX) |
| Vector Store | ChromaDB `EphemeralClient` |
| Repo Cloning | GitPython |
| HTTP Client | httpx (async) · openai SDK (for NIM) |

### Frontend
| | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Diagrams | Mermaid.js |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |
| Streaming | Native `EventSource` (SSE) + Fetch `ReadableStream` |

---

## ML Algorithms & Models

The retrieval pipeline is a classic two-stage **retrieve-then-rerank** pattern: a cheap bi-encoder narrows the whole repo to 20 candidates, then an expensive cross-encoder rescores only those 20 for precision. All inference runs on CPU via ONNX Runtime — no GPU, no PyTorch.

| Stage | Algorithm / Model | Type | Size | Purpose |
|---|---|---|---|---|
| **Chunking** | Sliding window (60 lines, 10-line overlap) | Deterministic | — | Split each source file into retrievable units while preserving cross-chunk context |
| **Junk filter** | Extension + size heuristics | Deterministic | — | Drops `.min.js`, `.bundle.js`, source maps, files >500 KB before indexing |
| **Embedding** | `BAAI/bge-small-en-v1.5` | Bi-encoder transformer (384-dim) | ~130 MB | Encodes query and chunks into dense vectors independently |
| **Dense retrieval** | Cosine similarity over HNSW | Approximate nearest-neighbor | — | ChromaDB pulls top-20 candidates from the vector index |
| **Reranking** | `Xenova/ms-marco-MiniLM-L-6-v2` | Cross-encoder transformer | ~90 MB | Jointly scores each `(query, chunk)` pair → top-5 for the LLM |
| **Generation** | `llama-3.3-70b-versatile` (Groq) · Nemotron / MiniMax (NIM) · Gemini · Mistral (Ollama) | Causal LLM | — | Produces structured analysis JSON, Markdown docs, Mermaid diagrams, and streamed chat replies |
| **Inference runtime** | [ONNX Runtime](https://onnxruntime.ai/) via [fastembed](https://github.com/qdrant/fastembed) | CPU graph executor | — | 2-3× faster than `sentence-transformers`, no PyTorch dependency |

**Why two stages?** A bi-encoder is fast but treats the query and chunk separately, which misses subtle relevance. A cross-encoder reads both together — far more accurate but too slow to run over an entire repo. Running the bi-encoder first to get 20 candidates, then the cross-encoder to rerank, gets you cross-encoder precision at bi-encoder speed.

Set `ENABLE_RERANK=false` to skip the second stage (faster chat, lower precision). Set `ENABLE_RAG=false` to disable retrieval entirely and stuff the analysis JSON into the chat prompt instead.

---

## Architecture

```
Browser (React)
  └── RepoInput → LoadingProgress → AnalysisResults / ChatPanel
           │               │ SSE                │ HTTP
           ▼               ▼                    ▼
     FastAPI Backend ─────────────────────────────────
     │                                                │
     ├── POST /api/analyze/        (start job)        │
     ├── GET  /api/analyze/stream/{id}  (SSE)         │
     ├── GET  /api/analyze/results/{id} (full JSON)   │
     └── POST /api/chat/stream     (RAG + LLM stream) │
           │                                          │
     ┌─────┴──────┐              ┌────────────────────┘
     │            │              │
  GitPython   CodeParser    LLMService                 EmbeddingService
  (clone)     (parse files) (Groq/NIM/Gemini/Ollama)   (fastembed + ChromaDB + reranker)
```

### Analysis pipeline (background task)

```
POST /api/analyze/
  └─► job created (UUID) ──► BackgroundTask starts
        │
        ├─ 1. Clone repo (GitPython → ../cloned_repos/owner__repo/)
        ├─ 2. Parse files (supported extensions only, ignores node_modules etc.)
        ├─ 3. Build vector index (fastembed bge-small → ChromaDB, 60-line chunks)
        ├─ 4. LLM analyze — 4 parallel sub-calls via asyncio.gather:
        │       ├─ overview        (purpose, technologies, complexity)
        │       ├─ architecture    (pattern, components, 300-500 word description)
        │       ├─ files           (key files, entry points, dependencies)
        │       └─ insights        (strengths + improvements with file evidence)
        ├─ 5. LLM generate docs (Markdown)
        └─ 6. LLM generate diagrams — 3 parallel sub-calls:
                ├─ architecture (subgraphs, 8-15 nodes)
                ├─ flowchart    (10-20 nodes, decision diamonds)
                └─ class        (classDiagram, 6-12 components)
                └─► job["status"] = "completed"

GET /api/analyze/stream/{id}   — SSE polling every 500ms, emits {status, progress}
GET /api/analyze/results/{id}  — returns {analysis, documentation, diagrams}
```

### RAG chat pipeline (two-stage retrieval)

```
User question
  └─► embed question (fastembed: BAAI/bge-small-en-v1.5 → 384-dim vector)
        └─► ChromaDB cosine similarity → top-20 candidate chunks
              └─► cross-encoder rerank (Xenova/ms-marco-MiniLM-L-6-v2)
                    scores every (query, chunk) pair jointly → top-5
                    └─► LLM prompt = system(repo overview + chunks) + last 10 messages + question
                          └─► streamed response (word-by-word SSE)
```

---

## Quick Start

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **Git** on `PATH`
- A free [Groq API key](https://console.groq.com) (or Gemini / local Ollama)

### 1. Clone

```bash
git clone https://github.com/anishek1/Logic-Lens.git
cd Logic-Lens
```

### 2. Backend

```bash
cd backend

python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Mac / Linux

pip install -r requirements.txt
```

Copy the env template and add your key:

```bash
cp .env.example .env
# open .env and set GROQ_API_KEY=gsk_...
```

Start:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite proxies `/api/*` → `localhost:8000` automatically — no CORS setup needed for local dev.

---

## Environment Variables

File: `backend/.env` (never commit — already in `.gitignore`)

```env
# ── LLM Provider ─────────────────────────────────────────
LLM_PROVIDER=groq                       # groq | nim | gemini | ollama

# Groq (recommended — fast, generous free tier)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# NVIDIA NIM (large context, strong reasoning models)
# LLM_PROVIDER=nim
# NIM_API_KEY=nvapi-your_key_here
# NIM_MODEL=nvidia/nemotron-3-nano-30b-a3b          # fast hybrid MoE
# NIM_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1  # larger reasoning model
# NIM_MODEL=minimaxai/minimax-m2.5                  # strong general model
# NIM_MODEL=meta/llama-3.3-70b-instruct             # broad coverage

# Gemini
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_key_here

# Ollama (fully local, no API key)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=mistral

# ── Paths ─────────────────────────────────────────────────
REPOS_DIR=../cloned_repos               # where repos are cloned

# ── RAG ───────────────────────────────────────────────────
ENABLE_RAG=true                         # false disables ChromaDB entirely (~300 MB RAM saved)
ENABLE_RERANK=true                      # false skips cross-encoder rerank (faster, lower precision)
EMBED_MODEL=BAAI/bge-small-en-v1.5
RERANK_MODEL=Xenova/ms-marco-MiniLM-L-6-v2

# ── App ───────────────────────────────────────────────────
DEBUG=true
```

> **First-run downloads**: With RAG enabled, the first analysis downloads ~220 MB of ONNX models (bge-small + cross-encoder) into the fastembed cache. Cached forever after.

---

## API Reference

### Analysis

| Method | Endpoint | Body / Params | Response |
|---|---|---|---|
| `POST` | `/api/analyze/` | `{"repo_url": "https://github.com/..."}` | `{"job_id": "uuid"}` |
| `GET` | `/api/analyze/stream/{job_id}` | — | SSE: `{status, progress, error}` |
| `GET` | `/api/analyze/results/{job_id}` | — | `{analysis, documentation, diagrams}` |
| `GET` | `/api/analyze/status/{job_id}` | — | `{status, progress, error}` |

### Chat

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/api/chat/stream` | `{message, history, context, job_id}` | Streamed text |
| `POST` | `/api/chat/` | `{message, history, context, job_id}` | `{"response": "..."}` |

### Generate

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate/diagram` | Generate a single Mermaid diagram on demand |
| `POST` | `/api/generate/readme` | Generate README from existing analysis |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns LLM provider config + live status |

---

## Project Structure

```
Logic_Lens/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, static file serving
│   │   ├── routes/
│   │   │   ├── analyze.py           # Job queue, SSE stream, results
│   │   │   ├── chat.py              # RAG chat (stream + sync)
│   │   │   └── generate.py          # On-demand diagram / README
│   │   ├── services/
│   │   │   ├── code_parser.py       # Git clone + recursive file parser
│   │   │   ├── llm_service.py       # Groq / Gemini / Ollama abstraction + RAG prompt builder
│   │   │   ├── embedding_service.py # ChromaDB build_index + retrieve
│   │   │   └── diagram_service.py   # Template-based Mermaid fallback
│   │   └── models/
│   │       └── schemas.py           # Pydantic request / response models
│   ├── requirements.txt
│   ├── .env                         # ← create from .env.example (gitignored)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Root component — all shared state
│   │   ├── index.css                # Design tokens, animations, utilities
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── RepoInput.jsx        # Hero section + URL input
│   │       ├── LoadingProgress.jsx  # SSE-driven step tracker
│   │       ├── AnalysisResults.jsx  # Tabbed dashboard (overview/arch/diagrams/docs)
│   │       ├── ChatPanel.jsx        # RAG chat UI with streaming
│   │       ├── MermaidDiagram.jsx   # Mermaid renderer
│   │       └── MarkdownRenderer.jsx # Syntax-highlighted Markdown
│   ├── package.json
│   └── vite.config.js               # Dev proxy: /api → localhost:8000
│
└── .gitignore
```

---

## Supported File Types

| Language | Extensions |
|---|---|
| Python | `.py` |
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Java | `.java` |
| Go | `.go` |
| Rust | `.rs` |
| C / C++ | `.c`, `.h`, `.cpp` |
| C# | `.cs` |
| Ruby | `.rb` |
| PHP | `.php` |

---

## Known Limitations

| Limitation | Detail |
|---|---|
| In-memory job store | `analysis_jobs` dict resets on server restart |
| Public repos only | Private GitHub repos require SSH/token auth (not implemented) |
| Large repos | Context is capped: Groq 35K chars · NIM 50K · Gemini 100K · Ollama 18K. Very large repos get truncated to priority files |
| Stale clones | Already-cloned repos are reused. Delete `cloned_repos/<owner>__<repo>/` to force a fresh clone |
| ChromaDB ephemeral | Vector index resets on restart — re-analyzing rebuilds it in ~30 seconds |

---

## Troubleshooting

**Analysis stuck at 0% / job 404**
- Uvicorn may have hot-reloaded mid-analysis (triggered by new `.py` files appearing in `repos/`). Make sure `REPOS_DIR` points outside the `backend/` directory (the default `../cloned_repos` already does this).

**"fatal: repository not found"**
- Paste only the base repo URL. Any GitHub URL format works: `github.com/user/repo`, `github.com/user/repo.git`, or even `github.com/user/repo/tree/main` — the clone URL is normalized automatically.

**LLM response "not available" everywhere**
- The LLM returned malformed JSON. This happens with very large repos that overflow the context window. Try a smaller repo, or switch to `LLM_PROVIDER=gemini` for a larger (50K char) context window.

**Ollama: "connection refused"**
- Make sure Ollama is running: `ollama serve`
- Pull the model first: `ollama pull mistral`

---

## License

MIT © [ Anishekh Prasad ](https://github.com/anishek1)
