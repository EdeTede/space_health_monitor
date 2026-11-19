"""DLCO decompression gate — wraps the EVA model (model.js) for the Kiwinaut UI."""
from __future__ import annotations

from typing import Any, Literal

from app.engines import eva_model as M

Level = Literal["green", "yellow", "orange", "red"]

DAYS = {
    0: "Baseline DLCO archived. Prebreathe protocol rehearsed.",
    35: "Routine training. Watch hydration and calorie shortfalls.",
    98: "Shelter ops. Fatigue and load gaps can raise EVA risk later.",
    150: "Airlock window. DLCO gate is prime. Exercise prebreathe preferred.",
    210: "Landing archive. Personal DLCO pattern stored for next sortie.",
}


def _band_from_dcs(dcs: float, symptoms: bool, drop: float) -> tuple[Level, str, str]:
    if symptoms and drop > 0:
        return "red", "RED · SYMPTOMS", "Stop the EVA. DCS protocol: 100% O₂, repressurize. No EVA until DLCO returns to baseline."
    if dcs > M.K["dcsAccept"] * 1.5:
        return "orange", "ORANGE · HIGH", "Postpone the EVA 24–48 h. Rest day. Log symptoms. Alert the medical officer."
    if dcs > M.K["dcsAccept"]:
        return "yellow", "YELLOW · MODERATE", "Extend exercise prebreathe. Drink more. No heavy ARED 24 h before/after. Lighter EVA tasks."
    if drop >= 5:
        return "yellow", "YELLOW · MODERATE", "DLCO drop moderate — extend prebreathe and protect hydration."
    return "green", "GREEN · LOW", "Cleared for the EVA and normal training."


