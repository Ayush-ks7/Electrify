from datetime import date, datetime
from typing import Literal

from .scoring import ConsumerID, Reading, Schema, ScoreResponse


class ConsumerResponse(Schema):
    consumer_id: ConsumerID
    created_at: datetime


class ConsumerList(Schema):
    consumers: list[ConsumerResponse]
    total: int
    limit: int
    offset: int


class HistoryResponse(Schema):
    consumer_id: ConsumerID
    readings: list[Reading]
    total: int
    limit: int
    offset: int


class RiskResponse(Schema):
    prediction_id: int
    consumer_id: ConsumerID
    created_at: datetime
    source: Literal["features", "history", "stored_history"]
    period_start: date | None
    period_end: date | None
    score: ScoreResponse


class HealthResponse(Schema):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unavailable"]
    model: Literal["ok", "unavailable"]
    feature_count: int = 24
