from typing import Annotated

from fastapi import APIRouter, Depends

from ..dependencies import get_scoring_service
from ...schemas.scoring import HistoryScoreRequest, ScoreRequest, ScoreResponse
from ...services.scoring_service import ScoringService

router = APIRouter(tags=["scoring"])
Service = Annotated[ScoringService, Depends(get_scoring_service)]


@router.post("/score", response_model=ScoreResponse)
def score(request: ScoreRequest, service: Service):
    return service.score_features(request)


@router.post("/score-history", response_model=ScoreResponse)
def score_history(request: HistoryScoreRequest, service: Service):
    return service.score_histories(request)
