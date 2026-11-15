"""Sense → Score math ported from dosefit.html (sample model, not clinical)."""
from __future__ import annotations

import math
from typing import Any, Literal

PlanMode = Literal["dose", "std"]

RISK_WEIGHT = {
    "hip": 1.0,
    "spine": 0.85,
    "femur": 0.7,
    "tibia": 0.55,
    "chest": 0.2,
    "arm": 0.15,
    "skull": 0.05,
}


def dens(region: dict[str, Any], day: float, mode: PlanMode) -> float:
    """Bone density % vs launch for a region on mission day."""
    loss = float(region[mode]) * day / 30.0
    rid = region["id"]
    if mode == "std" and rid not in ("skull", "arm"):
        storm_days = max(0.0, min(day, 104.0) - 96.0)
        loss += storm_days * 0.06 * (float(region["std"]) / 1.25)
    if mode == "std" and day >= 150 and rid in ("hip", "femur"):
        loss += 0.4
    return 100.0 - loss


def readiness(regions: list[dict[str, Any]], day: float, mode: PlanMode) -> float:
    by_id = {r["id"]: r for r in regions}
    h = 100.0 - dens(by_id["hip"], day, mode)
    t = 100.0 - dens(by_id["tibia"], day, mode)
    s = 100.0 - dens(by_id["spine"], day, mode)
    f = 100.0 - dens(by_id["femur"], day, mode)
    return max(0.0, min(100.0, 100.0 - h * 3.2 - s * 1.5 - f * 1.0 - t * 0.8))


def load_gap(region: dict[str, Any], day: float, mode: PlanMode, index: int) -> float:
    """Fraction of daily mechanical dose still missing (0 = filled)."""
    need = float(region["dose_need"])
    if need <= 0:
        return 0.0
    if mode == "dose":
        delivered = min(1.0, 0.55 + 0.35 * math.sin(day * 0.07 + index))
    else:
        delivered = 0.35 + 0.15 * math.sin(day * 0.05)
    storm_cut = 0.55 if mode == "std" and 96 <= day < 105 else 0.0
    return max(0.0, min(1.0, 1.0 - delivered + storm_cut))


def fracture_risk(region: dict[str, Any], day: float, mode: PlanMode) -> float:
    d = dens(region, day, mode)
    weight = RISK_WEIGHT.get(region["id"], 0.3)
    return max(0.0, min(100.0, (100.0 - d) * 12.0 * weight))


def mechanical_score(region: dict[str, Any], day: float, mode: PlanMode, index: int) -> float:
    """0–100 how close today's load is to the personal target."""
    gap = load_gap(region, day, mode, index)
    return round(100.0 * (1.0 - gap), 1)


def radiation_pct(day: float, mode: PlanMode, flare_active: bool = False) -> float:
    """Sample cumulative radiation budget use (% of daily soft limit)."""
    base = 35.0 + (day / 210.0) * 40.0
    if 96 <= day < 105:
        base += 45.0 if mode == "std" else 28.0
    if flare_active:
        base += 20.0
    return max(0.0, min(100.0, base))


def sample_vitals(day: float, mode: PlanMode, scenario: str) -> tuple[float, float]:
    resting = 58 + (4 if mode == "std" else 0) + math.sin(day * 0.05) * 2
    hrv = 72 - (8 if mode == "std" else 0) + math.cos(day * 0.04) * 4
    if scenario == "low_readiness":
        resting += 16
        hrv *= 0.7
    return round(resting, 1), round(hrv, 1)


def rgb_density(d: float) -> list[int]:
    t = max(0.0, min(1.0, (100.0 - d) / 8.0))
    a, b, c = [94, 231, 255], [255, 200, 87], [255, 93, 108]
    if t < 0.5:
        u = t * 2
        src, dst = a, b
    else:
        u = (t - 0.5) * 2
        src, dst = b, c
    return [round(src[i] + (dst[i] - src[i]) * u) for i in range(3)]


def rgb_gap(gap: float) -> list[int]:
    t = max(0.0, min(1.0, gap))
    a, b, c = [94, 231, 255], [255, 200, 87], [255, 93, 108]
    if t < 0.5:
        u = t * 2
        src, dst = a, b
    else:
        u = (t - 0.5) * 2
        src, dst = b, c
    return [round(src[i] + (dst[i] - src[i]) * u) for i in range(3)]


