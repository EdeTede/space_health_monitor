# Variable log

Every quantity the model uses, where it came from, and what it is.

Confidence. **Published** is a figure stated in a peer-reviewed paper or a NASA
document. **Derived** is calculated here from published figures. **Chosen** means
no published value exists and the number was picked.

The last column is the name in `model.js`, for cross-referencing only.

---

## Nitrogen kinetics

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Tissue nitrogen half-time | 360 min at rest | Published | NASA operational single compartment model | How long the body takes to clear half its dissolved nitrogen once breathing pure oxygen. | `tau` |
| Exercise effect on clearance | 0.03 per mL/kg/min | Published | NASA TP-2004-213158, TP-2020-220529 | How much faster nitrogen leaves the tissue when the crew member works rather than rests. | `exerciseK` |
| Sea-level tissue ratio | 0.79 | Published | NASA DCS Evidence Report | The supersaturation everyone carries permanently at sea level, below which there is no decompression dose. | `anchor` |

## Supersaturation to risk

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Bubble formation curve | exponent 3.08, midpoint 0.47 | Published | NASA TM-100456, 34 experiments, N = 607, r = 0.91 | The curve turning tissue supersaturation into the chance gas bubbles appear in venous blood. | `vgeN`, `vgeC` |
| Decompression sickness curve | exponent 4.24, midpoint 2.16 | Published | NASA TM-100456, r = 0.84 | The same transformation but for sickness itself rather than bubbles. | `dcsN`, `dcsC` |
| Ambulation effect | 1.204 times the ratio | Derived | Solved here against NASA NTRS 20170004350 | How much walking raises effective supersaturation, set so the model reproduces NASA's published 8.4 percent for their own protocol. | `amb` |
| Tissue ratio ceiling | 1.65 | Published | NASA operational limit | The supersaturation above which a protocol is not flown whatever else the numbers say. | `rLimit` |
| Acceptable sickness risk | 3.0 % per person per EVA | Published | NASA acceptable risk standard | The decompression sickness probability NASA will accept for one crew member on one EVA. | `dcsAccept` |

## Supersaturation to diffusing capacity

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Bubble effect on diffusing capacity | 3.1 % | Published, **abstract only** | Thorsen 1995, PMID 8574122 | How much transfer factor is lost when bubbles are present rather than absent, which sets the scale of the whole index. | `kBub` |
| Oxygen effect on diffusing capacity | 0.019 % per kPa.day | Published | Thorsen 1994, Eur Respir J 7, 4-10, n = 41, p < 0.001 | How much transfer factor is lost per unit of oxygen exposure, with no bubbles involved. | `kOx` |
| Hyperoxia counting threshold | 21 kPa | Published | Thorsen 1994 | The oxygen pressure above which exposure starts counting, chosen by Thorsen over the conventional 50 kPa. | `oxThr` |
| Reference haemoglobin | 14.6 g/dL | Published | Dujic 1993 | The haemoglobin the correction is anchored to, chosen so the correction is exactly one there. | `hbStd` |
| Haemoglobin correction | (10.22 + Hb) / (1.7 x Hb) | Published | Dujic 1993 | Corrects for carbon monoxide binding to haemoglobin, so a low count does not read as a damaged lung. | `hbFactor` |

## Carryover between EVAs

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Nuclei added per EVA | 0.03 on the ratio | **Chosen** | No published value for EVA | How much one EVA raises the supersaturation the next one starts from, through the bubble seeds it leaves behind. | `carryPer` |
| Nuclei half-life | 36 hours | **Chosen** | No published value for EVA | How fast that seed population disappears between exposures. | `carryHalf` |
| Carryover mechanism | qualitative only | Published | Arieli 2017, Balestra 2024 | Bubbles grow only from pre-existing seeds, repeat exposures raise the seed count, and across a week of diving bubble counts fall then rise. | - |

