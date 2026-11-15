# EVKIWI

NASA Space Apps Challenge 2026 — AI health & exercise monitor with a personal **DLCO / DRI** decompression gate.

## Layout

```
space_health_monitor/
├── frontend/          # UI, brand, 3D assets, EVA calculator
│   ├── index.html     # Main 3-phase shell (spacewalk → calc → recommendations)
│   ├── kiwinaut-eva.html
│   ├── eva-calc.html
│   ├── app.js / model.js
│   ├── brand/
│   ├── models/
│   └── vendor/
└── backend/           # FastAPI decompress API
    ├── app/
    ├── requirements.txt
    └── README.md
```

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8791
```

Open http://127.0.0.1:8791/

## Flow

1. **Spacewalk** — 3D EVA twin (Auto / Manual playback, ISS · Moon · Mars)
2. **Enter DRI** — full EVA calculator (typed DLCO readings)
3. **Calendar** — fictional crew profiles, NASA-derived tasks, simulated monitor traces and mock Playbook scheduling
4. **Recommendations** — selected EVA preparation, calendar-fed model estimates and preview/apply plan changes

5. **Risk methods** — existing-model comparison with four published NASA TBDM cases, preparation-time differences, and a separate BGI probability calculator. This comparison also appears in the DLCO calculator and Recommendations. The source PDF does not contain enough information to recreate the full bubble-growth solver; custom-plan NASA timing is explicitly unavailable. See [NASA method notes](frontend/NASA-METHOD.md).

See [Mission calendar guide](frontend/PLANNER.md) for the demo workflow, static preview command, integration seams, modeling limitations and tests. The calendar and its recommendations run locally without the FastAPI service; the existing API remains available for other clients.

Sample data only — not clinical or operational advice. Not an official NASA product.
