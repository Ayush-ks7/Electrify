from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Consumer, DailyReading, Prediction


class ConsumerRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, consumer_id: str):
        return self.session.get(Consumer, consumer_id)

    def ensure(self, consumer_id: str):
        consumer = self.get(consumer_id)
        if consumer is None:
            consumer = Consumer(consumer_id=consumer_id)
            self.session.add(consumer)
            self.session.flush()
        return consumer

    def list(self, limit: int, offset: int):
        total = self.session.scalar(select(func.count()).select_from(Consumer))
        rows = self.session.scalars(select(Consumer).order_by(Consumer.consumer_id).limit(limit).offset(offset)).all()
        return rows, total

    def history(self, consumer_id: str, start: date | None = None, end: date | None = None,
                limit: int | None = None, offset: int = 0):
        query = select(DailyReading).where(DailyReading.consumer_id == consumer_id)
        if start is not None:
            query = query.where(DailyReading.date >= start)
        if end is not None:
            query = query.where(DailyReading.date <= end)
        total = self.session.scalar(select(func.count()).select_from(query.subquery()))
        query = query.order_by(DailyReading.date).offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return self.session.scalars(query).all(), total

    def save_history(self, consumer_id: str, readings):
        existing, _ = self.history(consumer_id, min(r.date for r in readings), max(r.date for r in readings))
        by_date = {row.date: row for row in existing}
        for reading in readings:
            if reading.date in by_date:
                by_date[reading.date].consumption = reading.consumption
            else:
                self.session.add(DailyReading(consumer_id=consumer_id, date=reading.date,
                                              consumption=reading.consumption))

    def save_prediction(self, **values):
        prediction = Prediction(**values)
        self.session.add(prediction)
        return prediction

    def latest_prediction(self, consumer_id: str):
        return self.session.scalar(select(Prediction).where(Prediction.consumer_id == consumer_id)
                                   .order_by(Prediction.id.desc()).limit(1))
