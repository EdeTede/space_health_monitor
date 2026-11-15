/* =====================================================================
   EVA DECOMPRESSION RISK MODEL
   Every constant, equation and assumption. Nothing else depends on the
   interface, so this file can be lifted out and used on its own.
   Full derivation and sources are in DOCUMENTATION.md
   ===================================================================== */

var ATM = 14.696;    /* psia per standard atmosphere */
var KPA = 101.325;   /* kPa per standard atmosphere */

var K = {
  /* --- nitrogen kinetics --- */
  tau:       519.37,  /* min. single compartment time constant. 360 min half-time at rest */
  exerciseK: 0.03,    /* per mL/kg/min. exponent on metabolic rate in the rate constant   */

  /* --- supersaturation to risk --- */
  anchor:    0.79,    /* tissue ratio at sea level. zero decompression dose               */
  vgeN:      3.08,    /* Hill exponent, venous gas emboli                                 */
  vgeC:      0.47,    /* Hill constant, venous gas emboli                                 */
  dcsN:      4.24,    /* Hill exponent, decompression sickness                            */
  dcsC:      2.16,    /* Hill constant, decompression sickness                            */
  amb:       1.2043,  /* ambulation multiplier on the tissue ratio                        */

  /* --- supersaturation to diffusing capacity --- */
  kBub:      3.1,     /* % DLCO lost per unit venous gas emboli likelihood                */
  kOx:       0.019,   /* % DLCO lost per kPa.day of hyperoxic exposure                    */
  oxThr:     21,      /* kPa. oxygen pressure above which exposure counts                 */
  hbStd:     14.6,    /* g/dL. haemoglobin the correction is referenced to                */

  /* --- carryover between exposures. no published value for EVA --- */
  carryPer:  0.03,    /* ratio multiplier added per preceding EVA                         */
  carryHalf: 36,      /* hours. half-life of the nuclei population                        */

  /* --- operational limits --- */
  rLimit:    1.65,    /* tissue ratio ceiling. a plan above this is not flown             */
  dcsAccept: 3.0      /* % per person per EVA. NASA acceptable risk                       */
};

/* rate constant for nitrogen washout at a given metabolic rate */
function rateConstant(vo2){ return Math.exp(K.exerciseK*vo2)/K.tau; }

/* Hill transforms. R is the effective tissue ratio. */
function hillVGE(R){ var x=Math.max(0,R-K.anchor), y=Math.pow(x,K.vgeN); return 100*y/(y+K.vgeC); }
function hillDCS(R){ var x=Math.max(0,R-K.anchor), y=Math.pow(x,K.dcsN); return 100*y/(y+K.dcsC); }
function hillVGEinv(p){ p=Math.min(99.99,Math.max(1e-9,p))/100;
  return K.anchor+Math.pow(K.vgeC*p/(1-p),1/K.vgeN); }
function hillDCSinv(d){ d=Math.min(99.99,Math.max(1e-9,d))/100;
  return K.anchor+Math.pow(K.dcsC*d/(1-d),1/K.dcsN); }

/* haemoglobin correction factor, 1.0 at the standard */
function hbFactor(hb){ return (10.22+hb)/(1.7*hb); }

/* carryover multiplier after n preceding EVAs spaced gapHours apart */
function carryover(n,gapHours){
  if(!n||n<=0) return 1;
  var r=Math.pow(0.5,gapHours/K.carryHalf), load=0;
  for(var i=0;i<n;i++) load=load*r+1;
  return 1+K.carryPer*load*r;
}

/* ---------------------------------------------------------------------
   FORWARD MODEL
   p = { habP, habFO2, suitP, prebreathe, exercise, decompress, outside,
         ambulatory, priorEVAs, gapHours }
   pressures in psia, times in minutes, exercise in mL/kg/min
   --------------------------------------------------------------------- */
