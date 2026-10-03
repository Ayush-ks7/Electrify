#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python_cmd="$(command -v python3 || command -v python || true)"
if [[ -z "$python_cmd" ]]; then
  echo "Python 3.10-3.13 is required." >&2
  exit 1
fi

if [[ ! -f .venv/bin/python ]]; then
  "$python_cmd" -m venv .venv
fi
source .venv/bin/activate
python -c "import sys; assert (3,10) <= sys.version_info[:2] < (3,14), 'Python 3.10-3.13 required'"
python -m pip install -r backend/requirements.txt -e ai_ml/Electrify_AI_ML_Final -e backend
python -m pip check
echo "Backend + AI/ML environment ready."
echo "Run: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log"
