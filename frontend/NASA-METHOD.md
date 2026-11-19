# NASA source comparison

## What is implemented

The existing calculator remains unchanged as a separate method. The comparison is available beneath its results, in calendar Recommendations, and from **Risk methods** in the main navigation. NASA model lab is a separate developer screen.

1. Four immutable published scenario results from the supplied `NASAmodel.pdf`, **Modeling Oxygen Prebreathe Protocols for Exploration EVA Using Variable Pressure Suits**, Abercromby, Conkin and Gernhardt, 2017. NASA NTRS: https://ntrs.nasa.gov/api/citations/20170004350/downloads/20170004350.pdf
2. The BGI-to-DCS logistic regression from the supplemental NASA presentation **Fifteen-minute Extravehicular Activity Prebreathe Protocol Using NASA's Exploration Atmosphere**, slide 12: https://ntrs.nasa.gov/api/citations/20140000417/downloads/20140000417.pdf

`P(DCS)% = 100 / (1 + exp(-(-3.477 + 0.0499 * BGI)))`

The supplied 2017 presentation describes logistic regression on slide 6 but omits its coefficients. The implementation therefore identifies the supplemental coefficient source explicitly. A manually supplied BGI is independent of the app's synthetic readings and existing model; it is not presumed to belong to the selected calendar EVA. No current-plan NASA percentage is displayed without a BGI.

## Source cases

| Case | Initial saturated habitat | Prebreathe | Subsequent pressure profile | Published DCS |
|---|---|---|---|---|
| 1 | 8.2 psia, 34% O2 | 15 min at 6.0 psia | 360 min at 4.3 psia | 8.4% |
| 2 | 14.7 psia, 21% O2 | 120 min at 14.7 psia | 240 min at 8.2, then 120 min at 4.3 psia | 8.5% |
| 3 | 14.7 psia, 21% O2 | 120 min at 14.7 psia | 180 min at 8.2, 120 min at 6.0, 60 min at 4.3 psia | 8.4% |
| 4 | 14.7 psia, 21% O2 | 120 min at 14.7 psia | Case 3 plus two 15 min recompressions to 8.2 psia | 7.9% |

Breathing gas is 95% oxygen per slide 7. Slides 7–12 specify the cases and results. Case 4 has a source ambiguity: slide 7 summarizes six hours with recompressions during the intermediate stage; slide 12 plots six hours at working pressures plus 30 min of recompressions. The app uses the explicit slide-12 timeline (390 min) and flags the discrepancy. No transition-rate precision is inferred from the plotted slopes.

## Calculation and preparation-time differences

The existing calculator uses exponential nitrogen washout and a Hill probability transform. NASA uses time-dependent tissue bubble dynamics, a Bubble Growth Index, and logistic regression. These are distinct models, not interchangeable probability calibrations of the same state variable.

Each reference case is compared with an explicitly labeled **existing-model projection**: the same initial habitat, published prebreathe duration, and elapsed EVA duration, but a constant final 4.3 psia suit pressure, pure oxygen, resting prebreathe, no ambulation factor and no prior-EVA carryover. The existing model cannot represent 95% gas, variable suit pressure, or recompression. Therefore the percentage-point difference is a descriptive comparison with simplified inputs, not an equivalent-exposure validation or accuracy score.

The source-case time comparison evaluates the active existing forward model for each whole minute of resting oxygen, from 0 to 1,440, and reports the first sampled time at or below the source's stated risk. It also compares both methods at the user's target (default 3%). Published NASA prebreathe times are shown as qualifying only when the source case's risk meets that numerical target; they are not optimized minima. None of the four source cases establishes a 3% solution.

For the current calendar/calculator profile, the existing-model time search adds resting oxygen to the credited preparation. It preserves the existing mixed-stage dose: `effectiveRate = (oldRate * oldMinutes + restingRate * addedMinutes) / totalMinutes`. The search uses the active forward equations, including developer edits, rather than assuming the old inverse formulas remain valid. The displayed UTC preparation start assumes the EVA stays fixed; it is not conflict-checked or automatically scheduled. Existing preview/apply scenarios remain available and clearly report that a new NASA BGI is unavailable.

## Full TBDM is not implemented

The supplied slide 5 equation is reproduced as a source image in the NASA developer lab. The presentation does not provide sufficient calibrated physical constants, initial bubble conditions, film-thickness function, tissue gas kinetics/metabolic tensions, BGI aggregation definition, or numerical pressure-transition rules to recreate its bubble solver. The four reported outcomes cannot uniquely supply those missing quantities.

The implementation does not fit an invented BGI/prebreathe mapping, substitute tissue ratio for BGI, interpolate between incomparable protocols, or apply a fixed risk reduction for exercise or recompression. Arbitrary NASA-profile risk and NASA preparation-time optimization remain unavailable pending an executable TBDM specification or validated implementation.

## Developer behavior and verification

`developer-nasa.html` exposes the probability expression and coefficients, preview/apply/reset, independent of the existing calculator's developer settings. It uses the safe math parser, localStorage `kiwinaut-nasa-v1`, validation before persistence, and cross-tab refresh. Modified outputs are marked developer experiments; published case data remains fixed. Browser overrides do not alter the Python API.

Run `node --test space_health_monitor/tests/*.test.cjs` from the workspace root. Tests cover the published data, logistic coefficients, source timing, independent configuration, invalid inputs, target qualification, existing-model time searches, and mixed-stage oxygen preservation, plus existing planner/developer tests.
