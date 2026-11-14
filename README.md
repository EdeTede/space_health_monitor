# EVA Decompression Risk Calculator

Pulmonary diffusing capacity as a per-crew-member measure of decompression
burden, for lunar surface extravehicular activity.

Built for the NASA Space Apps Challenge, health monitoring software challenge.

---

## The problem

NASA's acceptable decompression sickness risk is 15 percent per person per EVA,
set by NASA-STD-3001 [V2 6008] at 95 percent statistical confidence, and it must
be verified by test. Their modelled baseline for a lunar surface EVA from the
8.2 psia / 34 percent oxygen exploration atmosphere is 8.4 percent.

That leaves a margin of only about 30 percent individual variation. A crew member
who bubbles 1.3 times more than the model assumes is over the limit on every
single EVA, and nothing in the current system would detect them.

The evidence that currently justifies flying these protocols is 334 EVAs with
zero reported decompression sickness, against 20 to 40 percent incidence in
ground chamber tests of the same profiles. Every explanation for that gap turns
on microgravity, and NASA states that microgravity prebreathe protocols are not
effective for planetary EVA. There is no flight dataset for walking
decompression.

NASA carries this as an open gap: *"ExAtm5: We do not know the O2 prebreathe
requirements for DCS mitigation from the 8.2/34 environment."*

## The idea

Bubbles released by decompression are filtered by the lungs. That filtering
measurably reduces the transfer of gas across the alveolar membrane, which a
single ten second breath hold can measure.

So a diffusing capacity reading before and after an EVA carries a signal about
how much that particular crew member actually bubbled, not how much the
population model says they should have.

Subtract the parts of the fall explained by oxygen exposure and haemoglobin, both
computable from the protocol, and what remains is attributable to bubbles.

## What the tool does

**Assessment.** Two readings in, a decompression risk index and a decompression
sickness probability out, plus a personal factor describing how this crew member
compares to the model.

**Planning.** Set a target risk, hold one lever fixed, and the other two move
together to meet it. Levers are prebreathe duration, exercise during prebreathe,
and decompression time, with suit pressure and habitat atmosphere available too.

**Mission.** The same protocol across consecutive days with carryover between
exposures. Each day is predicted from the days before it only, so every
prediction is out of sample before it becomes data.

Both Planning and Mission lead with what the measurement buys, in crew minutes
saved or added and in percentage points of risk removed.

## Files

| File | What it is |
| --- | --- |
| `eva-calc.html` | The whole tool. Open it in a browser, no server needed. |
| `model.js` | The model alone, no interface code. Lifts out and runs on its own. |
| `app.js` | The interface. |
| `DOCUMENTATION.md` | Full specification. Every equation derived, every constant sourced. |
| `VARIABLE-LOG.md` | Every quantity, its source, and whether it is published, derived or chosen. |

## Honesty

Three numbers in this model have no published value and were chosen: the
carryover per EVA, the nuclei half-life, and the lunar dust coefficient. They are
labelled as such in `VARIABLE-LOG.md` and exposed as inputs rather than buried.

The number that sets the scale of the entire index comes from a PubMed abstract
whose full text has not been obtained (Thorsen 1995, PMID 8574122).

The gravity factors are a cross-model calibration between a Hill tissue-ratio
model and NASA's Tissue Bubble Dynamics Model, not a physical measurement.

The model cannot evaluate staged suit pressure profiles, and `DOCUMENTATION.md`
section 11 shows why with the numbers.

## Calibration

| Check | Model | NASA |
| --- | --- | --- |
| Artemis 15 min prebreathe, surface EVA | 8.40 % | 8.4 % |
| ISS ISLE operational, microgravity | 0.20 % | 0.3 % per EVA |
| Exploration atmosphere tissue nitrogen | 5.41 psi | 5.4 psi |
| ISS tissue nitrogen | 11.61 psi | 11.6 psi |
| Sea-level tissue ratio | 0.790 | 0.79 |
