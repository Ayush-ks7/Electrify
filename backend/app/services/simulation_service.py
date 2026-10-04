"""Single-process virtual meters. Daily aggregation is ingestion, not ML feature engineering.

Only owned demo copies are mutated. Scenario labels never enter RiskService.
The durable cursor and daily totals advance atomically with telemetry; on restart
streams are paused. Run one Uvicorn worker (no distributed scheduler is implied).
"""
from datetime import datetime, time, timedelta, timezone
from hashlib import sha256
import logging
import math
import random
from statistics import mean
from threading import Event, RLock, Thread
from time import monotonic
from uuid import uuid4

from sqlalchemy import delete, select

from ..core.errors import ServiceError, invalid_input
from ..db.models import Case, Consumer, DailyReading, Finding, Investigation, MeterReading, Prediction, SimulationStream
from ..db.repositories import ConsumerRepository
from ..schemas.scoring import HistoryScoreRequest, Reading
from .scoring_service import ScoringService
from .investigation_service import InvestigationService
from ..core.topology import CONSUMER_IDS

logger = logging.getLogger("electrify.backend.simulation")
DEMO_IDS = CONSUMER_IDS
# wall seconds per tick, simulated minutes per tick
SPEEDS = {"realistic": (60, 1), "fast": (2, 360), "very_fast": (1, 1440)}
MIN_OBSERVED_DAYS = 1  # Positive baseline required; validity is enforced by the existing ML contract.
MAX_SIMULATED_DAYS = 90


