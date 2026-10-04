from typing import Literal

from pydantic import Field, model_validator

from .scoring import ConsumerID, Schema
from ..core.topology import CONSUMER_IDS

Scenario = Literal["normal", "tampering", "sudden_drop", "meter_fault", "communication_failure", "legitimate_abnormal"]
Speed = Literal["realistic", "fast", "very_fast"]
CaseStatus = Literal["Requires Review", "Under Investigation", "Dismissed", "Resolved"]


class Target(Schema):
    consumer_id: ConsumerID
    scenario: Scenario


class StartSimulation(Schema):
    targets: list[Target] = Field(min_length=1, max_length=len(CONSUMER_IDS))
    speed: Speed = "fast"

    @model_validator(mode="after")
    def unique_targets(self):
        if len({t.consumer_id for t in self.targets}) != len(self.targets):
            raise ValueError("Select each consumer only once.")
        return self


class SimulationControl(Schema):
    # Empty means all owned simulation streams, never original consumers.
    consumer_ids: list[ConsumerID] = Field(default_factory=list, max_length=len(CONSUMER_IDS))


class UpdateInvestigation(Schema):
    status: CaseStatus
