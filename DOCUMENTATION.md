# EVA Decompression Risk Model

Pulmonary diffusing capacity as a per-crew-member measure of decompression burden.

Complete specification. Every constant, equation, source and known weakness.

---

## Contents

1. What the model does
2. Notation
3. Constants
4. The forward model
5. The effective ratio
6. The inverse model
7. Solving for a protocol
8. The mission panel
9. What the measurement buys
10. What is not known
11. Where the model does not apply
12. Deliberate omissions
13. Reference values
14. The gap this addresses
15. Sources

---

## 1. What the model does

It connects three things.

1. A decompression protocol, which is a set of pressures and times.
2. A bubble burden, expressed as a likelihood of venous gas emboli and a
   probability of decompression sickness.
3. A measurable fall in pulmonary diffusing capacity.

Running forwards, a protocol predicts a bubble burden and therefore a fall in
diffusing capacity. Running backwards, a measured fall recovers a bubble burden
for one specific crew member, which can be compared against what the protocol
was supposed to deliver.

The second direction is the point. Decompression models are population models.
A measurement makes the number personal.

The tool has three panels. **Assessment** inverts a measured pair of readings.
**Planning** solves for a protocol that meets a target. **Mission** runs the same
protocol across consecutive days and recalibrates from each day's reading.

---

## 2. Notation

| Symbol | Meaning | Units |
| --- | --- | --- |
| P_hab | habitat total pressure | psia |
| F_O2 | habitat oxygen fraction | dimensionless |
| P_suit | suit operating pressure | psid |
| t_pb | prebreathe duration | min |
| t_dec | decompression duration | min |
| t_out | time outside | min |
| VO2 | metabolic rate during prebreathe | mL/kg/min |
| p_N2 | dissolved tissue nitrogen pressure | atm |
| R_rest | resting tissue ratio | dimensionless |
| R_eff | effective tissue ratio | dimensionless |
| H | cumulative hyperoxic exposure | kPa.day |
| DL_CO | diffusing capacity for carbon monoxide | mL/min/mmHg |
| DL_NO | diffusing capacity for nitric oxide | mL/min/mmHg |

1 atm = 14.696 psia = 101.325 kPa.

---

## 3. Constants

| Symbol | Value | Source |
| --- | --- | --- |
| tau | 519.37 min | NASA operational single compartment. 519.37 x ln2 = 360 min half-time at rest. |
| exerciseK | 0.03 per mL/kg/min | NASA TP-2004-213158, TP-2020-220529. |
| anchor | 0.79 | NASA DCS Evidence Report. Decompression dose is (P1N2/P2) - 0.79. |
| vgeN, vgeC | 3.08, 0.47 | NASA TM-100456 Hill fit for venous gas emboli. 34 experiments, N = 607, r = 0.91. |
| dcsN, dcsC | 4.24, 2.16 | Same report, decompression sickness fit, r = 0.84. |
| ambWalk | 1.5772 | Derived here, section 5.3. |
| ambMicro | 0.2945 | Derived here, section 5.3. |
| kBub | 3.1 % | Thorsen 1995. Microemboli present -5.9 %, absent -2.8 %. PMID 8574122. |
| kOx | 0.019 % per kPa.day | Thorsen 1994, n = 41, p < 0.001. Eur Respir J 1994, 7, 4-10. |
| oxThr | 21 kPa | Thorsen 1994, section 5.4. |
| hbStd | 14.6 g/dL | Dujic 1993. |
| carryPer | 0.03 | No published value, section 10.1. |
| carryHalf | 36 hours | No published value, section 10.1. |
| rLimit | 1.65 | Operational tissue ratio ceiling. |
| dcsAccept | 15 % | NASA-STD-3001 [V2 6008], per person per EVA, at 95 % statistical confidence. |

---

## 4. The forward model

### 4.1 Starting condition

The crew member has been living in the habitat long enough to equilibrate, so
dissolved tissue nitrogen equals the inspired nitrogen pressure.

    p_N2(0) = (P_hab / 14.696) x (1 - F_O2)

