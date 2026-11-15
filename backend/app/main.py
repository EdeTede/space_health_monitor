"""EVKIWI API — DLCO decompression gate for NASA Space Apps Challenge 2026."""
from __future__ import annotations

from fastapi import Request, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import FRONTEND_ROOT
from app.models import HealthOut
from app.routers import decompress
# Mission dashboard (bone twin, Sense → Score → Adapt) — restored alongside the decompress gate
from app.legacy.db import init_db as legacy_init_db
from app.legacy.routers import adapt as legacy_adapt, crew as legacy_crew, mission as legacy_mission, scenarios as legacy_scenarios, score as legacy_score, sense as legacy_sense, twin as legacy_twin

app = FastAPI(
    title="EVKIWI",
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
for _r in (legacy_crew, legacy_mission, legacy_sense, legacy_score, legacy_adapt, legacy_twin, legacy_scenarios):
    app.include_router(_r.router)


@app.on_event("startup")
def _legacy_startup() -> None:
    legacy_init_db()

# Explicit allow-list: never expose arbitrary files from the project root.
@app.get("/planner.html")
def planner_page() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "planner.html")


@app.get("/planner.css")
def planner_styles() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "planner.css", media_type="text/css")


@app.get("/planner-core.js")
def planner_core() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "planner-core.js", media_type="application/javascript")


@app.get("/planner.js")
def planner_script() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "planner.js", media_type="application/javascript")

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


@app.get("/dosefit.html")
@app.get("/dashboard")
def mission_dashboard() -> FileResponse:
    return _page("dosefit.html")


@app.get("/dosefit-exercise.html")
def mission_exercise() -> FileResponse:
    return _page("dosefit-exercise.html")


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


@app.get("/developer-tasks.html")
def developer_tasks() -> FileResponse:
    return _page("developer-tasks.html")


@app.get("/developer-calculator.html")
def developer_calculator() -> FileResponse:
    return _page("developer-calculator.html")


@app.get("/developer.css")
def developer_css() -> FileResponse:
    return FileResponse(FRONTEND_ROOT / "developer.css", media_type="text/css")


@app.get("/developer.js")
@app.get("/dev-engine.js")
@app.get("/dev-bootstrap.js")
def developer_script(request: Request) -> FileResponse:
    return FileResponse(FRONTEND_ROOT / request.url.path.lstrip("/"), media_type="application/javascript")


# Explicit NASA comparison assets; no arbitrary filesystem path is accepted.
@app.get("/risk-methods.html")
@app.get("/developer-nasa.html")
@app.get("/nasa-model.js")
@app.get("/nasa-ui.js")
@app.get("/nasa-developer.js")
@app.get("/risk-methods.js")
@app.get("/nasa.css")
@app.get("/nasa-equation.png")
@app.get("/NASAmodel.pdf")
@app.get("/NASA-METHOD.md")
def nasa_assets(request: Request) -> FileResponse:
    return FileResponse(FRONTEND_ROOT / request.url.path.lstrip("/"))
