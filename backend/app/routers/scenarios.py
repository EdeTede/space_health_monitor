from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.db import connect, get_mission
from app.engines import adapt as adapt_engine
from app.models import ActivateOut, AdaptPlanOut, ScenarioOut, WorkoutSession
from app.routers.mission import _mission_out

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioOut])
def list_scenarios() -> list[ScenarioOut]:
    conn = connect()
    try:
        m = get_mission(conn)
        rows = conn.execute("SELECT id, name, description FROM scenarios").fetchall()
        return [
            ScenarioOut(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                active=r["id"] == m["active_scenario"],
            )
            for r in rows
        ]
    finally:
        conn.close()


@router.post("/{scenario_id}/activate", response_model=ActivateOut)
def activate_scenario(scenario_id: str) -> ActivateOut:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT id, name, description FROM scenarios WHERE id = ?", (scenario_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Unknown scenario: {scenario_id}")
        m = get_mission(conn)
        plan = adapt_engine.plan_for(scenario_id)
        # Scenario follows mission day in the UI; activating only stores the adapted plan.
        conn.execute(
            "UPDATE missions SET active_scenario = ? WHERE id = ?",
            (scenario_id, m["id"]),
        )
        conn.execute(
            "INSERT INTO workout_plans (mission_id, scenario_id, plan_json) VALUES (?, ?, ?)",
            (m["id"], scenario_id, json.dumps(plan)),
        )
        conn.commit()
        m = get_mission(conn)
        return ActivateOut(
            scenario=ScenarioOut(
                id=row["id"], name=row["name"], description=row["description"], active=True
            ),
            plan=AdaptPlanOut(
                scenario_id=plan["scenario_id"],
                scenario_name=plan["scenario_name"],
                why=plan["why"],
                sessions=[WorkoutSession(**s) for s in plan["sessions"]],
            ),
            mission=_mission_out(m),
        )
    finally:
        conn.close()
