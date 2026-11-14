"""Pydantic request/response models for Kiwinaut decompress API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthOut(BaseModel):
    status: str = "ok"
    service: str = "kiwinaut"


class DecompressIn(BaseModel):
    day: float = Field(default=150, ge=0, le=210)
    dlco_pct: float | None = Field(default=None, ge=-40, le=20)
    dlco_pre: float | None = Field(default=None, ge=0, le=80)
    dlco_post: float | None = Field(default=None, ge=0, le=80)
    hb: float = Field(default=13.3, ge=5, le=25)
    hydration: float = Field(default=70, ge=0, le=100)
    bubble_grade: int = Field(default=0, ge=0, le=4)
    symptoms: bool = False
    prebreathe_min: float | None = Field(default=None, ge=0, le=600)
    suit_p: float | None = Field(default=None, ge=2, le=15)


class DecompressPartOut(BaseModel):
    label: str
    v: int
    push: bool = False


class DecompressCardOut(BaseModel):
    id: str
    ico: str
    title: str
    reason: str
    color: str


class DecompressOut(BaseModel):
    day: float
    dlco_pct: float
    dlco_pre: float | None = None
    dlco_post: float | None = None
    hb: float | None = None
    hydration: float
    bubble_grade: int
    symptoms: bool
    score: int
    level: Literal["green", "yellow", "orange", "red"]
    band: Literal["green", "yellow", "orange", "red"]
    name: str
    blurb: str
    drop: int
    parts: list[DecompressPartOut]
    cards: list[DecompressCardOut]
    coach: str
    day_note: str
    rest_prebreathe_h: float
    exercise_prebreathe_h: float
    vge: float | None = None
    dcs: float | None = None
    model_vge: float | None = None
    model_dcs: float | None = None
    personal_factor: float | None = None
    oxygen_time_min: float | None = None
    source: str = "eva-model"
