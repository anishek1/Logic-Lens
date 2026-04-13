# ── Stage 1: Build React frontend ────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend (final image) ────────────────────
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

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Production env defaults (override via Railway dashboard)
ENV REPOS_DIR=/tmp/cloned_repos \
    OUTPUT_DIR=/tmp/output \
    LLM_PROVIDER=groq \
    PORT=8000

WORKDIR /app/backend

EXPOSE 8000

# Use $PORT so Railway can assign the port dynamically
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
