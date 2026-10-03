from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .api.dependencies import require_api_key
from .api.routes import consumers, health, scoring
from .core.config import Settings
from .core.errors import ServiceError
from .core.logging import configure_logging
from .db.database import Database
from .db.models import Base
from .services.ai_ml_service import AIMLService

logger = logging.getLogger("electrify.backend")


def error_response(status, code, message):
    return JSONResponse(status_code=status, content={"detail": {"code": code, "message": message}})


def create_app(settings: Settings | None = None, ai_ml: AIMLService | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        configure_logging(settings.log_level)
        database = Database(settings.database_url)
        app.state.database = database
        app.state.database_ready = False
        try:
            try:
                if settings.database_auto_create:
                    Base.metadata.create_all(database.engine)
                app.state.database_ready = set(Base.metadata.tables).issubset(inspect(database.engine).get_table_names())
            except SQLAlchemyError:
                logger.error("Database initialization failed")
            app.state.ai_ml = ai_ml or AIMLService(settings)
            if ai_ml is None:
                app.state.ai_ml.load()
            yield
        finally:
            database.engine.dispose()

    app = FastAPI(title="Electrify Backend", version="1.0.0", lifespan=lifespan,
                  description="Full-history review prioritization. Model output is not proof of theft.")
    app.state.settings = settings
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins,
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-API-Key"],
                       expose_headers=["X-Request-ID"])

    @app.exception_handler(ServiceError)
    async def service_error(request, exc):
        return error_response(exc.status, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo the body, rejected input, or Pydantic exception context.
        errors = [{"type": e["type"], "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": {
            "code": "INVALID_INPUT", "message": "Request validation failed.", "errors": errors,
        }})

    @app.exception_handler(IntegrityError)
    async def conflict(request, exc):
        return error_response(409, "WRITE_CONFLICT", "Concurrent or conflicting write; retry the request.")

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        logger.error("Database operation failed")
        return error_response(503, "DATABASE_UNAVAILABLE", "Database operation failed.")

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        request_id = str(uuid4())
        start = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.error("Unhandled request failure request_id=%s", request_id)
            response = error_response(500, "INTERNAL_ERROR", "An internal error occurred.")
        response.headers["X-Request-ID"] = request_id
        route = request.scope.get("route")
        # Route template omits consumer identifiers; no payloads, queries or secrets.
        logger.info("request_id=%s method=%s route=%s status=%s duration_ms=%.1f",
                    request_id, request.method, getattr(route, "path", "unmatched"),
                    response.status_code, (perf_counter() - start) * 1000)
        return response

    app.include_router(health.router)
    for router in (health.model_router, scoring.router, consumers.router):
        app.include_router(router, prefix="/api/v1", dependencies=[Depends(require_api_key)])
    return app


app = create_app()
