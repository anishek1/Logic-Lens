# Backend-only image — frontend is deployed separately on Vercel
FROM python:3.11-slim

# git is required at runtime for repo cloning
RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (cached layer)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Production env defaults (override via Railway / Cloud Run dashboard)
ENV REPOS_DIR=/tmp/cloned_repos \
    OUTPUT_DIR=/tmp/output \
    LLM_PROVIDER=groq \
    ENABLE_RAG=false \
    PORT=8000

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
