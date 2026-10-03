"""Browser + API + scheduler + real locked ML validation in an isolated temp DB.

Run: .venv/Scripts/python.exe scripts/smoke_simulation.py
Requires the optional Playwright/Chromium tools used by smoke_frontend.py.
"""
from datetime import date, timedelta
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time

import httpx
from playwright.sync_api import sync_playwright, expect

from smoke_frontend import ROOT, stop, wait_ready

ARTIFACTS = ROOT / "logs" / "simulation-validation"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_until(check, page, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = check()
        if result:
            return result
        page.wait_for_timeout(200)
    raise AssertionError("Timed out waiting for runtime condition")


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    backend_port, frontend_port = free_port(), free_port()
    backend_url, origin = f"http://127.0.0.1:{backend_port}", f"http://localhost:{frontend_port}"
    with tempfile.TemporaryDirectory(prefix="electrify-simulation-") as directory:
        env = {**os.environ, "DATABASE_URL": f"sqlite:///{Path(directory).as_posix()}/smoke.db", "DATABASE_AUTO_CREATE": "true", "CORS_ORIGINS": origin, "VITE_API_BASE_URL": backend_url}
        runner = f"from app.main import create_app; from app.core.config import Settings; import uvicorn; uvicorn.run(create_app(Settings(api_key=None)), host='127.0.0.1', port={backend_port}, access_log=False)"
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        processes = []
        with (ARTIFACTS / "backend.log").open("w", encoding="utf-8") as backend_log, (ARTIFACTS / "vite.log").open("w", encoding="utf-8") as frontend_log:
            try:
                backend = subprocess.Popen([sys.executable, "-c", runner], cwd=ROOT, env=env, stdout=backend_log, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(backend)
                wait_ready(backend_url + "/health", backend)
                frontend = subprocess.Popen([shutil.which("node"), "node_modules/vite/bin/vite.js", "--host", "localhost", "--port", str(frontend_port), "--strictPort"], cwd=ROOT, env=env, stdout=frontend_log, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(frontend)
                wait_ready(origin, frontend)
                with httpx.Client(base_url=backend_url, trust_env=False, timeout=30) as api, sync_playwright() as playwright:
                    preflight = api.options("/api/v1/simulation/start", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
                    assert preflight.status_code == 200 and preflight.headers["access-control-allow-origin"] == origin
                    seed = {"consumers": [{"CONS_NO": "ORIGINAL-001", "readings": [{"date": (date(2025, 1, 1) + timedelta(days=i)).isoformat(), "consumption": 12.0 + i % 7} for i in range(365)]}], "include_explanations": True}
                    assert api.post("/api/v1/score-history", json=seed).status_code == 200
                    original = api.get("/api/v1/consumers/ORIGINAL-001/history").json()
                    browser = playwright.chromium.launch()
                    context = browser.new_context(viewport={"width": 1440, "height": 1000})
                    page = context.new_page()
                    errors, failed, requests = [], [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
                    page.on("requestfailed", lambda req: failed.append(f"{req.url}: {req.failure}") if "ERR_ABORTED" not in (req.failure or "") else None)
                    page.on("request", lambda req: requests.append(req.url))
                    page.goto(origin + "/dashboard")
                    expect(page.get_by_role("link", name="ORIGINAL-001", exact=True)).to_be_visible()
                    page.get_by_role("button", name="Simulation Mode", exact=True).click()
                    panel = page.get_by_role("dialog", name="Simulation Mode")
                    expect(panel).to_be_visible()
                    panel.get_by_label("Demo consumer 1", exact=True).uncheck()
                    panel.get_by_label("ORIGINAL-001", exact=True).check()
                    panel.get_by_label("Stream speed").select_option("realistic")
                    panel.get_by_role("button", name="Start / Resume").click()
                    wait_until(lambda: len(api.get("/api/v1/simulation").json()["streams"]) == 1, page)
                    wait_until(lambda: api.get("/api/v1/simulation").json()["streams"][0]["generated_readings"] >= 1, page)
                    panel.get_by_role("button", name="Pause all").click()
                    wait_until(lambda: api.get("/api/v1/simulation").json()["streams"][0]["state"] == "paused", page)
                    paused = api.get("/api/v1/simulation").json()["streams"][0]["generated_readings"]
                    page.wait_for_timeout(1200)
                    assert api.get("/api/v1/simulation").json()["streams"][0]["generated_readings"] == paused
                    panel.get_by_role("button", name="Reset Simulation").click()
                    wait_until(lambda: not api.get("/api/v1/simulation").json()["streams"], page)
                    panel.get_by_label("Stream speed").select_option("very_fast")
                    panel.get_by_role("button", name="Run mixed demo").click()
                    wait_until(lambda: len(api.get("/api/v1/simulation").json()["streams"]) == 5, page)
                    panel.get_by_role("button", name="Close modal").click()
                    wait_until(lambda: min(s["completed_days"] for s in api.get("/api/v1/simulation").json()["streams"]) >= 3, page)
                    rows = api.get("/api/v1/investigations").json()["investigations"]
                    by_scenario = {r["scenario"]: r for r in rows if r["simulated"]}
                    assert set(by_scenario) == {"normal", "tampering", "meter_fault", "communication_failure", "legitimate_abnormal"}
                    for row in by_scenario.values():
                        expect(page.get_by_role("link", name=row["consumer_id"], exact=True)).to_be_visible()
                    assert by_scenario["communication_failure"]["latest_reading"]["energy_kwh"] is None
                    assert by_scenario["meter_fault"]["probable_cause"] == "Meter malfunction suspected"
                    assert by_scenario["tampering"]["deviation_pct"] < -70
                    assert page.evaluate("performance.getEntriesByType('navigation').length") == 1
                    page.screenshot(path=str(ARTIFACTS / "dashboard.png"), full_page=True)
                    cid = by_scenario["tampering"]["consumer_id"]
                    page.get_by_role("link", name=cid, exact=True).click()
                    expect(page.get_by_text("Full-history model explanation", exact=True)).to_be_visible()
                    page.get_by_label("Case status").select_option("Under Investigation")
                    wait_until(lambda: api.get(f"/api/v1/investigations/{cid}").json()["case_status"] == "Under Investigation", page)
                    before = api.get(f"/api/v1/consumers/{cid}/history").json()["total"]
                    wait_until(lambda: api.get(f"/api/v1/consumers/{cid}/history").json()["total"] > before + 1, page)
                    wait_until(lambda: sum(f"/consumers/{cid}/history" in url for url in requests) >= 2, page)
                    risk = api.get(f"/api/v1/consumers/{cid}/risk").json()
                    assert risk["score"]["results"][0]["explanation"]["top_signals"]
                    page.get_by_role("button", name="Simulation Mode", exact=False).click()
                    panel.get_by_role("button", name="Stop all").click()
                    wait_until(lambda: all(s["state"] == "stopped" for s in api.get("/api/v1/simulation").json()["streams"]), page)
                    snapshot = api.get("/api/v1/simulation").json()
                    page.wait_for_timeout(1300)
                    assert api.get("/api/v1/simulation").json() == snapshot
                    page.screenshot(path=str(ARTIFACTS / "controls.png"), full_page=True)
                    panel.get_by_role("button", name="Close modal").click()
                    page.get_by_role("button", name="Score Stored History").click()
                    expect(page.get_by_text("Stored history scored and saved successfully.")).to_be_visible(timeout=30000)
                    page.screenshot(path=str(ARTIFACTS / "consumer-detail.png"), full_page=True)
                    page.get_by_role("button", name="View notifications").click()
                    expect(page.get_by_role("dialog", name="Investigation Alerts")).to_be_visible()
                    page.get_by_role("button", name="Close modal").click()
                    page.set_viewport_size({"width": 390, "height": 844})
                    page.get_by_role("button", name="Simulation Mode", exact=False).click()
                    expect(panel).to_be_visible()
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                    page.screenshot(path=str(ARTIFACTS / "mobile-controls.png"), full_page=True)
                    panel.get_by_role("button", name="Reset Simulation").click()
                    wait_until(lambda: not api.get("/api/v1/simulation").json()["streams"], page)
                    expect(page).to_have_url(origin + "/dashboard")
                    panel.get_by_role("button", name="Close modal").click()
                    assert api.get("/api/v1/consumers/ORIGINAL-001/history").json() == original
                    page.set_viewport_size({"width": 1440, "height": 1000})
                    page.get_by_role("link", name="ORIGINAL-001", exact=True).click()
                    expect(page.get_by_text("Full-history model explanation", exact=True)).to_be_visible()
                    page.get_by_role("button", name="Score Stored History").click()
                    expect(page.get_by_text("Stored history scored and saved successfully.")).to_be_visible(timeout=30000)
                    page.goto(origin + "/system")
                    expect(page.get_by_text("electrify-task7-locked-v1", exact=True)).to_be_visible()
                    for route in ["cases", "anomalies", "alerts"]:
                        page.goto(origin + "/" + route)
                        expect(page).to_have_url(origin + "/consumers")
                    assert not errors, errors
                    assert not failed, failed
                    report = {"result": "PASS", "browser_errors": errors, "failed_requests": failed, "scenarios": list(by_scenario), "checks": ["real backend scheduler", "real locked ML and explanations", "five mixed scenarios", "null outage payload", "fault distinct from tampering", "live dashboard and history without reload", "case status persisted", "pause/stop/reset", "original history preserved", "CORS", "mobile controls", "legacy routes unified"], "requests": len(requests)}
                    (ARTIFACTS / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
                    print(json.dumps(report, indent=2))
                    browser.close()
            finally:
                for process in reversed(processes):
                    stop(process)


if __name__ == "__main__":
    main()
