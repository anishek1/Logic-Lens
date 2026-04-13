# LogicLens

> AI-powered code intelligence platform — clone any GitHub repo, get instant architecture analysis, auto-generated documentation, interactive Mermaid diagrams, and a RAG-powered chat that searches the actual source code.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Architecture Analysis** | Detects patterns (MVC, Microservices, Monolith), components, entry points, and complexity |
| 📄 | **Auto Documentation** | Generates structured Markdown docs — overview, features, setup, key components |
| 📊 | **Live Diagrams** | Architecture, class diagram, and flowchart rendered with Mermaid.js |
| 💬 | **RAG-Powered Chat** | Embeds code chunks into ChromaDB; retrieves relevant files before every LLM answer |
| ⚡ | **Real-time Streaming** | SSE progress bar during analysis + word-by-word streamed chat responses |
| 🔒 | **Multi-Provider LLM** | Groq (fast, free) · Gemini (cloud) · Ollama (100% local, no data leaves your machine) |

---

## Tech Stack

### Backend
| | Technology |
|---|---|
| Framework | FastAPI (async) + Uvicorn |
| LLM Providers | [Groq](https://console.groq.com) `llama-3.3-70b-versatile` · Google Gemini · Ollama |
| RAG / Embeddings | ChromaDB `EphemeralClient` + built-in `all-MiniLM-L6-v2` ONNX (~23 MB, no PyTorch) |
| Repo Cloning | GitPython |
| HTTP Client | httpx (async) |

### Frontend
| | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Diagrams | Mermaid.js |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |
| Streaming | Native `EventSource` (SSE) + Fetch `ReadableStream` |

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
  GitPython   CodeParser    LLMService           EmbeddingService
  (clone)     (parse files) (Groq/Gemini/Ollama) (ChromaDB RAG)
```

### Analysis pipeline (background task)

```
POST /api/analyze/
  └─► job created (UUID) ──► BackgroundTask starts
        │
        ├─ 1. Clone repo (GitPython → ../cloned_repos/owner__repo/)
        ├─ 2. Parse files (supported extensions only, ignores node_modules etc.)
        ├─ 3. Build vector index (ChromaDB: chunk 60 lines, embed with all-MiniLM)
        ├─ 4. LLM analyze (architecture, tech stack, key files, complexity)
        ├─ 5. LLM generate docs (Markdown)
        └─ 6. LLM generate diagrams (3× Mermaid JSON)
                └─► job["status"] = "completed"

GET /api/analyze/stream/{id}   — SSE polling every 500ms, emits {status, progress}
GET /api/analyze/results/{id}  — returns {analysis, documentation, diagrams}
```

### RAG chat pipeline

```
User question
  └─► embed question (all-MiniLM-L6-v2)
        └─► ChromaDB cosine similarity → top-5 code chunks
              └─► LLM prompt = system(repo overview + chunks) + history + question
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
LLM_PROVIDER=groq                       # groq | gemini | ollama

# Groq (recommended — fast, generous free tier)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Gemini
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_key_here

# Ollama (fully local, no API key)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=mistral

# ── Paths ─────────────────────────────────────────────────
REPOS_DIR=../cloned_repos               # where repos are cloned
OUTPUT_DIR=../output

# ── App ───────────────────────────────────────────────────
DEBUG=true
```

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
├── Dockerfile                       # Multi-stage: Node (build) → Python (serve)
├── railway.toml                     # Railway deployment config
├── .dockerignore
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

## Deployment — Railway

The repo ships with a production-ready multi-stage `Dockerfile` and `railway.toml`.

### Steps

1. Push to GitHub
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select this repo
3. Railway auto-detects `railway.toml` and builds the Docker image
4. Set environment variables in the Railway dashboard:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `LLM_PROVIDER` | `groq` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `REPOS_DIR` | `/tmp/cloned_repos` |
| `DEBUG` | `false` |

5. Enable **Sleep on inactivity** (Service → Settings) to stay within the free $5/month credit

### Self-hosted with Docker

```bash
# Build (from repo root)
docker build -t logiclens .

# Run
docker run -p 8000:8000 \
  -e GROQ_API_KEY=gsk_your_key \
  -e LLM_PROVIDER=groq \
  -e REPOS_DIR=/tmp/cloned_repos \
  logiclens
```

App available at `http://localhost:8000`

---

## Known Limitations

| Limitation | Detail |
|---|---|
| In-memory job store | `analysis_jobs` dict resets on server restart — production should use Redis |
| Public repos only | Private GitHub repos require SSH/token auth (not implemented) |
| Large repos | Context is capped: Groq 20K chars · Gemini 50K · Ollama 12K. Very large repos get truncated to priority files |
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

MIT © [Anishekh Prasad](https://github.com/anishek1)
