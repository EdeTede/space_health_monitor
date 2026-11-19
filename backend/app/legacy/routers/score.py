from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, Query

from app.legacy.db import connect, get_astronaut, get_mission, get_regions
from app.legacy.engines.twin import build_score
from app.legacy.models import ScoreOut

router = APIRouter(prefix="/api/score", tags=["score"])


@router.get("", response_model=ScoreOut)
def score_day(
    day: float | None = Query(None, ge=0, le=210),
    mode: Literal["dose", "std"] | None = None,
) -> ScoreOut:
    conn = connect()
    try:
        m = get_mission(conn)
        regions = get_regions(conn)
        astronaut = get_astronaut(conn, m["astronaut_id"])
        use_day = float(m["day"] if day is None else day)
        use_mode = mode or m["plan_mode"]
        snap = build_score(regions, use_day, use_mode, astronaut["targets"], m["active_scenario"])
        # cache integer day snapshot
        conn.execute(
            """INSERT OR REPLACE INTO daily_scores
               (mission_id, day, mode, mechanical_json, radiation, readiness, density_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                m["id"],
                int(round(use_day)),
                use_mode,
                json.dumps(snap["mechanical"]),
                snap["radiation_pct"],
                snap["readiness"],
                json.dumps({r["id"]: r["density"] for r in snap["mechanical"]}),
            ),
        )
        conn.commit()
        return ScoreOut(**snap)
    finally:
        conn.close()
