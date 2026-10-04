"""Simulation browser regressions against real FastAPI/ML in a temporary database."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

import httpx
from playwright.sync_api import sync_playwright, expect

from smoke_workspace import ROOT, free_port, stop, wait_ready

ARTIFACTS = ROOT / "logs" / "simulation-validation"
MODES = ("normal", "tampering", "sudden_drop", "meter_fault", "communication_failure", "legitimate_abnormal")


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    bp, fp = free_port(), free_port()
    backend_url, origin = f"http://127.0.0.1:{bp}", f"http://localhost:{fp}"
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    with tempfile.TemporaryDirectory(prefix="electrify-simulation-") as directory:
        env = {**os.environ, "DATABASE_URL": f"sqlite:///{Path(directory).as_posix()}/smoke.db",
               "DATABASE_AUTO_CREATE": "true", "CORS_ORIGINS": origin, "VITE_API_BASE_URL": backend_url}
        runner = f"from app.main import create_app; from app.core.config import Settings; import uvicorn; uvicorn.run(create_app(Settings(api_key=None)), host='127.0.0.1', port={bp}, access_log=False)"
        processes = []
        with (ARTIFACTS / "backend.log").open("w") as bl, (ARTIFACTS / "vite.log").open("w") as fl:
            try:
                backend = subprocess.Popen([sys.executable, "-c", runner], cwd=ROOT, env=env, stdout=bl, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(backend)
                wait_ready(backend_url + "/health", backend)
                frontend = subprocess.Popen([shutil.which("node"), "node_modules/vite/bin/vite.js", "--host", "localhost", "--port", str(fp), "--strictPort"], cwd=ROOT, env=env, stdout=fl, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(frontend)
                wait_ready(origin, frontend)
                with httpx.Client(base_url=backend_url, trust_env=False, timeout=90) as api, sync_playwright() as p:
                    browser = p.chromium.launch()
                    page = browser.new_page(viewport={"width": 1440, "height": 1100})
                    page.set_default_timeout(45000)
                    expect.set_options(timeout=45000)
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "503" not in m.text else None)

                    def navigate(path):
                        page.locator(".sidebar").get_by_role("link", name=path, exact=True).click()

                    def streams():
                        return api.get("/api/v1/simulation").json()["streams"]

                    def choose(mode):
                        page.get_by_label("Choose a target").select_option("Consumer")
                        page.get_by_label("Consumer", exact=True).select_option("C01")
                        page.get_by_label("Choose a scenario").select_option(mode)
                        page.get_by_role("button", name="Start Simulation", exact=True).click()
                        expect(page.get_by_text("Selected scenario applied.", exact=True)).to_be_visible()
                        expect(page.get_by_text("Simulation Active", exact=True)).to_be_visible()

                    def score_visible(locator):
                        expect(locator).to_have_text(re.compile(r"^\d+(?:\.\d+)? %$"))

                    page.goto(origin + "/simulation")
                    expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                    options = page.get_by_label("Choose a scenario").locator("option").evaluate_all("els => els.map(e=>e.value)")
                    assert set(options) == set(MODES)
                    runs, results = [], {}
                    for mode in MODES:
                        choose(mode)
                        stream = streams()[0]
                        runs.append(stream["run_id"])
                        expect(page.get_by_role("table", name="Simulation meters")).to_contain_text(stream["run_id"][:8])
                        score_visible(page.get_by_test_id("risk-score"))
                        deadline = time.monotonic() + 35
                        while time.monotonic() < deadline:
                            row = api.get(f"/api/v1/investigations/{stream['consumer_id']}").json()
                            if row["prediction"]["period_end"] == row["latest_daily_date"] and streams()[0]["completed_days"] >= 1:
                                break
                            page.wait_for_timeout(200)
                        else:
                            raise AssertionError(f"No completed scored day for {mode}")
                        assert row["latest_reading"]["scenario"] == mode
                        assert row["latest_reading"]["run_id"] == stream["run_id"]
                        assert 0 <= row["review_probability"] <= 1
                        if mode == "normal": assert abs(row["deviation_pct"]) < 7
                        if mode in ("sudden_drop", "tampering"): assert row["deviation_pct"] < -70
                        if mode == "legitimate_abnormal": assert row["deviation_pct"] > 130
                        if mode == "communication_failure": assert row["latest_daily_kwh"] is None
                        if mode == "meter_fault": assert row["latest_reading"]["meter_status"] == "fault"
                        results[mode] = {"probability": row["review_probability"], "cause": row["probable_cause"]}
                        # SPA navigation exercises caches without a page refresh.
                        navigate("Consumers")
                        consumer_row = page.get_by_role("row").filter(has=page.get_by_role("link", name="C01", exact=True))
                        score_visible(consumer_row.get_by_test_id("risk-score"))
                        consumer_row.get_by_role("link", name="C01", exact=True).click()
                        expect(page.get_by_role("heading", name="Consumer C01", exact=True)).to_be_visible()
                        score_visible(page.get_by_test_id("risk-score"))
                        page.get_by_role("tab", name="Detection", exact=True).click()
                        score_visible(page.get_by_test_id("risk-score"))
                        navigate("Overview")
                        expect(page.get_by_role("table", name="Transformer energy balance")).to_be_visible()
                        if mode == "communication_failure":
                            expect(page.get_by_role("table", name="Transformer energy balance")).to_contain_text("Unavailable")
                        navigate("Anomalies")
                        if mode != "normal":
                            expect(page.get_by_role("table", name="Anomalies")).to_contain_text(row["probable_cause"])
                        navigate("Simulation")
                        page.get_by_role("button", name="Stop", exact=True).click()
                        expect(page.get_by_text("Simulation Stopped", exact=True)).to_be_visible()
                        stopped = streams()
                        page.wait_for_timeout(2300)
                        assert streams() == stopped
                    assert len(set(runs)) == len(MODES)
                    # A delayed old workspace response cannot overwrite Reset's baseline.
                    old = api.get("/api/v1/operations?days=30").json()
                    held = []
                    def delay(route):
                        if not held: held.append(route)
                        else: route.continue_()
                    page.route("**/api/v1/operations?days=30", delay)
                    deadline = time.monotonic() + 8
                    while not held and time.monotonic() < deadline: page.wait_for_timeout(100)
                    assert held
                    page.get_by_role("button", name="Reset", exact=True).click()
                    expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                    try: held[0].fulfill(status=200, content_type="application/json", body=json.dumps(old))
                    except Exception: pass  # Chromium may have closed the aborted request already.
                    page.unroute("**/api/v1/operations?days=30", delay)
                    expect(page.locator(".topbar")).to_contain_text("Baseline preview")
                    assert streams() == []
                    navigate("Consumers")
                    expect(page.get_by_test_id("risk-score").first).to_have_text("Not scored")
                    navigate("Anomalies")
                    expect(page.get_by_text("No findings in this queue", exact=True)).to_be_visible()
                    navigate("Simulation")
                    for mode in ("normal", "meter_fault", "sudden_drop"):
                        page.get_by_role("button", name="Reset", exact=True).click()
                        expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                        choose(mode)
                        page.get_by_role("button", name="Reset", exact=True).click()
                        expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                        assert streams() == []
                    # Reset failure remains visible and retryable, never a false success.
                    choose("normal")
                    page.route("**/api/v1/simulation/reset", lambda r: r.fulfill(status=503, content_type="application/json", body='{"detail":{"message":"Reset temporarily unavailable"}}'))
                    page.get_by_role("button", name="Reset", exact=True).click()
                    expect(page.get_by_role("alert")).to_contain_text("Reset temporarily unavailable")
                    assert streams()
                    page.unroute("**/api/v1/simulation/reset")
                    page.get_by_role("button", name="Reset", exact=True).click()
                    expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                    # Every initialized meter gets its own real saved model score.
                    page.get_by_role("button", name="Start Simulation", exact=True).click()
                    expect(page.get_by_text("Selected scenario applied.", exact=True)).to_be_visible()
                    expect(page.get_by_test_id("risk-score")).to_have_count(20)
                    for score in page.get_by_test_id("risk-score").all(): score_visible(score)
                    page.get_by_role("button", name="Reset", exact=True).click()
                    expect(page.get_by_text("Simulation Off", exact=True)).to_be_visible()
                    page.wait_for_timeout(2300)
                    assert streams() == []
                    page.screenshot(path=str(ARTIFACTS / "reset.png"), full_page=True)
                    (ARTIFACTS / "result.json").write_text(json.dumps({"modes": results, "errors": errors, "transition_runs": runs}, indent=2))
                    assert not errors, errors
                    browser.close()
                    print("Simulation browser regressions passed: six modes, real scores, SPA updates, transitions, stop, repeated reset, delayed response, reset failure and 20-meter scoring.")
            finally:
                for process in reversed(processes): stop(process)

if __name__ == "__main__":
    main()
