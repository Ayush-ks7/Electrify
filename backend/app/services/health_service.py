from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from ..schemas.consumer import HealthResponse


def check_health(database, database_ready, ai_ml):
    database_ok = False
    try:
        with database.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            database_ok = database_ready
    except SQLAlchemyError:
        pass
    model_ok = ai_ml.ready
    return HealthResponse(status="ok" if database_ok and model_ok else "degraded",
                          database="ok" if database_ok else "unavailable",
                          model="ok" if model_ok else "unavailable")
