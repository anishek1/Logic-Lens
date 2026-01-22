# LogicLens Backend

FastAPI-based backend for code analysis and documentation generation.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

## API Endpoints

- `POST /api/analyze` - Analyze a repository
- `GET /api/analyze/stream/{job_id}` - Stream analysis results
- `POST /api/chat` - Chat with codebase
- `POST /api/generate/diagram` - Generate diagrams
