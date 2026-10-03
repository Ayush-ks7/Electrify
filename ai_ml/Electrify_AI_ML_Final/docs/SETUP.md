# Setup Guide

## Prerequisites

- Python 3.10–3.13; final artifact validation used Python 3.13.5.
- Internet access is normally needed to install pinned dependencies.
- No API keys or external credentials are required.

## Install

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -e .
```

The package also loads a local `.env` file when present. Copy `.env.example` to `.env` and adjust paths/values as needed.

## Run API

```bash
uvicorn electrify_ai_ml.api:app --host 0.0.0.0 --port 8000
```

## Run tests

```bash
pytest -q
python scripts/validate_package.py
```

## Generate V1 features from a wide CSV

```bash
python scripts/build_features.py --input-csv path/to/raw.csv --output-csv path/to/features.csv
```

The transformer expects an identifier column named `CONS_NO` and supported daily date columns. Labels are not required.

## Retrain/reproduce the locked artifact

```bash
python scripts/retrain_locked_model.py   --features-csv path/to/dataset_A_features_v1.csv   --split-manifest training/split_manifest.json   --output-model models/electrify_final_model.joblib
```

This is for reproducibility. Replacing the shipped artifact changes the deployed model and must trigger new validation.

## API documentation

Open:

`http://127.0.0.1:8000/docs`

The stable contract is also in `API_SPEC.md`.