def evaluate(
    *,
    day: float = 150,
    dlco_pct: float | None = None,
    dlco_pre: float | None = None,
    dlco_post: float | None = None,
    hb: float = 13.3,
    hydration: float = 70,
    bubble_grade: int = 0,
    symptoms: bool = False,
    protocol: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run the published EVA model, then emit Kiwinaut bands + action cards."""
    day_i = int(round(day))
    hyd = float(hydration)
    bub = max(0, min(4, int(bubble_grade)))

    p = {**M.DEFAULT_PROTOCOL, **(protocol or {})}
    if day_i == 150:
        p["priorEVAs"] = max(int(p.get("priorEVAs") or 0), 1)

    # Derive % change from measured pre/post when provided.
    if dlco_pre is not None and dlco_post is not None and float(dlco_pre) > 0:
        pre = float(dlco_pre)
        post = float(dlco_post)
        dlco_pct = 100.0 * (post - pre) / pre
        inv = M.inverse(p, {"pre": pre, "post": post, "hb": hb, "dust": 0, "kDust": 0})
    else:
        pre = 32.0
        # Approximate post from % change so the scientific model still runs.
        pct = float(-2 if dlco_pct is None else dlco_pct)
        post = pre * (1.0 + pct / 100.0)
        dlco_pct = pct
        inv = M.inverse(p, {"pre": pre, "post": post, "hb": hb, "dust": 0, "kDust": 0})

    fwd = inv["forward"]
    drop = max(0.0, -float(dlco_pct))
    dcs = float(inv["dcs"])
    vge = float(inv["vge"])
    model_vge = float(fwd["vge"])
    model_dcs = float(fwd["dcs"])
    factor = inv["factor"] if inv["usable"] else 1.0

    # Composite score for the HUD dial (0–100), driven mainly by personal DCS %.
    s = min(100.0, max(0.0, round(dcs * 12.0 + bub * 6.0 + (0 if hyd >= 70 else (70 - hyd) * 0.35) + (18 if symptoms else 0))))
    level, name, blurb = _band_from_dcs(dcs, bool(symptoms), drop)
    if symptoms and drop > 0:
        s = max(s, 90)

    parts: list[dict[str, Any]] = [
        {"label": f"Personal DCS {dcs:.2f}% (NASA accept {M.K['dcsAccept']:.0f}%)", "v": int(round(dcs * 4)), "push": dcs > M.K["dcsAccept"]},
        {"label": f"Bubble index (VGE) {vge:.0f} · model {model_vge:.0f}", "v": int(round(vge / 5)), "push": vge > model_vge * 1.15},
        {"label": f"DLCO change {dlco_pct:+.2f}%", "v": int(round(drop * 2)), "push": drop >= 5},
        {"label": f"Bubble grade {bub}", "v": bub * 9, "push": bub >= 2},
        {
            "label": "Hydration adequate" if hyd >= 70 else ("Hydration low" if hyd >= 45 else "Hydration critical"),
            "v": 0 if hyd >= 70 else int(round((70 - hyd) * 0.5 if hyd >= 45 else 14 + (45 - hyd) * 0.65)),
            "push": hyd < 55,
        },
    ]
    if symptoms:
        parts.append({"label": "Symptoms reported", "v": 28, "push": True})

    cards: list[dict[str, str]] = []

    def card(id_: str, ico: str, title: str, reason: str, color: str) -> None:
        cards.append({"id": id_, "ico": ico, "title": title, "reason": reason, "color": color})

    t_info = M.oxygen_time_for(M.K["dcsAccept"], p, float(p["exercise"]), float(p["suitP"]), float(factor) if factor == factor else 1.0)
    t_blind = M.oxygen_time_for(M.K["dcsAccept"], p, float(p["exercise"]), float(p["suitP"]), 1.0)

    if level == "green":
        card("go", "GO", "Proceed with measured protocol", f"because personal DCS {dcs:.2f}% ≤ {M.K['dcsAccept']:.0f}%", "ok")
        card("p3", "+3h", "Schedule DLCO retest +3 h after ingress", "because learn personal post-EVA pattern", "holo")
    else:
        if t_info > float(p["prebreathe"]):
            card("pb", f"+{int(round(t_info - float(p['prebreathe'])))}", f"Extend O₂ time to ~{t_info:.0f} min", f"because personal factor needs more washout than {t_blind:.0f} min blind", "amber")
        if hyd < 70:
            card("h2o", "H₂O", "Hydrate +500 ml before airlock", f"because hydration {int(hyd)}/100", "amber")
        card("ared", "HOLD", "Hold heavy ARED 24 h before/after EVA", "because loading near pressure drop raises bubble risk", "hot")
    if level == "yellow":
        card("lite", "EVA", "Assign lighter EVA tasks (grip / duration)", f"because DCS {dcs:.2f}% over accept", "amber")
    if level == "orange":
        card("delay", "+24h", "Postpone EVA 24–48 hours", f"because personal DCS {dcs:.2f}%", "hot")
        card("mo", "MO", "Alert crew medical officer", "because ORANGE decision support", "hot")
    if level == "red":
        card("stop", "STOP", "Abort / do not start EVA", "because symptoms + DLCO drop", "red")
        card("o2", "O₂", "DCS protocol: 100% O₂ + repressurize", "because RED threshold", "red")
    card("p24", "+24h", "Retest DLCO at +24 h", "because close the personal pattern loop", "holo")

    coach = {
        "red": "CDR Lee: STOP · 100% O₂ · repressurize · notify MO · DLCO gate until baseline.",
        "orange": f"CDR Lee: delay EVA · personal DCS {dcs:.2f}% · extend O₂ toward {t_info:.0f} min · MO alert.",
        "yellow": f"CDR Lee: hydrate · O₂ ~{t_info:.0f} min · no heavy ARED · VGE {vge:.0f}.",
        "green": f"CDR Lee: GREEN · personal DCS {dcs:.2f}% · DLCO +3 h / +24 h after ingress.",
    }[level]

    return {
        "day": float(day_i),
        "dlco_pct": float(dlco_pct),
        "dlco_pre": pre,
        "dlco_post": post,
        "hb": float(hb),
        "hydration": hyd,
        "bubble_grade": bub,
        "symptoms": bool(symptoms),
        "score": int(s),
        "level": level,
        "band": level,
        "name": name,
        "blurb": blurb,
        "drop": int(round(drop)),
        "parts": parts,
        "cards": cards,
        "coach": coach,
        "day_note": DAYS.get(day_i, DAYS[150]),
        "rest_prebreathe_h": round(t_blind / 60.0, 2),
        "exercise_prebreathe_h": round(t_info / 60.0, 2),
        "vge": round(vge, 2),
        "dcs": round(dcs, 3),
        "model_vge": round(model_vge, 2),
        "model_dcs": round(model_dcs, 3),
        "personal_factor": None if factor != factor else round(float(factor), 3),
        "oxygen_time_min": round(t_info, 1),
        "source": "eva-model",
    }
