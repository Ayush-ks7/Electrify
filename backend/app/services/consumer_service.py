from datetime import timedelta

from ..core.errors import ServiceError, invalid_input
from ..db.repositories import ConsumerRepository
from ..schemas.consumer import ConsumerList, ConsumerResponse, HistoryResponse, RiskResponse
from ..schemas.scoring import HistoryConsumer, Reading, MAX_HISTORY_DAYS


class ConsumerService:
    def __init__(self, repository: ConsumerRepository):
        self.repository = repository

    def get(self, consumer_id: str):
        consumer = self.repository.get(consumer_id)
        if consumer is None:
            raise ServiceError(404, "CONSUMER_NOT_FOUND", "Consumer was not found.")
        return ConsumerResponse.model_validate(consumer)

    def list(self, limit, offset):
        consumers, total = self.repository.list(limit, offset)
        return ConsumerList(consumers=consumers, total=total, limit=limit, offset=offset)

    def history(self, consumer_id, start, end, limit, offset):
        self.get(consumer_id)
        if start and end and end < start:
            raise invalid_input("period_end must be on or after period_start.")
        rows, total = self.repository.history(consumer_id, start, end, limit, offset)
        return HistoryResponse(consumer_id=consumer_id, readings=[Reading.model_validate(r) for r in rows],
                               total=total, limit=limit, offset=offset)

    def risk(self, consumer_id):
        self.get(consumer_id)
        prediction = self.repository.latest_prediction(consumer_id)
        if prediction is None:
            raise ServiceError(404, "RISK_NOT_FOUND", "No saved prediction exists for this consumer.")
        return RiskResponse(prediction_id=prediction.id, consumer_id=consumer_id,
                            created_at=prediction.created_at, source=prediction.source,
                            period_start=prediction.period_start, period_end=prediction.period_end,
                            score=prediction.score)

    def stored_history(self, consumer):
        self.get(consumer.CONS_NO)
        rows, total = self.repository.history(consumer.CONS_NO, consumer.period_start,
                                              consumer.period_end, limit=MAX_HISTORY_DAYS)
        if not rows:
            raise invalid_input("No stored readings exist in the requested period.")
        start = consumer.period_start or rows[0].date
        end = consumer.period_end or rows[-1].date
        days = (end - start).days + 1
        if total > MAX_HISTORY_DAYS or not 2 <= days <= MAX_HISTORY_DAYS:
            raise invalid_input("A scoring period must span 2..10000 calendar days.")
        by_date = {row.date: row.consumption for row in rows}
        # Assemble the documented input calendar only. All feature math stays in AI/ML.
        readings = [Reading(date=start + timedelta(days=i),
                            consumption=by_date.get(start + timedelta(days=i))) for i in range(days)]
        return HistoryConsumer(CONS_NO=consumer.CONS_NO, period_start=start, period_end=end, readings=readings)
