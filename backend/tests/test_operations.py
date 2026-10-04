from sqlalchemy import select
from app.core.topology import CONSUMER_IDS, TRANSFORMERS
from app.db.models import DailyReading, SimulationStream
from app.services.operations_service import residual


def test_topology_windows_residual_and_validation(client):
    assert len(CONSUMER_IDS) == 20 and len(set(CONSUMER_IDS)) == 20
    assert TRANSFORMERS[0]['consumers'] == [f'C{i:02d}' for i in range(1, 11)]
    assert TRANSFORMERS[1]['consumers'] == [f'C{i:02d}' for i in range(11, 21)]
    for days in (7, 30):
        data = client.get(f'/api/v1/operations?days={days}').json()
        assert len(data['consumers']) == 20 and len(data['transformers']) == 2
        assert all(c['investigation'] is None for c in data['consumers'])
        assert len(data['consumers'][0]['history']) == days
        for transformer in data['transformers']:
            assert len(transformer['consumers']) == 10
            assert len(transformer['trend']) == days
            assert transformer['residual'] == transformer['input'] - transformer['consumer']
            assert transformer['percent'] == transformer['residual'] / transformer['input'] * 100
    assert client.get('/api/v1/operations?days=8').status_code == 422
    assert residual(100, 0) == (100, 100)
    assert residual(100, None) == (None, None)
    assert residual(0, 0) == (0, None)
    assert residual(100, 110) == (-10, -10)


def test_findings_cases_notes_and_reset_preserve_evidence(client, app):
    app.state.simulation.close()
    response = client.post('/api/v1/simulation/start', json={'targets': [{'consumer_id': 'C01', 'scenario': 'communication_failure'}], 'speed': 'very_fast'})
    assert response.status_code == 200
    app.state.simulation.tick(force=True)
    data = client.get('/api/v1/operations').json()
    c = data['consumers'][0]
    assert c['history'][-1]['consumption'] is None
    assert data['transformers'][0]['residual'] is None
    assert data['transformers'][1]['residual'] is not None
    assert len(data['anomalies']) == 1 and data['cases'] == []
    anomaly = data['anomalies'][0]
    assert anomaly['evidence']['probable_cause'] == 'Meter Data Transmission Failure'
    assert anomaly['evidence']['prediction']['score']['results'][0]['CONS_NO'] == c['backend_id']
    created = client.post('/api/v1/operations/cases', json={'anomaly_id': anomaly['id']})
    assert created.status_code == 200
    case = created.json()
    assert case['status'] == 'Open'
    assert client.post('/api/v1/operations/cases', json={'anomaly_id': anomaly['id']}).json()['id'] == case['id']
    for status in ['Under Review', 'Confirmed', 'False Positive', 'Resolved', 'Open']:
        response = client.post(f"/api/v1/operations/cases/{case['id']}/status", json={'status': status})
        assert response.status_code == 200 and response.json()['status'] == status
    assert client.post(f"/api/v1/operations/cases/{case['id']}/notes", json={'note': 'Meter check requested'}).status_code == 200
    assert client.post(f"/api/v1/operations/cases/{case['id']}/notes", json={'note': '   '}).status_code == 422
    assert client.post(f"/api/v1/operations/cases/{case['id']}/status", json={'status': 'Proven theft'}).status_code == 422
    assert client.post('/api/v1/operations/cases', json={'anomaly_id': 'missing'}).status_code == 404
    assert client.post('/api/v1/simulation/reset', json={}).status_code == 200
    after = client.get('/api/v1/operations').json()
    assert after['anomalies'][0]['evidence'] == anomaly['evidence']
    assert after['anomalies'][0]['case_id'] == case['id']
    assert after['cases'][0]['events'][-1]['note'] == 'Meter check requested'
    assert len(after['consumers']) == 20


def test_zero_is_not_missing_and_all_topology_targets_supported(client, app):
    app.state.simulation.close()
    response = client.post('/api/v1/simulation/start', json={'targets': [{'consumer_id': cid, 'scenario': 'normal'} for cid in CONSUMER_IDS], 'speed': 'fast'})
    assert response.status_code == 200 and len(response.json()['streams']) == 20
    assert response.json()['demo_consumers'] == CONSUMER_IDS
    with app.state.database.sessions() as session:
        cid = next(s['consumer_id'] for s in response.json()['streams'] if s['source_consumer_id'] == 'C01')
        reading = session.scalar(select(DailyReading).where(DailyReading.consumer_id == cid).order_by(DailyReading.date.desc()))
        reading.consumption = 0
        session.commit()
    data = client.get('/api/v1/operations').json()
    assert data['consumers'][0]['history'][-1]['consumption'] == 0
    assert data['transformers'][0]['consumer'] is not None


def test_legacy_owned_demo_adopts_topology_without_losing_history(client, app, ai_ml):
    from fastapi.testclient import TestClient
    from app.main import create_app
    app.state.simulation.close()
    response = client.post('/api/v1/simulation/start', json={'targets': [{'consumer_id': 'C01', 'scenario': 'normal'}]})
    cid = response.json()['streams'][0]['consumer_id']
    with app.state.database.sessions() as session:
        stream = session.get(SimulationStream, cid)
        stream.config = {**stream.config, 'source_consumer_id': 'demo:1'}
        session.commit()
    original = client.get(f'/api/v1/consumers/{cid}/history').json()
    restarted = create_app(app.state.settings, ai_ml=ai_ml)
    with TestClient(restarted) as other:
        restarted.state.simulation.close()
        streams = other.get('/api/v1/simulation').json()['streams']
        assert len(streams) == 1 and streams[0]['source_consumer_id'] == 'C01'
        resumed = other.post('/api/v1/simulation/start', json={'targets': [{'consumer_id': 'C01', 'scenario': 'normal'}]}).json()
        assert len(resumed['streams']) == 1 and resumed['streams'][0]['consumer_id'] == cid
        assert other.get(f'/api/v1/consumers/{cid}/history').json() == original
