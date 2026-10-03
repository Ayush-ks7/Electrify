# Electrify AI/ML Provenance

## Completed stages

- Task 3 — deterministic chronological cleaning and data-quality preservation.
- Task 4 — V1 feature engineering.
- Task 5 — EDA, feature diagnostics, redundancy analysis, leakage review.
- Task 6 — leakage-safe model experiments on Dataset A with stratified CV and untouched test split.
- Task 7 — model locking and sigmoid calibration.
- Task 8 — global/local explainability.
- Final handoff — standalone integration module.

## Dataset A

- 42,372 consumers.
- 24 model features.
- Target: `FLAG`.
- Positive rate: approximately 8.53%.
- Train split: 33,897 rows.
- Frozen test split: 8,475 rows.
- Full-history feature period: 1,034 chronological calendar positions.

## Locked model

HistGradientBoostingClassifier:
- class-balanced training
- median imputation + missing indicators
- sigmoid probability calibration
- 5-fold calibration CV within training split
- random_state=42

## Frozen test

- ROC-AUC: 0.7858
- PR-AUC: 0.3344
- Brier: 0.0669

## Threshold

0.2010437721624017

This is a cross-validated F1 screening convention, not a field-validated operational optimum.

## Dataset B

Dataset B was evaluated only after the Dataset A model was locked. It was not used for tuning. Its different label/data-collection characteristics prevent treating its results as directly interchangeable with Dataset A.

## Final explanation reference

The final package uses feature reference medians computed from Dataset A's training split only.
