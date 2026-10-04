"""Full-stack browser acceptance on temporary ports/database; no developer data touched."""
import csv
import io
import json
import os
import re
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
ARTIFACTS = ROOT / 'logs' / 'workspace-validation'

def stop(process):
    if process.poll() is None:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW, check=True)
        else:
            process.terminate()
        process.wait(timeout=15)

def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]

def wait_ready(url, process):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError('Server exited before readiness')
        try:
            if httpx.get(url, trust_env=False).status_code == 200:
                return
        except httpx.TransportError:
            pass
        time.sleep(.2)
    raise RuntimeError('Server not ready')

def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    bp, fp = free_port(), free_port()
    backend_url, origin = f'http://127.0.0.1:{bp}', f'http://localhost:{fp}'
    flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    with tempfile.TemporaryDirectory(prefix='electrify-workspace-') as directory:
        env = {**os.environ, 'DATABASE_URL': f'sqlite:///{Path(directory).as_posix()}/smoke.db',
               'DATABASE_AUTO_CREATE': 'true', 'CORS_ORIGINS': origin, 'VITE_API_BASE_URL': backend_url}
        runner = f"from app.main import create_app; from app.core.config import Settings; import uvicorn; uvicorn.run(create_app(Settings(api_key=None)), host='127.0.0.1', port={bp}, access_log=False)"
        processes = []
        with (ARTIFACTS / 'backend.log').open('w', encoding='utf-8') as bl, (ARTIFACTS / 'vite.log').open('w', encoding='utf-8') as fl:
            try:
                backend = subprocess.Popen([sys.executable, '-c', runner], cwd=ROOT, env=env, stdout=bl, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(backend); wait_ready(backend_url + '/health', backend)
                frontend = subprocess.Popen([shutil.which('node'), 'node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', str(fp), '--strictPort'], cwd=ROOT, env=env, stdout=fl, stderr=subprocess.STDOUT, creationflags=flags)
                processes.append(frontend); wait_ready(origin, frontend)
                with httpx.Client(base_url=backend_url, trust_env=False, timeout=60) as api, sync_playwright() as p:
                    browser = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
                    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, has_touch=True)
                    page = context.new_page(); page.set_default_timeout(25000)
                    errors = []; warnings = []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else warnings.append(m.text) if m.type == 'warning' else None)
                    page.goto(origin); expect(page.get_by_role('heading', name='Overview', exact=True)).to_be_visible()
                    expect(page.get_by_role('table', name='Transformer energy balance')).to_be_visible()
                    assert page.locator('.sidebar nav a').count() == 7
                    assert page.locator('.metric strong').all_text_contents() == ['20', '2', '0', '0']
                    page.screenshot(path=str(ARTIFACTS / 'overview-desktop.png'), full_page=True)
                    for days in (7, 30):
                        page.get_by_role('button', name=f'Last {days} Days', exact=True).click()
                        expect(page.get_by_text(f'{days}-day view', exact=True)).to_be_visible()
                        with page.expect_download() as download_info:
                            page.get_by_role('button', name='Export CSV').click()
                        download = download_info.value
                        rows = list(csv.DictReader(io.StringIO(Path(download.path()).read_text(encoding='utf-8-sig'))))
                        expected = api.get(f'/api/v1/operations?days={days}').json()
                        assert len(rows) == 2
                        for row, t in zip(rows, expected['transformers']):
                            assert row['start_date'] == expected['range']['start']
                            assert abs(float(row['residual_energy_kwh']) - (float(row['input_energy_kwh']) - float(row['consumer_energy_sum_kwh']))) < 1e-8
                            assert row['transformer'] == t['id']
                    page.get_by_role('button', name='T1', exact=True).click()
                    expect(page.get_by_role('dialog')).to_contain_text('10 connected consumers')
                    page.get_by_role('button', name='Close drawer').click()
                    page.get_by_role('button', name='Collapse sidebar').click()
                    assert page.locator('.app').evaluate("e => e.classList.contains('collapsed')")
                    expect(page.locator('.sidebar a[title="Locality"]')).to_be_visible()
                    page.get_by_role('button', name='Expand sidebar').click()
                    page.goto(origin + '/locality')
                    expect(page.get_by_role('button', name='Inspect consumer C01', exact=True)).to_be_visible()
                    assert page.get_by_role('button', name='Inspect consumer', exact=False).count() == 20
                    page.screenshot(path=str(ARTIFACTS / 'locality-initial.png'), full_page=True)
                    expect(page.get_by_role('button', name='Inspect transformer', exact=False)).to_have_count(2)
                    page.get_by_role('button', name='Inspect consumer C01', exact=True).click()
                    expect(page.get_by_role('dialog')).to_contain_text('Consumer C01')
                    expect(page.get_by_role('dialog')).to_contain_text('M-01')
                    page.keyboard.press('Escape')
                    page.get_by_role('button', name='Inspect transformer T1', exact=True).click()
                    expect(page.get_by_role('dialog')).to_contain_text('10 connected consumers')
                    page.keyboard.press('Escape')
                    page.screenshot(path=str(ARTIFACTS / 'locality-3d.png'), full_page=True)
                    page.get_by_role('tab', name='2D Graph').click()
                    expect(page.locator('.graph-stage canvas').first).to_be_visible()
                    page.wait_for_timeout(400)
                    # Cytoscape's actual rendered positions; click the canvas, not a substitute list.
                    def graph_node(cid):
                        return page.locator('.graph-stage').evaluate("(el,id) => { const cy=el._cyreg.cy; return {pos:cy.getElementById(id).renderedPosition(), count:cy.nodes().length}; }", cid)
                    node = graph_node('T1'); assert node['count'] == 22
                    page.locator('.graph-stage').click(position=node['pos'])
                    expect(page.get_by_role('dialog')).to_contain_text('Transformer T1')
                    page.keyboard.press('Escape')
                    assert page.locator('.graph-stage').evaluate("el => el._cyreg.cy.nodes('.highlight').length") == 11
                    node = graph_node('C01'); page.locator('.graph-stage').click(position=node['pos'])
                    expect(page.get_by_role('dialog')).to_contain_text('Consumer C01')
                    page.keyboard.press('Escape')
                    assert page.locator('.graph-stage').evaluate("el => el._cyreg.cy.edges('.highlight').length") == 1
                    # Drag persists across polling; no continuous force layout.
                    pos = graph_node('C02')['pos']; box = page.locator('.graph-stage').bounding_box()
                    page.mouse.move(box['x'] + pos['x'], box['y'] + pos['y']); page.mouse.down(); page.mouse.move(box['x'] + pos['x'] + 20, box['y'] + pos['y'] + 20, steps=5); page.mouse.up()
                    if page.get_by_role('dialog').is_visible(): page.keyboard.press('Escape')
                    page.screenshot(path=str(ARTIFACTS / 'locality-2d.png'), full_page=True)
                    page.goto(origin + '/consumers'); expect(page.get_by_role('table', name='Consumers')).to_be_visible()
                    assert page.locator('tbody tr').count() == 10
                    page.get_by_role('button', name='Next', exact=True).click(); expect(page.get_by_role('link', name='C20', exact=True)).to_be_visible()
                    page.get_by_placeholder('Consumer or meter ID').fill('C01'); expect(page.get_by_role('link', name='C01', exact=True)).to_be_visible()
                    page.get_by_role('link', name='C01', exact=True).click()
                    for tab in ('Overview', 'Usage', 'Detection', 'Evidence', 'Cases'):
                        page.get_by_role('tab', name=tab, exact=True).click(); expect(page.get_by_role('tabpanel')).to_be_visible()
                    page.goto(origin + '/simulation'); expect(page.get_by_text('Simulation Off', exact=True)).to_be_visible()
                    page.get_by_label('Choose a target').select_option('Consumer'); page.get_by_label('Consumer', exact=True).select_option('C01')
                    page.get_by_label('Choose a scenario').select_option('meter_fault')
                    page.get_by_role('button', name='Start Simulation', exact=True).click()
                    expect(page.get_by_text('Simulation Active', exact=True)).to_be_visible()
                    page.goto(origin + '/anomalies'); expect(page.locator('tbody tr').first).to_be_visible()
                    page.locator('tbody tr').first.locator('td a').first.click()
                    page.get_by_role('button', name='Create Case', exact=True).click()
                    expect(page.get_by_role('heading', name='Cases', exact=True)).to_be_visible()
                    page.get_by_role('button', name='Add Note', exact=True).click()
                    page.get_by_label('Investigation note').fill('Meter inspection requested. Cause remains unverified.')
                    page.get_by_role('dialog').get_by_role('button', name='Add Note', exact=True).click()
                    expect(page.get_by_text('Note added', exact=True).first).to_be_visible()
                    for button, value in [('Change Status', 'Under Review'), ('Mark Confirmed', 'Confirmed'), ('Mark False Positive', 'False Positive'), ('Resolve', 'Resolved')]:
                        page.get_by_role('button', name=button, exact=True).click()
                        page.get_by_role('dialog').get_by_label('Status', exact=True).select_option(value)
                        page.get_by_role('button', name='Save Status', exact=True).click()
                        expect(page.get_by_text('Status updated', exact=True)).to_be_visible()
                    page.reload(); expect(page.get_by_text('Meter inspection requested. Cause remains unverified.')).to_be_visible()
                    page.screenshot(path=str(ARTIFACTS / 'cases.png'), full_page=True)
                    # Real model has run on a completed day, not a fabricated frontend score.
                    deadline = time.monotonic() + 30
                    while time.monotonic() < deadline:
                        state = api.get('/api/v1/operations').json()
                        if state['consumers'][0]['investigation']['prediction']: break
                        page.wait_for_timeout(500)
                    assert state['consumers'][0]['investigation']['prediction']['score']['results'][0]['CONS_NO']
                    # Force outage scenario on a different canonical target for null-data coverage.
                    api.post('/api/v1/simulation/start', json={'targets': [{'consumer_id': 'C11', 'scenario': 'communication_failure'}], 'speed': 'very_fast'}).raise_for_status()
                    page.goto(origin + '/data-quality'); expect(page.get_by_role('link', name='C11', exact=True)).to_be_visible()
                    expect(page.get_by_text('Meter Data Transmission Failure', exact=True)).to_be_visible()
                    page.goto(origin + '/overview'); expect(page.get_by_role('table', name='Transformer energy balance')).to_contain_text('Unavailable')
                    for path in ['overview', 'locality', 'consumers', 'anomalies', 'cases', 'data-quality', 'simulation']:
                        page.goto(origin + '/' + path); expect(page.locator('h1')).to_be_visible()
                        assert 'Demo profile' not in page.locator('body').inner_text()
                    for width, height, name in [(1024, 800, 'tablet'), (390, 844, 'mobile')]:
                        page.set_viewport_size({'width': width, 'height': height}); page.goto(origin + '/overview')
                        expect(page.get_by_role('table', name='Transformer energy balance')).to_be_visible()
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        if width < 760:
                            page.get_by_role('button', name='Open navigation').click()
                            page.get_by_role('dialog').get_by_role('link', name='Locality', exact=True).click()
                            expect(page.get_by_role('heading', name='Locality', exact=True)).to_be_visible()
                            expect(page.get_by_role('button', name='Inspect transformer T1', exact=True)).to_be_visible()
                            page.screenshot(path=str(ARTIFACTS / 'locality-mobile.png'), full_page=True)
                            page.get_by_role('tab', name='2D Graph').click(); expect(page.locator('.graph-stage canvas').first).to_be_visible()
                            page.goto(origin + '/overview'); expect(page.get_by_role('table', name='Transformer energy balance')).to_be_visible()
                        page.screenshot(path=str(ARTIFACTS / f'overview-{name}.png'), full_page=True)
                        page.mouse.move(width / 2, height / 2); page.mouse.wheel(0, 600); page.wait_for_timeout(700)
                        assert page.evaluate('scrollY') > 0
                        page.keyboard.press('Home'); page.keyboard.press('PageDown'); page.wait_for_timeout(500)
                        assert page.evaluate('scrollY') > 0
                    for path in ['overview', 'locality', 'consumers', 'anomalies', 'cases', 'data-quality', 'simulation']:
                        page.goto(origin + '/' + path); expect(page.locator('h1')).to_be_visible()
                        page.wait_for_timeout(200)
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path
                    page.goto(origin + '/overview'); expect(page.get_by_role('table', name='Transformer energy balance')).to_be_visible()
                    touch = context.new_cdp_session(page)
                    touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 380, 'y': 650}]})
                    for y in (600, 500, 400, 300, 200):
                        touch.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 380, 'y': y}]})
                    touch.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    page.wait_for_timeout(400)
                    assert page.evaluate('scrollY') > 0
                    page.goto(origin + '/simulation'); expect(page.get_by_text('Simulation Active', exact=True)).to_be_visible()
                    page.get_by_role('button', name='Stop', exact=True).click()
                    expect(page.get_by_text('Simulation Stopped', exact=True)).to_be_visible()
                    page.get_by_label('Choose a target').select_option('Transformer')
                    page.get_by_label('Transformer', exact=True).select_option('T2')
                    expect(page.get_by_text('10 consumers selected', exact=True)).to_be_visible()
                    page.get_by_role('button', name='Reset', exact=True).click()
                    expect(page.get_by_role('heading', name=re.compile('0 active.*0 initialized meters'))).to_be_visible()
                    assert len(api.get('/api/v1/operations').json()['cases']) == 1
                    page.emulate_media(reduced_motion='reduce'); page.goto(origin + '/overview')
                    expect(page.get_by_role('table', name='Transformer energy balance')).to_be_visible()
                    assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
                    assert page.evaluate("getComputedStyle(document.documentElement).scrollbarWidth") == 'none'
                    assert not page.evaluate("document.documentElement.classList.contains('lenis-smooth')")
                    # Retry state for backend outage is visible and recoverable.
                    page.route('**/api/v1/operations*', lambda r: r.fulfill(status=503, content_type='application/json', body='{"detail":{"message":"Workspace temporarily unavailable"}}'))
                    page.goto(origin + '/consumers'); expect(page.get_by_role('alert')).to_be_visible()
                    page.unroute('**/api/v1/operations*'); page.get_by_role('button', name='Retry', exact=True).click()
                    expect(page.get_by_role('table', name='Consumers')).to_be_visible()
                    # Only intentionally injected HTTP 503 should reach console.
                    errors = [e for e in errors if '503' not in e]
                    (ARTIFACTS / 'result.json').write_text(json.dumps({'errors': errors, 'warnings': warnings, 'routes': 7, 'consumers': 20, 'transformers': 2}, indent=2))
                    assert not errors, errors
                    assert not [w for w in warnings if 'GSAP' in w], warnings
                    browser.close()
                    print('Workspace browser acceptance passed: topology, exports, 3D/2D clicks, cases, simulation, real ML, responsive and reduced motion.')
            finally:
                for process in reversed(processes): stop(process)

if __name__ == '__main__':
    main()