def rgb_risk(risk: float) -> list[int]:
    t = max(0.0, min(1.0, risk / 60.0))
    a, b, c = [61, 220, 151], [255, 200, 87], [255, 93, 108]
    if t < 0.5:
        u = t * 2
        src, dst = a, b
    else:
        u = (t - 0.5) * 2
        src, dst = b, c
    return [round(src[i] + (dst[i] - src[i]) * u) for i in range(3)]


def region_rgb(region: dict[str, Any], day: float, mode: PlanMode, index: int, scan: str) -> list[int]:
    if scan == "risk":
        return rgb_risk(fracture_risk(region, day, mode))
    if scan == "dose":
        return rgb_gap(load_gap(region, day, mode, index))
    return rgb_density(dens(region, day, mode))


def tip_for(region: dict[str, Any], day: float, mode: PlanMode, index: int, scan: str) -> str:
    d = dens(region, day, mode)
    gap = load_gap(region, day, mode, index)
    risk = fracture_risk(region, day, mode)
    name = region["name"]
    if scan == "dose":
        if gap > 0.45:
            return f"Load shortfall on {name}. DoseFit would add heavy sets targeting this region."
        if gap > 0.2:
            return f"{name} is close to today's mechanical dose. Keep impact or load quality high."
        return f"{name} hit today's load target."
    if scan == "risk":
        if risk > 40:
            return f"Elevated fracture risk at {name} for a 0.38 g Mars walk-off."
        if risk > 18:
            return f"Watch {name}: density loss is starting to raise landing risk."
        return f"{name} looks stable for landing under current plan."
    if d < 94:
        return f"{name} is {(100 - d):.1f}% below launch. Porosity exaggerated in the hologram."
    return f"{name} still near launch density."


def event_html(day: float, mode: PlanMode, regions: list[dict[str, Any]]) -> str:
    if 96 <= day < 105:
        if mode == "dose":
            return (
                "<b style='color:var(--amber)'>☀ SOLAR STORM.</b> Crew in the shelter. "
                "DoseFit switches to a compact band and impact session, so no loading days are lost."
            )
        return (
            "<b style='color:var(--amber)'>☀ SOLAR STORM.</b> Crew in the shelter, with no machines "
            "and no plan. 8 days of bone loading lost."
        )
    if day >= 209.5:
        r = readiness(regions, 210, mode)
        if r >= 75:
            return (
                "<b style='color:var(--ok)'>MARS LANDING.</b> Hips strong enough to climb down "
                "the ladder and walk on Mars."
            )
        return (
            "<b style='color:var(--red)'>MARS LANDING.</b> Hip bone too weak for a safe first walk. "
            "High fracture risk in 0.38 g."
        )
    events = [
        (0, "<b>LAUNCH.</b> Bone twin calibrated from pre-flight BodyParts3D scan. Targets set per region."),
        (30, "<b>MONTH 1.</b> Insoles catch the right hip being under-loaded. DoseFit shifts squats to right-leg-first."),
        (105, "<b>STORM OVER.</b> Catch-up sessions close the loading gap."),
        (150, "<b>SPACEWALK WEEK.</b> Leg loading paused 24 h before the EVA, then made up after."),
        (185, "<b>FINAL APPROACH.</b> Training shifts to landing prep: balance, heavy squats, impact work."),
    ]
    text = ""
    for d0, msg in events:
        if day >= d0:
            text = msg
    if mode == "std" and 30 <= day < 96:
        text = "<b>FIXED PLAN.</b> Same workout every day. Nobody notices the right hip is under-loaded."
    return text


def dcs_risk(day: float, scenario: str) -> tuple[float, str]:
    """Simplified N₂ / DCS risk score for EVA day."""
    base = 18.0 + (5.0 if 145 <= day <= 160 else 0.0)
    if scenario == "spacewalk":
        base = 42.0
    if base < 25:
        label = "LOW"
    elif base < 45:
        label = "MODERATE"
    else:
        label = "HIGH"
    return round(base, 1), label


def prebreathe_hours(dcs: float) -> tuple[float, float]:
    """Rest vs exercise-enhanced prebreathe (simplified)."""
    rest = 4.3
    exercise = 2.0 if dcs < 50 else 2.4
    return rest, exercise
