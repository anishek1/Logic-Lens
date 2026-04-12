# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Backend** (run from `backend/`):
```bash
python -m venv venv
.\venv\Scripts\activate          # Windows
source venv/bin/activate         # Mac/Linux
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (run from `frontend/`):
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Environment (`backend/.env`)

```env
# Default — Groq (fast, free tier)
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile   # optional, this is the default

# Local (no API key)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=mistral    # run: ollama pull mistral

# Cloud
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_key_here

DEBUG=true
REPOS_DIR=./repos
OUTPUT_DIR=./output
```

**Fallback chain:** Gemini → Groq (if key missing) → Ollama (if Groq key missing).

## Architecture

### Analysis flow (async job queue)
1. `POST /api/analyze/` → creates UUID job in `analysis_jobs` dict, returns `job_id`, spawns `BackgroundTask`
2. `GET /api/analyze/stream/{job_id}` → SSE polling loop (0.5s interval) emits `{status, progress}`
3. `GET /api/analyze/results/{job_id}` → returns full `{analysis, documentation, diagrams}` once `status="completed"`

Progress steps: Cloning Repository (0%) → Parsing Code (15%) → Building Search Index (25%) → AI Analysis (30%) → Generating Documentation (60%) → Creating Diagrams (80%) → Done (100%)

`analysis_jobs` is an in-memory dict in `routes/analyze.py` — no database. All jobs and conversations reset on server restart.

### RAG pipeline (`services/embedding_service.py`)
- Uses **ChromaDB** with its built-in `DefaultEmbeddingFunction` (ONNX runtime + all-MiniLM-L6-v2, ~23 MB — no PyTorch)
- First use downloads the ONNX model to `~/.cache/chroma/onnx_models/`
- `build_index(code_data, job_id)` — chunks each file into 60-line segments (10-line overlap), embeds, stores in a ChromaDB collection named by `job_id`
- `retrieve(query, job_id, top_k=5)` — embeds the query, returns top-5 similar chunks with file path metadata
- All ChromaDB calls run in `asyncio.to_thread` to avoid blocking the event loop
- Singleton pattern: `_client` and `_embed_fn` are module-level globals, initialised once on first call
- Collection names are sanitised via `_safe_name()` (alphanumeric + hyphens, 3–63 chars)

### LLM abstraction (`services/llm_service.py`)
- `LLMService` checks `LLM_PROVIDER` env var at init; callers create a fresh instance per request
- **Groq**: uses OpenAI-compatible API at `https://api.groq.com/openai/v1/chat/completions` via `httpx`; supports `response_format: {"type": "json_object"}` for JSON mode; streaming parses `data: {...}` SSE lines
- **Gemini**: lazy import (`import google.generativeai`) inside the provider branch only — avoids version conflicts at module load
- **Ollama**: `json_mode=False` for diagram generation; `_extract_mermaid()` regex-parses raw text as fallback for small models
- `_build_code_context()` limits: Groq = 20 000 chars total / 1 500 chars per file / 800 chars for directory tree; Ollama = 12 000 chars; Gemini = 50 000 chars. Prioritises files matching `main/app/index/server/config/__init__`
- `chat_stream(message, history, context, retrieved_chunks)` — if `retrieved_chunks` present, formats them as code blocks with file paths in the system prompt; otherwise falls back to full analysis JSON
- Chat history: last 10 messages, stored in `conversations` dict in `routes/chat.py`

### RAG-powered chat flow (`routes/chat.py`)
1. `POST /api/chat/` or `POST /api/chat/stream` receives `{message, history, context, job_id}`
2. `_retrieve_chunks(message, job_id)` calls `embedding_service.retrieve()` — returns `[]` on error or missing `job_id`
3. Retrieved chunks injected into LLM system prompt alongside the analysis context
4. Response streamed back as plain-text SSE

### Diagram pipeline
- **Primary**: LLM generates three Mermaid diagrams (`class_diagram`, `flowchart`, `architecture`) as JSON during analysis
- **Fallback**: `DiagramService` in `services/diagram_service.py` generates template-based diagrams; called on-demand via `POST /api/generate/diagram`
- `DiagramService._clean_name()` strips all non-alphanumeric chars — component names with punctuation are silently truncated to 20 chars

### Frontend state flow (`src/App.jsx`)
- `App` owns all shared state: `analysisData`, `currentJobId`, `completedJobId`, `isAnalyzing`, `activeTab`
- `completedJobId` is snapshotted from `currentJobId` at completion and passed to `ChatPanel` — `currentJobId` is cleared after the job finishes to avoid stale closure issues
- After analysis completes: auto-switches to Chat tab + shows a green CTA banner on the Analyze tab
- Chat tab is disabled (`cursor-not-allowed`) until `analysisData` is set
- `LoadingProgress` uses a **refs pattern** for `onComplete`/`onError` callbacks (stored in `useRef`, updated in a separate `useEffect`) so the EventSource `useEffect` only depends on `[jobId]` — prevents reconnection on every parent render
- `ChatPanel` sends `job_id` in every chat request for RAG retrieval; shows a blocker screen with "← Go to Analyze" if no analysis exists yet

### Key constraints
- `CodeParser.clone_and_parse()` clones into `./repos/<repo-name>/`; re-uses existing clone if directory exists — stale clones are never refreshed automatically
- In-memory storage (`analysis_jobs`, `conversations`) resets on every server restart — production would need Redis
- `routes/generate.py` `generate_readme` endpoint calls `llm.generate_documentation()` (fixed from the original broken `llm.generate_readme()` call)
- LogicLens uses **context stuffing + RAG**, not pure RAG — the analysis JSON provides repo-level context; ChromaDB retrieval provides file-level precision for chat answers

## MCP — Stitch (Google UI Design)

Stitch MCP is configured in `~/.claude.json` (user scope) with HTTP transport:

```
URL:    https://stitch.googleapis.com/mcp
Header: X-Goog-Api-Key: <key>
```

Use `/ultimate-design` skill to route design tasks. Key Stitch tools: `mcp__stitch__list_projects`, `mcp__stitch__generate_screen_from_text`, `mcp__stitch__get_screen`, `mcp__stitch__edit_screens`.