For the exploration atmosphere of 8.2 psia at 34 % oxygen this is 0.3683 atm, or
5.41 psi. NASA publishes 5.4 psi. For 14.7 psia at 21 % it is 11.61 psi against
NASA's published 11.6.

**Pressures are dry.** No alveolar water vapour is subtracted. This is forced by
NASA's own anchor. At sea level, 14.696 x 0.79 / 14.696 = 0.790, which is the
published 0.79. Subtracting 47 mmHg gives 0.741, which is not.

Three habitat presets are offered, being the atmospheres the xEVA system is
specified to operate from in EVA-EXP-0075.

| Preset | Pressure | Oxygen | Tissue nitrogen |
| --- | --- | --- | --- |
| Exploration atmosphere | 8.2 psia | 34 % | 5.41 psi |
| Intermediate | 10.2 psia | 26.5 % | 7.50 psi |
| ISS standard | 14.7 psia | 21 % | 11.61 psi |

### 4.2 Nitrogen washout

A single perfusion-limited compartment. On 100 % oxygen the inspired nitrogen
pressure is zero, so the tissue decays toward zero.

    dp_N2/dt = -k x p_N2
    p_N2(t)  = p_N2(0) x exp(-k t)
    k        = exp(0.03 x VO2) / 519.37

At rest, VO2 = 0, k = 1/519.37 per minute, half-time 360 minutes. At the
5.8 mL/kg/min of NASA's light exercise protocol the half-time falls to 304 min.

### 4.3 Prebreathe and decompression are the same thing physiologically

They are two separate entries on an operational timeline, scheduled and costed
independently, and the time accounting in section 9 reports them separately. But
they are one quantity in the model, and the diminishing return belongs to the
total rather than to either one.

| Decompression time, prebreathe held at 15 min | DCS | Value per minute |
| --- | --- | --- |
| 0 min | 8.40 % | |
| 5 min | 7.55 % | 0.171 %/min |
| 30 min | 4.22 % | 0.115 %/min |
| 60 min | 1.89 % | 0.066 %/min |
| 90 min | 0.72 % | 0.039 %/min |

The first five minutes are worth 3.3 times the five minutes added at the one hour
mark, so shortening a decompression is disproportionately expensive. That comes
from the shape of the Hill curve, not from any rate effect on bubble growth,
which this model does not contain.

### 4.3.1 Why they are interchangeable in this model, and why that is a limitation

This model is Haldanean. It compares dissolved tissue nitrogen against ambient
pressure at the endpoint and carries no term for the rate of the pressure drop.
Within that frame, prebreathe and decompression are the same quantity.

**Physiologically they are not.** A faster decompression excites more micronuclei
into growing bubbles at the same dissolved gas load. In animals a fast
decompression rate is a determining factor for DCS, and in both animals and men a
slow ascent induces fewer venous gas bubbles than a fast one. In one diving
study an ascent at 9 m/min was only 93 seconds longer than one at 17 m/min, and
that was enough to reduce bubble formation and DCS risk, with identical dissolved
gas at the end.

The mechanism is that susceptibility is lower when ascent is slow, because
nitrogen pressure inside the nucleus stays high while washout removes nitrogen
from the tissue. The rate at which stable micronuclei transform into growing
bubbles depends on time-dependent supersaturation, not its endpoint. NASA's own
prebreathe review describes bubbles forming from a limited number of large-radius
micronuclei during a rapid initial depressurization.

No rate coefficient is implemented, because the available data is from diving
ascents and does not transfer to an 8.2 to 4.3 psia suit transition, and no
EVA-specific figure exists. **Risk at short decompression times is therefore
underestimated**, and the tool warns below 10 minutes and warns more strongly
below 3.

Decompression time is floored at 1 minute. Below roughly 3 minutes barotrauma to
ear, sinus and lung becomes the limiting hazard rather than decompression
sickness, and that is outside this model entirely.

### 4.3.2 Why they are interchangeable

