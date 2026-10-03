#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
import joblib, numpy as np, pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV

FEATURES=json.loads((Path(__file__).resolve().parents[1]/"config/feature_schema.json").read_text())["features"]
FEATURES=[x["name"] for x in FEATURES]

def main():
    p=argparse.ArgumentParser(description="Reproduce the locked Electrify Task 7 model artifact.")
    p.add_argument("--features-csv",required=True,help="Task 4 Dataset A V1 feature CSV")
    p.add_argument("--split-manifest",required=True,help="Task 6 split_manifest.json")
    p.add_argument("--output-model",default="models/electrify_final_model.joblib")
    args=p.parse_args()

    df=pd.read_csv(args.features_csv)
    if list(df.columns[2:]) != FEATURES:
        raise SystemExit("Feature CSV does not match the locked 24-feature schema.")
    m=json.loads(Path(args.split_manifest).read_text())
    train_idx=np.array(m["train_indices"],dtype=int)
    X=df[FEATURES]; y=df["FLAG"].astype(int)
    estimator=Pipeline([
        ("imputer",SimpleImputer(strategy="median",add_indicator=True)),
        ("model",HistGradientBoostingClassifier(random_state=42,class_weight="balanced"))
    ])
    model=CalibratedClassifierCV(estimator,method="sigmoid",cv=5)
    model.fit(X.iloc[train_idx],y.iloc[train_idx])
    out=Path(args.output_model); out.parent.mkdir(parents=True,exist_ok=True)
    joblib.dump(model,out,compress=3)
    print(out)

if __name__=="__main__":
    main()
