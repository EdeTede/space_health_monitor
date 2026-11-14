"""Pydantic request/response models for DoseFit API."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

PlanMode = Literal["dose", "std"]
ScanMode = Literal["density", "dose", "risk"]
SenseType = Literal["load", "radiation", "hrv", "eva", "flare", "symptom"]


class HealthOut(BaseModel):
    status: str = "ok"
    service: str = "dosefit"


class AstronautOut(BaseModel):
    id: str
    name: str
    role: str
    targets: dict[str, float]


class MissionOut(BaseModel):
    id: str
    name: str
    duration_days: int
    earth_mars_mkm: float
    plan_mode: PlanMode
    day: float
    active_scenario: str
    astronaut_id: str
    distance_mkm: float


class DayIn(BaseModel):
    day: float = Field(ge=0, le=210)


class ModeIn(BaseModel):
    mode: PlanMode


class RegionTwinOut(BaseModel):
    id: str
    name: str
    density: float
    density_landing: float
    density_alt_landing: float
    load_gap: float
    fracture_risk: float
    rgb: list[int]
    tip: str


class TwinOut(BaseModel):
    day: float
    mode: PlanMode
    distance_mkm: float
    walkoff_readiness: float
    walkoff_ready: bool
    event_html: str
    active_scenario: str
    regions: list[RegionTwinOut]


class SenseEventIn(BaseModel):
    day: float | None = None
    type: SenseType
    payload: dict[str, Any] = Field(default_factory=dict)


class SenseBatchIn(BaseModel):
    events: list[SenseEventIn]


class SenseOut(BaseModel):
    accepted: int
    mission_day: float


class RegionScoreOut(BaseModel):
    id: str
    name: str
    mechanical: float
    density: float
    load_gap: float
    fracture_risk: float
    target: float


class ScoreOut(BaseModel):
    day: float
    mode: PlanMode
    mechanical: list[RegionScoreOut]
    radiation_pct: float
    radiation_budget_pfu: float
    readiness: float
    resting_hr: float
    hrv_ms: float


class WorkoutSession(BaseModel):
    title: str
    detail: str
    regions: str
    priority: int = 1
    flags: list[str] = Field(default_factory=list)
    how: str | None = None
    steps: list[str] = Field(default_factory=list)


class AdaptPlanOut(BaseModel):
    scenario_id: str
    scenario_name: str
    why: str
    sessions: list[WorkoutSession]


class ScenarioOut(BaseModel):
    id: str
    name: str
    description: str
    active: bool = False


class ActivateOut(BaseModel):
    scenario: ScenarioOut
    plan: AdaptPlanOut
    mission: MissionOut


class EvaPrebreatheOut(BaseModel):
    day: float
    dcs_risk: float
    dcs_label: Literal["LOW", "MODERATE", "HIGH"]
    rest_prebreathe_h: float
    exercise_prebreathe_h: float
    heavy_loading_blocked: bool
    guidance: str
