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

from sqlalchemy import delete, select

from ..core.errors import ServiceError, invalid_input
from ..db.models import Consumer, DailyReading, Investigation, MeterReading, Prediction, SimulationStream
from ..db.repositories import ConsumerRepository
from ..schemas.scoring import HistoryScoreRequest, Reading
from .scoring_service import ScoringService
from .investigation_service import InvestigationService

logger = logging.getLogger("electrify.backend.simulation")
DEMO_IDS = [f"demo:{i}" for i in range(1, 6)]
# wall seconds per tick, simulated minutes per tick
SPEEDS = {"realistic": (60, 1), "fast": (2, 360), "very_fast": (1, 1440)}
MIN_OBSERVED_DAYS = 30  # Demo scheduling gate; not a new claim of model validity.
MAX_SIMULATED_DAYS = 90


class SimulationService:
    def __init__(self, database, ai_ml, settings):
        self.database, self.ai_ml, self.settings = database, ai_ml, settings
        self.lock = RLock()
        self.closed = Event()
        self.due = {}
        self.thread = None

    def launch(self):
        with self.database.sessions() as session:
            for stream in session.scalars(select(SimulationStream)):
                if stream.config["state"] == "running":
                    stream.config = {**stream.config, "state": "paused"}
            session.commit()
        self.thread = Thread(target=self._run, name="virtual-meters", daemon=True)
        self.thread.start()

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join()

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
                    "score_every_completed_days": 7, "max_simulated_days": MAX_SIMULATED_DAYS}

    def start(self, request):
        with self.lock, self.database.sessions() as session:
            repo = ConsumerRepository(session)
            current = {s.consumer_id: s for s in session.scalars(select(SimulationStream))}
            targets = []
            for target in request.targets:
                source = target.consumer_id
                cid = source if source in current else "SIM-" + sha256(source.encode()).hexdigest()[:16]
                if cid not in current:
                    if len(current) >= 20:
                        raise invalid_input("At most 20 demo copies may exist. Reset unused streams first.")
                    if repo.get(cid):
                        raise invalid_input("Demo identifier conflicts with an existing consumer.")
                    if source in DEMO_IDS:
                        number = int(source.split(":")[1])
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
                        readings = [Reading(date=r.date, consumption=r.consumption) for r in rows]
                        provenance = "Copy of stored history; generated continuation"
                    observed = [r.consumption for r in readings[-30:] if r.consumption is not None and r.consumption >= 0]
                    if not observed or mean(observed) <= 0:
                        raise invalid_input("A positive observed baseline is needed; use the predefined demo group.")
                    repo.ensure(cid)
                    repo.save_history(cid, readings)
                    cursor = datetime.combine(readings[-1].date + timedelta(days=1), time(), timezone.utc)
                    stream = SimulationStream(consumer_id=cid, config={
                        "source_consumer_id": source, "provenance": provenance,
                        "baseline_kwh": round(mean(observed), 4), "cursor": cursor.isoformat(),
                        "started_at": cursor.isoformat(), "completed_days": 0,
                        "day_total": 0.0, "day_missing": False, "generated_readings": 0,
                        "last_score_day": -7, "score_state": "Waiting for completed daily history",
                        "last_error": None,
                    })
                    session.add(stream)
                    current[cid] = stream
                stream = current[cid]
                if stream.config["completed_days"] >= MAX_SIMULATED_DAYS:
                    raise invalid_input("Demo reached 90 simulated days. Reset it to start again.")
                changed = stream.config.get("scenario") != target.scenario
                stream.config = {**stream.config, "scenario": target.scenario, "speed": request.speed,
                                 "state": "running", "last_error": None,
                                 "scenario_start_day": stream.config["completed_days"] if changed else stream.config["scenario_start_day"],
                                 "scenario_started_at": stream.config["cursor"] if changed else stream.config["scenario_started_at"]}
                targets.append(cid)
            if len(set(targets)) != len(targets):
                raise invalid_input("Selections refer to the same demo copy.")
            session.commit()
            for cid in targets:
                self.due[cid] = 0
        return self.status()

    def control(self, action, ids):
        with self.lock, self.database.sessions() as session:
            streams = list(session.scalars(select(SimulationStream)))
            known = {s.consumer_id for s in streams}
            if set(ids) - known:
                raise ServiceError(404, "SIMULATION_NOT_FOUND", "A selected simulation was not found.")
            for stream in streams:
                cid = stream.consumer_id
                if ids and cid not in ids:
                    continue
                if action == "reset":
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
                    stream.config = config
                    session.commit()
                    self._score(session, stream)
                    if InvestigationService(session).get(cid)["requires_review"] and session.get(Investigation, cid) is None:
                        session.add(Investigation(consumer_id=cid, status="Requires Review"))
                        session.commit()
                except Exception:
                    session.rollback()
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
            rng = random.Random(f"{cid}:{config['generated_readings']}")
            weights = [0.6 + .7 * math.exp(-((h-19)/3)**2) + .4 * math.exp(-((h-8)/2)**2) for h in range(24)]
            expected = config["baseline_kwh"] * weights[cursor.hour] / sum(weights)
            power = expected * rng.uniform(.94, 1.06)
            scenario = config["scenario"]
            age = config["completed_days"] - config["scenario_start_day"]
            meter, comm = "normal", "online"
            voltage = round(rng.uniform(225, 235), 2)
            context = None
            if scenario == "tampering":
                power *= .22
            elif scenario == "meter_fault":
                power *= 12 if config["generated_readings"] % 3 else 0
                voltage, meter = 420.0, "fault"
            elif scenario == "communication_failure":
                power, voltage, comm = None, None, "offline"
            elif scenario == "legitimate_abnormal" and age < 4:
                power *= 2.5
                context = "Temporary additional load reported by simulator (unverified)"
            energy = None if power is None else round(power * duration / 60, 6)
            signals = {"voltage_v": voltage, "current_a": None if power is None else round(power * 1000 / (voltage * .95), 3),
                       "power_kw": None if power is None else round(power, 4), "energy_kwh": energy,
                       "interval_minutes": duration, "meter_status": "unknown" if comm == "offline" else meter,
                       "communication_status": comm, "load_context": context, "simulated": True}
            session.add(MeterReading(consumer_id=cid, timestamp=cursor, signals=signals))
            config["day_missing"] = config["day_missing"] or energy is None
            config["day_total"] += energy or 0
            config["generated_readings"] += 1
            after = cursor + timedelta(minutes=duration)
            if after.date() != cursor.date():
                ConsumerRepository(session).save_history(cid, [Reading(date=cursor.date(), consumption=
                    None if config["day_missing"] else round(config["day_total"], 4))])
                config["day_total"], config["day_missing"] = 0.0, False
                config["completed_days"] += 1
            cursor = after
            remaining -= duration
            if config["completed_days"] >= MAX_SIMULATED_DAYS:
                config["state"] = "stopped"
                break
        config["cursor"] = cursor.isoformat()

    def _score(self, session, stream):
        config = dict(stream.config)
        day = config["completed_days"]
        if day < 1 or day - config["last_score_day"] < 7:
            return
        repo = ConsumerRepository(session)
        readings, _ = repo.history(stream.consumer_id)
        config["last_score_day"] = day
        if sum(r.consumption is not None for r in readings) < MIN_OBSERVED_DAYS:
            config["score_state"] = "Insufficient history: need 30 observed days for demo scheduling"
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
                config["last_score_day"] = day - 6
        stream.config = config
        session.commit()
