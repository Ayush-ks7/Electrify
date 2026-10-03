from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Consumer(Base):
    __tablename__ = "consumers"
    consumer_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DailyReading(Base):
    __tablename__ = "daily_readings"
    consumer_id: Mapped[str] = mapped_column(ForeignKey("consumers.consumer_id"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    consumption: Mapped[float | None] = mapped_column(Float, nullable=True)


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (Index("ix_predictions_consumer_latest", "consumer_id", "id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    consumer_id: Mapped[str] = mapped_column(ForeignKey("consumers.consumer_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    model_version: Mapped[str] = mapped_column(String(128))
    source: Mapped[str] = mapped_column(String(32))
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    # Immutable snapshot includes quality, explanation, warnings, threshold and disclaimer.
    score: Mapped[dict] = mapped_column(JSON)


class SimulationStream(Base):
    __tablename__ = "simulation_streams"
    consumer_id: Mapped[str] = mapped_column(ForeignKey("consumers.consumer_id"), primary_key=True)
    config: Mapped[dict] = mapped_column(JSON)


class MeterReading(Base):
    __tablename__ = "meter_readings"
    __table_args__ = (Index("ix_meter_consumer_latest", "consumer_id", "id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    consumer_id: Mapped[str] = mapped_column(ForeignKey("consumers.consumer_id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    signals: Mapped[dict] = mapped_column(JSON)


class Investigation(Base):
    __tablename__ = "investigations"
    consumer_id: Mapped[str] = mapped_column(ForeignKey("consumers.consumer_id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), default="Requires Review")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
