$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) { throw "Python 3.10-3.13 is required." }

if (-not (Test-Path .venv/Scripts/python.exe)) {
    & $python.Source -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Virtual environment creation failed." }
}
& .\.venv\Scripts\python.exe -c "import sys; assert (3,10) <= sys.version_info[:2] < (3,14), 'Python 3.10-3.13 required'"
if ($LASTEXITCODE -ne 0) { throw "Python version check failed." }
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt -e .\ai_ml\Electrify_AI_ML_Final -e .\backend
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
& .\.venv\Scripts\python.exe -m pip check
if ($LASTEXITCODE -ne 0) { throw "Dependency check failed." }
Write-Host "Backend + AI/ML environment ready."
Write-Host "Run: .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log"
