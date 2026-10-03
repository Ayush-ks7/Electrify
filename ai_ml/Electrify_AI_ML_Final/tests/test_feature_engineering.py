import numpy as np
import pandas as pd
from electrify_ai_ml.feature_engineering import build_v1_features_from_wide

def test_feature_schema_and_zero_missing_semantics():
    dates=[f"2026-01-{i:02d}" for i in range(1,11)]
    frame=pd.DataFrame([{
        "CONS_NO":"C1",
        **{d:(0.0 if i==1 else None if i==2 else float(i)) for i,d in enumerate(dates, start=1)}
    }])
    out=build_v1_features_from_wide(frame)
    assert list(out.columns)[0]=="CONS_NO"
    assert len(out.columns)==25
    assert int(out.loc[0,"observed_days"])==9
    assert int(out.loc[0,"missing_days"])==1
    assert int(out.loc[0,"zero_days"])==1
    assert float(out.loc[0,"missing_ratio"])==0.1
    assert float(out.loc[0,"zero_ratio_observed"])==1/9

def test_date_columns_are_chronologically_sorted():
    frame=pd.DataFrame([{
        "CONS_NO":"C1",
        "2026-01-03":3.0,
        "2026-01-01":1.0,
        "2026-01-02":2.0,
    }])
    out=build_v1_features_from_wide(frame)
    assert out.loc[0,"consumption_trend_slope"] > 0
