from ..core.errors import ServiceError, invalid_input
from ..schemas.scoring import StoredHistoryConsumer
from .consumer_service import ConsumerService


class ScoringService:
    def __init__(self, repository, ai_ml, settings):
        self.repository = repository
        self.ai_ml = ai_ml
        self.settings = settings

    def _options(self, request):
        if len(request.consumers) > self.settings.max_consumers_per_request:
            raise invalid_input("Batch exceeds the configured consumer limit.")
        return {"threshold": request.threshold, "include_explanations": request.include_explanations,
                "top_k": request.explanation_top_k or self.settings.explanation_top_k}

    def score_features(self, request):
        options = self._options(request)
        rows = [{"CONS_NO": c.CONS_NO, **c.features.model_dump()} for c in request.consumers]
        response = self.ai_ml.score_feature_rows(rows, **options)
        self._persist(request.consumers, response, {})
        return response

    def score_histories(self, request):
        options = self._options(request)
        consumer_service = ConsumerService(self.repository)
        histories = [consumer_service.stored_history(c) if isinstance(c, StoredHistoryConsumer) else c
                     for c in request.consumers]
        response = self.ai_ml.score_histories([c.model_dump(mode="json") for c in histories], **options)
        self._persist(request.consumers, response, {c.CONS_NO: c for c in histories})
        return response

    def _persist(self, consumers, response, histories):
        results = {result.CONS_NO: result for result in response.results}
        if len(results) != len(consumers) or set(results) != {c.CONS_NO for c in consumers}:
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML returned an invalid result.")
        for consumer in consumers:
            cid = consumer.CONS_NO
            self.repository.ensure(cid)
            history = histories.get(cid)
            source = "features"
            if history:
                source = "stored_history" if isinstance(consumer, StoredHistoryConsumer) else "history"
                self.repository.save_history(cid, history.readings)
            snapshot = response.model_copy(update={
                "results": [results[cid]],
                "history_warnings": [w for w in response.history_warnings if w.startswith(f"{cid}:")],
            })
            self.repository.save_prediction(
                consumer_id=cid, model_version=response.model_version, source=source,
                period_start=history.period_start if history else None,
                period_end=history.period_end if history else None,
                score=snapshot.model_dump(mode="json"),
            )
        # No partial consumers, readings or scores survive any failed batch.
        self.repository.session.commit()
