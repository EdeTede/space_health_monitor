# DoseFit backend

Python FastAPI + SQLite service for the NASA Space Apps DoseFit demo.

**Sense → Score → Adapt** loop powers the bone-twin scan in `../dosefit.html`.

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8791
```

If `venv` creation is blocked, install into a local vendor folder instead:

```bash
cd backend
python3 -m pip install --target ./.vendor -r requirements.txt
PYTHONPATH="./.vendor:$PYTHONPATH" python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8791
```

Open http://127.0.0.1:8791/

## Key endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/twin?day=&mode=&scan=` | Bone twin snapshot for the scan HUD |
| GET | `/api/score?day=&mode=` | Two-dose dashboard |
| POST | `/api/sense` | Ingest wearable / dosimeter / HRV / EVA events |
| GET | `/api/adapt/next` | Next workout plan |
| POST | `/api/scenarios/{id}/activate` | Activate demo scenario |
| GET | `/api/eva/prebreathe` | DCS risk + exercise prebreathe |

Sample data only — not clinical or operational advice.
