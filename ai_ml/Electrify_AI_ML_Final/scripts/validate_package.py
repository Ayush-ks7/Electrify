#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import joblib
import pandas as pd
from electrify_ai_ml.constants import FEATURES
from electrify_ai_ml.config import Settings
from electrify_ai_ml.feature_engineering import build_v1_features_from_wide

ROOT=Path(__file__).resolve().parents[1]

def main():
    settings=Settings.from_env()
    model=joblib.load(settings.model_path)
    med=json.loads(settings.reference_medians_path.read_text())
    assert len(FEATURES)==24
    assert list(med)==FEATURES
    assert model.predict_proba(pd.DataFrame([[np.nan]*24],columns=FEATURES)).shape==(1,2)
    print("VALIDATION_OK")
    print("model_path:",settings.model_path)
    print("features:",len(FEATURES))
    print("default_threshold:",settings.default_threshold)

if __name__=="__main__":
    main()