Both are spent on 100 % oxygen, so inspired nitrogen is zero in both, so the
washout rate is identical. Ambient pressure changes the ratio, not the rate.
Only the total matters.

    t_oxygen   = t_pb + t_dec
    p_N2(seal) = p_N2(0) x exp(-k x t_oxygen)

Verified numerically. 30 + 0, 15 + 15 and 0 + 30 minutes all give a resting ratio
of 1.1880.

This is a property of EVA, not of decompression generally. A diver ascending on
air is still taking inert gas in, so ascent rate changes the gradient. An EVA
depressurisation on pure oxygen has no inert gas in the breathing mix at all.

It is also why the model reproduces NASA's Case 1 without modelling its 6.0 psia
prebreathe stage separately. Fifteen minutes on oxygen at 6.0 psia and fifteen
minutes on oxygen at 8.2 psia leave the tissue in the same place.

### 4.4 The tissue ratio

The supersaturation at the moment the suit reaches operating pressure.

    R_rest = p_N2(seal) / (P_suit / 14.696)

The peak is at the moment of seal. Afterwards the tissue keeps clearing while
ambient pressure is constant, so the ratio only falls. **Time outside does not
raise decompression risk in this model.** Verified: 60, 360 and 540 minutes
outside give an identical ratio of 1.2211. See section 11 for why this may not be
true in NASA's own model.

### 4.5 Risk

Two Hill functions of the effective ratio.

    VGE(%) = 100 x (R_eff - 0.79)^3.08 / [ (R_eff - 0.79)^3.08 + 0.47 ]
    DCS(%) = 100 x (R_eff - 0.79)^4.24 / [ (R_eff - 0.79)^4.24 + 2.16 ]

Both are zero at or below a ratio of 0.79, which is where everyone sits at sea
level.

### 4.6 Hyperoxic dose

Integrated above a threshold, over every phase.

    H = (P_hab/14.696 x 101.325 - 21) x (t_oxygen / 1440)
      + (P_suit/14.696 x 101.325 - 21) x (t_out / 1440)

### 4.7 The predicted fall in diffusing capacity

    dDL_CO (%) = -( 3.1 x VGE/100 + 0.019 x H )

---

## 5. The effective ratio

    R_eff = 0.79 + A x C x (R_rest - 0.79)

where A is the gravity factor and C the carryover multiplier.

### 5.1 Why the dose and not the ratio

The factors scale the **decompression dose**, which is the ratio above the
sea-level anchor, not the ratio itself. Scaling the ratio drags the anchor with
it and sends low-dose microgravity cases to exactly zero, which is an artefact.

### 5.2 Why a multiplier at all

Both gravity regime and repeated exposure act by changing the population of
bubble micronuclei, the seeds bubbles grow from. A larger seed population at the
same supersaturation behaves like a larger dose. A multiplier reproduces that and
leaves the Hill functions untouched.

The literature is explicit that the nuclei population is what current models do
not represent. Decompression models consider only saturation and desaturation of
inert gas and disregard the population of bubble micronuclei. That is the gap the
measurement addresses.

### 5.3 Deriving the two gravity factors

The Hill fits were made on chamber exposures simulating microgravity. Two
published NASA figures anchor the two regimes.

| Anchor | Condition | R_rest | NASA figure | Factor |
| --- | --- | --- | --- | --- |
| Artemis 15 min prebreathe | surface | 1.2228 | 8.4 % modelled | 1.5772 |
| ISS ISLE operational | microgravity | 1.8252 | 0.3 % per EVA | 0.2945 |

The ratio between them is 5.35.

**This is a cross-model calibration, not a physical measurement.** Two cautions
belong with it. NASA produced the 8.4 % with the Tissue Bubble Dynamics Model, a
different model from the Hill tissue-ratio fit used here, so the factor partly
reconciles two models rather than measuring anything. And the paper does not
state whether that EVA is ambulatory, so attributing the factor to walking is an
interpretation the source does not support.

The microgravity anchor is on firmer ground. The 0.3 % is an operational figure
and ISS EVA genuinely is non-ambulatory, though the 0 % observed across 130 EVAs
cannot itself be used as an anchor.

