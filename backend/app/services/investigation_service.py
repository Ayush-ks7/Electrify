"""Explainable operational rules, explicitly separate from locked ML output.

Deviation is a descriptive baseline comparison, not an anomaly probability or
an input feature. No cause classifier or calibrated cause confidence exists.
"""
from sqlalchemy import select

from ..core.errors import ServiceError
from ..db.models import DailyReading, Investigation, MeterReading, SimulationStream, utc_now
from ..db.repositories import ConsumerRepository


def telemetry_dict(row):
    return {"id": row.id, "consumer_id": row.consumer_id, "timestamp": row.timestamp,
            "received_at": row.received_at, **row.signals}


class InvestigationService:
    def __init__(self, session):
        self.session = session
        self.repo = ConsumerRepository(session)

    def get(self, cid):
        if not self.repo.get(cid):
            raise ServiceError(404, "CONSUMER_NOT_FOUND", "Consumer was not found.")
        stream = self.session.get(SimulationStream, cid)
        config = stream.config if stream else {}
        latest = self.session.scalar(select(MeterReading).where(MeterReading.consumer_id == cid)
                                     .order_by(MeterReading.id.desc()).limit(1))
        days = list(self.session.scalars(select(DailyReading).where(DailyReading.consumer_id == cid)
                                         .order_by(DailyReading.date.desc()).limit(3)))
        prediction = self.repo.latest_prediction(cid)
        score = prediction.score["results"][0] if prediction else None
        state = self.session.get(Investigation, cid)
        baseline = config.get("baseline_kwh")
        latest_daily = days[0].consumption if days else None
        deviation = round((latest_daily / baseline - 1) * 100, 1) if baseline and latest_daily is not None else None
        signals = latest.signals if latest else {}
        evidence = []
        cause, confidence, priority = "Undetermined", "Unavailable — no cause classifier", "Routine"
        action = "Continue monitoring; review full-history screening results in context."
        review = bool(score and score["screening_flag"])
        if review:
            priority, action = "Review", "Review consumption history and model signals before deciding on inspection."
        if baseline:
            evidence.append(f"Fixed pre-simulation baseline: {baseline:.2f} kWh/day (valid non-negative readings among the last 30 stored dates).")
        if deviation is not None:
            evidence.append(f"Latest completed day differs by {deviation:+.1f}% from that baseline.")
        if signals.get("communication_status") == "offline":
            cause, confidence, priority = "Meter Data Transmission Failure", "Telemetry status evidence (not calibrated)", "High"
            action = "Restore communication and verify missing intervals; do not infer theft from an outage."
            evidence.append("No meter payload received: voltage, current, power and consumption are null.")
            review = True
        elif signals.get("meter_status") == "fault":
            cause, confidence, priority = "Meter malfunction suspected", "Fault flag and implausible voltage (not calibrated)", "High"
            action = "Check and service the meter; validate readings before interpreting model risk."
            evidence.append("Meter fault flag and implausible 420 V telemetry; consumption may be unreliable.")
            review = True
        elif signals.get("load_context"):
            cause, confidence, priority = "Reported temporary load change", "Simulator context supplied; unverified", "Review"
            action = "Confirm the reported load change with the consumer and monitor recovery."
            evidence.append(signals["load_context"])
            review = True
        elif baseline and len(days) == 3 and all(
                r.consumption is not None and r.consumption < baseline * .5
                and r.date.isoformat() >= config["scenario_started_at"][:10] for r in days):
            cause, confidence, priority = "Persistent reduction; tampering is one hypothesis", "Rule evidence only; cause unverified", "High"
            action = "Verify occupancy and load changes, then inspect meter integrity if unexplained."
            evidence.append("Three completed days below 50% of baseline with online communication and no meter fault.")
            review = True
        elif deviation is not None and abs(deviation) > 50:
            cause, confidence, priority = "Consumption change under observation", "Baseline comparison only; cause unverified", "Review"
            action = "Check load context and monitor persistence across completed days."
            review = True
        elif latest and not review:
            cause, confidence = "No operational anomaly detected", "Telemetry rules only; not a theft clearance"
        if score:
            evidence.append("Full-history ML output is a review signal, not a cause determination or proof of theft.")
        return {
            "consumer_id": cid, "simulated": stream is not None,
            "source_consumer_id": config.get("source_consumer_id"),
            "run_id": config.get("run_id"),
            "provenance": config.get("provenance"), "scenario": config.get("scenario"),
            "stream_state": config.get("state"), "simulation_time": config.get("cursor"),
            "baseline_kwh": baseline, "latest_daily_kwh": latest_daily,
            "latest_daily_date": days[0].date if days else None, "deviation_pct": deviation,
            "latest_reading": telemetry_dict(latest) if latest else None,
            "risk_level": ("Elevated review signal" if score["screening_flag"] else "Below screening threshold") if score else "Not scored",
            "review_probability": score["predicted_probability"] if score else None,
            "anomaly_score": None, "cause_confidence": None,
            "probable_cause": cause, "cause_evidence_confidence": confidence,
            "recommended_action": action, "inspection_priority": priority,
            "priority_basis": "Operational rules and saved screening flag; not an ML priority engine",
            "requires_review": review, "case_status": state.status if state else None,
            "detection_start": config.get("scenario_started_at"),
            "detection_end": latest.timestamp if latest else None,
            "evidence": evidence, "score_state": config.get("score_state"),
            "last_error": config.get("last_error"),
            "prediction": {"created_at": prediction.created_at, "period_start": prediction.period_start,
                           "period_end": prediction.period_end, "score": prediction.score} if prediction else None,
        }

    def list(self, limit, offset):
        consumers, total = self.repo.list(limit, offset)
        return {"investigations": [self.get(c.consumer_id) for c in consumers], "total": total,
                "limit": limit, "offset": offset}

    def readings(self, cid, limit):
        if not self.repo.get(cid):
            raise ServiceError(404, "CONSUMER_NOT_FOUND", "Consumer was not found.")
        rows = list(self.session.scalars(select(MeterReading).where(MeterReading.consumer_id == cid)
                                        .order_by(MeterReading.id.desc()).limit(limit)))
        return {"readings": [telemetry_dict(row) for row in reversed(rows)]}

    def update(self, cid, status):
        if not self.repo.get(cid):
            raise ServiceError(404, "CONSUMER_NOT_FOUND", "Consumer was not found.")
        record = self.session.get(Investigation, cid)
        if record is None:
            record = Investigation(consumer_id=cid)
            self.session.add(record)
        record.status, record.updated_at = status, utc_now()
        self.session.commit()
        return self.get(cid)
