FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml README.md ./
COPY src ./src
COPY models ./models
COPY artifacts ./artifacts
COPY config ./config

RUN pip install --no-cache-dir -e .

EXPOSE 8000
CMD ["uvicorn","electrify_ai_ml.api:app","--host","0.0.0.0","--port","8000"]
