"""Kiwinaut API — DLCO decompression gate for NASA Space Apps Challenge 2026."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import PROJECT_ROOT
from app.models import HealthOut
from app.routers import decompress

app = FastAPI(
    title="Kiwinaut",
    version="1.0.0",
    description="AI health & exercise monitor — DLCO decompression gate",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decompress.router)

models_dir = PROJECT_ROOT / "models"
if models_dir.is_dir():
    app.mount("/models", StaticFiles(directory=str(models_dir)), name="models")
brand_dir = PROJECT_ROOT / "brand"
if brand_dir.is_dir():
    app.mount("/brand", StaticFiles(directory=str(brand_dir)), name="brand")
vendor_dir = PROJECT_ROOT / "vendor"
if vendor_dir.is_dir():
    app.mount("/vendor", StaticFiles(directory=str(vendor_dir)), name="vendor")


@app.get("/api/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit-future.html")


@app.get("/dosefit-future.html")
def dosefit_future_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "dosefit-future.html")


@app.get("/kiwinaut-eva.html")
def kiwinaut_eva_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "kiwinaut-eva.html")


@app.get("/eva-calc.html")
def eva_calc_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "eva-calc.html")


@app.get("/model.js")
def model_js() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "model.js", media_type="application/javascript")


@app.get("/app.js")
def app_js() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "app.js", media_type="application/javascript")


@app.get("/DOCUMENTATION.md")
def documentation_md() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "DOCUMENTATION.md", media_type="text/markdown")


@app.get("/VARIABLE-LOG.md")
def variable_log_md() -> FileResponse:
    return FileResponse(PROJECT_ROOT / "VARIABLE-LOG.md", media_type="text/markdown")
