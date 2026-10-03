import numpy as np
import pandas as pd
from pathlib import Path
from electrify_ai_ml.config import Settings
from electrify_ai_ml.service import RiskService
from electrify_ai_ml.constants import FEATURES

def test_locked_model_loads_and_scores():
    service=RiskService.create()
    row={f:None for f in FEATURES}
    row.update({
        "observed_days":1000,
        "missing_days":34,
        "missing_ratio":0.0329,
        "zero_days":2,
        "zero_ratio_observed":0.002,
        "mean_consumption":3.5,
        "median_consumption":3.4,
        "std_consumption":1.4,
        "min_consumption":0.1,
        "max_consumption":10.0,
        "p25_consumption":2.5,
        "p75_consumption":4.2,
        "p90_consumption":5.5,
        "iqr_consumption":1.7,
        "cv_consumption":0.4,
        "recent_30d_mean":3.7,
        "recent_vs_prior_30d_ratio":1.1,
        "recent_change":0.1,
        "first_quarter_mean":3.2,
        "last_quarter_mean":3.7,
        "long_run_change":0.156,
        "consumption_trend_slope":0.001,
        "recent_30d_zero_days":0,
        "recent_30d_missing_days":1,
    })
    result=service.score_feature_rows([{"CONS_NO":"C1",**row}],include_explanations=True,top_k=3)
    item=result["results"][0]
    assert 0 <= item["predicted_probability"] <= 1
    assert len(item["explanation"]["top_signals"])==3
    assert result["model_version"]=="electrify-task7-locked-v1"

def test_raw_history_scoring():
    service=RiskService.create()
    readings=[{"date":f"2026-01-{i:02d}","consumption":(None if i==5 else float(i))} for i in range(1,10)]
    result=service.score_histories([{"CONS_NO":"C2","readings":readings}],include_explanations=False)
    item=result["results"][0]
    assert 0 <= item["predicted_probability"] <= 1
    assert result["history_warnings"]

def test_reference_medians_are_training_only_artifact():
    service=RiskService.create()
    assert set(service.model.reference_medians)==set(FEATURES)
