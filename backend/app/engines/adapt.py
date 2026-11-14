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
                "how": "ARED bar + footplate · ~35 min",
                "steps": [
                    "Warm up with 2 light squat sets (8–10 reps).",
                    "Set load +5% vs yesterday’s working weight.",
                    "Squat 4×6: full depth, 2–3 min rest between sets.",
                    "Deadlift 4×6: hips through, brace spine, same rest.",
                    "Log peak force and any hip asymmetry in the insole feed.",
                ],
            },
            {
                "title": "Treadmill intervals",
                "detail": "30 min with harness load",
                "regions": "Shins, heart",
                "priority": 1,
                "flags": [],
                "how": "T2 treadmill + bungee harness · 30 min",
                "steps": [
                    "Clip harness; set body-load ~70–80% body weight.",
                    "5 min easy walk warm-up.",
                    "6×2 min hard / 2 min easy (RPE 7–8).",
                    "5 min cool-down walk; check shin comfort.",
                ],
            },
            {
                "title": "CEVIS easy spin",
                "detail": "20 min recovery cadence",
                "regions": "Heart",
                "priority": 2,
                "flags": [],
                "how": "Cycle ergometer · 20 min",
                "steps": [
                    "Seat height so knee soft at bottom.",
                    "Easy cadence 70–80 rpm, conversational pace.",
                    "Keep HR in Zone 2; no hard efforts.",
                    "Note resting HR after cool-down.",
                ],
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
                "how": "ARED · single-leg bias · ~30 min",
                "steps": [
                    "Warm up both legs lightly.",
                    "Start every set with the right leg / right-foot bias.",
                    "5×5 at yesterday’s load — do not add weight today.",
                    "Between sets, check insole: right peak force should rise toward left.",
                    "Finish with 2 sets left-leg only if right still trails.",
                ],
            },
            {
                "title": "Heel drops + band rows",
                "detail": "Impact stimulus for femoral neck",
                "regions": "Hips, shins",
                "priority": 1,
                "flags": ["impact"],
                "how": "Handrails + resistance bands · 15 min",
                "steps": [
                    "Hold rail; rise onto toes, then drop heels firmly (not slam).",
                    "3×15 heel drops, pause if shin pain.",
                    "Band rows 3×12: squeeze shoulder blades, slow return.",
                    "Keep hips level — no leaning off the weak side.",
                ],
            },
            {
                "title": "Treadmill steady",
                "detail": "25 min harness; watch right-foot force",
                "regions": "Legs",
                "priority": 2,
                "flags": ["insole_feedback"],
                "how": "T2 + harness + insole HUD · 25 min",
                "steps": [
                    "Harness load ~65% BW.",
                    "Steady walk/jog; glance at right vs left force every 5 min.",
                    "Cue: push harder through right midfoot if gap >10%.",
                    "Stop early if right hip ache rises above mild.",
                ],
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
                "how": "Shelter kit: bands + handrail · 20 min",
                "steps": [
                    "Stay in storm shelter — no ARED / treadmill.",
                    "Band squats 3×12 (feet wide, sit back).",
                    "Heel drops 3×12 holding the rail.",
                    "Band rows 3×15.",
                    "Breathing stays easy; this is load, not cardio.",
                ],
            },
            {
                "title": "Wait for all-clear",
                "detail": "Resume when flux drops under 10 pfu",
                "regions": "—",
                "priority": 1,
                "flags": ["radiation_hold"],
                "how": "Radiation console · monitoring",
                "steps": [
                    "Do not leave shelter until ops calls all-clear.",
                    "Watch particle flux on the radiation panel.",
                    "Target: flux under 10 pfu sustained.",
                    "Hydrate; keep band kit ready for the next bout.",
                ],
            },
            {
                "title": "Catch-up session (tomorrow)",
                "detail": "Squat and deadlift +10% sets to close the gap",
                "regions": "Hips, spine",
                "priority": 1,
                "flags": ["catch_up"],
                "how": "ARED · post-storm · ~40 min",
                "steps": [
                    "Confirm all-clear and readiness first.",
                    "Warm up thoroughly after shelter days.",
                    "Squat + deadlift: add one set (+10% volume vs plan).",
                    "Keep load at last good working weight.",
                    "Log that catch-up closed the storm gap.",
                ],
            },
            {
                "title": "Option: blood-flow-restriction cuffs",
                "detail": "Light band work with cuffs keeps muscle; weak for bone. Needs clot-risk screening. Not yet used on the ISS.",
                "regions": "Muscle",
                "priority": 2,
                "flags": ["bfr", "optional", "screening_required"],
                "how": "Optional BFR cuffs · screening required",
                "steps": [
                    "Only if medical cleared clot risk.",
                    "Light band work with cuffs — muscle maintenance, not bone dose.",
                    "Keep sessions short; stop for numbness or pain.",
                    "Skip entirely if unsure — shelter bands are enough.",
                ],
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
                "how": "ARED · high load, low volume · ~25 min",
                "steps": [
                    "Check resting HR before starting — abort if still climbing.",
                    "Warm up carefully to a heavy triple.",
                    "3×3 near yesterday’s top load; 3–4 min rest.",
                    "Stop the set if form breaks or HR won’t settle.",
                    "Skip extras — bone needs the heavy hits, not more sets.",
                ],
            },
            {
                "title": "Short treadmill",
                "detail": "15 min easy harness walk",
                "regions": "Legs, heart",
                "priority": 2,
                "flags": ["recovery"],
                "how": "T2 easy · 15 min",
                "steps": [
                    "Light harness (~50% BW).",
                    "Easy walk only — no intervals.",
                    "Stay nasal-breathing if possible.",
                    "End early if dizziness or HR spikes.",
                ],
            },
            {
                "title": "Skip CEVIS intervals",
                "detail": "Moved to tomorrow if HRV recovers",
                "regions": "Heart",
                "priority": 3,
                "flags": ["deferred"],
                "how": "Deferred · check morning HRV",
                "steps": [
                    "Do not ride hard intervals today.",
                    "Log the deferral in the plan.",
                    "Retest HRV tomorrow morning.",
                    "If HRV recovers, run CEVIS then; if not, rest again.",
                ],
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
                "how": "O₂ mask + CEVIS protocol · ~2 h",
                "steps": [
                    "Don O₂ mask; confirm suit / airlock timeline with IVR.",
                    "Follow the guided cycle script (arms + legs light).",
                    "Stay on protocol pace — do not race the clock.",
                    "Target ~2.0 h exercise prebreathe vs ~4.3 h at rest.",
                    "Hand off to airlock only when console shows complete.",
                ],
            },
            {
                "title": "Hold heavy ARED",
                "detail": "No squats/jumps 24 h before EVA; bone dose moves to tomorrow",
                "regions": "Hips, spine",
                "priority": 1,
                "flags": ["loading_hold"],
                "how": "Loading hold · resume after EVA",
                "steps": [
                    "No heavy squats, deadlifts, or jumps today.",
                    "Light mobility only if needed for suit prep.",
                    "Bone mechanical dose is scheduled for tomorrow.",
                    "Confirm tomorrow’s catch-up is on the calendar.",
                ],
            },
            {
                "title": "Post-EVA symptom log",
                "detail": "Joint pain, skin mottling, fatigue, neuro symptoms → flag for medical",
                "regions": "—",
                "priority": 1,
                "flags": ["symptom_log", "dcs_watch"],
                "how": "Post-EVA medical checklist · 10 min",
                "steps": [
                    "Within 1 h of ingress, open the symptom log.",
                    "Note joint pain, skin mottling, unusual fatigue, neuro changes.",
                    "Any positive flag → call medical immediately.",
                    "If clear, mark complete and rest.",
                ],
            },
        ],
    }
