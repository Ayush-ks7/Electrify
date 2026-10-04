"""Utility workspace projection; descriptive totals never enter model inference."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import math

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select

from ..core.topology import CONSUMERS, TRANSFORMERS
from ..core.errors import ServiceError
from ..db.models import Case, DailyReading, Finding, SimulationStream, utc_now
from .investigation_service import InvestigationService


def capture_finding(session, cid):
    row = InvestigationService(session).get(cid)
    if row["source_consumer_id"] not in {c["id"] for c in CONSUMERS}:
        return
    stream = session.get(SimulationStream, cid)
    key = f"{cid}:{stream.config.get('run_id', '')}:{row['detection_start']}"
    fid = "AN-" + sha256(key.encode()).hexdigest()[:10].upper()
    finding = session.get(Finding, fid)
    if session.scalar(select(Case).where(Case.anomaly_id == fid)):
        return  # Preserve the evidence on which a human opened a case.
    if not row["requires_review"]:
        if finding:
            session.delete(finding)
            session.commit()
    elif finding is None:
        session.add(Finding(id=fid, consumer_id=row["source_consumer_id"], snapshot=jsonable_encoder(row)))
        session.commit()
    else:
        finding.snapshot = jsonable_encoder(row)
        session.commit()


def residual(input_energy, consumer_energy):
    if input_energy is None or consumer_energy is None:
        return None, None
    value = input_energy - consumer_energy
    return value, value / input_energy * 100 if input_energy else None


def preview_usage(cid, day):
    return round((12 + int(cid[1:]) * 2) * (1 + .08 * math.sin(day.toordinal() * 2 * math.pi / 7)), 4)


class OperationsService:
    def __init__(self, session):
        self.session = session

    def snapshot(self, days):
        streams = {s.config['source_consumer_id']: s for s in self.session.scalars(select(SimulationStream))
                   if s.config['source_consumer_id'] in {c['id'] for c in CONSUMERS}}
        histories = {source: list(self.session.scalars(select(DailyReading).where(DailyReading.consumer_id == s.consumer_id)
                     .order_by(DailyReading.date.desc()).limit(60)))[::-1] for source, s in streams.items()}
        end = max([datetime.now(timezone.utc).date() - timedelta(days=1)] + [r.date for rows in histories.values() for r in rows])
        dates = [end - timedelta(days=i) for i in reversed(range(days))]
        consumers = []
        for node in CONSUMERS:
            cid = node['id']
            stream = streams.get(cid)
            info = InvestigationService(self.session).get(stream.consumer_id) if stream else None
            stored = {r.date: r.consumption for r in histories.get(cid, [])}
            readings = [{"date": d.isoformat(), "consumption": stored.get(d) if stream else preview_usage(cid, d)} for d in dates]
            consumers.append({**node, "backend_id": stream.consumer_id if stream else None,
                              "source": "Simulated meter" if stream else "Illustrative baseline",
                              "history": readings, "investigation": info,
                              "baseline": stream.config['baseline_kwh'] if stream else 12 + int(cid[1:]) * 2})
        balances = []
        for transformer in TRANSFORMERS:
            connected = [c for c in consumers if c['transformer'] == transformer['id']]
            trend = []
            for i, d in enumerate(dates):
                values = [c['history'][i]['consumption'] for c in connected]
                total = sum(values) if all(v is not None and v >= 0 for v in values) else None
                # Generated supply follows actual load, before a faulty/under-reporting
                # meter distorts its reading. Never infer supply from a scenario label.
                def supply(c):
                    stream = streams.get(c['id'])
                    if stream:
                        generated = stream.config.get('supply_daily_kwh', {})
                        if d.isoformat() in generated:
                            return generated[d.isoformat()]
                        observed = next((r.consumption for r in histories[c['id']] if r.date == d), None)
                        if observed is not None and observed >= 0:
                            return observed
                    return preview_usage(c['id'], d)
                incoming = sum(supply(c) for c in connected) * 1.045
                loss, pct = residual(incoming, total)
                trend.append({"date": d.isoformat(), "input": incoming, "consumer": total, "residual": loss, "percent": pct})
            incoming = sum(r['input'] for r in trend)
            total = sum(r['consumer'] for r in trend) if all(r['consumer'] is not None for r in trend) else None
            loss, pct = residual(incoming, total)
            balances.append({**transformer, "input": incoming, "consumer": total, "residual": loss, "percent": pct,
                             "status": "Incomplete data" if pct is None else "Review" if abs(pct) > 10 else "Within demo range", "trend": trend})
        findings = list(self.session.scalars(select(Finding).order_by(Finding.detected_at.desc())))
        cases = list(self.session.scalars(select(Case).order_by(Case.created_at.desc())))
        case_map = {c.anomaly_id: c.id for c in cases}
        anomalies = [{"id": f.id, "consumer": f.consumer_id, "detected_at": f.detected_at,
                      "case_id": case_map.get(f.id), "evidence": f.snapshot} for f in findings]
        return {"range": {"start": dates[0].isoformat(), "end": end.isoformat(), "days": days},
                "consumers": consumers, "transformers": balances, "anomalies": anomalies,
                "cases": [self.case_dict(c) for c in cases],
                "input_source": "Simulated transformer supply follows generated load plus 4.5%; baseline input is illustrative where supply is unavailable. No physical transformer meter connected."}

    @staticmethod
    def case_dict(case):
        return {"id": case.id, "anomaly_id": case.anomaly_id, "status": case.status,
                "created_at": case.created_at, "events": case.events}

    def create_case(self, anomaly_id):
        if not self.session.get(Finding, anomaly_id):
            raise ServiceError(404, "ANOMALY_NOT_FOUND", "Anomaly was not found.")
        existing = self.session.scalar(select(Case).where(Case.anomaly_id == anomaly_id))
        if existing:
            return self.case_dict(existing)
        case = Case(id="CS-" + anomaly_id[3:], anomaly_id=anomaly_id,
                    events=[{"at": utc_now().isoformat(), "message": "Case created"}])
        self.session.add(case)
        self.session.commit()
        return self.case_dict(case)

    def update_case(self, cid, status=None, note=None):
        case = self.session.get(Case, cid)
        if not case:
            raise ServiceError(404, "CASE_NOT_FOUND", "Case was not found.")
        event = {"at": utc_now().isoformat()}
        if status:
            case.status = status
            event['message'] = f"Status updated: {status}"
        else:
            event.update(message="Note added", note=note)
        case.events = [*case.events, event]
        self.session.commit()
        return self.case_dict(case)
