# EVKIWI backend

FastAPI service for the EVKIWI demo.

Serves the `../frontend` app and powers **Decompression Test** via the EVA DLCO model (`eva_model.py`, ported from `frontend/model.js`).

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8791
```

Vendor fallback (no venv):

```bash
python3 -m pip install --target ./.vendor -r requirements.txt
PYTHONPATH="./.vendor:$PYTHONPATH" python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8791
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| POST | `/api/decompress/test` | DLCO → VGE / DCS + recommendation cards |
| GET | `/api/decompress/test` | Query-string convenience |

Static UI routes: `/`, `/kiwinaut-eva.html`, `/eva-calc.html`, `/brand/*`, `/models/*`, `/vendor/*`.

Sample data only — not clinical advice.
