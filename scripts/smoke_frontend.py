"""Real browser -> Vite -> FastAPI -> locked model, using only a temporary DB.

Optional validation tools: pip install playwright; python -m playwright install chromium.
Run from the repository root with .venv/Scripts/python.exe scripts/smoke_frontend.py.
"""
from collections import Counter
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

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "logs" / "frontend-validation"


def stop(process):
    if process.poll() is None:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           creationflags=subprocess.CREATE_NO_WINDOW, check=True)
        else:
            process.terminate()
        process.wait(timeout=15)


def wait_ready(url, process):
    deadline = time.monotonic() + 60
    with httpx.Client(trust_env=False) as client:
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f"Server exited before readiness: {url}")
            try:
                if client.get(url).status_code == 200:
                    return
            except httpx.TransportError:
                pass
            time.sleep(0.2)
    raise RuntimeError(f"Server did not become ready: {url}")


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="electrify-frontend-") as directory:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        backend_url = f"http://127.0.0.1:{port}"
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            frontend_port = sock.getsockname()[1]
        origin = f"http://localhost:{frontend_port}"
        env = {**os.environ, "DATABASE_URL": f"sqlite:///{Path(directory).as_posix()}/smoke.db",
               "DATABASE_AUTO_CREATE": "true", "CORS_ORIGINS": origin,
               "VITE_API_BASE_URL": backend_url}
        # Ignore an optional developer's local API key without changing their .env.
        runner = "from app.main import create_app; from app.core.config import Settings; import uvicorn; uvicorn.run(create_app(Settings(api_key=None)), host='127.0.0.1', port=" + str(port) + ", access_log=False)"
        processes = []
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        with (ARTIFACTS / "backend.log").open("w", encoding="utf-8") as backend_log, (ARTIFACTS / "vite.log").open("w", encoding="utf-8") as vite_log:
            try:
                backend = subprocess.Popen([sys.executable, "-c", runner], cwd=ROOT, env=env, stdout=backend_log, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(backend)
                wait_ready(backend_url + "/health", backend)
                frontend = subprocess.Popen([shutil.which("node"), "node_modules/vite/bin/vite.js", "--host", "localhost", "--port", str(frontend_port), "--strictPort"], cwd=ROOT, env=env, stdout=vite_log, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(frontend)
                wait_ready(origin, frontend)
                with httpx.Client(base_url=backend_url, trust_env=False) as client:
                    assert client.get("/health").json()["status"] == "ok"
                    cors = client.options("/api/v1/score-history", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
                    assert cors.status_code == 200 and cors.headers["access-control-allow-origin"] == origin
                    rejected = client.options("/api/v1/score-history", headers={"Origin": "https://untrusted.invalid", "Access-Control-Request-Method": "POST"})
                    assert rejected.status_code == 400
                with sync_playwright() as playwright:
                    browser = playwright.chromium.launch()
                    context = browser.new_context(viewport={"width": 1440, "height": 1000})
                    page = context.new_page()
                    errors, warnings, requests = [], [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else warnings.append(message.text) if message.type == "warning" else None)
                    page.on("request", lambda req: requests.append(req.url) if req.url.startswith(backend_url) else None)
                    page.goto(origin)
                    assert page.evaluate("async () => (await import('/src/services/api.ts')).API_BASE_URL") == backend_url
                    expect(page.get_by_text("System Status: Operational")).to_be_visible()
                    expect(page.get_by_text("No consumers stored yet.", exact=False)).to_be_visible()
                    assert "14,850" not in page.locator("main").inner_text()

                    start = date(2023, 1, 1)
                    readings = [{"date": (start + timedelta(days=i)).isoformat(), "consumption": None if i == 1032 else 0.0 if i == 1033 else 3.0 + i % 7 / 10} for i in range(1034)]
                    history_payload = {"consumers": [{"CONS_NO": "BROWSER-HISTORY", "readings": readings}]}
                    scored = page.evaluate("async payload => (await import('/src/services/api.ts')).api.scoreHistory(payload)", history_payload)
                    assert scored["model_version"] == "electrify-task7-locked-v1"
                    assert scored["results"][0]["data_quality"]["missing_days"] == 1
                    features = json.loads((ROOT / "ai_ml/Electrify_AI_ML_Final/sample_data/sample_feature_request.json").read_text())
                    features["consumers"] = [features["consumers"][0]]
                    features["consumers"][0]["CONS_NO"] = "BROWSER:#?+%"
                    features["threshold"] = 0.0
                    page.evaluate("async payload => (await import('/src/services/api.ts')).api.score(payload)", features)
                    page.get_by_role("button", name="Refresh Data", exact=True).click()
                    expect(page.get_by_role("cell", name="BROWSER:#?+%", exact=True)).to_be_visible()
                    page.get_by_label("Consumption consumer").select_option("BROWSER-HISTORY")
                    expect(page.get_by_text("Loading backend data...", exact=True)).to_have_count(0)
                    expect(page.locator('.recharts-line-curve')).to_be_visible()
                    page.screenshot(path=str(ARTIFACTS / "dashboard.png"), full_page=True)

                    page.get_by_role("button", name="All Consumers", exact=True).click()
                    expect(page.get_by_role("cell", name="BROWSER-HISTORY Stored consumer")).to_be_visible()
                    before_search = len(requests)
                    page.get_by_placeholder("Search Consumer ID...").fill("HISTORY")
                    expect(page.locator("tbody tr")).to_have_count(1)
                    assert len(requests) == before_search, "Search should reuse cached directory"
                    page.get_by_role("cell", name="BROWSER-HISTORY Stored consumer").click()
                    expect(page.get_by_role("heading", name="BROWSER-HISTORY", exact=True)).to_be_visible()
                    expect(page.get_by_role("button", name="Score Stored History", exact=True)).to_be_enabled()
                    page.get_by_role("button", name="Usage & Profiling", exact=True).click()
                    expect(page.get_by_role("cell", name="Missing", exact=True)).to_be_visible()
                    expect(page.get_by_role("cell", name="0.0 kWh", exact=True)).to_be_visible()
                    assert page.get_by_role("button", name="24H", exact=True).is_disabled()
                    before_range = len(requests)
                    page.get_by_role("button", name="7D", exact=True).click()
                    expect(page.locator("tbody tr")).to_have_count(7)
                    assert len(requests) == before_range, "Time window should not refetch history"
                    page.get_by_role("button", name="Detection & ML Signals", exact=True).click()
                    expect(page.get_by_text("electrify-task7-locked-v1", exact=True)).to_be_visible()
                    expect(page.get_by_text("Missing days: 1", exact=True)).to_be_visible()
                    for signal in scored["results"][0]["explanation"]["top_signals"]:
                        expect(page.get_by_role("heading", name=signal["feature"], exact=True)).to_be_visible()
                    page.get_by_role("button", name="Evidence & Timeline", exact=False).click()
                    expect(page.get_by_text("Source: history", exact=True)).to_be_visible()
                    page.get_by_role("button", name="Score Stored History", exact=True).click()
                    expect(page.get_by_text("Stored history scored and saved successfully.")).to_be_visible()
                    expect(page.get_by_text("Source: stored_history", exact=True)).to_be_visible()
                    page.get_by_role("button", name="Cases & Alerts", exact=True).click()
                    expect(page.get_by_text("Case and alert records are unavailable.", exact=False)).to_be_visible()

                    page.keyboard.press("Control+k")
                    page.get_by_placeholder("Search Consumer ID...").fill("BROWSER:#")
                    page.get_by_text("BROWSER:#?+%", exact=True).click()
                    expect(page.get_by_role("heading", name="BROWSER:#?+%", exact=True)).to_be_visible()
                    expect(page.get_by_text("No daily readings stored.", exact=False)).to_be_visible()
                    assert page.get_by_role("button", name="Score Stored History", exact=True).is_disabled()
                    page.get_by_role("link", name="Settings & System", exact=True).click()
                    expect(page.get_by_text("electrify-task7-locked-v1", exact=True)).to_be_visible()
                    page.get_by_text("Required features (24)", exact=True).click()
                    expect(page.get_by_role("link", name="Consumers", exact=True)).to_be_visible()
                    page.set_viewport_size({"width": 390, "height": 844})
                    page.goto(origin + "/consumers/BROWSER-HISTORY")
                    expect(page.get_by_role("heading", name="BROWSER-HISTORY", exact=True)).to_be_visible()
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                    page.screenshot(path=str(ARTIFACTS / "consumer-mobile.png"), full_page=True)
                    counts_before = len(requests)
                    page.wait_for_timeout(1500)
                    assert len(requests) == counts_before, "Unexpected background refetch loop"
                    assert not errors, errors
                    context.close()

                    # Fault injection is separate from healthy-flow console checks.
                    fault_context = browser.new_context()
                    fault = fault_context.new_page()
                    fault.goto(origin + "/consumers/DOES-NOT-EXIST")
                    expect(fault.get_by_text("Consumer Not Found", exact=True)).to_be_visible()
                    fault.route(backend_url + "/api/v1/consumers?*", lambda route: route.fulfill(status=503, content_type="application/json", headers={"Access-Control-Allow-Origin": origin}, body=json.dumps({"detail": {"code": "DATABASE_UNAVAILABLE", "message": "Database unavailable for test."}})))
                    fault.goto(origin + "/dashboard")
                    expect(fault.get_by_role("alert")).to_contain_text("Database unavailable for test.")
                    assert "14,850" not in fault.locator("main").inner_text()
                    fault.unroute_all()
                    fault.get_by_role("button", name="Retry", exact=True).click()
                    expect(fault.get_by_role("cell", name="BROWSER:#?+%", exact=True)).to_be_visible()
                    fault.route(backend_url + "/api/v1/consumers/*/risk", lambda route: route.fulfill(status=503, content_type="application/json", headers={"Access-Control-Allow-Origin": origin}, body=json.dumps({"detail": {"code": "DATABASE_UNAVAILABLE", "message": "Risk unavailable for test."}})))
                    fault.reload()
                    expect(fault.get_by_role("alert")).to_contain_text("Summary risk totals are unavailable")
                    fault.unroute_all()
                    fault.route(backend_url + "/api/v1/model-info", lambda route: route.fulfill(status=401, content_type="application/json", headers={"Access-Control-Allow-Origin": origin}, body=json.dumps({"detail": {"message": "Unauthorized"}})))
                    fault.goto(origin + "/system")
                    expect(fault.get_by_role("alert")).to_contain_text("Backend access denied")
                    fault.unroute_all()
                    fault.route(backend_url + "/api/v1/consumers/*/risk", lambda route: route.fulfill(status=404, content_type="application/json", headers={"Access-Control-Allow-Origin": origin}, body=json.dumps({"detail": {"code": "RISK_NOT_FOUND", "message": "No saved prediction"}})))
                    fault.goto(origin + "/consumers/BROWSER-HISTORY")
                    expect(fault.get_by_text("No saved prediction for this consumer.", exact=True)).to_be_visible()
                    expect(fault.get_by_text("Not scored", exact=True)).to_be_visible()
                    fault_context.close()
                    browser.close()
                    report = {"status": "passed", "health": "ok", "cors": "passed including POST preflight and rejected origin", "history_days": 1034, "browser_console_errors": errors, "browser_warnings": warnings, "request_counts": dict(Counter(url.replace(backend_url, '') for url in requests)), "checks": ["empty dashboard", "real model scores", "dashboard", "consumer list/search", "encoded ID", "null and zero history", "pagination", "explanations", "stored rescoring", "global search", "model info", "mobile", "no refetch loops", "404", "API failure and retry"]}
                    (ARTIFACTS / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
                    print(json.dumps(report))
            finally:
                for process in reversed(processes):
                    stop(process)


if __name__ == "__main__":
    main()
