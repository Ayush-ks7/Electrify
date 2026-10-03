"""Launch real Uvicorn on an ephemeral port and exercise all v1 endpoints."""
from datetime import date, timedelta
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import httpx

ROOT = Path(__file__).resolve().parents[2]


def main():
    with tempfile.TemporaryDirectory(prefix="electrify-smoke-") as directory:
        temp = Path(directory)
        # Windows subprocess socket inheritance varies; release a free port for the child.
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        env = {**os.environ, "DATABASE_URL": f"sqlite:///{(temp / 'smoke.db').as_posix()}",
               "DATABASE_AUTO_CREATE": "true", "API_KEY": "smoke-local-key"}
        with (temp / "uvicorn.log").open("w+", encoding="utf-8") as log:
            process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
                 "--port", str(port), "--no-access-log"], cwd=ROOT, env=env,
                stdout=log, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30,
                                  headers={"X-API-Key": "smoke-local-key"}, trust_env=False) as client:
                    deadline = time.monotonic() + 60
                    while True:
                        if process.poll() is not None:
                            raise RuntimeError("Uvicorn exited before readiness")
                        try:
                            response = client.get("/health")
                            if response.status_code == 200:
                                break
                        except httpx.TransportError:
                            pass
                        if time.monotonic() >= deadline:
                            raise RuntimeError("Backend failed to become ready within 60 seconds")
                        time.sleep(0.2)
                    info = client.get("/api/v1/model-info")
                    assert info.status_code == 200 and info.json()["feature_count"] == 24
                    features = json.loads((ROOT / "ai_ml/Electrify_AI_ML_Final/sample_data/sample_feature_request.json").read_text())
                    scored = client.post("/api/v1/score", json=features)
                    assert scored.status_code == 200, scored.text
                    start = date(2023, 1, 1)
                    readings = [{"date": (start + timedelta(days=i)).isoformat(),
                                 "consumption": None if i == 5 else 0.0 if i == 6 else 3.0 + (i % 7) / 10}
                                for i in range(1034)]
                    payload = {"consumers": [{"CONS_NO": "SMOKE-HISTORY", "period_start": readings[0]["date"],
                                               "period_end": readings[-1]["date"], "readings": readings}],
                               "include_explanations": True}
                    history = client.post("/api/v1/score-history", json=payload)
                    assert history.status_code == 200, history.text
                    body = history.json()
                    assert not body["history_warnings"]
                    assert body["results"][0]["data_quality"]["missing_days"] == 1
                    assert len(body["results"][0]["explanation"]["top_signals"]) == 3
                    assert client.get("/api/v1/consumers").status_code == 200
                    assert client.get("/api/v1/consumers/SMOKE-HISTORY").status_code == 200
                    stored = client.get("/api/v1/consumers/SMOKE-HISTORY/history").json()
                    assert stored["total"] == 1034
                    assert stored["readings"][5]["consumption"] is None
                    assert stored["readings"][6]["consumption"] == 0
                    risk = client.get("/api/v1/consumers/SMOKE-HISTORY/risk")
                    assert risk.status_code == 200 and risk.json()["score"] == body
                    rescored = client.post("/api/v1/score-history", json={
                        "consumers": [{"CONS_NO": "SMOKE-HISTORY", "stored": True}], "include_explanations": True})
                    assert rescored.status_code == 200 and rescored.json() == body
                    assert client.post("/api/v1/score", json={"consumers": []}).status_code == 422
                    print(json.dumps({"status": "passed", "endpoints": 8, "history_days": 1034,
                                      "model_version": body["model_version"],
                                      "probability": body["results"][0]["predicted_probability"],
                                      "stored_rescore_matches": True}))
            finally:
                if os.name == "nt" and process.poll() is None:
                    # Windows venv python.exe is a launcher: terminate its child too.
                    subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
                elif process.poll() is None:
                    process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=10)


if __name__ == "__main__":
    main()
