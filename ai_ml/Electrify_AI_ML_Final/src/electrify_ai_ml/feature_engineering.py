from __future__ import annotations
import re
import warnings
from datetime import date
import numpy as np
import pandas as pd

from .constants import FEATURES
from .exceptions import InputValidationError

DATE_PATTERNS = (
    (re.compile(r"^\d{4}/\d{1,2}/\d{1,2}$"), "%Y/%m/%d"),
    (re.compile(r"^\d{2}-\d{2}-\d{2}$"), "%d-%m-%y"),
    (re.compile(r"^\d{4}-\d{2}-\d{2}$"), "%Y-%m-%d"),
)

def detect_date_columns(columns) -> list[str]:
    found=[]
    for c in columns:
        s=str(c)
        for pat,_ in DATE_PATTERNS:
            if pat.fullmatch(s):
                found.append(s)
                break
    return found

def sort_date_columns(columns: list[str]) -> list[str]:
    def key(c: str):
        for pat,fmt in DATE_PATTERNS:
            if pat.fullmatch(c):
                return pd.to_datetime(c, format=fmt)
        raise ValueError(f"Unsupported date column: {c}")
    return sorted(columns, key=key)

def _ratio(a, b):
    a=np.asarray(a,dtype=float)
    b=np.asarray(b,dtype=float)
    return np.divide(a, b, out=np.full(a.shape, np.nan), where=(b != 0) & np.isfinite(b))

def _nanpercentile(a, q):
    with np.errstate(all="ignore"):
        return np.nanpercentile(a, q, axis=1)

