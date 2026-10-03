from __future__ import annotations
from pathlib import Path
import re
import numpy as np
import pandas as pd
from .feature_engineering import sort_date_columns

def clean_dataset_a(raw_csv: str|Path, output_csv: str|Path) -> None:
    raw=Path(raw_csv); out=Path(output_csv)
    a=pd.read_csv(raw)
    dates=sort_date_columns([c for c in a.columns if re.fullmatch(r"\d{4}/\d{1,2}/\d{1,2}",str(c))])
    result=a[["CONS_NO","FLAG"]+dates].copy()
    result["CONS_NO"]=result["CONS_NO"].astype("string")
    result["FLAG"]=pd.to_numeric(result["FLAG"],errors="raise").astype("int8")
    out.parent.mkdir(parents=True,exist_ok=True)
    result.to_csv(out,index=False,na_rep="")

def clean_dataset_b(raw_csv: str|Path, output_csv: str|Path) -> None:
    raw=Path(raw_csv); out=Path(output_csv)
    b=pd.read_csv(raw)
    dates=sort_date_columns([c for c in b.columns if re.fullmatch(r"\d{2}-\d{2}-\d{2}",str(c))])
    metadata=b["CONS_NO"].isna() & b["CHK_STATE"].isna()
    result=b.loc[~metadata,["CONS_NO"]+dates+["CHK_STATE"]].copy()
    result["CONS_NO"]=result["CONS_NO"].astype("string")
    result["CHK_STATE"]=pd.to_numeric(result["CHK_STATE"],errors="raise").astype("int8")
    out.parent.mkdir(parents=True,exist_ok=True)
    result.to_csv(out,index=False,na_rep="")
