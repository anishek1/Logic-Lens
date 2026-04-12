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
# Option 1: Groq (default — fast, free tier available)
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile   # optional, this is the default

# Option 2: Local
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=mistral    # run: ollama pull mistral

# Option 3: Cloud
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_key_here

DEBUG=true
```

**Fallback chain:** Gemini → Groq (if key missing) → Ollama (if Groq key missing). Groq is now the default provider.

## Architecture

### Analysis flow (async job queue)
1. `POST /api/analyze/` → creates UUID job in `analysis_jobs` dict, returns `job_id`, spawns `BackgroundTask`
2. `GET /api/analyze/stream/{job_id}` → SSE polling loop (0.5s interval) emits `{status, progress}`
3. `GET /api/analyze/results/{job_id}` → returns full `{analysis, documentation, diagrams}` once `status="completed"`

`analysis_jobs` is an in-memory dict in `routes/analyze.py` — no database. All jobs and conversations reset on server restart.

### LLM abstraction (`services/llm_service.py`)
- `LLMService` checks `LLM_PROVIDER` env var at init; all callers create a fresh instance per-request
- For Ollama, `json_mode=False` is used for diagram generation because small local models fail strict JSON; `_extract_mermaid()` regex-parses raw text as fallback
- `_build_code_context()` caps context at 12 000 chars (Ollama) or 50 000 chars (Gemini); prioritises files matching `main/app/index/server/config/__init__`
- Chat uses last 10 messages of history; conversation history lives in `conversations` dict in `routes/chat.py`

### Diagram pipeline
- **Primary**: LLM generates three Mermaid diagrams (`class_diagram`, `flowchart`, `architecture`) as JSON during analysis
- **Fallback**: `DiagramService` in `services/diagram_service.py` generates template-based diagrams from analysis fields; called on-demand via `POST /api/generate/diagram`

### Frontend state flow (`src/App.jsx`)
`App` owns all shared state (`analysisData`, `currentJobId`, `isAnalyzing`). After `POST /api/analyze/` returns a `job_id`, `LoadingProgress` polls the SSE stream and calls `onComplete`/`onError` callbacks into `App`. `AnalysisResults` renders three sub-tabs (Analysis, Docs, Diagrams). `ChatPanel` receives `analysisData` as `context` and posts to `/api/chat/stream` (plain text SSE).

### Key constraints
- `CodeParser.clone_and_parse()` clones into `./repos/<repo-name>/`; re-uses existing clone if directory exists — stale clones are never refreshed automatically
- `DiagramService._clean_name()` strips all non-alphanumeric chars — component names with punctuation are silently truncated to 20 chars
- `generate.py` calls `llm.generate_readme()` which is not defined on `LLMService` — that endpoint will 500
