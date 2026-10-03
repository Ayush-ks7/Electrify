FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
# Keep the original package layout: its configuration resolves relative to its source.
COPY ai_ml/Electrify_AI_ML_Final/pyproject.toml ai_ml/Electrify_AI_ML_Final/pyproject.toml
COPY ai_ml/Electrify_AI_ML_Final/src ai_ml/Electrify_AI_ML_Final/src
COPY ai_ml/Electrify_AI_ML_Final/config ai_ml/Electrify_AI_ML_Final/config
COPY ai_ml/Electrify_AI_ML_Final/models/electrify_final_model.joblib ai_ml/Electrify_AI_ML_Final/models/electrify_final_model.joblib
COPY ai_ml/Electrify_AI_ML_Final/artifacts/feature_reference_medians_train_only.json ai_ml/Electrify_AI_ML_Final/artifacts/feature_reference_medians_train_only.json
RUN pip install --no-cache-dir -e ./ai_ml/Electrify_AI_ML_Final
COPY backend backend
RUN pip install --no-cache-dir -e ./backend && useradd --create-home electrify && mkdir /state && chown electrify:electrify /state
ENV DATABASE_URL=sqlite:////state/electrify.db
USER electrify
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
