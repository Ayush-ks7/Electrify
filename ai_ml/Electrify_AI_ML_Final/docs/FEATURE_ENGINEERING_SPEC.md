# Feature Engineering Specification

This document defines the exact 24 features consumed by the locked Dataset A model.

## Data semantics

- Daily readings are ordered chronologically before any feature is calculated.
- Missing consumption is represented as `null`/`NaN`, never converted to zero.
- Actual zero consumption remains a zero.
- Consumer IDs are identifiers only.
- Labels (`FLAG`, `CHK_STATE`) are excluded from inference and never used by the transformer.
- The production transformer operates on the supplied history period. For comparable history quality, every intended calendar day should be represented; missing readings should be null.

## Feature set

### 1. `observed_days`
### 2. `missing_days`
### 3. `missing_ratio`
### 4. `zero_days`
### 5. `zero_ratio_observed`
### 6. `mean_consumption`
### 7. `median_consumption`
### 8. `std_consumption`
### 9. `min_consumption`
### 10. `max_consumption`
### 11. `p25_consumption`
### 12. `p75_consumption`
### 13. `p90_consumption`
### 14. `iqr_consumption`
### 15. `cv_consumption`
### 16. `recent_30d_mean`
### 17. `recent_vs_prior_30d_ratio`
### 18. `recent_change`
### 19. `first_quarter_mean`
### 20. `last_quarter_mean`
### 21. `long_run_change`
### 22. `consumption_trend_slope`
### 23. `recent_30d_zero_days`
### 24. `recent_30d_missing_days`

The exact calculations are implemented in `src/electrify_ai_ml/feature_engineering.py`.

### Data quality
- `observed_days`: count of finite readings.
- `missing_days`: total supplied calendar positions minus observed readings.
- `missing_ratio`: `missing_days / total_calendar_positions`.

### Zero behavior
- `zero_days`: count of observed values equal to zero.
- `zero_ratio_observed`: `zero_days / observed_days`; NaN when no observations exist.

### Distribution
For all finite observed values:
- mean, median, standard deviation (population `ddof=0`), min, max
- p25, p75, p90
- IQR = p75 - p25
- CV = std / abs(mean); NaN when mean is zero.

### Recent behavior
- `recent_30d_mean`: mean over the final 30 supplied chronological positions (or fewer when history is shorter).
- `recent_vs_prior_30d_ratio`: recent mean / preceding 30-position mean.
- `recent_change`: `(recent_mean - prior_mean) / abs(prior_mean)`.
- `recent_30d_zero_days`: exact zero count in final 30 positions.
- `recent_30d_missing_days`: missing count in final 30 positions.

The preceding 30-day comparison is only fully available when at least 60 calendar positions are supplied.

### Long-term behavior
- `first_quarter_mean`: mean of the first `floor(d/4)` positions, minimum 1.
- `last_quarter_mean`: mean of the last `floor(d/4)` positions, minimum 1.
- `long_run_change`: `(last_quarter_mean - first_quarter_mean) / abs(first_quarter_mean)`.
- `consumption_trend_slope`: chronological linear slope using the same closed-form calculation as the Task 4 training implementation; missing readings are omitted from the dependent-variable sum and observation counts.

## Numeric behavior

The transformer uses float32 consumption arrays to match the Task 4 training implementation. The resulting feature values should therefore be considered numerically equivalent within normal float32 tolerance.

## Leakage boundary

Feature generation is label-free and does not fit statistics from a train/test split. The model's imputation statistics are fitted inside the serialized pipeline on the Dataset A training split.

## Early-warning warning

These definitions summarize the supplied full history. They are not validated as a cutoff-time/real-time early-warning feature set.