### 5.4 The hyperoxia threshold

Thorsen 1994 integrated above 21 kPa, not the conventional 50 kPa, and said why.
The conventional units, UPTD and CPTD, do not account for exposure below 50 kPa
and are valid only for vital capacity. His evidence was a shallow saturation dive
at 40 to 50 kPa with no venous gas microemboli detected which still produced
significant lung function changes while scoring near zero on UPTD. He tested 30
and 40 kPa thresholds, and hyperbolic and exponential forms, and reported the
21 kPa linear version.

The threshold is an input. Set it to 50 and the suit contribution vanishes, since
the suit at 4.3 psia sits at 29.7 kPa.

---

## 6. The inverse model

Measure diffusing capacity before and after. Everything computable from
pressures, times and blood values is removed, and whatever remains is attributed
to bubbles.

### 6.1 The measured change

    d (%) = 100 x (DL_post - DL_pre) / DL_pre

### 6.2 Haemoglobin correction

    hbFactor(Hb) = (10.22 + Hb) / (1.7 x Hb)
    d_corrected  = d x hbFactor(Hb) / hbFactor(14.6)

The standard is self-consistent. 10.22 + 14.6 = 24.82 and 1.7 x 14.6 = 24.82, so
the factor is exactly 1 there.

### 6.3 The subtraction

    explained = 0.019 x H + kDust x dust
    residual  = -( d_corrected + explained )

Every term removed is computed, not measured, so none adds measurement error.

### 6.4 Back to a bubble burden

    VGE_measured (%) = 100 x residual / 3.1
    R_implied        = 0.79 + [ 0.47 p / (1 - p) ]^(1/3.08),  p = VGE_measured/100
    DCS_measured     = hillDCS(R_implied)

### 6.5 The personal factor

    factor = VGE_measured / VGE_predicted

A ratio of likelihoods, not of tissue ratios. Applying it to the ratio instead is
a mistake that runs away, because the Hill curve is steep. Withheld when the
predicted burden is below an index of 1, because the ratio then divides by
something close to zero, and clamped to between 0.25 and 4 when used.

### 6.6 The baseline reset rule

If the post reading exceeds the pre reading, the lung has not improved across a
decompression. The earlier reading understated the true baseline. The later value
becomes the baseline and the EVA scores zero.

---

## 7. Solving for a protocol

All three solves are closed form. Let

    R_target = 0.79 + ( hillVGEinv( hillVGE(hillDCSinv(target)) / f ) - 0.79 ) / (A x C)
    q        = R_target x (P_suit / 14.696) / p_N2(0)

where f is the personal factor. If q >= 1 the protocol already meets the target
with no oxygen time at all.

**Oxygen time**, given exercise and suit pressure.

    t_oxygen = -ln(q) / k(VO2)
    t_pb     = t_oxygen - t_dec

**Exercise**, given oxygen time and suit pressure.

    VO2 = ln( -519.37 x ln(q) / t_oxygen ) / 0.03

**Suit pressure**, given oxygen time and exercise.

    P_suit = 14.696 x p_N2(0) x exp(-k x t_oxygen) / R_target

Verified by round trip at 1, 3, 5 and 8 percent targets.

### 7.1 The coupled levers

Planning holds one lever where you put it. The other two are coupled: move either
and the third re-solves so the target is kept. When the solving lever runs out of
range it clamps and the achieved risk drifts, which is stated rather than hidden.

### 7.2 Unreachable targets

Every lever in this model only lowers risk. None raises it. So a held lever that
already over-protects can never be climbed back out of.

| Target | Maximum held oxygen time before the target is unreachable |
| --- | --- |
| 1 % | 95 min |
| 3 % | 58 min |
| 5 % | 38 min |
| 8 % | 17 min |
| 10 % | 7 min |
| 15 % | 0 min |

