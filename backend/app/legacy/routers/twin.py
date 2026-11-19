from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from app.legacy.db import connect, get_mission, get_regions
from app.legacy.engines.twin import build_twin
from app.legacy.models import TwinOut

router = APIRouter(prefix="/api/twin", tags=["twin"])


@router.get("", response_model=TwinOut)
def twin_state(
    day: float | None = Query(None, ge=0, le=210),
    mode: Literal["dose", "std"] | None = None,
    scan: Literal["density", "dose", "risk"] = "density",
) -> TwinOut:
    conn = connect()
    try:
        m = get_mission(conn)
        regions = get_regions(conn)
        use_day = float(m["day"] if day is None else day)
        use_mode = mode or m["plan_mode"]
        snap = build_twin(
            regions,
            use_day,
            use_mode,
            float(m["duration_days"]),
            float(m["earth_mars_mkm"]),
            m["active_scenario"],
            scan,
        )
        return TwinOut(**snap)
    finally:
        conn.close()
