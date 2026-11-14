# EVA Decompression Risk Model

Complete specification. Every constant, equation, source and known weakness.

Companion files. `model.js` is the model on its own, with no interface code.
`app.js` is the interface. `eva-calc.html` is the two combined and published.

---

## 1. What the model does

It connects three things.

1. A decompression protocol, which is a set of pressures and times.
2. A bubble burden, expressed as a likelihood of venous gas emboli and a
   probability of decompression sickness.
3. A measurable fall in pulmonary diffusing capacity.

Running forwards, a protocol predicts a bubble burden and therefore a fall in
diffusing capacity. Running backwards, a measured fall in diffusing capacity
recovers a bubble burden for one specific crew member, which can then be
compared against what the protocol was supposed to deliver.

The second direction is the point. Decompression models are population models.
A measurement makes the number personal.

---

## 2. Notation

| Symbol | Meaning | Units |
| --- | --- | --- |
| P_hab | habitat total pressure | psia |
| F_O2 | habitat oxygen fraction | dimensionless |
| P_suit | suit operating pressure | psid |
| t_pb | prebreathe duration | min |
| t_dec | decompression duration | min |
| t_out | time outside the habitat | min |
| VO2 | metabolic rate during prebreathe | mL/kg/min |
| p_N2 | dissolved tissue nitrogen pressure | atm |
| R_rest | resting tissue ratio | dimensionless |
| R_eff | effective tissue ratio | dimensionless |
| H | cumulative hyperoxic exposure | kPa.day |
| DL_CO | diffusing capacity for carbon monoxide | mL/min/mmHg |
| DL_NO | diffusing capacity for nitric oxide | mL/min/mmHg |

Standard conversions. 1 atm = 14.696 psia = 101.325 kPa.

---

## 3. Constants

| Symbol | Value | Source |
| --- | --- | --- |
| tau | 519.37 min | NASA operational single compartment. Gives a 360 min half-time at rest, since 519.37 x ln2 = 360. |
| exerciseK | 0.03 per mL/kg/min | NASA TP-2004-213158, TP-2020-220529. |
| anchor | 0.79 | NASA DCS Evidence Report. Decompression dose is (P1N2/P2) - 0.79. |
| vgeN, vgeC | 3.08, 0.47 | NASA TM-100456 Hill fit for venous gas emboli. 34 experiments, N = 607, r = 0.91. |
| dcsN, dcsC | 4.24, 2.16 | Same report, Hill fit for decompression sickness, r = 0.84. |
| amb | 1.2043 | Derived here. See section 5.3. |
| kBub | 3.1 % | Thorsen 1995. Microemboli present -5.9 %, absent -2.8 %. PMID 8574122. |
| kOx | 0.019 % per kPa.day | Thorsen 1994, n = 41, p < 0.001. Eur Respir J 1994, 7, 4-10. |
| oxThr | 21 kPa | Thorsen 1994. See section 5.4. |
| hbStd | 14.6 g/dL | Dujic 1993, standard haemoglobin for the correction. |
| carryPer | 0.03 | No published value. See section 8.1. |
| carryHalf | 36 hours | No published value. See section 8.1. |
| rLimit | 1.65 | Operational tissue ratio ceiling. |
| dcsAccept | 3.0 % | NASA acceptable DCS, per person per EVA. |

---

## 4. The forward model

### 4.1 Starting condition

The crew member has been living in the habitat long enough to equilibrate, so
dissolved tissue nitrogen equals the inspired nitrogen pressure.

    p_N2(0) = (P_hab / 14.696) x (1 - F_O2)

For the exploration atmosphere of 8.2 psia at 34 % oxygen this is 0.3683 atm,
or 5.41 psi. NASA publishes 5.4 psi for the same atmosphere.

**Pressures are dry.** No alveolar water vapour is subtracted. This is forced
by NASA's own anchor. At sea level, 14.696 x 0.79 / 14.696 = 0.790, which is
the published 0.79. Subtracting 47 mmHg gives 0.741, which is not. The same
check on the exploration atmosphere gives 5.41 psi dry against NASA's 5.4, and
4.81 psi wet, which is wrong.

### 4.2 Nitrogen washout

A single perfusion-limited compartment. On 100 % oxygen the inspired nitrogen
pressure is zero, so the tissue decays toward zero.

    dp_N2/dt = -k x p_N2
    p_N2(t)  = p_N2(0) x exp(-k t)

with the rate constant raised by metabolic work.

    k = exp(0.03 x VO2) / 519.37

At rest, VO2 = 0, so k = 1/519.37 per minute and the half-time is 360 minutes.
Exercise shortens it. At the 5.8 mL/kg/min of NASA's light exercise protocol
the half-time falls to 304 minutes.

### 4.3 Prebreathe and decompression are the same thing

