FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY analysis-service /app/analysis-service
COPY knowledge_base /app/knowledge_base

EXPOSE 8000
CMD ["uvicorn", "analysis-service.app:app", "--host", "0.0.0.0", "--port", "8000"]
