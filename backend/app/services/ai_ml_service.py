"""Thin adapter over the existing Electrify AI/ML package.

Do not reimplement feature engineering or model inference here.
"""

from collections import defaultdict
from dataclasses import replace
import logging
from threading import Lock

from electrify_ai_ml.config import Settings as MLSettings
from electrify_ai_ml.exceptions import InputValidationError
from electrify_ai_ml.service import RiskService

from ..core.config import Settings
from ..core.errors import ServiceError, invalid_input
from ..schemas.scoring import ModelInfo, ScoreResponse

logger = logging.getLogger("electrify.backend.ai_ml")


class AIMLService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._service = None
        self._lock = Lock()

    def load(self) -> None:
        try:
            ml_settings = replace(
                MLSettings.from_env(),
                model_path=self.settings.ai_ml_model_path,
                reference_medians_path=self.settings.ai_ml_reference_medians_path,
                default_threshold=self.settings.default_threshold,
                max_consumers=self.settings.max_consumers_per_request,
                explanation_top_k=self.settings.explanation_top_k,
            )
            self._service = RiskService.create(ml_settings)
        except Exception:
            # Package exceptions can contain artifact paths: do not log their text.
            self._service = None
            logger.error("Model initialization failed")

    @property
    def ready(self) -> bool:
        return self._service is not None and self._service.model.loaded

    def _call(self, method, *args, **kwargs):
        if not self.ready:
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML model is unavailable.")
        try:
            # Serialize access to the shared model; synchronous routes run in the worker pool.
            with self._lock:
                return getattr(self._service, method)(*args, **kwargs)
        except InputValidationError:
            raise invalid_input("Input does not satisfy the AI/ML contract.") from None
        except Exception:
            logger.error("Model operation failed")
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML scoring failed.") from None

    def _validated_score(self, result):
        try:
            return ScoreResponse.model_validate(result)
        except Exception:
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML returned an invalid result.") from None

    def score_feature_rows(self, rows, **kwargs):
        return self._validated_score(self._call("score_feature_rows", rows, **kwargs))

    def score_histories(self, consumers, **kwargs):
        # RiskService concatenates histories onto one calendar. Batch only equal periods
        # so another consumer cannot introduce extra missing days into this consumer.
        groups = defaultdict(list)
        for consumer in consumers:
            groups[(consumer["period_start"], consumer["period_end"])].append(consumer)
        results, warnings, response = {}, [], None
        for group in groups.values():
            response = self._validated_score(self._call("score_histories", group, **kwargs))
            results.update({result.CONS_NO: result for result in response.results})
            warnings.extend(response.history_warnings)
        if set(results) != {c["CONS_NO"] for c in consumers}:
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML returned an invalid result.")
        return response.model_copy(update={
            "results": [results[c["CONS_NO"]] for c in consumers], "history_warnings": warnings,
        })

    def model_info(self):
        try:
            return ModelInfo.model_validate(self._call("model_info"))
        except ServiceError:
            raise
        except Exception:
            raise ServiceError(503, "MODEL_UNAVAILABLE", "AI/ML returned invalid metadata.") from None
