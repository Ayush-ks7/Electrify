import math

import pytest
from electrify_ai_ml.constants import FEATURES
from pydantic import ValidationError

from app.schemas.scoring import FeatureValues, HistoryConsumer, Reading


def test_feature_schema_is_exact_and_nullable():
    assert list(FeatureValues.model_fields) == FEATURES
    assert FeatureValues.model_validate(dict.fromkeys(FEATURES)).model_dump() == dict.fromkeys(FEATURES)


@pytest.mark.parametrize("value", [math.nan, math.inf, -math.inf, True, "4"])
def test_non_numeric_or_nonfinite_values_rejected(value):
    with pytest.raises(ValidationError):
        Reading(date="2026-01-01", consumption=value)
    with pytest.raises(ValidationError):
        FeatureValues.model_validate({**dict.fromkeys(FEATURES), "observed_days": value})


@pytest.mark.parametrize("value", [1234567890, "2026-01-01T00:00:00", "2026-13-01"])
def test_dates_are_calendar_dates(value):
    with pytest.raises(ValidationError):
        Reading(date=value, consumption=None)


def test_partial_period_rejected():
    with pytest.raises(ValidationError):
        HistoryConsumer(CONS_NO="C1", period_start="2026-01-01", readings=[
            {"date": "2026-01-01", "consumption": 0}, {"date": "2026-01-02", "consumption": None}])
