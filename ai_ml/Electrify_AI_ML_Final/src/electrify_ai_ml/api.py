from __future__ import annotations
import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from typing import Any

from .config import Settings
from .exceptions import InputValidationError, ModelLoadError
from .logging_utils import configure_logging, get_logger
from .service import RiskService
from .constants import FEATURES

settings=Settings.from_env()
configure_logging(settings.log_level)
logger=get_logger("electrify.api")
try:
    service=RiskService.create(settings)
    _load_error=None
except ModelLoadError as exc:
    service=None
    _load_error=str(exc)
    logger.exception("Model initialization failed")

app=FastAPI(
    title="Electrify AI/ML Inference API",
    version="1.0.0",
    description="Self-contained risk-scoring component for Electrify. Model outputs are review-prioritization signals, not proof of theft.",
)

class FeatureConsumer(BaseModel):
    model_config=ConfigDict(extra="forbid")
    CONS_NO: str = Field(min_length=1)
    features: dict[str, Any]

class ScoreRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    consumers: list[FeatureConsumer] = Field(min_length=1)
    threshold: float|None = Field(default=None, ge=0.0, le=1.0)
    include_explanations: bool = True
    explanation_top_k: int = Field(default=3, ge=1, le=24)

class Reading(BaseModel):
    model_config=ConfigDict(extra="forbid")
    date: date
    consumption: float|None = None

class HistoryConsumer(BaseModel):
    model_config=ConfigDict(extra="forbid")
    CONS_NO: str = Field(min_length=1)
    readings: list[Reading] = Field(min_length=1)
    period_start: date|None = None
    period_end: date|None = None

class HistoryScoreRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    consumers: list[HistoryConsumer] = Field(min_length=1)
    threshold: float|None = Field(default=None, ge=0.0, le=1.0)
    include_explanations: bool = True
    explanation_top_k: int = Field(default=3, ge=1, le=24)

@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id=request.headers.get("X-Request-ID",str(uuid.uuid4()))
    response=None
    try:
        response=await call_next(request)
        return response
    finally:
        if response is not None:
            response.headers["X-Request-ID"]=request_id
            logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)

def _require_service():
    if service is None:
        raise HTTPException(status_code=503, detail={
            "code":"MODEL_UNAVAILABLE",
            "message":"AI/ML model artifacts could not be loaded. Check model/config paths and dependency compatibility."
        })
    return service

@app.get("/health")
def health():
    return {
        "status":"ok" if service is not None else "degraded",
        "model_loaded":service is not None,
        "model_version":"electrify-task7-locked-v1",
        "feature_count":len(FEATURES),
    }

@app.get("/v1/model-info")
def model_info():
    return _require_service().model_info()

@app.post("/v1/score")
def score(request: ScoreRequest):
    svc=_require_service()
    try:
        rows=[{"CONS_NO":c.CONS_NO,**c.features} for c in request.consumers]
        return svc.score_feature_rows(rows,request.threshold,request.include_explanations,request.explanation_top_k)
    except InputValidationError as exc:
        raise HTTPException(status_code=422,detail={"code":"INVALID_INPUT","message":str(exc)})

@app.post("/v1/score-history")
def score_history(request: HistoryScoreRequest):
    svc=_require_service()
    try:
        consumers=[]
        for c in request.consumers:
            consumers.append({
                "CONS_NO":c.CONS_NO,
                "readings":[{"date":r.date,"consumption":r.consumption} for r in c.readings],
                "period_start":c.period_start,
                "period_end":c.period_end,
            })
        return svc.score_histories(consumers,request.threshold,request.include_explanations,request.explanation_top_k)
    except InputValidationError as exc:
        raise HTTPException(status_code=422,detail={"code":"INVALID_INPUT","message":str(exc)})

@app.get("/")
def root():
    return {"service":"Electrify AI/ML","docs":"/docs","health":"/health","score":"/v1/score","score_history":"/v1/score-history"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("electrify_ai_ml.api:app",host="0.0.0.0",port=8000,reload=False)
