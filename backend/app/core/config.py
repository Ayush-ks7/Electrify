from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
AI_ML_ROOT = PROJECT_ROOT / "ai_ml" / "Electrify_AI_ML_Final"


class Settings(BaseSettings):
    app_env: str = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    database_url: str = f"sqlite:///{(BACKEND_ROOT / 'electrify.db').as_posix()}"
    database_auto_create: bool = True
    ai_ml_model_path: Path = AI_ML_ROOT / "models" / "electrify_final_model.joblib"
    ai_ml_reference_medians_path: Path = AI_ML_ROOT / "artifacts" / "feature_reference_medians_train_only.json"
    default_threshold: float = Field(default=0.2010437721624017, ge=0, le=1)
    explanation_top_k: int = Field(default=3, ge=1, le=24)
    api_key: SecretStr | None = Field(default=None, min_length=1)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    max_consumers_per_request: int = Field(default=100, ge=1, le=100)

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