Both are spent on 100 % oxygen, so inspired nitrogen is zero in both, so the
washout rate is identical in both. Ambient pressure changes the ratio, not the
rate. Only the total matters.

    t_oxygen = t_pb + t_dec
    p_N2(seal) = p_N2(0) x exp(-k x t_oxygen)

Verified numerically. 30 + 0, 15 + 15 and 0 + 30 minutes all give a resting
ratio of 1.1880.

This is a property of EVA, not of decompression generally. A diver ascending on
air is still taking inert gas in, so ascent rate changes the gradient. An EVA
depressurisation on pure oxygen has no inert gas in the breathing mix at all.

### 4.4 The tissue ratio

The supersaturation at the moment the suit reaches operating pressure.

    R_rest = p_N2(seal) / (P_suit / 14.696)

The peak is at the moment of seal. Afterwards the tissue keeps clearing while
ambient pressure is constant, so the ratio only falls. **Time outside cannot
raise decompression risk.** Verified: 60, 360 and 540 minutes outside give an
identical ratio of 1.2211.

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

Two additive terms.

    dDL_CO (%) = -( 3.1 x VGE/100 + 0.019 x H )

---

## 5. The effective ratio

    R_eff = R_rest x A x C

where A is the ambulation multiplier and C the carryover multiplier.

### 5.1 Why a multiplier and not an offset

Both ambulation and repeated exposure act by changing the population of bubble
micronuclei, which are the seeds bubbles grow from. A larger seed population at
the same supersaturation behaves like a higher supersaturation. A multiplier on
the ratio reproduces that and keeps the Hill functions untouched.

### 5.2 Why this matters

The literature is explicit that the nuclei population is the thing current
models do not represent. Decompression models consider only saturation and
desaturation of inert gas and disregard the population of bubble micronuclei,
the precursors of venous gas emboli. This is the gap the measurement addresses.

### 5.3 Deriving the ambulation multiplier

The Hill fits were made on chamber exposures simulating microgravity, which
were non-ambulatory. NASA states plainly that DCS risk is significantly
increased by ambulation and physical activity during altitude exposure, and
that ISS microgravity prebreathe protocols are therefore not effective for
planetary EVA.

The multiplier is solved so that NASA's own reference case is reproduced. NASA
published 8.4 % DCS for an EVA beginning at the exploration atmosphere,
followed by 15 minutes of in-suit oxygen prebreathe and 6 hours at 4.3 psi
(NTRS 20170004350).

    R_rest at that protocol          = 1.2228
    R giving DCS = 8.4 %             = 1.4726
    A = 1.4726 / 1.2228              = 1.2043

Three things fall out of this, and they are the reason the calibration is worth
doing rather than leaving the raw fit in place.

1. The model reproduces NASA's published number exactly, 8.40 % against 8.4 %.
2. The effective ratio of 1.473 sits inside 1.22 to 1.49, the band over which
   the Hill fit was checked against the Evidence Report threshold table. The
   uncalibrated ratio of 1.22 sits on the very edge of it.
3. The predicted fall in diffusing capacity rises from 0.15 to 0.39
   mL/min/mmHg on a baseline of 32, so the quantity being measured is roughly
   two and a half times larger.

The mechanism is tribonucleation. Joint movement generates gas nuclei, which is
literally an increase in effective supersaturation.

### 5.4 The hyperoxia threshold

Thorsen 1994 integrated above 21 kPa, not the conventional 50 kPa, and said why.
The conventional units, Unit Pulmonary Toxic Dose and Cumulative Pulmonary
Toxic Dose, do not take into account exposure below 50 kPa and are valid only
for vital capacity as the lung function variable. His evidence was a shallow
saturation dive at 40 to 50 kPa with no venous gas microemboli detected, which
still produced significant lung function changes while scoring near zero on
UPTD. He tested 30 and 40 kPa thresholds, and hyperbolic and exponential forms,
and reported the 21 kPa linear version.

The threshold is exposed as an input. Set it to 50 and the suit contribution
vanishes, since the suit at 4.3 psia sits at 29.7 kPa.

---

## 6. The inverse model

Measure diffusing capacity before and after. Everything that can be computed
from pressures, times and blood values is removed, and whatever remains is
attributed to bubbles.

### 6.1 The measured change

    d (%) = 100 x (DL_post - DL_pre) / DL_pre

### 6.2 Haemoglobin correction

Carbon monoxide binds to haemoglobin, so a low count reads as a low transfer
factor even in a healthy lung.

    hbFactor(Hb) = (10.22 + Hb) / (1.7 x Hb)
    d_corrected  = d x hbFactor(Hb) / hbFactor(14.6)

The standard is self-consistent. 10.22 + 14.6 = 24.82 and 1.7 x 14.6 = 24.82,
so the factor is exactly 1 at the standard.

