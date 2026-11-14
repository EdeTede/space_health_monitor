"""EVA decompression risk model — Python port of model.js (see DOCUMENTATION.md)."""
from __future__ import annotations

import math
from typing import Any

ATM = 14.696
KPA = 101.325

K = {
    "tau": 519.37,
    "exerciseK": 0.03,
    "anchor": 0.79,
    "vgeN": 3.08,
    "vgeC": 0.47,
    "dcsN": 4.24,
    "dcsC": 2.16,
    "amb": 1.2043,
    "kBub": 3.1,
    "kOx": 0.019,
    "oxThr": 21.0,
    "hbStd": 14.6,
    "carryPer": 0.03,
    "carryHalf": 36.0,
    "rLimit": 1.65,
    "dcsAccept": 3.0,
}


def rate_constant(vo2: float) -> float:
    return math.exp(K["exerciseK"] * vo2) / K["tau"]


def hill_vge(r: float) -> float:
    x = max(0.0, r - K["anchor"])
    y = x ** K["vgeN"]
    return 100.0 * y / (y + K["vgeC"])


def hill_dcs(r: float) -> float:
    x = max(0.0, r - K["anchor"])
    y = x ** K["dcsN"]
    return 100.0 * y / (y + K["dcsC"])


def hill_vge_inv(p: float) -> float:
    p = min(99.99, max(1e-9, p)) / 100.0
    return K["anchor"] + (K["vgeC"] * p / (1.0 - p)) ** (1.0 / K["vgeN"])


def hill_dcs_inv(d: float) -> float:
    d = min(99.99, max(1e-9, d)) / 100.0
    return K["anchor"] + (K["dcsC"] * d / (1.0 - d)) ** (1.0 / K["dcsN"])


def hb_factor(hb: float) -> float:
    return (10.22 + hb) / (1.7 * hb)


def carryover(n: int, gap_hours: float) -> float:
    if not n or n <= 0:
        return 1.0
    r = 0.5 ** (gap_hours / K["carryHalf"])
    load = 0.0
    for _ in range(n):
        load = load * r + 1.0
    return 1.0 + K["carryPer"] * load * r


def forward(p: dict[str, Any]) -> dict[str, float]:
    p_hab = p["habP"] / ATM
    p_suit = p["suitP"] / ATM
    k = rate_constant(float(p["exercise"]))
    p_n2 = p_hab * (1.0 - float(p["habFO2"]))
    t_oxygen = float(p["prebreathe"]) + float(p["decompress"])
    p_n2 *= math.exp(-k * t_oxygen)
    r_rest = p_n2 / p_suit
    r_eff = r_rest * (K["amb"] if p.get("ambulatory", True) else 1.0) * carryover(
        int(p.get("priorEVAs") or 0), float(p.get("gapHours") or 24)
    )
    h = max(0.0, p_hab * KPA - K["oxThr"]) * (t_oxygen / 1440.0) + max(
        0.0, p_suit * KPA - K["oxThr"]
    ) * (float(p["outside"]) / 1440.0)
    vge = hill_vge(r_eff)
    dcs = hill_dcs(r_eff)
    return {
        "Rrest": r_rest,
        "Reff": r_eff,
        "H": h,
        "vge": vge,
        "dcs": dcs,
        "dBubble": -K["kBub"] * vge / 100.0,
        "dOxygen": -K["kOx"] * h,
        "dDLCO": -(K["kBub"] * vge / 100.0 + K["kOx"] * h),
    }


def inverse(p: dict[str, Any], m: dict[str, Any]) -> dict[str, Any]:
    f = forward(p)
    pre = float(m["pre"])
    post = float(m["post"])
    d_pct = 100.0 * (post - pre) / pre if pre > 0 else 0.0
    rising = post > pre
    corrected = d_pct * (hb_factor(float(m["hb"])) / hb_factor(K["hbStd"]))
    explained = K["kOx"] * f["H"] + float(m.get("kDust") or 0) * float(m.get("dust") or 0)
    residual = -(corrected + explained)
    vge = 0.0 if rising else min(100.0, max(0.0, 100.0 * residual / K["kBub"]))
    usable = f["vge"] >= 1.0
    factor = (vge / f["vge"]) if usable else float("nan")
    return {
        "forward": f,
        "dPct": d_pct,
        "rising": rising,
        "corrected": corrected,
        "explained": explained,
        "residual": residual,
        "vge": vge,
        "dcs": hill_dcs(hill_vge_inv(vge)),
        "usable": usable,
        "factor": factor,
    }


def oxygen_time_for(target_dcs: float, p: dict[str, Any], exercise: float, suit_p: float, factor: float = 1.0) -> float:
    f = factor or 1.0
    vge_wanted = hill_vge(hill_dcs_inv(target_dcs)) / f
    r_rest = hill_vge_inv(min(99.9, vge_wanted)) / (
        (K["amb"] if p.get("ambulatory", True) else 1.0) * carryover(int(p.get("priorEVAs") or 0), float(p.get("gapHours") or 24))
    )
    q = r_rest * (suit_p / ATM) / ((p["habP"] / ATM) * (1.0 - p["habFO2"]))
    if q >= 1:
        return 0.0
    return -math.log(q) / rate_constant(exercise)


DEFAULT_PROTOCOL = {
    "habP": 8.2,
    "habFO2": 0.34,
    "suitP": 4.3,
    "prebreathe": 15.0,
    "exercise": 0.0,
    "decompress": 0.0,
    "outside": 360.0,
    "ambulatory": True,
    "priorEVAs": 0,
    "gapHours": 24.0,
}