def build_v1_features_from_wide(
    frame: pd.DataFrame,
    id_col: str = "CONS_NO",
    date_columns: list[str] | None = None,
) -> pd.DataFrame:
    """Build the exact 24 features used by the locked Dataset A model.

    Labels are never read. If FLAG/CHK_STATE are present they are ignored,
    but should not be sent by inference clients.
    """
    if id_col not in frame.columns:
        raise InputValidationError(f"Missing required identifier column: {id_col}")
    dates = sort_date_columns(date_columns or detect_date_columns(frame.columns))
    if not dates:
        raise InputValidationError("No supported daily date columns were found.")
    X=frame[dates].apply(pd.to_numeric, errors="coerce").to_numpy(dtype=np.float32)
    n,d=X.shape
    if d < 2:
        raise InputValidationError("At least two chronological readings are required.")
    obs=np.isfinite(X)
    with np.errstate(all="ignore"):
        mean=np.nanmean(X,axis=1)
        med=np.nanmedian(X,axis=1)
        std=np.nanstd(X,axis=1)
        mn=np.nanmin(X,axis=1)
        mx=np.nanmax(X,axis=1)
        p25=np.nanpercentile(X,25,axis=1)
        p75=np.nanpercentile(X,75,axis=1)
        p90=np.nanpercentile(X,90,axis=1)
    oc=obs.sum(axis=1).astype(np.int32)
    mc=(d-oc).astype(np.int32)
    zero=(obs & (X==0)).sum(axis=1).astype(np.int32)

    rn=min(30,d)
    recent=X[:,-rn:]
    prior=X[:,-60:-30] if d>=60 else X[:,:0]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        with np.errstate(all="ignore"):
            recent_mean=np.nanmean(recent,axis=1)
            prior_mean=np.nanmean(prior,axis=1) if prior.shape[1] else np.full(n,np.nan)

    q=max(1,d//4)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        with np.errstate(all="ignore"):
            first_mean=np.nanmean(X[:,:q],axis=1)
            last_mean=np.nanmean(X[:,-q:],axis=1)

    t=np.arange(d,dtype=np.float64)
    counts=oc.astype(np.float64)
    valid=obs.astype(np.float64)
    tsum=valid @ t
    ysum=np.nan_to_num(X,nan=0.0).sum(axis=1)
    tys=np.nan_to_num(X,nan=0.0) @ t
    den=((t-t.mean())**2).sum()
    with np.errstate(all="ignore"):
        slope=(tys - (tsum*ysum/np.where(counts==0,np.nan,counts))) / den
    slope[counts < 2] = np.nan

    result=pd.DataFrame({
        "CONS_NO":frame[id_col].astype("string").to_numpy(),
        "observed_days":oc,
        "missing_days":mc,
        "missing_ratio":mc/d,
        "zero_days":zero,
        "zero_ratio_observed":_ratio(zero,oc),
        "mean_consumption":mean,
        "median_consumption":med,
        "std_consumption":std,
        "min_consumption":mn,
        "max_consumption":mx,
        "p25_consumption":p25,
        "p75_consumption":p75,
        "p90_consumption":p90,
        "iqr_consumption":p75-p25,
        "cv_consumption":_ratio(std,np.abs(mean)),
        "recent_30d_mean":recent_mean,
        "recent_vs_prior_30d_ratio":_ratio(recent_mean,prior_mean),
        "recent_change":_ratio(recent_mean-prior_mean,np.abs(prior_mean)),
        "first_quarter_mean":first_mean,
        "last_quarter_mean":last_mean,
        "long_run_change":_ratio(last_mean-first_mean,np.abs(first_mean)),
        "consumption_trend_slope":slope,
        "recent_30d_zero_days":(recent==0).sum(axis=1).astype(np.int32),
        "recent_30d_missing_days":np.isnan(recent).sum(axis=1).astype(np.int32),
    })
    # Exact model feature order.
    return result[["CONS_NO"] + FEATURES]

def history_to_wide(
    consumer_id: str,
    readings: list[dict],
    period_start: date | None = None,
    period_end: date | None = None,
) -> pd.DataFrame:
    if not consumer_id:
        raise InputValidationError("CONS_NO must be non-empty.")
    if not readings:
        raise InputValidationError("At least one daily reading is required.")
    rows=[]
    seen=set()
    for item in readings:
        raw_date=item.get("date")
        if raw_date is None:
            raise InputValidationError("Each reading requires a date.")
        dt=pd.to_datetime(raw_date, errors="coerce")
        if pd.isna(dt):
            raise InputValidationError(f"Invalid date: {raw_date}")
        day=dt.date()
        if day in seen:
            raise InputValidationError(f"Duplicate date in history: {day.isoformat()}")
        seen.add(day)
        value=item.get("consumption")
        if value is None:
            val=np.nan
        else:
            try:
                val=float(value)
            except (TypeError,ValueError):
                raise InputValidationError(f"Consumption must be numeric or null for {day.isoformat()}")
            if not np.isfinite(val):
                raise InputValidationError(f"Consumption must be finite or null for {day.isoformat()}")
        rows.append((day,val))
    rows.sort()
    if period_start and period_end:
        if period_end < period_start:
            raise InputValidationError("period_end must be on or after period_start.")
        expected=pd.date_range(period_start,period_end,freq="D").date
        observed={d for d,_ in rows}
        missing=sorted(set(expected)-observed)
        extra=sorted(observed-set(expected))
        if missing or extra:
            msg=[]
            if missing: msg.append(f"missing calendar dates: {[d.isoformat() for d in missing[:10]]}")
            if extra: msg.append(f"dates outside declared period: {[d.isoformat() for d in extra[:10]]}")
            raise InputValidationError("; ".join(msg))
    cols={}
    for day,val in rows:
        cols[day.strftime("%Y-%m-%d")]=val
    return pd.DataFrame([{"CONS_NO":consumer_id, **cols}])

def feature_only_frame(feature_rows: list[dict]) -> pd.DataFrame:
    if not feature_rows:
        raise InputValidationError("At least one feature row is required.")
    out=pd.DataFrame(feature_rows)
    missing=[f for f in FEATURES if f not in out.columns]
    extra=[c for c in out.columns if c != "CONS_NO" and c not in FEATURES]
    if missing:
        raise InputValidationError(f"Missing required model features: {missing}")
    if extra:
        raise InputValidationError(f"Unexpected model features: {extra}")
    if "CONS_NO" not in out.columns:
        raise InputValidationError("CONS_NO is required.")
    for c in FEATURES:
        try:
            vals=pd.to_numeric(out[c],errors="coerce")
        except (TypeError, ValueError) as exc:
            raise InputValidationError(f"Feature {c} must be numeric or null.") from exc
        bad=out[c].notna() & ~np.isfinite(vals.to_numpy(dtype=float))
        if bad.any():
            raise InputValidationError(f"Feature {c} contains non-finite values.")
        out[c]=vals
    out["CONS_NO"]=out["CONS_NO"].astype("string")
    return out[["CONS_NO"]+FEATURES]
