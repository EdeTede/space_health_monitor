# Mission calendar and EVA recommendations

The **Calendar** and **Recommendations** navigation items open a shared mission workspace. The original spacewalk and standalone DLCO calculator remain available. All profiles and readings in this workspace are fictional. No monitor hardware or external scheduling account is connected.

## Run

The existing FastAPI server serves the four new planner assets. Alternatively, the entire calendar demo works without backend dependencies. From the `space_health_monitor` directory:

```powershell
python -m http.server 8792 --bind 127.0.0.1 --directory frontend
```

Open `http://127.0.0.1:8792/index.html#calendar`. The standalone workspace is `/planner.html`. The mission begins at **2026-11-15 09:00 UTC**, independently of the computer clock. Use the clock input or **+30 min** to simulate progression. All schedule entry/display uses UTC even if the browser's date input formats dates in your locale.

## Try the workflow

1. Choose Alex Lee, Sam Rivera or Jamie Chen. **Edit profile** changes the fictional name, role and demo HR/stress baselines.
2. Switch between day and seven-day agenda columns. Select an activity for its exact start/end, source, stress contribution, and time-indexed simulated readings. Past and future samples are explicitly distinguished.
3. **Add activity** searches a 16-item NASA-derived catalogue. Enter a UTC start, whole-minute duration and optional note. Link preparation to an upcoming EVA. Overlaps for the same crew are rejected; different crew can work concurrently. Future activities can be edited/removed. Started/historical activities are read-only.
4. **Connections** toggles Bio-Monitor/EveryWear simulations. The Playbook mock imports six tasks on 19 November across the crew; repeat imports skip existing IDs. Export downloads the current schedule using a clearly labeled local JSON contract, not a real Playbook API schema.
5. Selecting an EVA opens **Recommendations**. It shows time until EVA, medical/suit checks, linked preparation, model inputs and estimated DCS probability.
6. Preview a 24-hour delay, shorter EVA, added oxygen time or light-exercise prebreathe. Applying a valid preview updates the calendar and calculation together. The seeded delay deliberately conflicts with next-day exercise/tool tasks: resolve those tasks in Calendar before applying it. An active preparation block cannot be moved into the future as if it had not started.

## Model mapping

`planner-core.js` calls the existing `model.js` `forward()` function; it does not duplicate or replace its equations. The UI does not use the old 3% label as a medical clearance threshold.

- Habitat pressure, oxygen fraction and suit pressure come from editable mission assumptions (initially ISS-like 14.7 psia, 0.21 and 4.3 psia). Ambulation is false in this version.
- EVA duration supplies `outside`.
- Only same-crew, explicitly linked, contiguous oxygen tasks ending at the EVA start count. An interruption discards earlier oxygen credit rather than combining separate sessions. This conservative demo handling is not an operational break-in-prebreathe algorithm.
- Depressurization minutes are counted separately, once. Light exercise is a combined oxygen/exercise task, avoiding overlapping schedule records. Its assumed VO2 is 5.8 mL/kg/min.
- An equivalent exercise input preserves the sequential exponential washout exactly: `exercise = log(sum(duration * exp(K.exerciseK * VO2)) / totalOxygenMinutes) / K.exerciseK`.
- Prior EVA count and the gap since the most recent EVA feed the model's existing carryover approximation. That model assumes evenly spaced previous EVAs; irregular histories are not modeled exactly.
- The original model's DCS result does **not** depend on outside duration. Shortening an EVA therefore changes oxygen exposure and illustrative workload, but not DCS. Delay alone is not additional oxygen prebreathe.
- Medical checks, hydration, meals, sleep, routine exercise and tool tasks have descriptive readiness effects and demo stress contributions; no unsupported DCS multipliers are assigned.
- Stress is `baseline + sum(task stress per hour * overlapping hours in the last 24 h)`, clamped to 0–100. It is not a validated stress scale, NASA-TLX score, biomarker or clinical predictor.
- Monitor traces are deterministic synthetic samples. Bio-Monitor fields are HR, respiration and skin temperature. EveryWear is modeled as an application receiving HR/activity data. Neither measures DLCO here. Past samples use a per-event HR baseline; future samples use the current profile. Values are illustrative, not validated normal ranges.

The risk is **DCS**, not probability of an equipment leak or accidental depressurization. All scenarios require mission-specific medical and operational validation before any real use. Task durations, dates, coefficients and readings are demo assumptions even when task names are grounded in NASA reports. Sources are linked per task and in the page's assumptions disclosure.

## Integration seams and storage

- `MissionPlanner.adapters.bio` and `.everywear` expose names, `mode`, fields and a deterministic `read(state, event)` adapter. The UI gates visibility with the connection switches. Future integrations need approved API access, units/schema validation and timestamp handling.
- `.playbook.pull(state)` supplies stable mock IDs. `.export(state)` creates `kiwinaut-demo-schedule-v1`. No remote requests, credential entry or claim of official interoperability.
- State is stored under `kiwinaut-mission-v1` in browser localStorage. It is single-browser storage, not a shared mission backend or suitable storage for real medical records. Export before clearing browser site data. Storage failure is surfaced in the toolbar.
- `index.html` and the workspace use same-origin, source-checked `postMessage` navigation. The new recommendation calculation uses schedule inputs, independently of the standalone DLCO measurement screen.

## Verification

From `space_health_monitor`:

```powershell
node --test tests/planner.test.cjs
```

Tests cover crew isolation, source schedule conflicts, sequential washout equivalence, interruption handling, scenario effects, history protection, input validation, deterministic readings and stable mock-import IDs. Browser checks cover rendering, scenario preview/application, mock import, individual task creation and navigation. The planner requires no new JavaScript packages.
