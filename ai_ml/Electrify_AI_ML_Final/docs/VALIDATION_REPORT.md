# Final AI/ML Validation Report

## Artifact provenance

- Task 3: deterministic chronological cleaning decisions preserved.
- Task 4: 24 Dataset A V1 model features preserved.
- Task 5: EDA, feature diagnostics and leakage review completed.
- Task 6: model experiments and leakage-safe split completed.
- Task 7: HistGradientBoosting + sigmoid calibration locked.
- Task 8: global/local explainability completed.

## Locked model

HistGradientBoostingClassifier with:
- class-balanced training
- median imputation
- missing indicators
- sigmoid calibration
- 5-fold calibration CV inside the Dataset A training split
- 24 exact V1 features

## Frozen Dataset A test metrics

See `artifacts/final_test_summary.json`.

The final reported frozen test metrics are:
- ROC-AUC: 0.7858
- PR-AUC: 0.3344
- Brier score: 0.0669

## Threshold

Default screening threshold: 0.2010437721624017.

It is a training-only F1 screening convention, not an operationally validated threshold.

## Explainability correction in this final package

The packaged reference values for local sensitivity explanations are computed from the
Dataset A training split only. The earlier Task 8 exploratory explanation files used all-data
medians; those exploratory outputs are intentionally not used by the final integration module.

## Final runtime testing

The final package is tested in the packaging environment with:
- Python 3.13.5
- scikit-learn 1.8.0
- FastAPI 0.128.2
- Pydantic 2.13.4
- pandas 2.2.3
- numpy 2.3.5
- joblib 1.5.3
- pytest 9.0.2

See `reports/test_run.txt` inside the final package for the exact test output.

## Not completed because the systems do not yet exist

- application backend
- database integration
- frontend
- authentication/authorization
- production deployment
- production monitoring
- real-world inspection-cost calibration of the decision threshold

These are handoff/integration work, not unresolved AI/ML implementation defects.