At the 15 % limit the exploration atmosphere meets the target with no prebreathe
at all, so there is no protocol to tune. The tool has work to do below about
11 %, which is where a flight surgeon wanting margin would sit, or wherever a
crew member's own measurement pushes them.

---

## 8. The mission panel

The same protocol every day, with carryover between exposures. This is the panel
a ground control operator would work from.

The risk limit is adjustable. It defaults to NASA's 15 percent but a flight
surgeon holding margin would set it lower, and the panel states which side of
NASA's figure the chosen limit sits on.

Each day is predicted using only the days before it. Day one is predicted from
the model alone. If a reading is entered for day one, the personal factor is
fitted from it and day two is predicted with that factor. If day two also has a
reading, the factor becomes the running mean of both, and so on. Every prediction
is therefore out of sample before it becomes training data.

The limit is NASA's 15 % per person per EVA, and the headline is how many
consecutive days the protocol sustains before crossing it.

---

## 9. What the measurement buys

The two numbers at the top of Planning and Mission.

**Blind** is the protocol you would fly knowing nothing about this crew member,
solved with a personal factor of 1. **Informed** is the protocol that puts this
crew member on the target, solved with their measured factor.

    time   = t_informed - t_blind,  multiplied by the number of EVAs
    risk   = (what the blind protocol actually does to them) - target

Both directions matter. A crew member reading below 1 hands back crew time at no
cost in risk. One reading above 1 costs time but removes risk they did not know
they were carrying.

| Personal factor | Blind protocol | They need | Their real risk, flown blind |
| --- | --- | --- | --- |
| 0.6 | 73 min | 19 min | 1.29 % |
| 1.0 | 73 min | 73 min | 3.00 % |
| 1.6 | 73 min | 109 min | 7.19 % |
| 2.0 | 73 min | 124 min | 11.56 % |

Those figures are at a 3 % target. At the 15 % limit, a crew member at 1.30 times
the modelled burden breaches it on the baseline protocol, which is a margin of
only 30 % individual variation.

---

## 10. What is not known

### 10.1 Carryover between EVAs

No published coefficient exists for EVA. The implementation is a nuclei load
incrementing by one per exposure and decaying exponentially between them.

    r    = 0.5 ^ (gap_hours / carryHalf)
    L(n) = L(n-1) x r + 1,  L(0) = 0
    C    = 1 + carryPer x L(n) x r

with carryPer = 0.03 and carryHalf = 36 hours, both chosen, not fitted.

The mechanism is well attested even though the magnitude is not. The increased
risk of decompression illness on a second dive is one of the standard
observations micronuclei theory explains. Microparticles are increased by
repetitive diving, some possess enzyme activity providing nucleation sites, and
they are more numerous in proportion to dive repetition.

The shape across many days is probably not monotonic. Balestra and colleagues,
tracking a week of repeated diving, found venous gas emboli first falling and
then rising, consistent with depletion of a first generation of pre-existing
nuclei followed by inflammation generating a second generation. That is a
U-shape, and this model does not reproduce it.

### 10.2 Lunar dust

No coefficient exists for diffusing capacity lost per unit of inhaled dust. The
slot is present and does nothing at zero. The dose is trackable even where the
response is not, because NASA-STD-3001 [V2 6053] caps lunar dust at 0.3 mg per
cubic metre and [V2 6153] requires exposure records.

### 10.3 The shape of the bubble to diffusing capacity relationship

Linear here because the evidence supports nothing else, not because anyone tested
it. Thorsen 1995 is a two-group contrast, bubbles present against absent, which
gives one number and no shape. Thorsen 1994 entered accumulated bubble score, the
sum of bubble scores registered precordially, as a plain linear term with
coefficient -0.32.

Physiologically a threshold is more plausible. The lung has large recruitment
reserve, so a small bubble load should be absorbed with little measurable effect
until that reserve is consumed, giving a flat region then a steep rise. No graded
data exists to fit it.

### 10.4 Thorsen 1995 full text

Not obtained. The -5.9 % and -2.8 % figures come from the indexed abstract.
PMID 8574122, no DOI. This is the single most load-bearing unverified number in
the model, since it sets the entire scale of the index.

