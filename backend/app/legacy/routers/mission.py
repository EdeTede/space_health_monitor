from __future__ import annotations

from fastapi import APIRouter

from app.legacy.db import connect, get_mission
from app.legacy.engines.twin import distance_mkm
from app.legacy.models import DayIn, MissionOut, ModeIn

router = APIRouter(prefix="/api/mission", tags=["mission"])


def _mission_out(row: dict) -> MissionOut:
    dist = distance_mkm(row["day"], row["duration_days"], row["earth_mars_mkm"])
    return MissionOut(
        id=row["id"],
        name=row["name"],
        duration_days=row["duration_days"],
        earth_mars_mkm=row["earth_mars_mkm"],
        plan_mode=row["plan_mode"],
        day=row["day"],
        active_scenario=row["active_scenario"],
        astronaut_id=row["astronaut_id"],
        distance_mkm=round(dist, 1),
    )


@router.get("", response_model=MissionOut)
def get_current_mission() -> MissionOut:
    conn = connect()
    try:
        return _mission_out(get_mission(conn))
    finally:
        conn.close()


@router.post("/day", response_model=MissionOut)
def set_day(body: DayIn) -> MissionOut:
    conn = connect()
    try:
        m = get_mission(conn)
        day = max(0.0, min(float(m["duration_days"]), body.day))
        conn.execute("UPDATE missions SET day = ? WHERE id = ?", (day, m["id"]))
        conn.commit()
        m = get_mission(conn)
        return _mission_out(m)
    finally:
        conn.close()


@router.post("/mode", response_model=MissionOut)
def set_mode(body: ModeIn) -> MissionOut:
    conn = connect()
    try:
        m = get_mission(conn)
        conn.execute("UPDATE missions SET plan_mode = ? WHERE id = ?", (body.mode, m["id"]))
        conn.commit()
        return _mission_out(get_mission(conn))
    finally:
        conn.close()
