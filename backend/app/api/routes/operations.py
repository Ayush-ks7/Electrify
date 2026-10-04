from typing import Annotated, Literal
from fastapi import APIRouter, Depends, Request
from pydantic import Field, field_validator
from sqlalchemy.orm import Session
from ...db.database import get_session
from ...schemas.scoring import Schema
from ...services.operations_service import OperationsService

router = APIRouter(prefix="/operations", tags=["utility workspace"])

def service(session: Annotated[Session, Depends(get_session)]):
    return OperationsService(session)

class CreateCase(Schema):
    anomaly_id: str = Field(min_length=1, max_length=64)

class Status(Schema):
    status: Literal['Open', 'Under Review', 'Confirmed', 'False Positive', 'Resolved']

class Note(Schema):
    note: str = Field(min_length=1, max_length=4000)

    @field_validator('note')
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError('Note cannot be blank')
        return value.strip()

@router.get('')
def workspace(request: Request, svc: Annotated[OperationsService, Depends(service)], days: Literal['7', '30'] = '7'):
    # A snapshot cannot straddle generation, a scenario switch or reset.
    with request.app.state.simulation.lock:
        return svc.snapshot(int(days))

@router.post('/cases')
def create(body: CreateCase, request: Request, svc: Annotated[OperationsService, Depends(service)]):
    with request.app.state.simulation.lock:
        return svc.create_case(body.anomaly_id)

@router.post('/cases/{cid}/status')
def status(cid: str, body: Status, svc: Annotated[OperationsService, Depends(service)]):
    return svc.update_case(cid, status=body.status)

@router.post('/cases/{cid}/notes')
def note(cid: str, body: Note, svc: Annotated[OperationsService, Depends(service)]):
    return svc.update_case(cid, note=body.note)