## Crew member defaults

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Baseline diffusing capacity | 32.00 mL/min/mmHg | Published | Prisk 1993, doi 10.1152/jappl.1993.75.1.15, Table 5 | In-flight transfer factor of four payload crew on flight day 9, which ran 26.5 to 40.3. | `S.pre` |
| Haemoglobin | 13.3 g/dL | Published | Prisk 1993, same four crew | Their measured haemoglobin, which ran 12.2 to 14.3. | `S.hb` |
| Microgravity rise | about 28 % | Published | Prisk 1993, Prisk 2019 | Transfer factor rises by roughly a quarter in weightlessness and stays up, so the in-flight baseline is not the ground one. | - |

## Atmosphere and suit

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Habitat pressure | 8.2 psia | Published | NASA Exploration Atmosphere | The cabin pressure chosen for exploration missions specifically to shorten prebreathe. | `S.habP` |
| Habitat oxygen fraction | 34 % | Published | NASA, revised from 8.0 / 32 in 2012 | The oxygen fraction that goes with it, raised to cut hypoxic stress without changing decompression risk. | `S.habFO2` |
| Tissue nitrogen in that habitat | 5.4 psi | Published | NASA Evidence Report, Risk of Hypoxia from the Exploration Atmosphere | The dissolved nitrogen a crew member carries there, against 11.6 psi in a 14.7 psia cabin. | derived |
| Suit pressure | 4.3 psid | Published | EMU operating pressure | What the current suit runs at, which is what creates the supersaturation on exit. | `S.sp` |
| Variable suit range | 3.7 to 8.2 psia | Published | NASA Evidence Report | The range a suitport-compatible variable pressure suit is proposed to cover. | slider range |
| Suit option for 8.2 / 34 | 5.65 to 5.90 psid | Published | NASA OCHMO DCS technical brief | The suit pressure NASA lists as removing the prebreathe requirement for this atmosphere entirely. | - |
| Reference protocol | 15 min prebreathe | Published | Abercromby et al. 2015 | The in-suit oxygen prebreathe modelled for the exploration atmosphere. | default |
| Its predicted risk | 8.4 % | Published | NASA NTRS 20170004350 | NASA's own sickness estimate for that protocol with a 6 hour EVA at 4.3 psi. | calibration target |

## Lunar dust

| Quantity | Value | Confidence | Source | What it is | In code |
| --- | --- | --- | --- | --- | --- |
| Dust damage coefficient | none exists | **Chosen, left at zero** | No published value | How much transfer factor is lost per unit of inhaled dust, which nobody has measured. | `S.kDust` |
| Dust exposure limit | 0.3 mg/m3 | Published | NASA-STD-3001 [V2 6053] | The lunar dust concentration limit, so the dose can be tracked even where the response cannot. | - |
| Dust exposure records | required | Published | NASA-STD-3001 [V2 6153] | The standard requires exposure to be recorded, so the input exists operationally. | - |

## Physical constants

| Quantity | Value | Confidence | What it is | In code |
| --- | --- | --- | --- | --- |
| Standard atmosphere | 14.696 psia | Definition | Standard atmosphere in pounds per square inch. | `ATM` |
| Standard atmosphere | 101.325 kPa | Definition | Standard atmosphere in kilopascals. | `KPA` |

---

## The four weakest points

1. **The bubble effect on diffusing capacity rests on an abstract.** Thorsen 1995
   full text has not been obtained. The minus 5.9 and minus 2.8 percent figures come
   from the PubMed record. This one number sets the scale of the entire index.
2. **Carryover is invented.** Both carryover constants were chosen, not fitted. The
   mechanism is well attested, the magnitude is not.
3. **The bubble to diffusing capacity relationship is assumed linear.** Thorsen 1995
   is a two-group contrast which supports no shape at all, and a threshold form is
   physiologically more plausible.
4. **Group fits are read as individual probabilities.** The Hill curves were fitted
   across 607 chamber exposures as population incidences.

---

## Not yet retrieved

| Item | Identifier | Why it matters |
| --- | --- | --- |
| Thorsen 1995 full text | PMID 8574122, no DOI | Would confirm or correct the bubble effect, the most load-bearing number here. |
| Shykoff 2014 | PMID 25109082 | More repeated hyperoxic exposure data for the oxygen arm. |
| NASA TM-100456 Update | October 1990, not in NTRS | The revision of the Hill fit this model is built on. |
| Doppler grade to bubble count mapping | - | Would let graded bubble data test the linearity assumption. |
