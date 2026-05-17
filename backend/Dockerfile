FROM python:3.11-slim

# git is required by GitPython to clone repos for analysis
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-bake ONNX models into the image so startup is instant (no 2-3 min download on cold start)
ENV FASTEMBED_CACHE_DIR=/app/models
RUN python -c "from fastembed import TextEmbedding; list(TextEmbedding('BAAI/bge-small-en-v1.5').embed(['warmup']))"
RUN python -c "from fastembed.rerank.cross_encoder import TextCrossEncoder; list(TextCrossEncoder('Xenova/ms-marco-MiniLM-L-6-v2').rerank('test', ['doc']))"

COPY . .

# HF Spaces requires a non-root user with uid 1000
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user

# Cloned repos go to /tmp (ephemeral is fine for analysis jobs)
ENV REPOS_DIR=/tmp/cloned_repos

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
