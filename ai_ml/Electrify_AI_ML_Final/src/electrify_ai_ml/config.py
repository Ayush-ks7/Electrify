from __future__ import annotations
import json
import os
from dotenv import load_dotenv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PACKAGE_ROOT / ".env", override=False)

def _resolve_path(value: str | None, default: Path) -> Path:
    raw = value if value else str(default)
    p = Path(raw)
    return p if p.is_absolute() else PACKAGE_ROOT / p

@dataclass(frozen=True)
class Settings:
    model_path: Path
    reference_medians_path: Path
    default_threshold: float
    max_consumers: int
    explanation_top_k: int
    log_level: str
    training_reference_days: int
    min_history_days_for_full_recent_comparison: int

    @classmethod
    def from_env(cls) -> "Settings":
        defaults_path = PACKAGE_ROOT / "config" / "defaults.json"
        with defaults_path.open(encoding="utf-8") as f:
            d: dict[str, Any] = json.load(f)
        threshold = float(os.getenv("ELECTRIFY_DEFAULT_THRESHOLD", d["default_threshold"]))
        if not 0.0 <= threshold <= 1.0:
            raise ValueError("ELECTRIFY_DEFAULT_THRESHOLD must be between 0 and 1.")
        max_consumers = int(os.getenv("ELECTRIFY_MAX_CONSUMERS", d["max_consumers_per_request"]))
        top_k = int(os.getenv("ELECTRIFY_EXPLANATION_TOP_K", d["explanation_top_k"]))
        if max_consumers < 1:
            raise ValueError("ELECTRIFY_MAX_CONSUMERS must be positive.")
        if top_k < 1 or top_k > 24:
            raise ValueError("ELECTRIFY_EXPLANATION_TOP_K must be between 1 and 24.")
        return cls(
            model_path=_resolve_path(os.getenv("ELECTRIFY_MODEL_PATH"), PACKAGE_ROOT / "models" / "electrify_final_model.joblib"),
            reference_medians_path=_resolve_path(os.getenv("ELECTRIFY_REFERENCE_MEDIANS_PATH"), PACKAGE_ROOT / "artifacts" / "feature_reference_medians_train_only.json"),
            default_threshold=threshold,
            max_consumers=max_consumers,
            explanation_top_k=top_k,
            log_level=os.getenv("ELECTRIFY_LOG_LEVEL", d["log_level"]).upper(),
            training_reference_days=int(d["training_reference_days"]),
            min_history_days_for_full_recent_comparison=int(d["min_history_days_for_full_recent_comparison"]),
        )
