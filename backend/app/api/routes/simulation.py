from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ...db.database import get_session
from ...schemas.simulation import SimulationControl, StartSimulation, UpdateInvestigation
from ...services.investigation_service import InvestigationService

router = APIRouter(tags=["simulation and investigations"])


@router.get("/simulation")
def simulation_status(request: Request):
    return request.app.state.simulation.status()


@router.post("/simulation/start")
def start(body: StartSimulation, request: Request):
    return request.app.state.simulation.start(body)


@router.post("/simulation/{action}")
def control(action: Literal["pause", "stop", "reset"], body: SimulationControl, request: Request):
    return request.app.state.simulation.control(action, body.consumer_ids)


def service(session: Annotated[Session, Depends(get_session)]):
    return InvestigationService(session)


@router.get("/investigations")
def investigations(svc: Annotated[InvestigationService, Depends(service)],
                   limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0)):
    return svc.list(limit, offset)


@router.get("/investigations/{consumer_id}")
def investigation(consumer_id: str, svc: Annotated[InvestigationService, Depends(service)]):
    return svc.get(consumer_id)


@router.post("/investigations/{consumer_id}/status")
def update(consumer_id: str, body: UpdateInvestigation, svc: Annotated[InvestigationService, Depends(service)]):
    return svc.update(consumer_id, body.status)


@router.get("/consumers/{consumer_id}/telemetry")
def telemetry(consumer_id: str, svc: Annotated[InvestigationService, Depends(service)],
              limit: int = Query(96, ge=1, le=1000)):
    return svc.readings(consumer_id, limit)
