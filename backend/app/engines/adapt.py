"""Adapt engine: scenario → next workout plan."""
from __future__ import annotations

from typing import Any


SCENARIO_NAMES = {
    "normal": "Normal day",
    "underload_hip": "Under-loaded hip",
    "flare": "Solar flare",
    "low_readiness": "Low readiness",
    "spacewalk": "Spacewalk day",
}


def plan_for(scenario_id: str) -> dict[str, Any]:
    builders = {
        "normal": _normal,
        "underload_hip": _underload_hip,
        "flare": _flare,
        "low_readiness": _low_readiness,
        "spacewalk": _spacewalk,
    }
    fn = builders.get(scenario_id, _normal)
    plan = fn()
    plan["scenario_id"] = scenario_id
    plan["scenario_name"] = SCENARIO_NAMES.get(scenario_id, scenario_id)
    return plan


def _normal() -> dict[str, Any]:
    return {
        "why": "Every region hit its target and readiness is high. The plan stays the same, with a small load increase to keep bone responding.",
        "sessions": [
            {
                "title": "ARED squat + deadlift",
                "detail": "+5% load vs yesterday · 4×6 heavy",
                "regions": "Hips, spine, thighs",
                "priority": 1,
                "flags": ["progressive_overload"],
            },
            {
                "title": "Treadmill intervals",
                "detail": "30 min with harness load",
                "regions": "Shins, heart",
                "priority": 1,
                "flags": [],
            },
            {
                "title": "CEVIS easy spin",
                "detail": "20 min recovery cadence",
                "regions": "Heart",
                "priority": 2,
                "flags": [],
            },
        ],
    }


def _underload_hip() -> dict[str, Any]:
    return {
        "why": "Smart insoles show the right hip under-loaded. DoseFit shifts squats to right-leg-first and adds single-leg work.",
        "sessions": [
            {
                "title": "Right-leg-first ARED squats",
                "detail": "Unilateral emphasis · 5×5 @ yesterday's load",
                "regions": "Right hip, femur",
                "priority": 1,
                "flags": ["asymmetry_correct"],
            },
            {
                "title": "Heel drops + band rows",
                "detail": "Impact stimulus for femoral neck",
                "regions": "Hips, shins",
                "priority": 1,
                "flags": ["impact"],
            },
            {
                "title": "Treadmill steady",
                "detail": "25 min harness; watch right-foot force",
                "regions": "Legs",
                "priority": 2,
                "flags": ["insole_feedback"],
            },
        ],
    }


def _flare() -> dict[str, Any]:
    return {
        "why": "Today's workout was cut short by the flare and radiation passed the daily budget. A shelter session keeps bones loaded now; catch-up runs after all-clear.",
        "sessions": [
            {
                "title": "Shelter session (now)",
                "detail": "20 min: band squats, heel drops for impact, band rows",
                "regions": "Hips, shins, spine",
                "priority": 1,
                "flags": ["shelter", "compact"],
            },
            {
                "title": "Wait for all-clear",
                "detail": "Resume when flux drops under 10 pfu",
                "regions": "—",
                "priority": 1,
                "flags": ["radiation_hold"],
            },
            {
                "title": "Catch-up session (tomorrow)",
                "detail": "Squat and deadlift +10% sets to close the gap",
                "regions": "Hips, spine",
                "priority": 1,
                "flags": ["catch_up"],
            },
            {
                "title": "Option: blood-flow-restriction cuffs",
                "detail": "Light band work with cuffs keeps muscle; weak for bone. Needs clot-risk screening. Not yet used on the ISS.",
                "regions": "Muscle",
                "priority": 2,
                "flags": ["bfr", "optional", "screening_required"],
            },
        ],
    }


def _low_readiness() -> dict[str, Any]:
    return {
        "why": "Resting heart rate is up and HRV is down. DoseFit cuts total volume but keeps a few heavy reps, because bone needs load size, not long sessions.",
        "sessions": [
            {
                "title": "Heavy ARED singles",
                "detail": "3×3 @ high load · long rest · stop if HR stays elevated",
                "regions": "Hips, spine",
                "priority": 1,
                "flags": ["low_volume", "high_intensity"],
            },
            {
                "title": "Short treadmill",
                "detail": "15 min easy harness walk",
                "regions": "Legs, heart",
                "priority": 2,
                "flags": ["recovery"],
            },
            {
                "title": "Skip CEVIS intervals",
                "detail": "Moved to tomorrow if HRV recovers",
                "regions": "Heart",
                "priority": 3,
                "flags": ["deferred"],
            },
        ],
    }


def _spacewalk() -> dict[str, Any]:
    return {
        "why": "EVA day: nitrogen / DCS risk elevated. Use guided exercise prebreathe (~2 h vs ~4.3 h at rest). No heavy loading in the 24 h before; log symptoms after.",
        "sessions": [
            {
                "title": "Exercise prebreathe",
                "detail": "Guided cycle ~2.0 h (vs 4.3 h resting prebreathe)",
                "regions": "Heart, arms",
                "priority": 1,
                "flags": ["prebreathe", "eva"],
            },
            {
                "title": "Hold heavy ARED",
                "detail": "No squats/jumps 24 h before EVA; bone dose moves to tomorrow",
                "regions": "Hips, spine",
                "priority": 1,
                "flags": ["loading_hold"],
            },
            {
                "title": "Post-EVA symptom log",
                "detail": "Joint pain, skin mottling, fatigue, neuro symptoms → flag for medical",
                "regions": "—",
                "priority": 1,
                "flags": ["symptom_log", "dcs_watch"],
            },
        ],
    }
