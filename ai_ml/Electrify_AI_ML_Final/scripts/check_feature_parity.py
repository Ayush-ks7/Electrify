#!/usr/bin/env python3
from __future__ import annotations
import argparse
import numpy as np
import pandas as pd
from electrify_ai_ml.feature_engineering import build_v1_features_from_wide

def main():
    p=argparse.ArgumentParser(description="Compare generated V1 features with a reference feature CSV.")
    p.add_argument("--raw-csv",required=True)
    p.add_argument("--reference-csv",required=True)
    p.add_argument("--rows",type=int,default=100)
    args=p.parse_args()
    raw=pd.read_csv(args.raw_csv,nrows=args.rows)
    ref=pd.read_csv(args.reference_csv,nrows=args.rows)
    got=build_v1_features_from_wide(raw)
    features=[c for c in ref.columns if c not in {"CONS_NO","FLAG"}]
    if list(got["CONS_NO"].astype(str)) != list(ref["CONS_NO"].astype(str)):
        raise SystemExit("Consumer IDs do not align.")
    max_diff=0.0
    for f in features:
        a=got[f].to_numpy(dtype=float); b=ref[f].to_numpy(dtype=float)
        ok=np.isfinite(a)&np.isfinite(b)
        if ok.any(): max_diff=max(max_diff,float(np.max(np.abs(a[ok]-b[ok]))))
        if not np.allclose(a,b,equal_nan=True,atol=2e-6,rtol=2e-6):
            raise SystemExit(f"Feature mismatch: {f}")
    print(f"PARITY_OK rows={len(got)} features={len(features)} max_abs_diff={max_diff:.8g}")

if __name__=="__main__":
    main()
