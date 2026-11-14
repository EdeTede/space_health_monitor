"""Kiwinaut API — DLCO decompression gate for NASA Space Apps Challenge 2026."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import FRONTEND_ROOT
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

# Static frontend assets (brand, anatomy models, Three.js)
for mount, folder in (
    ("/models", FRONTEND_ROOT / "models"),
    ("/brand", FRONTEND_ROOT / "brand"),
    ("/vendor", FRONTEND_ROOT / "vendor"),
):
    if folder.is_dir():
        app.mount(mount, StaticFiles(directory=str(folder)), name=mount.strip("/"))


def _page(name: str) -> FileResponse:
    return FileResponse(FRONTEND_ROOT / name)


@app.get("/api/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut()


@app.get("/")
def index() -> FileResponse:
    return _page("index.html")


@app.get("/index.html")
def index_html() -> FileResponse:
    return _page("index.html")


@app.get("/dosefit-future.html")
def dosefit_future_alias() -> FileResponse:
    """Legacy alias for the main shell."""
    return _page("index.html")


@app.get("/kiwinaut-eva.html")
def kiwinaut_eva_page() -> FileResponse:
    return _page("kiwinaut-eva.html")


@app.get("/eva-calc.html")
def eva_calc_page() -> FileResponse:
    return _page("eva-calc.html")


@app.get("/model.js")
def model_js() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "model.js", media_type="application/javascript")


@app.get("/app.js")
def app_js() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "app.js", media_type="application/javascript")


@app.get("/DOCUMENTATION.md")
def documentation_md() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "DOCUMENTATION.md", media_type="text/markdown")


@app.get("/VARIABLE-LOG.md")
def variable_log_md() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "VARIABLE-LOG.md", media_type="text/markdown")
