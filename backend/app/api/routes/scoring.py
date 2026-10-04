from typing import Annotated

from fastapi import APIRouter, Depends, Request

from ..dependencies import get_scoring_service
from ...schemas.scoring import HistoryScoreRequest, ScoreRequest, ScoreResponse, StoredHistoryConsumer
from ...db.models import SimulationStream
from ...services.operations_service import capture_finding
from ...services.scoring_service import ScoringService

router = APIRouter(tags=["scoring"])
Service = Annotated[ScoringService, Depends(get_scoring_service)]


@router.post("/score", response_model=ScoreResponse)
def score(request: ScoreRequest, service: Service):
    return service.score_features(request)


@router.post("/score-history", response_model=ScoreResponse)
def score_history(body: HistoryScoreRequest, request: Request, service: Service):
    # Manual scoring must finish before reset; it must not recreate a deleted copy.
    with request.app.state.simulation.lock:
        response = service.score_histories(body)
        session = service.repository.session
        for consumer in body.consumers:
            # The existing consumer-detail action scores full stored history.
            # A successful retry must also clear the simulator's stale error.
            if not isinstance(consumer, StoredHistoryConsumer) or consumer.period_start or consumer.period_end:
                continue
            stream = session.get(SimulationStream, consumer.CONS_NO)
            if stream:
                stream.config = {**stream.config, "last_score_day": stream.config["completed_days"],
                                 "score_state": "Scored full stored history", "last_error": None}
                session.commit()
                capture_finding(session, consumer.CONS_NO)
        return response
