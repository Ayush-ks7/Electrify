from fastapi import APIRouter, Request, Response

from ...schemas.consumer import HealthResponse
from ...schemas.scoring import ModelInfo
from ...services.health_service import check_health

router = APIRouter(tags=["health"])
model_router = APIRouter(tags=["model"])


@router.get("/health", response_model=HealthResponse)
def health(request: Request, response: Response):
    state = request.app.state
    result = check_health(state.database, state.database_ready, state.ai_ml)
    if result.status != "ok":
        response.status_code = 503
    return result


@model_router.get("/model-info", response_model=ModelInfo)
def model_info(request: Request):
    return request.app.state.ai_ml.model_info()
