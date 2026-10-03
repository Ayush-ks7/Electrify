from datetime import date
from typing import Annotated, Literal

from electrify_ai_ml.constants import FEATURES
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, create_model, field_validator, model_validator

ConsumerID = Annotated[str, StringConstraints(strict=True, min_length=1, max_length=128, pattern=r"^\S+$")]
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Probability = Annotated[Number, Field(ge=0, le=1)]
MAX_HISTORY_DAYS = 10000


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


# Names and order come from the locked package; every nullable feature is required.
FeatureValues = create_model("FeatureValues", __base__=Schema,
                             **{name: (Number | None, ...) for name in FEATURES})


class FeatureConsumer(Schema):
    CONS_NO: ConsumerID
    features: FeatureValues


class Reading(Schema):
    date: date
    consumption: Number | None

    @field_validator("date", mode="before")
    @classmethod
    def calendar_date(cls, value):
        if type(value) is date:
            return value
        if not isinstance(value, str) or len(value) != 10:
            raise ValueError("Use a YYYY-MM-DD calendar date.")
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise ValueError("Use a valid YYYY-MM-DD calendar date.") from None


class Period(Schema):
    period_start: date | None = None
    period_end: date | None = None

    @field_validator("period_start", "period_end", mode="before")
    @classmethod
    def calendar_date(cls, value):
        return None if value is None else Reading.calendar_date(value)

    @model_validator(mode="after")
    def valid_period(self):
        if (self.period_start is None) != (self.period_end is None):
            raise ValueError("Supply both period_start and period_end, or neither.")
        if self.period_start is not None:
            days = (self.period_end - self.period_start).days + 1
            if not 2 <= days <= MAX_HISTORY_DAYS:
                raise ValueError("A scoring period must span 2..10000 calendar days.")
        return self


class HistoryConsumer(Period):
    CONS_NO: ConsumerID
    readings: list[Reading] = Field(min_length=2, max_length=MAX_HISTORY_DAYS)

    @model_validator(mode="after")
    def complete_calendar(self):
        days = [reading.date for reading in self.readings]
        if len(set(days)) != len(days):
            raise ValueError("Duplicate dates are not allowed.")
        start = self.period_start or min(days)
        end = self.period_end or max(days)
        if min(days) != start or max(days) != end or len(days) != (end - start).days + 1:
            raise ValueError("Supply every calendar date in the period; use null for missing consumption.")
        self.period_start, self.period_end = start, end
        return self


class StoredHistoryConsumer(Period):
    CONS_NO: ConsumerID
    stored: Literal[True]


class ScoreOptions(Schema):
    threshold: Probability | None = None
    include_explanations: StrictBool = True
    explanation_top_k: Annotated[int, Field(strict=True, ge=1, le=24)] | None = None

    @model_validator(mode="after")
    def unique_consumers(self):
        ids = [consumer.CONS_NO for consumer in self.consumers]
        if len(ids) != len(set(ids)):
            raise ValueError("Each CONS_NO may appear only once per request.")
        return self


class ScoreRequest(ScoreOptions):
    consumers: list[FeatureConsumer] = Field(min_length=1, max_length=100)


class HistoryScoreRequest(ScoreOptions):
    consumers: list[HistoryConsumer | StoredHistoryConsumer] = Field(min_length=1, max_length=100)


class DataQuality(Schema):
    observed_days: int | None
    missing_days: int | None
    missing_ratio: Number | None


class Signal(Schema):
    feature: str
    value: Number | None
    reference_value: Number
    probability_sensitivity: Number
    direction: Literal["increases_risk", "decreases_risk", "neutral"]
    description: str


class Explanation(Schema):
    method: str
    top_signals: list[Signal]
    note: str


class ScoreResult(Schema):
    CONS_NO: ConsumerID
    predicted_probability: Probability
    screening_threshold: Probability
    screening_flag: bool
    status: Literal["screen_for_review", "below_screening_threshold"]
    data_quality: DataQuality
    explanation: Explanation | None


class ScoreResponse(Schema):
    model_version: str
    scope: str
    results: list[ScoreResult]
    disclaimer: str
    history_warnings: list[str] = Field(default_factory=list)


class ModelInfo(Schema):
    model_version: str
    model_family: str
    probability_calibration: str
    feature_count: int
    required_features: list[str]
    default_threshold: Probability
    scope: str
    warning: str