### 10.5 Applying a group fit to an individual

The Hill functions were fitted as group incidences across 607 chamber exposures.
Reading them as one crew member's likelihood is how they are used operationally,
but it is a different claim from the one the fit supports.

---

## 11. Where the model does not apply

### 11.1 Outside the validated band

The Hill fits were checked against NASA's threshold table between tissue ratios
of 1.22 and 1.49. The exploration atmosphere sits inside that. ISS protocols land
between 1.7 and 2.0 and the raw fit over-predicts there by orders of magnitude.
The microgravity anchor was added to make those cases usable, but any habitat
near 14.7 psia should be treated as indicative only. The tool warns above a
resting ratio of 1.6.

### 11.2 Staged suit pressure profiles

NASA's own cases step the suit down during the EVA. Case 2 is four hours at
8.2 psi then two at 4.3. Case 3 is three hours at 8.2, two at 6.0 and one at 4.3.
NASA puts those within 0.1 percentage points of each other and of Case 1.

Neither metric available here reproduces that equivalence.

| | Peak ratio | Supersaturation-time integral | NASA |
| --- | --- | --- | --- |
| Case 1 | 1.223 | 45.6 | 8.4 % |
| Case 2 | 1.350 | 78.8 | 8.5 % |
| Case 3 | 1.203 | 71.3 | 8.4 % |

Peak ratio spreads them by 12 %, the integral by 51 %. The Tissue Bubble Dynamics
Model tracks bubble nucleation and growth, where bubbles grow above a threshold
and shrink below it, and that is not reducible to a scalar computed from
pressures and times. **This model cannot evaluate staged suit profiles and should
not be used for them.**

### 11.3 Decompression rate

Covered in section 4.3.1. The model has no rate term. Risk at short
decompression times is underestimated and barotrauma is not modelled at all.

### 11.4 EVA duration

Section 4.4 shows duration cannot raise risk in a peak-ratio model. That is
probably false in NASA's model. Case 2 runs one third the time at 4.3 psi as
Case 1, at a substantially higher peak ratio, and comes out at essentially the
same risk. That pattern only makes sense if time at supersaturation contributes.

---

## 12. Deliberate omissions

**Measurement repeatability is not modelled**, at the user's instruction. For the
record, within-subject coefficient of variation for diffusing capacity is around
5.5 %, and the whole 0 to 100 index spans 3.1 % of DL_CO, so a single breath-hold
pair does not resolve a single exposure. The index suits comparing protocols and
tracking one crew member across many exposures, not adjudicating one EVA from one
pair of readings.

**No oxygen carried across EVAs.** Hyperoxic exposure from earlier EVAs sits in
both the baseline and the post reading of the current one and cancels in the
difference. Only the current EVA's own dose is subtracted.

---

## 13. Reference values

Exploration atmosphere, 8.2 psia at 34 % oxygen, suit at 4.3 psid, surface EVA,
no preceding EVAs, 6 hours outside.

| Prebreathe, min | R_rest | R_eff | Index | DCS, % |
| --- | --- | --- | --- | --- |
| 0 | 1.259 | 1.529 | 44.2 | 11.39 |
| 15 | 1.223 | 1.473 | 39.6 | 8.40 |
| 30 | 1.188 | 1.418 | 35.1 | 6.04 |
| 45 | 1.154 | 1.364 | 30.6 | 4.22 |
| 60 | 1.121 | 1.313 | 26.3 | 2.87 |
| 90 | 1.058 | 1.213 | 18.3 | 1.19 |
| 120 | 0.999 | 1.120 | 11.4 | 0.42 |

Calibration checks.

| Case | Model | NASA |
| --- | --- | --- |
| Artemis 15 min prebreathe, surface | 8.40 % | 8.4 % modelled |
| ISS ISLE operational, microgravity | 0.20 % | 0.3 % per EVA |
| ISS 4 hour in-suit, microgravity | 0.17 % | more conservative than ISLE |
| Exploration atmosphere tissue nitrogen | 5.41 psi | 5.4 psi |
| ISS tissue nitrogen | 11.61 psi | 11.6 psi |
| Sea-level ratio | 0.790 | 0.79 |

