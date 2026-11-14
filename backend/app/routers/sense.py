from __future__ import annotations

import json

from fastapi import APIRouter

from app.db import connect, get_mission
from app.models import SenseBatchIn, SenseOut

router = APIRouter(prefix="/api/sense", tags=["sense"])


@router.post("", response_model=SenseOut)
def ingest_sense(body: SenseBatchIn) -> SenseOut:
    conn = connect()
    try:
        m = get_mission(conn)
        for ev in body.events:
            day = m["day"] if ev.day is None else ev.day
            conn.execute(
                "INSERT INTO sense_events (mission_id, day, type, payload_json) VALUES (?, ?, ?, ?)",
                (m["id"], day, ev.type, json.dumps(ev.payload)),
            )
            # Lightweight mission nudges from sense types
            if ev.type == "flare":
                conn.execute(
                    "UPDATE missions SET active_scenario = ? WHERE id = ?",
                    ("flare", m["id"]),
                )
            elif ev.type == "hrv" and float(ev.payload.get("delta_hr", 0)) >= 12:
                conn.execute(
                    "UPDATE missions SET active_scenario = ? WHERE id = ?",
                    ("low_readiness", m["id"]),
                )
            elif ev.type == "load" and ev.payload.get("region") == "hip" and float(ev.payload.get("gap", 0)) > 0.4:
                conn.execute(
                    "UPDATE missions SET active_scenario = ? WHERE id = ?",
                    ("underload_hip", m["id"]),
                )
            elif ev.type == "eva":
                conn.execute(
                    "UPDATE missions SET active_scenario = ? WHERE id = ?",
                    ("spacewalk", m["id"]),
                )
        conn.commit()
        m = get_mission(conn)
        return SenseOut(accepted=len(body.events), mission_day=m["day"])
    finally:
        conn.close()