### 6.3 The subtraction

    explained = 0.019 x H + kDust x dust
    residual  = -( d_corrected + explained )

Every term removed is computed, not measured, so none of them adds measurement
error of its own.

### 6.4 Back to a bubble burden

    VGE_measured (%) = 100 x residual / 3.1

and the decompression sickness probability follows by inverting the venous gas
emboli fit to a ratio and putting that ratio through the sickness fit.

    R_implied = 0.79 + [ 0.47 p / (1 - p) ]^(1/3.08),  p = VGE_measured/100
    DCS_measured = hillDCS(R_implied)

### 6.5 The personal factor

    factor = VGE_measured / VGE_predicted

Withheld when the predicted burden is below an index of 1, because the ratio
then divides by something close to zero and carries no information.

### 6.6 The baseline reset rule

If the post reading exceeds the pre reading, the lung has not improved across a
decompression. The earlier reading understated the true baseline. The later
value becomes the baseline and the EVA scores zero.

---

## 7. Solving for a protocol

All three solves are closed form. Let

    q = R_target x (P_suit / 14.696) / p_N2(0)

where R_target is the resting ratio that produces the wanted DCS probability,
found by inverting the sickness Hill function and dividing out A and C.

    R_target = hillDCSinv(target) / (A x C)

If q >= 1 the protocol already meets the target with no oxygen time at all.
Otherwise.

**Oxygen time**, given exercise and suit pressure.

    t_oxygen = -ln(q) / k(VO2)
    t_pb     = t_oxygen - t_dec

**Exercise**, given oxygen time and suit pressure.

    VO2 = ln( -519.37 x ln(q) / t_oxygen ) / 0.03

**Suit pressure**, given oxygen time and exercise.

    P_suit = 14.696 x p_N2(0) x exp(-k x t_oxygen) / R_target

Verified by round trip. Solving for 3 % with no exercise at 4.3 psid gives
72.5 minutes, which puts back through the forward model as 3.00 %.

### 7.1 The trade curve

Fix one lever and a target. The remaining two form a one-parameter family of
solutions, which is the curve the planning panel draws. Sampled at 140 points
and each point verified against the forward model during development.

Holding suit pressure at 4.3 psid for a 3 % target.

| Exercise, mL/kg/min | Prebreathe needed, min |
| --- | --- |
| 0 | 72.5 |
| 5.8 | 60.9 |
| 15 | 46.2 |
| 25 | 34.2 |

---

## 8. What is not known

### 8.1 Carryover between EVAs

No published coefficient exists for EVA. The implementation is a nuclei load
that increments by one per exposure and decays exponentially between them.

    r    = 0.5 ^ (gap_hours / carryHalf)
    L(n) = L(n-1) x r + 1,  L(0) = 0
    C    = 1 + carryPer x L(n) x r

with carryPer = 0.03 and carryHalf = 36 hours, both chosen, not fitted.

The mechanism is well attested even though the magnitude is not. The increased
risk of decompression illness on a second dive is one of the standard
observations that micronuclei theory explains. Microparticles are increased by
repetitive diving, some possess enzyme activity providing nucleation sites, and
they are more numerous in proportion to dive repetition.

The shape across many days is probably not monotonic. Balestra and colleagues,
tracking a week of repeated diving, found venous gas emboli first falling and
then rising, consistent with depletion of a first generation of pre-existing
nuclei followed by inflammation generating a second generation. That is a
U-shape, and this model does not reproduce it.

### 8.2 Lunar dust

No coefficient exists for diffusing capacity lost per unit of inhaled dust. The
slot is present and does nothing at zero. The dose is trackable even where the
response is not, because NASA-STD-3001 [V2 6053] caps lunar dust at 0.3 mg per
cubic metre and [V2 6153] requires exposure records.

### 8.3 The shape of the bubble to diffusing capacity relationship

It is linear here because the evidence supports nothing else, not because
anyone tested it. Thorsen 1995 is a two-group contrast, bubbles present against
absent, which gives one number and no shape. Thorsen 1994 entered accumulated
bubble score, the sum of bubble scores registered precordially, as a plain
linear term with coefficient -0.32.

Physiologically a threshold is more plausible. The lung has large recruitment
reserve, so a small bubble load should be absorbed with little measurable
effect until that reserve is consumed, giving a flat region then a steep rise.
No graded data exists to fit it.

### 8.4 Thorsen 1995 full text

Not obtained. The -5.9 % and -2.8 % figures come from the indexed abstract.
PMID 8574122, no DOI. This is the single most load-bearing unverified number in
the model, since it sets the entire scale of the index.

### 8.5 Applying a group fit to an individual

The Hill functions were fitted as group incidences across 607 chamber
exposures. Reading them as one crew member's likelihood is how they are used
operationally, but it is a different claim from the one the fit supports.