function forward(p){
  var pHab=p.habP/ATM, pSuit=p.suitP/ATM;
  var k=rateConstant(p.exercise);

  /* tissue is equilibrated with the habitat before anything starts */
  var pN2 = pHab*(1-p.habFO2);

  /* total time on oxygen before the suit reaches operating pressure.
     prebreathe and decompression are identical in effect, because
     inspired nitrogen is zero throughout both. */
  var tOxygen = p.prebreathe + p.decompress;
  pN2 *= Math.exp(-k*tOxygen);

  var Rrest = pN2/pSuit;
  var Reff  = Rrest * (p.ambulatory?K.amb:1) * carryover(p.priorEVAs,p.gapHours);

  /* hyperoxic dose. habitat pressure during prebreathe and decompression,
     suit pressure while outside, all on oxygen. */
  var H = Math.max(0,pHab*KPA-K.oxThr)*(tOxygen/1440)
        + Math.max(0,pSuit*KPA-K.oxThr)*(p.outside/1440);

  var vge=hillVGE(Reff), dcs=hillDCS(Reff);
  return { Rrest:Rrest, Reff:Reff, H:H, vge:vge, dcs:dcs,
           dBubble:-K.kBub*vge/100, dOxygen:-K.kOx*H,
           dDLCO:-(K.kBub*vge/100 + K.kOx*H) };
}

/* ---------------------------------------------------------------------
   INVERSE MODEL
   m = { pre, post, hb, dust, kDust }
   --------------------------------------------------------------------- */
function inverse(p,m){
  var f=forward(p);
  var dPct = m.pre>0 ? 100*(m.post-m.pre)/m.pre : 0;
  var rising = m.post>m.pre;
  var corrected = dPct*(hbFactor(m.hb)/hbFactor(K.hbStd));
  var explained = K.kOx*f.H + (m.kDust||0)*(m.dust||0);
  var residual  = -(corrected+explained);
  var vge = rising?0:Math.min(100,Math.max(0,100*residual/K.kBub));
  return { forward:f, dPct:dPct, rising:rising, corrected:corrected,
           explained:explained, residual:residual,
           vge:vge, dcs:hillDCS(hillVGEinv(vge)),
           usable:f.vge>=1, factor:f.vge>=1?vge/f.vge:NaN };
}

/* ---------------------------------------------------------------------
   SOLVERS. all closed form. see DOCUMENTATION.md section 6.
   --------------------------------------------------------------------- */
/* resting tissue ratio that produces the wanted DCS probability.
   factor is the crew member's measured bubble burden relative to the model,
   expressed on the venous gas emboli likelihood. factor 1 is the model alone.
      person VGE  = factor x model VGE
      person DCS  = hillDCS( hillVGEinv( person VGE ) )
   setting that equal to the target and rearranging gives the line below. */
function restingRatioFor(targetDCS,p,factor){
  var f=factor||1;
  var vgeWanted = hillVGE(hillDCSinv(targetDCS))/f;
  return hillVGEinv(Math.min(99.9,vgeWanted))
         /((p.ambulatory?K.amb:1)*carryover(p.priorEVAs,p.gapHours));
}
/* what this crew member actually experiences on a protocol built for the average */
function experiencedDCS(modelVGE,factor){
  return hillDCS(hillVGEinv(Math.min(99.9,modelVGE*(factor||1))));
}
/* oxygen time needed, given exercise and suit pressure */
function oxygenTimeFor(targetDCS,p,exercise,suitP,factor){
  var q = restingRatioFor(targetDCS,p,factor)*(suitP/ATM)/((p.habP/ATM)*(1-p.habFO2));
  if(q>=1) return 0;
  return -Math.log(q)/rateConstant(exercise);
}
/* exercise needed, given oxygen time and suit pressure */
function exerciseFor(targetDCS,p,tOxygen,suitP,factor){
  var q = restingRatioFor(targetDCS,p,factor)*(suitP/ATM)/((p.habP/ATM)*(1-p.habFO2));
  if(q>=1) return 0;
  if(tOxygen<=0) return Infinity;
  return Math.log(-K.tau*Math.log(q)/tOxygen)/K.exerciseK;
}
/* suit pressure needed, given oxygen time and exercise */
function suitPressureFor(targetDCS,p,tOxygen,exercise,factor){
  return ATM*((p.habP/ATM)*(1-p.habFO2))*Math.exp(-rateConstant(exercise)*tOxygen)
         /restingRatioFor(targetDCS,p,factor);
}
