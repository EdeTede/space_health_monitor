"""Build bone-twin snapshot for the scan HUD."""
from __future__ import annotations

from typing import Any, Literal

from app.legacy.engines import score as S

PlanMode = Literal["dose", "std"]


def distance_mkm(day: float, duration: float, earth_mars: float) -> float:
    return max(0.0, earth_mars * (1.0 - day / duration))


def build_twin(
    regions: list[dict[str, Any]],
    day: float,
    mode: PlanMode,
    duration: float,
    earth_mars: float,
    active_scenario: str,
    scan: str = "density",
) -> dict[str, Any]:
    alt: PlanMode = "std" if mode == "dose" else "dose"
    out_regions = []
    for i, r in enumerate(regions):
        d = S.dens(r, day, mode)
        landing = S.dens(r, duration, mode)
        alt_landing = S.dens(r, duration, alt)
        gap = S.load_gap(r, day, mode, i)
        risk = S.fracture_risk(r, day, mode)
        out_regions.append(
            {
                "id": r["id"],
                "name": r["name"],
                "density": round(d, 2),
                "density_landing": round(landing, 2),
                "density_alt_landing": round(alt_landing, 2),
                "load_gap": round(gap, 3),
                "fracture_risk": round(risk, 2),
                "rgb": S.region_rgb(r, day, mode, i, scan),
                "tip": S.tip_for(r, day, mode, i, scan),
            }
        )
    walk = S.readiness(regions, duration, mode)
    return {
        "day": day,
        "mode": mode,
        "distance_mkm": round(distance_mkm(day, duration, earth_mars), 1),
        "walkoff_readiness": round(walk, 1),
        "walkoff_ready": walk >= 75,
        "event_html": S.event_html(day, mode, regions),
        "active_scenario": active_scenario,
        "regions": out_regions,
    }


def build_score(
    regions: list[dict[str, Any]],
    day: float,
    mode: PlanMode,
    targets: dict[str, float],
    scenario: str,
) -> dict[str, Any]:
    mechanical = []
    for i, r in enumerate(regions):
        mechanical.append(
            {
                "id": r["id"],
                "name": r["name"],
                "mechanical": S.mechanical_score(r, day, mode, i),
                "density": round(S.dens(r, day, mode), 2),
                "load_gap": round(S.load_gap(r, day, mode, i), 3),
                "fracture_risk": round(S.fracture_risk(r, day, mode), 2),
                "target": float(targets.get(r["id"], r["dose_need"])),
            }
        )
    resting, hrv = S.sample_vitals(day, mode, scenario)
    flare = scenario == "flare" or (96 <= day < 105)
    return {
        "day": day,
        "mode": mode,
        "mechanical": mechanical,
        "radiation_pct": round(S.radiation_pct(day, mode, flare), 1),
        "radiation_budget_pfu": 10.0,
        "readiness": round(S.readiness(regions, day, mode), 1),
        "resting_hr": resting,
        "hrv_ms": hrv,
    }