---

## 9. Deliberate omissions

**Measurement repeatability is not modelled.** Excluded at the user's
instruction. For the record, within-subject coefficient of variation for
diffusing capacity is around 5.5 %, and the whole 0 to 100 index spans 3.1 % of
DL_CO, so a single breath-hold pair does not resolve a single exposure. The
index is useful for comparing protocols and for tracking one crew member across
many exposures, not for adjudicating one EVA from one pair of readings.

**No oxygen carried across EVAs.** Hyperoxic exposure from earlier EVAs is
present in both the baseline and the post reading of the current one, so it
cancels in the difference. Only the current EVA's own dose is subtracted.

**Time outside does not affect risk**, only the oxygen dose, as shown in 4.4.

---

## 10. Reference values

Exploration atmosphere, 8.2 psia at 34 % oxygen, suit at 4.3 psid, ambulatory,
no preceding EVAs, 6 hours outside.

| Prebreathe, min | R_rest | R_eff | Index | DCS, % | dDL_CO, % |
| --- | --- | --- | --- | --- | --- |
| 0 | 1.2586 | 1.5157 | 44.2 | 10.63 | -1.371 |
| 15 | 1.2228 | 1.4726 | 39.6 | 8.40 | -1.274 |
| 30 | 1.1880 | 1.4307 | 35.1 | 6.55 | -1.087 |
| 60 | 1.1213 | 1.3504 | 26.3 | 3.82 | -0.816 |
| 72.5 | 1.0953 | 1.3191 | 23.0 | 3.00 | -0.741 |
| 120 | 0.9990 | 1.2031 | 12.3 | 1.08 | -0.380 |

Suit pressure at a fixed 15 minute prebreathe.

| Suit, psid | R_eff | DCS, % |
| --- | --- | --- |
| 3.0 | 2.111 | 60.09 |
| 3.7 | 1.711 | 24.65 |
| 4.3 | 1.473 | 8.40 |
| 4.8 | 1.320 | 3.40 |
| 5.4 | 1.173 | 0.91 |

---

## 11. The gap this addresses

NASA's Human Research Roadmap carries the following as an open gap.

> ExAtm5: We do not know the O2 prebreathe requirements for DCS mitigation from
> the 8.2/34 environment.

The Evidence Report adds that the opportunity exists to mitigate decompression
sickness primarily through engineering controls using the exploration
atmosphere, suit port and variable pressure suit, but that this strategy still
requires validation to ensure it mitigates risk to acceptable levels.

The default protocol in this calculator sits at 8.4 % against NASA's own 3 %
acceptable risk. That is not an error in the model. It is NASA's published
figure for NASA's published protocol, and it is the hole the measurement is
meant to fill.

---

## 12. Sources

Abercromby A H, et al. Fifteen-minute extravehicular activity prebreathe
protocol using NASA's exploration atmosphere, 8.2 psia / 34 % O2.
https://www.nasa.gov/wp-content/uploads/2023/03/abercromby-8.2-34-atm-2015.pdf

Balestra C, et al. Physiology of deep closed circuit rebreather mixed gas
diving, vascular gas emboli and biological changes during a week-long liveaboard
safari. Front Physiol. 2024, 15, 1395846. doi 10.3389/fphys.2024.1395846

Dujic Z, et al. Effect of a single air dive on pulmonary diffusing capacity in
professional divers. J Appl Physiol. 1993.

NASA. Modeling oxygen prebreathe protocols for exploration extravehicular
activities using variable pressure suits. NTRS 20170004350.

NASA. Evidence report, risk of decompression sickness.
https://humanresearchroadmap.nasa.gov/evidence/reports/DCS.pdf

NASA. Evidence report, risk of hypoxia from the exploration atmosphere.
https://humanresearchroadmap.nasa.gov/evidence/reports/ExpAtm.pdf

NASA. Decompression sickness risk mitigation technical brief, OCHMO.
https://www.nasa.gov/wp-content/uploads/2023/03/dcs-technical-brief-ochmo.pdf

NASA TM-100456. Hill model for venous gas emboli and decompression sickness.

Prisk G K, Guy H J B, Elliott A R, Deutschman R A, West J B. Pulmonary
diffusing capacity, capillary blood volume, and cardiac output during sustained
microgravity. J Appl Physiol. 1993, 75(1), 15-26. doi 10.1152/jappl.1993.75.1.15

Thorsen E, et al. Contribution of hyperoxia to reduced pulmonary function after
deep saturation dives. 1993.

Thorsen E, et al. Reduced pulmonary function after saturation dives. Eur Respir
J. 1994, 7, 4-10.

Thorsen E, et al. Pulmonary function after saturation diving, bubbles present
against absent. PMID 8574122. Full text not obtained.
