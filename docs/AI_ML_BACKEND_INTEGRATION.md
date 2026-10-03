# AI/ML -> Backend Integration Contract

## Preferred first architecture

Backend process
-> `backend/app/services/ai_ml_service.py`
-> `electrify_ai_ml.service.RiskService`
-> exact V1 feature generation
-> locked calibrated model
-> explanation + screening status
-> backend API response

## Do not

- copy the AI/ML source into `backend/`
- move the `.joblib` model
- retrain during backend integration
- recompute the 24 features independently
- convert missing readings to zero
- send `FLAG`/`CHK_STATE` into inference
- use `CONS_NO` as a feature

## Existing AI/ML path

`ai_ml/Electrify_AI_ML_Final/models/electrify_final_model.joblib`

## Existing service import

```python
from electrify_ai_ml.service import RiskService

ai = RiskService.create()
result = ai.score_histories([...])
```

Read the package's `API_SPEC.md` and `INTEGRATION_GUIDE.md` for complete request/response details.
