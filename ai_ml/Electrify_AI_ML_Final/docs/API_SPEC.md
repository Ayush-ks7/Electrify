# API_SPEC.md — Electrify AI/ML Interface

    Version: **1.0**

    ## 1. Transport

    HTTP JSON API served by FastAPI.

    Base URL in local development: `http://127.0.0.1:8000`

    Endpoints:

    - `GET /health`
    - `GET /v1/model-info`
    - `POST /v1/score`
    - `POST /v1/score-history`

    The same logic is available in-process through `electrify_ai_ml.service.RiskService`; a future backend may use either approach.

    ## 2. Model input contract

    Exact model feature names (24):

    - `observed_days` — numeric, nullable
- `missing_days` — numeric, nullable
- `missing_ratio` — numeric, nullable
- `zero_days` — numeric, nullable
- `zero_ratio_observed` — numeric, nullable
- `mean_consumption` — numeric, nullable
- `median_consumption` — numeric, nullable
- `std_consumption` — numeric, nullable
- `min_consumption` — numeric, nullable
- `max_consumption` — numeric, nullable
- `p25_consumption` — numeric, nullable
- `p75_consumption` — numeric, nullable
- `p90_consumption` — numeric, nullable
- `iqr_consumption` — numeric, nullable
- `cv_consumption` — numeric, nullable
- `recent_30d_mean` — numeric, nullable
- `recent_vs_prior_30d_ratio` — numeric, nullable
- `recent_change` — numeric, nullable
- `first_quarter_mean` — numeric, nullable
- `last_quarter_mean` — numeric, nullable
- `long_run_change` — numeric, nullable
- `consumption_trend_slope` — numeric, nullable
- `recent_30d_zero_days` — numeric, nullable
- `recent_30d_missing_days` — numeric, nullable

    `CONS_NO` is an opaque string identifier and is not a model feature.

    `FLAG` and `CHK_STATE` are labels and must not be sent to the scoring API.

    Numeric inputs may be `null`. Non-finite numeric values (`NaN`, `Infinity`) are rejected.

    ## 3. POST /v1/score

    ### Request

    ```json
    {
      "consumers": [
        {
          "CONS_NO": "consumer-001",
          "features": {
            "observed_days": 900,
            "missing_days": 134,
            "missing_ratio": 0.1296,
            "zero_days": 7,
            "zero_ratio_observed": 0.008,
            "mean_consumption": 4.2,
            "median_consumption": 3.8,
            "std_consumption": 1.6,
            "min_consumption": 0.1,
            "max_consumption": 12.7,
            "p25_consumption": 2.9,
            "p75_consumption": 5.0,
            "p90_consumption": 6.8,
            "iqr_consumption": 2.1,
            "cv_consumption": 0.381,
            "recent_30d_mean": 4.8,
            "recent_vs_prior_30d_ratio": 1.2,
            "recent_change": 0.2,
            "first_quarter_mean": 3.7,
            "last_quarter_mean": 4.6,
            "long_run_change": 0.24,
            "consumption_trend_slope": 0.0018,
            "recent_30d_zero_days": 0,
            "recent_30d_missing_days": 2
          }
        }
      ],
      "threshold": 0.201043772162,
      "include_explanations": true,
      "explanation_top_k": 3
    }
    ```

    ### Request validation

    - `consumers`: 1..100 records.
    - `CONS_NO`: non-empty string.
    - `features`: must contain exactly the 24 feature names; no extras.
    - Every feature is numeric or `null`.
    - `threshold`: optional float in [0,1].
    - `explanation_top_k`: integer 1..24.

    ### Response

    ```json
    {
      "model_version": "electrify-task7-locked-v1",
      "scope": "Full-history consumer classification",
      "results": [
        {
          "CONS_NO": "consumer-001",
          "predicted_probability": 0.731,
          "screening_threshold": 0.201043772162,
          "screening_flag": true,
          "status": "screen_for_review",
          "data_quality": {
            "observed_days": 900,
            "missing_days": 134,
            "missing_ratio": 0.1296
          },
          "explanation": {
            "method": "leave-one-feature-out median replacement sensitivity",
            "top_signals": [
              {
                "feature": "max_consumption",
                "value": 12.7,
                "reference_value": 7.0,
                "probability_sensitivity": 0.091,
                "direction": "increases_risk",
                "description": "maximum observed consumption"
              }
            ],
            "note": "Sensitivity is model-specific, not causal attribution and not proof of theft."
          }
        }
      ],
      "disclaimer": "Model-generated risk prioritization only; not proof of theft and not a basis for automatic punitive action."
    }
    ```

    ## 4. POST /v1/score-history

    Use this endpoint when the backend has raw daily consumption history and wants the AI/ML module to perform Task 4 V1 feature generation.

    ### Request

    ```json
    {
      "consumers": [
        {
          "CONS_NO": "consumer-001",
          "period_start": "2026-01-01",
          "period_end": "2026-03-31",
          "readings": [
            {"date": "2026-01-01", "consumption": 3.2},
            {"date": "2026-01-02", "consumption": null},
            {"date": "2026-01-03", "consumption": 3.8}
          ]
        }
      ],
      "threshold": 0.201043772162,
      "include_explanations": true,
      "explanation_top_k": 3
    }
    ```

    Every calendar day in the intended analysis period should be represented. A missing reading is represented by `consumption: null`, not `0`.

    `period_start` and `period_end` are optional, but strongly recommended; when provided, the service rejects missing or extra calendar dates.

    Duplicate dates are rejected.

    ### Processing flow

    `readings -> chronological wide frame -> exact V1 features -> locked model -> calibrated probability -> threshold/status -> explanation`

    The service never uses target labels during feature generation.

    ### Additional response field

    If the supplied history spans a number of calendar days materially different from the Dataset A training horizon (1034 calendar positions), the response may include:

    `history_warnings: [...]`

    These warnings are informational; the model does not claim validated performance for a different horizon.

    ## 5. Error contract

    ### 422 INVALID_INPUT

    ```json
    {
      "detail": {
        "code": "INVALID_INPUT",
        "message": "Missing required model features: ['recent_30d_mean']"
      }
    }
    ```

    Typical causes: missing feature, extra feature, wrong type, non-finite number, duplicate date, missing calendar date, invalid period, invalid threshold.

    ### 503 MODEL_UNAVAILABLE

    ```json
    {
      "detail": {
        "code": "MODEL_UNAVAILABLE",
        "message": "AI/ML model artifacts could not be loaded. Check model/config paths and dependency compatibility."
      }
    }
    ```

    ## 6. Probability / confidence semantics

    `predicted_probability` is the calibrated probability output produced by the locked model pipeline. It should not be labeled as a certainty score or proof.

    There is no separate confidence interval in this package because the project has not validated uncertainty intervals for operational use.

    ## 7. Threshold semantics

    Default threshold: **0.201043772162**

    This is a training-only cross-validated F1 screening convention. It is configurable per request and via environment configuration.

    ## 8. Backend integration choice

    For the future hackathon backend, **in-process integration is preferred initially** because the frontend/backend are being built from scratch and this avoids an unnecessary service boundary.

    Use:

    ```python
    from electrify_ai_ml.service import RiskService
    service = RiskService.create()
    result = service.score_histories(...)
    ```

    Keep the FastAPI API available when the backend team prefers a separate process/container or independent scaling.

    ## 9. Initialization

    Model artifacts are loaded during `RiskService.create()` / API module initialization.

    Required files:

    - `models/electrify_final_model.joblib`
    - `artifacts/feature_reference_medians_train_only.json`
    - `config/defaults.json`
    - `config/model_metadata.json`

    ## 10. Performance

    - Model inference is batch-capable.
    - Explanation generation performs 24 feature-perturbation prediction passes plus the base prediction for the full batch, rather than 24 passes per consumer.
    - For a dashboard list, use `include_explanations=false` unless detailed explanations are needed.
    - No network dependency is required for inference.

    ## 11. Security

    - Do not log raw consumption payloads.
    - Treat `CONS_NO` as an opaque identifier.
    - Do not expose model artifacts for direct upload.
    - Add backend authentication/authorization when the main application is built.
