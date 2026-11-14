# Kiwinaut backend

FastAPI service for the Kiwinaut demo (NASA Space Apps Challenge 2026).

Powers the **Decompression Test** on `../dosefit-future.html` using the EVA DLCO model (`model.js` → `app/engines/eva_model.py`).

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

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| POST | `/api/decompress/test` | DLCO → VGE / DCS gate + decision cards |
| GET | `/api/decompress/test` | Same, query-string convenience |

Also serves `/`, `/eva-calc.html`, `/kiwinaut-eva.html`, `/model.js`, `/app.js`, `/DOCUMENTATION.md`, `/VARIABLE-LOG.md`, `/brand/*`, `/models/*`, `/vendor/*`.

Sample data only — not clinical or operational advice.
