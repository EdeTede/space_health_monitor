# EVKIWI

NASA Space Apps Challenge 2026 · Lucerne · Team **Cosmosaver**

Personal **DLCO / DRI** decompression gate for EVA — extra safe hours outside on ISS, Moon and Mars.

Live demo: https://trista1208.github.io/space_health_monitor/

---

## NASA Space Apps — submission checklist

Complete these in the **Project** tab of your team page. Don’t leave the NASA form to the last minute.

### 01 · Team & challenge

| | |
|---|---|
| **Team** | Cosmosaver |
| **Members** | Jiaqi · Eduard · Marco |
| **Event** | NASA Space Apps Challenge · Lucerne 2026 |
| **Challenge** | Health monitoring / decompression risk for exploration EVA |

Confirm every member is registered on the team page and the project is linked to the **correct official challenge**.

### 02 · Project story

**What we built**  
EVKIWI is a dual-login demo: astronauts see personal health and DRI readiness; mission planners see the whole crew. The home experience is a cinematic 3D spacewalk (ISS · Moon · Mars) with live pressure-risk HUD, then flows into DLCO / DRI scoring, calendar planning and recommendations.

**How**  
- Static frontend (HTML / CSS / JS + Three.js) with a FastAPI decompress API for local / full runs  
- Sample crew profiles, illustrative DRI scoring and NASA published-case comparison (not a full TBDM solver)  
- GitHub Pages hosts the static demo; local uvicorn serves the API when needed  

**What we achieved**  
- Two clear logins (astronaut / planner) on a premium space landing  
- Destination switcher for ISS, Moon and Mars  
- EVA calculator, crew calendar, recommendations and risk-method comparison against published NASA cases  
- Public demo on GitHub Pages  

### 03 · Demo & access

| Resource | Link |
|---|---|
| **Public demo** | https://trista1208.github.io/space_health_monitor/ |
| **Source repo** | https://github.com/Trista1208/space_health_monitor |
| **Pitch deck** | [`pitch/EVKIWI-pitch-deck.html`](pitch/EVKIWI-pitch-deck.html) · [`pitch/EVKIWI-pitch-deck.pptx`](pitch/EVKIWI-pitch-deck.pptx) |

**Try the demo:** open the public link → pick **ISS / Moon / Mars** → sign in as **Astronaut** or **Mission planner**.  
Test the link before submitting the NASA form.

**Local run (API + UI):**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# optional: PYTHONPATH=.vendor if using vendored deps
uvicorn app.main:app --reload --host 127.0.0.1 --port 8791
```

Open http://127.0.0.1:8791/

### 04 · Data & sources

**NASA resources used / cited**

- Abercromby, Conkin & Gernhardt (2017). *Modeling Oxygen Prebreathe Protocols for Exploration EVA Using Variable Pressure Suits*. NASA NTRS: https://ntrs.nasa.gov/api/citations/20170004350/downloads/20170004350.pdf  
- *Fifteen-minute Extravehicular Activity Prebreathe Protocol Using NASA’s Exploration Atmosphere* (BGI → DCS logistic coefficients). NASA NTRS: https://ntrs.nasa.gov/api/citations/20140000417/downloads/20140000417.pdf  

Method notes and limits: [`frontend/NASA-METHOD.md`](frontend/NASA-METHOD.md). Full tissue-bubble dynamics (TBDM) is **not** reimplemented — published cases and logistic regression are cited and compared only.

**Other materials**

- Anatomy meshes: **BodyParts3D** (CC BY 4.0)  
- Three.js (MIT) under `frontend/vendor/three/`  
- Crew readings, schedules and scores in the UI are **sample / illustrative data**, not real astronaut measurements  

### 05 · AI & licences

**AI use**  
Generative AI (Cursor / coding assistants) was used to help write, refactor and polish frontend, backend and docs. Human teammates designed the product story, science framing, sample thresholds and final review. AI output was edited before commit.

**Licences / rights**

- Project code in this repo: team work for NASA Space Apps 2026 (see repo for any added licence file)  
- BodyParts3D anatomy: **CC BY 4.0** — credit required  
- Three.js: **MIT**  
- NASA NTRS PDFs: cited as published NASA materials; not redistributed as official products  
- Brand mark and copy: Team Cosmosaver / EVKIWI  

This is **not** an official NASA product and is **not** clinical or operational advice.

### 06 · Final confirmation

Before the deadline:

1. Fill every required field on the NASA **Project** tab  
2. Paste the public demo + repo links and test them  
3. Submit the project  
4. Re-open the team page and confirm status shows **submitted**  

---

## Layout

```
space_health_monitor/
├── frontend/          # UI, brand, 3D assets, EVA calculator
│   ├── kiwinaut-eva.html   # Landing (also Pages index)
│   ├── index.html          # Main flow (spacewalk → calc → recs)
│   ├── astronaut.html / mission-control.html
│   ├── brand/ models/ vendor/
└── backend/           # FastAPI decompress API
```

Sample data only — decision support demo, confirmed in-product by the fictional crew medical officer role. Not an official NASA product.
