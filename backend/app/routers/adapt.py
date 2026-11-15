from __future__ import annotations

from fastapi import APIRouter

from app.db import connect, get_mission
from app.engines import adapt as adapt_engine
from app.engines import score as S
from app.models import AdaptPlanOut, EvaPrebreatheOut, WorkoutSession

router = APIRouter(prefix="/api", tags=["adapt"])


@router.get("/adapt/next", response_model=AdaptPlanOut)
def next_workout() -> AdaptPlanOut:
    conn = connect()
    try:
        m = get_mission(conn)
        # Prefer active scenario plan
        plan = adapt_engine.plan_for(m["active_scenario"])
        return AdaptPlanOut(
            scenario_id=plan["scenario_id"],
            scenario_name=plan["scenario_name"],
            why=plan["why"],
            sessions=[WorkoutSession(**s) for s in plan["sessions"]],
        )
    finally:
        conn.close()


@router.get("/eva/prebreathe", response_model=EvaPrebreatheOut)
def eva_prebreathe(day: float | None = None) -> EvaPrebreatheOut:
    conn = connect()
    try:
        m = get_mission(conn)
        use_day = float(m["day"] if day is None else day)
        risk, label = S.dcs_risk(use_day, m["active_scenario"])
        rest_h, ex_h = S.prebreathe_hours(risk)
        blocked = m["active_scenario"] == "spacewalk" or (145 <= use_day <= 160)
        guidance = (
            f"DCS risk {label} ({risk}). Prefer guided exercise prebreathe (~{ex_h} h) "
            f"over resting prebreathe (~{rest_h} h). "
            + ("Heavy ARED loading is blocked for 24 h pre-EVA." if blocked else "Heavy loading allowed.")
        )
        return EvaPrebreatheOut(
            day=use_day,
            dcs_risk=risk,
            dcs_label=label,  # type: ignore[arg-type]
            rest_prebreathe_h=rest_h,
            exercise_prebreathe_h=ex_h,
            heavy_loading_blocked=blocked,
            guidance=guidance,
        )
    finally:
        conn.close()
