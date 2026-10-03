# Electrify — Final Model Card (Task 7)

## Purpose
Classify electricity-consumer records using full-history consumption and data-quality features for the project theft-detection task.

## Locked model
- HistGradientBoostingClassifier
- Class-balanced training
- Median imputation + missing indicators
- Sigmoid probability calibration using 5-fold CV within Dataset A training data
- 24 Task 4 V1 features
- random_state=42

## Frozen Dataset A test results
- ROC-AUC: 0.7858
- PR-AUC: 0.3344
- Brier score: 0.0669

Threshold 0.50: precision 0.6304, recall 0.0802, F1 0.1423.

Cross-validated F1 screening threshold (0.2010): precision 0.3597, recall 0.4149, F1 0.3854.

## Threshold policy
Because no field-confirmed cost matrix or inspection capacity was supplied, the default project screening threshold is the training-only cross-validated F1-maximizing threshold. It is not evidence of operational optimality. Deployment should tune it using real inspection costs, missed-case costs, and available inspection capacity.

## Calibration
Sigmoid calibration reduced training-only OOF Brier from 0.1535 to 0.0661.

## Limitations
1. Full-history consumer classification only; no early-warning/real-time claim.
2. Dataset B is different and was evaluated only after Dataset A model lock.
3. A high model score is a prioritization signal, not proof of theft.
4. Positive cases should receive appropriate review/investigation rather than automatic punitive action.
5. Performance may change under new meter populations, collection procedures, missingness patterns, or label definitions.
