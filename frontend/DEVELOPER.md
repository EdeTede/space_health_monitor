# Local developer screens

Open **Developer** in the main app navigation. The two screens are also available at `/developer-tasks.html` and `/developer-calculator.html` when running the app server.

The additional **NASA model lab** at `/developer-nasa.html` independently edits the published BGI logistic equation and its coefficients. It displays the supplied bubble-dynamics equation and identifies the parameters missing for a complete solver. See [NASA method notes](NASA-METHOD.md).

Task specifications exposes all 16 catalogue activities: names, categories, default durations, stress rates, monitor HR offsets, oxygen credit, exercise VO₂, effects and source URLs. IDs remain stable. Default duration changes affect newly added activities; other task changes recalculate existing synthetic activities. Existing schedule times and durations are preserved.

Calculator lab exposes 16 constants and 29 expressions covering forward, inverse, carryover and closed-form solver calculations. A JSON test profile and forward trace show input-dependent intermediate results. The parser permits only arithmetic, named inputs and the listed math functions; it never evaluates JavaScript. Fixed control-flow guards, unit conversions and calendar aggregation rules are described on screen.

Use **Validate & preview**, then **Apply to local demo**. Both the calendar recommendations and the original DLCO calculator load the shared `dev-engine.js`; open tabs update through storage events. Mixed oxygen stages use their duration-weighted elimination rates, including custom rate equations. Equivalent exercise remains a diagnostic based on the original exponential mapping.

Configuration is saved under `kiwinaut-developer-v1` in localStorage, separate from crew schedules. Overrides apply only on the same browser origin (scheme, hostname and port). They do not edit source files or the Python backend model. Export/import JSON transfers both screens' configuration. Restore defaults resets only the current screen. A stale editor is blocked from applying after another tab changes configuration; reload it to continue.

Validation rejects malformed expressions, unknown variables, invalid task values and non-finite sample results. Failed application rolls back without replacing saved settings. This is numerical validation only: changing a forward equation can invalidate inverse or solver assumptions, which must be updated together. These estimates and simulated monitor readings are for demonstration, not mission clearance.

Verification: `node --test space_health_monitor/tests/developer.test.cjs space_health_monitor/tests/planner.test.cjs` from the workspace root. The 18 tests cover baseline numerical parity, parser restrictions, rollback, persistence, custom-rate calendar integration, task validation and existing planner workflows. Browser checks cover editor application/reset, task search, calculator rendering and cross-tab refresh. FastAPI routes were syntax-checked; runtime backend testing requires its dependencies.
