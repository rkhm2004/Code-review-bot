FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt

# The CS4 analysis container uses CPU-based Sentence Transformers + FAISS.
# Install the CPU-only PyTorch wheel explicitly so pip does not pull the
# multi-hundred-MB CUDA/cuDNN runtime packages.
RUN python -m pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    "torch==2.8.0"

RUN pip install --no-cache-dir -r /app/requirements.txt

COPY analysis-service /app/analysis-service
COPY knowledge_base /app/knowledge_base

EXPOSE 8000
CMD ["uvicorn", "app:app", "--app-dir", "/app/analysis-service", "--host", "0.0.0.0", "--port", "8000"]
