from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import Any
import pandas as pd

from .config import Settings
from .constants import FEATURES, MODEL_VERSION
from .exceptions import InputValidationError
from .feature_engineering import build_v1_features_from_wide, feature_only_frame, history_to_wide
from .model import ElectrifyModel
from .explain import Explainer

@dataclass
class RiskService:
    settings: Settings
    model: ElectrifyModel
    explainer: Explainer

    @classmethod
    def create(cls, settings: Settings | None=None):
        settings=settings or Settings.from_env()
        model=ElectrifyModel(settings)
        return cls(settings, model, Explainer(model))

    def _validate_threshold(self, threshold: float | None)->float:
        t=self.settings.default_threshold if threshold is None else float(threshold)
        if not 0.0 <= t <= 1.0:
            raise InputValidationError("threshold must be between 0 and 1.")
        return t

    def score_feature_rows(self, rows: list[dict[str,Any]], threshold: float|None=None, include_explanations: bool=True, top_k: int|None=None):
        if len(rows)<1 or len(rows)>self.settings.max_consumers:
            raise InputValidationError(f"consumers must contain 1..{self.settings.max_consumers} rows.")
        frame=feature_only_frame(rows)
        t=self._validate_threshold(threshold)
        X=frame[FEATURES]
        probs=self.model.predict_probability(X)
        explanations=self.explainer.explain_batch(X,probs,top_k or self.settings.explanation_top_k) if include_explanations else [None]*len(frame)
        results=[]
        for i,row in frame.iterrows():
            prob=float(probs[i])
            data_quality={
                "observed_days":None if pd.isna(row["observed_days"]) else int(row["observed_days"]),
                "missing_days":None if pd.isna(row["missing_days"]) else int(row["missing_days"]),
                "missing_ratio":None if pd.isna(row["missing_ratio"]) else float(row["missing_ratio"]),
            }
            results.append({
                "CONS_NO":str(row["CONS_NO"]),
                "predicted_probability":prob,
                "screening_threshold":t,
                "screening_flag":bool(prob>=t),
                "status":"screen_for_review" if prob>=t else "below_screening_threshold",
                "data_quality":data_quality,
                "explanation":explanations[i],
            })
        return {
            "model_version":MODEL_VERSION,
            "scope":"Full-history consumer classification",
            "results":results,
            "disclaimer":"Model-generated risk prioritization only; not proof of theft and not a basis for automatic punitive action.",
        }

    def score_histories(self, consumers:list[dict[str,Any]], threshold:float|None=None, include_explanations:bool=True, top_k:int|None=None):
        if len(consumers)<1 or len(consumers)>self.settings.max_consumers:
            raise InputValidationError(f"consumers must contain 1..{self.settings.max_consumers} rows.")
        wide_rows=[]
        history_warnings=[]
        for c in consumers:
            cid=str(c.get("CONS_NO",""))
            readings=c.get("readings",[])
            start=c.get("period_start")
            end=c.get("period_end")
            start=date.fromisoformat(start) if isinstance(start,str) else start
            end=date.fromisoformat(end) if isinstance(end,str) else end
            wide_rows.append(history_to_wide(cid,readings,start,end))
            n=len(readings)
            if start and end:
                calendar_days=(end-start).days+1
            else:
                dates=[pd.to_datetime(r["date"]) for r in readings]
                calendar_days=(max(dates)-min(dates)).days+1
            if calendar_days != self.settings.training_reference_days:
                history_warnings.append(f"{cid}: supplied history spans {calendar_days} calendar days; the locked model was trained on {self.settings.training_reference_days} calendar positions.")
            if calendar_days < self.settings.min_history_days_for_full_recent_comparison:
                history_warnings.append(f"{cid}: history shorter than 60 days; the recent/prior 30-day comparison cannot be fully formed.")
        wide=pd.concat(wide_rows,ignore_index=True,sort=False).fillna(pd.NA)
        feat=build_v1_features_from_wide(wide)
        rows=feat.to_dict(orient="records")
        response=self.score_feature_rows(rows,threshold,include_explanations,top_k)
        if history_warnings:
            response["history_warnings"]=history_warnings
        return response

    def model_info(self)->dict:
        return self.model.info()