class SimulationService:
    def __init__(self, database, ai_ml, settings):
        self.database, self.ai_ml, self.settings = database, ai_ml, settings
        self.lock = RLock()
        self.closed = Event()
        self.due = {}
        self.thread = None

    def launch(self):
        if self.thread and self.thread.is_alive():
            return
        self.closed.clear()
        with self.database.sessions() as session:
            for stream in session.scalars(select(SimulationStream)):
                if not stream.config.get("run_id"):
                    stream.config = {**stream.config, "run_id": uuid4().hex}
                # Preserve older owned demo histories while adopting canonical locality IDs.
                source = stream.config.get("source_consumer_id", "")
                if source.startswith("demo:") and source[5:].isdigit():
                    index = int(source[5:]) - 1
                    if 0 <= index < len(DEMO_IDS):
                        stream.config = {**stream.config, "source_consumer_id": DEMO_IDS[index]}
                if stream.config["state"] == "running":
                    stream.config = {**stream.config, "state": "paused"}
            session.commit()
        self.thread = Thread(target=self._run, name="virtual-meters", daemon=True)
        self.thread.start()

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join()
        self.due.clear()

    def _run(self):
        while not self.closed.wait(0.25):
            try:
                self.tick()
            except Exception:
                logger.exception("Virtual meter scheduler failed; retrying on next tick")

    def status(self):
        with self.lock, self.database.sessions() as session:
            return {"streams": [{"consumer_id": s.consumer_id, **s.config}
                                for s in session.scalars(select(SimulationStream).order_by(SimulationStream.consumer_id))],
                    "demo_consumers": DEMO_IDS, "minimum_observed_days": MIN_OBSERVED_DAYS,
                    "score_every_completed_days": 1, "max_simulated_days": MAX_SIMULATED_DAYS}

    def start(self, request):
        with self.lock, self.database.sessions() as session:
            repo = ConsumerRepository(session)
            current = {s.consumer_id: s for s in session.scalars(select(SimulationStream))}
            targets = []
            changed_targets = set()
            for target in request.targets:
                source = target.consumer_id
                previous = next((s.consumer_id for s in current.values() if s.config["source_consumer_id"] == source), None)
                cid = source if source in current else previous or "SIM-" + sha256(source.encode()).hexdigest()[:16]
                if cid not in current:
                    if len(current) >= len(DEMO_IDS):
                        raise invalid_input("At most 20 demo copies may exist. Reset unused streams first.")
                    if repo.get(cid):
                        raise invalid_input("Demo identifier conflicts with an existing consumer.")
                    if source in DEMO_IDS:
                        number = int(source[1:])
                        end = datetime.now(timezone.utc).date() - timedelta(days=1)
                        rng = random.Random(source)
                        readings = [Reading(date=end - timedelta(days=364-i), consumption=round(
                            (12 + number * 2) * (1 + .08 * math.sin(i * 2 * math.pi / 7))
                            * rng.uniform(.94, 1.06), 4)) for i in range(365)]
                        provenance = "Synthetic 365-day baseline"
                    else:
                        if not repo.get(source):
                            raise ServiceError(404, "CONSUMER_NOT_FOUND", "Selected consumer was not found.")
                        rows, total = repo.history(source, limit=10000)
                        if not rows or total > 9900 or (rows[-1].date - rows[0].date).days > 9900:
                            raise invalid_input("Select a consumer with 1..9900 days of history, or use the demo group.")
                        if rows[-1].date == rows[0].date:
                            raise invalid_input("Scoring needs at least two calendar days of history; use the demo group.")
                        readings = [Reading(date=r.date, consumption=r.consumption) for r in rows]
                        provenance = "Copy of stored history; generated continuation"
                    observed = [r.consumption for r in readings[-30:] if r.consumption is not None and r.consumption >= 0]
                    if not observed or mean(observed) <= 0:
                        raise invalid_input("A positive observed baseline is needed; use the predefined demo group.")
                    repo.ensure(cid)
                    repo.save_history(cid, readings)
                    cursor = datetime.combine(readings[-1].date + timedelta(days=1), time(), timezone.utc)
                    stream = SimulationStream(consumer_id=cid, config={
                        "run_id": uuid4().hex,
                        "source_consumer_id": source, "provenance": provenance,
                        "baseline_kwh": round(mean(observed), 4), "cursor": cursor.isoformat(),
                        "started_at": cursor.isoformat(), "completed_days": 0,
                        "day_total": 0.0, "day_missing": False, "generated_readings": 0,
                        "last_score_day": -1, "score_state": "Waiting for baseline scoring",
                        "supply_day_total": 0.0, "supply_daily_kwh": {},
                        "last_error": None,
                    })
                    session.add(stream)
                    current[cid] = stream
                stream = current[cid]
                changed = stream.config.get("scenario") != target.scenario
                if changed and stream.config.get("scenario") is not None:
                    self._clear_run(session, stream)
                    changed_targets.add(cid)
                if stream.config["completed_days"] >= MAX_SIMULATED_DAYS:
                    raise invalid_input("Demo reached 90 simulated days. Reset it to start again.")
                stream.config = {**stream.config, "scenario": target.scenario, "speed": request.speed,
                                 "state": "running",
                                 "scenario_start_day": stream.config["completed_days"] if changed else stream.config["scenario_start_day"],
                                 "scenario_started_at": stream.config["cursor"] if changed else stream.config["scenario_started_at"]}
                targets.append(cid)
            if len(set(targets)) != len(targets):
                raise invalid_input("Selections refer to the same demo copy.")
            session.commit()
            for cid in targets:
                # Score the real stored baseline immediately, including slow clocks.
                self._score(session, current[cid], retry_failed=True)
                # Repeated Start must not accelerate an already running stream.
                if cid in changed_targets:
                    self.due[cid] = 0
                else:
                    self.due.setdefault(cid, 0)
        return self.status()

    def _clear_findings(self, session, cid):
        # Human case evidence is immutable; unfiled simulation events are ephemeral.
        saved = set(session.scalars(select(Case.anomaly_id)))
        for finding in session.scalars(select(Finding)):
            if finding.snapshot.get("consumer_id") == cid and finding.id not in saved:
                session.delete(finding)

    def _clear_run(self, session, stream):
        cid, config = stream.consumer_id, stream.config
        self._clear_findings(session, cid)
        for model in (MeterReading, Investigation, Prediction):
            session.execute(delete(model).where(model.consumer_id == cid))
        session.execute(delete(DailyReading).where(
            DailyReading.consumer_id == cid,
            DailyReading.date >= datetime.fromisoformat(config["started_at"]).date()))
        stream.config = {**config, "run_id": uuid4().hex, "cursor": config["started_at"],
                         "completed_days": 0, "generated_readings": 0, "day_total": 0.0,
                         "day_missing": False, "last_score_day": -1,
                         "supply_day_total": 0.0, "supply_daily_kwh": {},
                         "score_state": "Waiting for baseline scoring", "last_error": None}

    def control(self, action, ids):
        with self.lock, self.database.sessions() as session:
            streams = list(session.scalars(select(SimulationStream)))
            known = {s.consumer_id for s in streams}
            unknown = set(ids) - known
            if unknown and (action != "reset" or any(session.get(Consumer, cid) for cid in unknown)):
                raise ServiceError(404, "SIMULATION_NOT_FOUND", "A selected simulation was not found.")
            for stream in streams:
                cid = stream.consumer_id
                if ids and cid not in ids:
                    continue
                if action == "reset":
                    self._clear_findings(session, cid)
                    # Ownership is proven by a persisted SimulationStream, not a name prefix.
                    for model in (MeterReading, Investigation, Prediction, DailyReading):
                        session.execute(delete(model).where(model.consumer_id == cid))
                    session.delete(stream)
                    session.flush()
                    session.execute(delete(Consumer).where(Consumer.consumer_id == cid))
                else:
                    stream.config = {**stream.config, "state": "paused" if action == "pause" else "stopped"}
                self.due.pop(cid, None)
            session.commit()
        return self.status()

    def tick(self, force=False):
        with self.lock, self.database.sessions() as session:
            ids = [s.consumer_id for s in session.scalars(select(SimulationStream))
                   if s.config["state"] == "running"]
            for cid in ids:
                if not force and monotonic() < self.due.get(cid, 0):
                    continue
                stream = session.get(SimulationStream, cid)
                config = dict(stream.config)
                delay, minutes = SPEEDS[config["speed"]]
                self.due[cid] = monotonic() + delay
                try:
                    self._generate(session, cid, config, minutes)
                    if config["score_state"] != "Scoring unavailable; telemetry retained":
                        config["last_error"] = None
                    stream.config = config
                    session.commit()
                    self._score(session, stream)
                    from .operations_service import capture_finding
                    capture_finding(session, cid)
                    if InvestigationService(session).get(cid)["requires_review"] and session.get(Investigation, cid) is None:
                        session.add(Investigation(consumer_id=cid, status="Requires Review"))
                        session.commit()
                except Exception:
                    session.rollback()
                    self.due.pop(cid, None)
                    stream = session.get(SimulationStream, cid)
                    stream.config = {**stream.config, "state": "paused", "last_error": "Generation failed; retry Start or reset."}
                    session.commit()
                    logger.exception("Simulation stream paused after processing failure")

    def _generate(self, session, cid, config, minutes):
        cursor = datetime.fromisoformat(config["cursor"])
        remaining = minutes
        while remaining > 0:
            # Split at hour boundaries, so partial realistic ticks and speed changes aggregate correctly.
            duration = min(remaining, 60 - cursor.minute)
            # Same hour has the same waveform regardless of tick size or speed changes.
            rng = random.Random(f"{config['source_consumer_id']}:{cursor.date()}:{cursor.hour}")
            weights = [0.6 + .7 * math.exp(-((h-19)/3)**2) + .4 * math.exp(-((h-8)/2)**2) for h in range(24)]
            expected = config["baseline_kwh"] * weights[cursor.hour] / sum(weights)
            power = expected * rng.uniform(.94, 1.06)
            supplied_power = power
            scenario = config["scenario"]
            age = config["completed_days"] - config["scenario_start_day"]
            meter, comm = "normal", "online"
            voltage = round(rng.uniform(225, 235), 2)
            context = None
            if scenario in ("tampering", "sudden_drop"):
                power *= .22
                if scenario == "sudden_drop":
                    supplied_power = power
            elif scenario == "meter_fault":
                power *= 12 if cursor.hour % 3 else 0
                voltage, meter = 420.0, "fault"
            elif scenario == "communication_failure":
                power, voltage, comm = None, None, "offline"
            elif scenario == "legitimate_abnormal" and age < 4:
                power *= 2.5
                supplied_power = power
                context = "Temporary additional load reported by simulator (unverified)"
            energy = None if power is None else round(power * duration / 60, 6)
            signals = {"voltage_v": voltage, "current_a": None if power is None else round(power * 1000 / (voltage * .95), 3),
                       "power_kw": None if power is None else round(power, 4), "energy_kwh": energy,
                       "interval_minutes": duration, "meter_status": "unknown" if comm == "offline" else meter,
                       "communication_status": comm, "load_context": context, "simulated": True,
                       "scenario": scenario, "run_id": config["run_id"],
                       "source_consumer_id": config["source_consumer_id"]}
            session.add(MeterReading(consumer_id=cid, timestamp=cursor, signals=signals))
            config["day_missing"] = config["day_missing"] or energy is None
            config["day_total"] += energy or 0
            config["supply_day_total"] = config.get("supply_day_total", 0.0) + supplied_power * duration / 60
            config["generated_readings"] += 1
            after = cursor + timedelta(minutes=duration)
            if after.date() != cursor.date():
                ConsumerRepository(session).save_history(cid, [Reading(date=cursor.date(), consumption=
                    None if config["day_missing"] else round(config["day_total"], 4))])
                config["day_total"], config["day_missing"] = 0.0, False
                config["supply_daily_kwh"] = {**config.get("supply_daily_kwh", {}),
                                              cursor.date().isoformat(): round(config["supply_day_total"], 4)}
                config["supply_day_total"] = 0.0
                config["completed_days"] += 1
            cursor = after
            remaining -= duration
            if config["completed_days"] >= MAX_SIMULATED_DAYS:
                config["state"] = "stopped"
                break
        config["cursor"] = cursor.isoformat()

    def _score(self, session, stream, retry_failed=False):
        config = dict(stream.config)
        day = config["completed_days"]
        if day <= config["last_score_day"] and not (retry_failed and config.get("last_error")):
            return
        repo = ConsumerRepository(session)
        readings, _ = repo.history(stream.consumer_id)
        config["last_score_day"] = day
        if sum(r.consumption is not None for r in readings) < MIN_OBSERVED_DAYS:
            config["score_state"] = "Insufficient observed history for scoring"
        else:
            try:
                ScoringService(repo, self.ai_ml, self.settings).score_histories(HistoryScoreRequest(
                    consumers=[{"CONS_NO": stream.consumer_id, "stored": True}], include_explanations=True))
                config["score_state"] = "Scored full stored history"
                config["last_error"] = None
            except ServiceError as exc:
                session.rollback()
                config["score_state"] = "Scoring unavailable; telemetry retained"
                config["last_error"] = exc.message
                # Retry after the next completed day, not on every scheduler tick.
                config["last_score_day"] = day
        stream.config = config
        session.commit()
