"""Decompression Test API — EVA model + Kiwinaut decision cards."""
from __future__ import annotations

from fastapi import APIRouter

from app.engines import decompress as D
from app.models import DecompressIn, DecompressOut

router = APIRouter(prefix="/api/decompress", tags=["decompress"])


def _run(body: DecompressIn) -> dict:
    protocol = {}
    if body.prebreathe_min is not None:
        protocol["prebreathe"] = body.prebreathe_min
    if body.suit_p is not None:
        protocol["suitP"] = body.suit_p
    return D.evaluate(
        day=body.day,
        dlco_pct=body.dlco_pct,
        dlco_pre=body.dlco_pre,
        dlco_post=body.dlco_post,
        hb=body.hb,
        hydration=body.hydration,
        bubble_grade=body.bubble_grade,
        symptoms=body.symptoms,
        protocol=protocol or None,
    )


@router.post("/test", response_model=DecompressOut)
def run_decompress_test(body: DecompressIn) -> DecompressOut:
    """Run the live decompression stress test from UI inputs."""
    return DecompressOut(**_run(body))


@router.get("/test", response_model=DecompressOut)
def get_decompress_test(
    day: float = 150,
    dlco_pre: float = 32.0,
    dlco_post: float = 31.61,
    hb: float = 13.3,
    hydration: float = 70,
    bubble_grade: int = 0,
    symptoms: bool = False,
) -> DecompressOut:
    """GET convenience for quick demos / curl."""
    return DecompressOut(
        **D.evaluate(
            day=day,
            dlco_pre=dlco_pre,
            dlco_post=dlco_post,
            hb=hb,
            hydration=hydration,
            bubble_grade=bubble_grade,
            symptoms=symptoms,
        )
    )
