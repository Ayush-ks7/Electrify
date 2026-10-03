from __future__ import annotations
import pandas as pd
from .constants import FEATURES
from .model import ElectrifyModel

FEATURE_TEXT={
    "observed_days":"number of days with a recorded consumption value",
    "missing_days":"number of days without a recorded consumption value",
    "missing_ratio":"share of the analysis period that is missing",
    "zero_days":"number of observed days with exactly zero consumption",
    "zero_ratio_observed":"share of observed days with zero consumption",
    "mean_consumption":"mean observed consumption",
    "median_consumption":"median observed consumption",
    "std_consumption":"standard deviation of consumption",
    "min_consumption":"minimum observed consumption",
    "max_consumption":"maximum observed consumption",
    "p25_consumption":"25th percentile of consumption",
    "p75_consumption":"75th percentile of consumption",
    "p90_consumption":"90th percentile of consumption",
    "iqr_consumption":"interquartile range of consumption",
    "cv_consumption":"coefficient of variation of consumption",
    "recent_30d_mean":"mean consumption in the most recent 30-day window",
    "recent_vs_prior_30d_ratio":"ratio of recent 30-day mean to the preceding 30-day mean",
    "recent_change":"relative change between recent and preceding 30-day means",
    "first_quarter_mean":"mean consumption in the first quarter of the supplied history",
    "last_quarter_mean":"mean consumption in the last quarter of the supplied history",
    "long_run_change":"relative change between last- and first-quarter means",
    "consumption_trend_slope":"chronological linear trend slope",
    "recent_30d_zero_days":"zero-consumption days in the most recent 30-day window",
    "recent_30d_missing_days":"missing days in the most recent 30-day window",
}

class Explainer:
    def __init__(self, model: ElectrifyModel):
        self.model=model
        self.medians=model.reference_medians

    def explain_batch(self, X: pd.DataFrame, base_probabilities, top_k: int=3):
        top_k=min(max(1,top_k),len(FEATURES))
        base=list(map(float,base_probabilities))
        deltas={f:None for f in FEATURES}
        for f in FEATURES:
            pert=X.copy()
            pert[f]=float(self.medians[f])
            alt=self.model.predict_probability(pert)
            deltas[f]=(pd.Series(base)-pd.Series(alt)).to_numpy()
        explanations=[]
        for i in range(len(X)):
            items=[]
            for f in FEATURES:
                delta=float(deltas[f][i])
                items.append({
                    "feature":f,
                    "value":None if pd.isna(X.iloc[i][f]) else float(X.iloc[i][f]),
                    "reference_value":float(self.medians[f]),
                    "probability_sensitivity":delta,
                    "direction":"increases_risk" if delta>0 else "decreases_risk" if delta<0 else "neutral",
                    "description":FEATURE_TEXT[f],
                })
            items.sort(key=lambda x:abs(x["probability_sensitivity"]), reverse=True)
            explanations.append({
                "method":"leave-one-feature-out median replacement sensitivity",
                "top_signals":items[:top_k],
                "note":"Sensitivity is model-specific, not causal attribution and not proof of theft.",
            })
        return explanations
