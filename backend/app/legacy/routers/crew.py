from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.legacy.db import connect, get_astronaut
from app.legacy.models import AstronautOut

router = APIRouter(prefix="/api/crew", tags=["crew"])


@router.get("", response_model=list[AstronautOut])
def list_crew() -> list[AstronautOut]:
    conn = connect()
    try:
        rows = conn.execute("SELECT id FROM astronauts").fetchall()
        return [AstronautOut(**get_astronaut(conn, r["id"])) for r in rows]
    finally:
        conn.close()


@router.get("/{astronaut_id}", response_model=AstronautOut)
def get_crew(astronaut_id: str) -> AstronautOut:
    conn = connect()
    try:
        try:
            return AstronautOut(**get_astronaut(conn, astronaut_id))
        except RuntimeError as exc:
            raise HTTPException(404, str(exc)) from exc
    finally:
        conn.close()
