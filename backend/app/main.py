"""DoseFit API — Sense → Score → Adapt + bone twin for the scan HUD."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import PROJECT_ROOT, init_db
from app.models import HealthOut
from app.routers import adapt, crew, mission, scenarios, sense, score, twin

app = FastAPI(title="DoseFit", version="1.0.0", description="Adaptive exercise & health monitor for astronauts")

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


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit.html")


@app.get("/dosefit.html")
def dosefit_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit.html")
