from hmac import compare_digest
from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from ..core.errors import ServiceError
from ..db.database import get_session
from ..db.repositories import ConsumerRepository
from ..services.consumer_service import ConsumerService
from ..services.scoring_service import ScoringService

key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(request: Request, key: Annotated[str | None, Security(key_header)] = None):
    expected = request.app.state.settings.api_key
    if expected is not None and not compare_digest((key or "").encode(), expected.get_secret_value().encode()):
        raise ServiceError(401, "UNAUTHORIZED", "A valid API key is required.")


def get_consumer_service(session: Annotated[Session, Depends(get_session)]):
    return ConsumerService(ConsumerRepository(session))


def get_scoring_service(request: Request, session: Annotated[Session, Depends(get_session)]):
    return ScoringService(ConsumerRepository(session), request.app.state.ai_ml, request.app.state.settings)
