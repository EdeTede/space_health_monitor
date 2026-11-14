"""SQLite bootstrap and helpers for Kiwinaut."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "dosefit.db"
SEED_PATH = DATA_DIR / "seed.json"
PROJECT_ROOT = ROOT.parent


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _exec_many(conn: sqlite3.Connection, sql: str, rows: list[tuple]) -> None:
    conn.executemany(sql, rows)


def init_db() -> None:
    seed = json.loads(SEED_PATH.read_text())
    conn = connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS astronauts (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              role TEXT NOT NULL,
              targets_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS missions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              duration_days INTEGER NOT NULL,
              earth_mars_mkm REAL NOT NULL,
              plan_mode TEXT NOT NULL,
              day REAL NOT NULL,
              active_scenario TEXT NOT NULL,
              astronaut_id TEXT NOT NULL REFERENCES astronauts(id)
            );
            CREATE TABLE IF NOT EXISTS region_rates (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              std REAL NOT NULL,
              dose REAL NOT NULL,
              dose_need REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sense_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              mission_id TEXT NOT NULL,
              day REAL NOT NULL,
              type TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS daily_scores (
              mission_id TEXT NOT NULL,
              day INTEGER NOT NULL,
              mode TEXT NOT NULL,
              mechanical_json TEXT NOT NULL,
              radiation REAL NOT NULL,
              readiness REAL NOT NULL,
              density_json TEXT NOT NULL,
              PRIMARY KEY (mission_id, day, mode)
            );
            CREATE TABLE IF NOT EXISTS workout_plans (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              mission_id TEXT NOT NULL,
              scenario_id TEXT NOT NULL,
              plan_json TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS scenarios (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT NOT NULL
            );
            """
        )

        # Re-seed if empty
        if conn.execute("SELECT COUNT(*) AS n FROM astronauts").fetchone()["n"] == 0:
            a = seed["astronaut"]
            conn.execute(
                "INSERT INTO astronauts (id, name, role, targets_json) VALUES (?, ?, ?, ?)",
                (a["id"], a["name"], a["role"], json.dumps(a["targets"])),
            )
            m = seed["mission"]
            conn.execute(
                """INSERT INTO missions
                   (id, name, duration_days, earth_mars_mkm, plan_mode, day, active_scenario, astronaut_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    m["id"],
                    m["name"],
                    m["duration_days"],
                    m["earth_mars_mkm"],
                    m["plan_mode"],
                    m["day"],
                    m["active_scenario"],
                    a["id"],
                ),
            )
            _exec_many(
                conn,
                "INSERT INTO region_rates (id, name, std, dose, dose_need) VALUES (?, ?, ?, ?, ?)",
                [
                    (r["id"], r["name"], r["std"], r["dose"], r["dose_need"])
                    for r in seed["regions"]
                ],
            )
            _exec_many(
                conn,
                "INSERT INTO scenarios (id, name, description) VALUES (?, ?, ?)",
                [(s["id"], s["name"], s["description"]) for s in seed["scenarios"]],
            )
            # Default normal plan placeholder
            conn.execute(
                "INSERT INTO workout_plans (mission_id, scenario_id, plan_json) VALUES (?, ?, ?)",
                (m["id"], "normal", json.dumps({"sessions": []})),
            )
            conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def get_mission(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM missions LIMIT 1").fetchone()
    if not row:
        raise RuntimeError("No mission seeded")
    return dict(row)


def get_regions(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM region_rates").fetchall()
    return [dict(r) for r in rows]


def get_astronaut(conn: sqlite3.Connection, astronaut_id: str | None = None) -> dict[str, Any]:
    if astronaut_id:
        row = conn.execute("SELECT * FROM astronauts WHERE id = ?", (astronaut_id,)).fetchone()
    else:
        row = conn.execute("SELECT * FROM astronauts LIMIT 1").fetchone()
    if not row:
        raise RuntimeError("No astronaut seeded")
    data = dict(row)
    data["targets"] = json.loads(data.pop("targets_json"))
    return data
