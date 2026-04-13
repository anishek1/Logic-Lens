# Stage 1: Build React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend (final image)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /frontend/dist ./frontend/dist

ENV REPOS_DIR=/tmp/cloned_repos \
    OUTPUT_DIR=/tmp/output \
    LLM_PROVIDER=groq \
    ENABLE_RAG=false \
    PORT=8000

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