---

## 14. The gap this addresses

NASA's Human Research Roadmap carries this as an open gap.

> ExAtm5: We do not know the O2 prebreathe requirements for DCS mitigation from
> the 8.2/34 environment.

The exploration atmosphere prebreathe protocol has not been validated, and
surface EVA protocols are in development and may make use of vehicle saturation
atmosphere, prebreathe time and exercise, and the ability of the suit to operate
at higher delta pressures. NASA-STD-3001 requires the 15 % limit be verified by
test.

The evidence base that currently justifies flying these protocols is 334 EVAs
with zero reported decompression sickness, against ground chamber incidences of
20 to 40 % for the same profiles. Every explanation offered for that gap turns on
microgravity: the absence of weight-bearing, the absence of ambulation, the
suit's own metabolic load. None of it transfers to a lunar surface EVA, and NASA
states plainly that microgravity prebreathe protocols are not effective for
planetary EVA.

So there is no flight dataset for walking decompression, and a measurement that
works in flight is how one would start building it.

---

## 15. Sources

Abercromby A H, et al. Fifteen-minute extravehicular activity prebreathe protocol
using NASA's exploration atmosphere, 8.2 psia / 34 % O2. Acta Astronautica.
https://www.nasa.gov/wp-content/uploads/2023/03/abercromby-8.2-34-atm-2015.pdf

Arieli R. Nanobubbles form at active hydrophobic spots on the luminal aspect of
blood vessels. Front Physiol. 2017. PMC5559548

Balestra C, et al. Physiology of deep closed circuit rebreather mixed gas diving,
vascular gas emboli and biological changes during a week-long liveaboard safari.
Front Physiol. 2024, 15, 1395846. doi 10.3389/fphys.2024.1395846

Conkin J, et al. Evidence report, risk of decompression sickness.
https://humanresearchroadmap.nasa.gov/evidence/reports/DCS.pdf

Dujic Z, et al. Effect of a single air dive on pulmonary diffusing capacity in
professional divers. J Appl Physiol. 1993.

Gernhardt M L, Dervay J P. Extravehicular activities, chapter 5.4.
https://www.nasa.gov/wp-content/uploads/2023/03/gernhardt-eva-ops-chp-5.4-2013.pdf

NASA. Modeling oxygen prebreathe protocols for exploration extravehicular
activities using variable pressure suits. NTRS 20170004350.

NASA. Evidence report, risk of reduced crew health and performance due to hypoxia
and decompression sickness. 2024.
https://humanresearchroadmap.nasa.gov/evidence/reports/Evidence%20Report%20Hypoxia%20and%20DCS_FINAL_1-8-2024.pdf

NASA. Decompression sickness technical brief, OCHMO.
https://www.nasa.gov/wp-content/uploads/2023/03/dcs-technical-brief-ochmo.pdf

NASA. EVA-EXP-0075, exploration EVA system concept of operations summary for
Artemis phase 1 lunar surface mission.

NASA. EVA-EXP-0042, xEVA system concept of operations.

NASA TM-100456. Hill model for venous gas emboli and decompression sickness.

NASA-STD-3001. Space flight human-system standard, volume 2.

Prisk G K, Guy H J B, Elliott A R, Deutschman R A, West J B. Pulmonary diffusing
capacity, capillary blood volume, and cardiac output during sustained
microgravity. J Appl Physiol. 1993, 75(1), 15-26. doi 10.1152/jappl.1993.75.1.15

Thorsen E, et al. Contribution of hyperoxia to reduced pulmonary function after
deep saturation dives. 1993.

Thorsen E, et al. Reduced pulmonary function after saturation dives. Eur Respir
J. 1994, 7, 4-10.

Thorsen E, et al. Pulmonary function after saturation diving, bubbles present
against absent. PMID 8574122. Full text not obtained.
