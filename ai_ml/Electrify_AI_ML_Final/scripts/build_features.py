#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
from electrify_ai_ml.feature_engineering import build_v1_features_from_wide

def main():
    parser=argparse.ArgumentParser(description="Build Electrify Task 4 V1 features from a wide daily-consumption CSV.")
    parser.add_argument("--input-csv",required=True)
    parser.add_argument("--output-csv",required=True)
    args=parser.parse_args()
    df=pd.read_csv(args.input_csv)
    feat=build_v1_features_from_wide(df)
    Path(args.output_csv).parent.mkdir(parents=True,exist_ok=True)
    feat.to_csv(args.output_csv,index=False)
    print(args.output_csv)

if __name__=="__main__":
    main()
