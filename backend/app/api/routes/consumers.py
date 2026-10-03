from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..dependencies import get_consumer_service
from ...schemas.consumer import ConsumerList, ConsumerResponse, HistoryResponse, RiskResponse
from ...schemas.scoring import ConsumerID
from ...services.consumer_service import ConsumerService

router = APIRouter(prefix="/consumers", tags=["consumers"])
Service = Annotated[ConsumerService, Depends(get_consumer_service)]
Limit = Annotated[int, Query(ge=1, le=1000)]
Offset = Annotated[int, Query(ge=0)]


@router.get("", response_model=ConsumerList)
def consumers(service: Service, limit: Limit = 100, offset: Offset = 0):
    return service.list(limit, offset)


@router.get("/{consumer_id}", response_model=ConsumerResponse)
def consumer(consumer_id: ConsumerID, service: Service):
    return service.get(consumer_id)


@router.get("/{consumer_id}/history", response_model=HistoryResponse)
def history(consumer_id: ConsumerID, service: Service, period_start: date | None = None,
            period_end: date | None = None, limit: Limit = 100, offset: Offset = 0):
    return service.history(consumer_id, period_start, period_end, limit, offset)


@router.get("/{consumer_id}/risk", response_model=RiskResponse)
def risk(consumer_id: ConsumerID, service: Service):
    return service.risk(consumer_id)
