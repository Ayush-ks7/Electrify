from __future__ import annotations
import json
from pathlib import Path
import joblib
import pandas as pd
import numpy as np

from .config import Settings
from .constants import FEATURES, MODEL_VERSION
from .exceptions import ModelLoadError, InputValidationError

class ElectrifyModel:
    def __init__(self, settings: Settings):
        self.settings=settings
        self._model=None
        self.reference_medians={}
        self._load()

    def _load(self):
        try:
            if not self.settings.model_path.exists():
                raise FileNotFoundError(self.settings.model_path)
            self._model=joblib.load(self.settings.model_path)
            with self.settings.reference_medians_path.open(encoding="utf-8") as f:
                self.reference_medians=json.load(f)
            missing=set(FEATURES)-set(self.reference_medians)
            if missing:
                raise ValueError(f"Reference medians missing features: {sorted(missing)}")
        except Exception as exc:
            raise ModelLoadError(
                f"Could not load Electrify model artifacts from "
                f"{self.settings.model_path} and {self.settings.reference_medians_path}: {exc}"
            ) from exc

    @property
    def loaded(self)->bool:
        return self._model is not None

    def predict_probability(self, X: pd.DataFrame) -> np.ndarray:
        if list(X.columns) != FEATURES:
            raise InputValidationError("Model input columns do not exactly match the locked 24-feature schema.")
        try:
            p=self._model.predict_proba(X)[:,1]
        except Exception as exc:
            raise ModelLoadError(f"Model inference failed: {exc}") from exc
        if not np.all(np.isfinite(p)) or np.any((p<0)|(p>1)):
            raise ModelLoadError("Model returned invalid probability values.")
        return p.astype(float)

    def info(self)->dict:
        return {
            "model_version":MODEL_VERSION,
            "model_family":"HistGradientBoostingClassifier",
            "probability_calibration":"sigmoid",
            "feature_count":len(FEATURES),
            "required_features":FEATURES,
            "default_threshold":self.settings.default_threshold,
            "scope":"Full-history consumer classification",
            "warning":"A model risk score is not proof of electricity theft.",
        }
