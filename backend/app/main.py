"""Kiwinaut API — Sense → Score → Adapt + bone twin for the scan HUD."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import PROJECT_ROOT, init_db
from app.models import HealthOut
from app.routers import adapt, crew, mission, scenarios, sense, score, twin

app = FastAPI(title="Kiwinaut", version="1.0.0", description="AI health & exercise monitor — for NASA Space Apps Challenge 2026")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crew.router)
app.include_router(mission.router)
app.include_router(sense.router)
app.include_router(score.router)
app.include_router(adapt.router)
app.include_router(twin.router)
app.include_router(scenarios.router)

models_dir = PROJECT_ROOT / "models"
if models_dir.is_dir():
    app.mount("/models", StaticFiles(directory=str(models_dir)), name="models")
brand_dir = PROJECT_ROOT / "brand"
if brand_dir.is_dir():
    app.mount("/brand", StaticFiles(directory=str(brand_dir)), name="brand")
vendor_dir = PROJECT_ROOT / "vendor"
if vendor_dir.is_dir():
    app.mount("/vendor", StaticFiles(directory=str(vendor_dir)), name="vendor")


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut()


@app.get("/")
def index() -> FileResponse:
    """Prime Space Apps experience: DLCO-driven decompression stress."""
    return FileResponse(PROJECT_ROOT / "dosefit-future.html")


@app.get("/dosefit.html")
def dosefit_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit.html")


@app.get("/dosefit-exercise.html")
def dosefit_exercise_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit-exercise.html")


@app.get("/dosefit-future.html")
def dosefit_future_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit-future.html")


@app.get("/kiwinaut-eva.html")
def kiwinaut_eva_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "kiwinaut-eva.html")
