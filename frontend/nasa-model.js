/* Source-backed NASA reference scenarios + published BGI probability transform.
   This is NOT an implementation of the unavailable tissue-bubble dynamics solver. */
(function(root){
  'use strict';
  const KEY='kiwinaut-nasa-v1';
  const source='https://ntrs.nasa.gov/api/citations/20170004350/downloads/20170004350.pdf';
  const regressionSource='https://ntrs.nasa.gov/api/citations/20140000417/downloads/20140000417.pdf';
  const defaults={version:1,b0:-3.477,b1:0.0499,expression:'100 / (1 + exp(-(b0 + b1 * BGI)))'};
  const cases=[
    {id:'case1',name:'Case 1 · exploration atmosphere',habP:8.2,habFO2:.34,pb:15,pbPressure:6,oxygen:.95,dcs:8.4,page:9,outside:360,stages:[{minutes:360,pressure:4.3}],description:'360 min at 4.3 psia'},
    {id:'case2',name:'Case 2 · two pressure stages',habP:14.7,habFO2:.21,pb:120,pbPressure:14.7,oxygen:.95,dcs:8.5,page:10,outside:360,stages:[{minutes:240,pressure:8.2},{minutes:120,pressure:4.3}],description:'240 min at 8.2 → 120 min at 4.3 psia'},
    {id:'case3',name:'Case 3 · three pressure stages',habP:14.7,habFO2:.21,pb:120,pbPressure:14.7,oxygen:.95,dcs:8.4,page:11,outside:360,stages:[{minutes:180,pressure:8.2},{minutes:120,pressure:6},{minutes:60,pressure:4.3}],description:'180 min at 8.2 → 120 min at 6.0 → 60 min at 4.3 psia'},
    {id:'case4',name:'Case 4 · intermittent recompression',habP:14.7,habFO2:.21,pb:120,pbPressure:14.7,oxygen:.95,dcs:7.9,page:12,outside:390,stages:[{minutes:180,pressure:8.2},{minutes:60,pressure:6},{minutes:15,pressure:8.2},{minutes:60,pressure:6},{minutes:15,pressure:8.2},{minutes:60,pressure:4.3}],description:'Case 3 + two 15 min recompressions at 8.2 psia (390 min elapsed in slide 12)'}
  ];
  cases.forEach(c=>{c.stages.forEach(Object.freeze);Object.freeze(c.stages);Object.freeze(c);});Object.freeze(cases);
  let settings={...defaults},fn,error='';
  function validate(c){if(c?.version!==1||!Number.isFinite(c.b0)||Math.abs(c.b0)>100||!Number.isFinite(c.b1)||c.b1<=0||c.b1>10)throw Error('Use a finite intercept (−100…100) and positive slope (≤10).');const parsed=root.DevConfig.parse(c.expression,['b0','b1','BGI']);for(const BGI of [0,1,20,100,1000]){const r=parsed({b0:c.b0,b1:c.b1,BGI});if(r<0||r>100)throw Error('DCS probability must be within 0–100%.');}return {config:{version:1,b0:c.b0,b1:c.b1,expression:c.expression},parsed};}
  function install(c){const v=validate(c);settings=v.config;fn=v.parsed;}
  function load(){try{const raw=root.localStorage?.getItem(KEY);install(raw?JSON.parse(raw):defaults);error='';}catch(e){install(defaults);error=e.message;}return error;}
  function apply(c){const v=validate(c);root.localStorage.setItem(KEY,JSON.stringify(v.config));settings=v.config;fn=v.parsed;error='';}
  function probability(BGI,c){if(!Number.isFinite(BGI)||BGI<0||BGI>1000)throw Error('Enter an independently obtained BGI between 0 and 1,000.');const r=c?validate(c).parsed({b0:c.b0,b1:c.b1,BGI}):fn({...settings,BGI});if(!Number.isFinite(r)||r<0||r>100)throw Error('Invalid probability.');return r;}
  function legacyProfile(c){return {habP:c.habP,habFO2:c.habFO2,suitP:4.3,prebreathe:c.pb,decompress:0,exercise:0,outside:c.outside,ambulatory:false,priorEVAs:0,gapHours:0};}
  // Solve with actual active forward equations, not stale closed-form inverses.
  // One-minute resolution, bounded search; the first sampled solution is reported.
  function preparation(p,target,{additional=false,limit=1440}={}){
    if(!Number.isFinite(target)||target<=0||target>=100)throw Error('Risk target must be between 0 and 100%.');
    const total=p.prebreathe+p.decompress,baseRate=p.effectiveRate??root.rateConstant(p.exercise);
    for(let minutes=0;minutes<=limit;minutes++){
      const q=additional?{...p,prebreathe:p.prebreathe+minutes,effectiveRate:total+minutes?(baseRate*total+root.rateConstant(0)*minutes)/(total+minutes):root.rateConstant(0)}:{...p,prebreathe:minutes,decompress:0,exercise:0,effectiveRate:root.rateConstant(0)};
      const risk=root.forward(q).dcs;if(!Number.isFinite(risk))throw Error('Existing model returned a non-finite risk.');
      if(risk<=target)return {minutes,risk,total:additional?total+minutes:minutes};
    }return null;
  }
  function compareCase(c,target){const p=legacyProfile(c),existing=root.forward(p).dcs,required=preparation(p,target),equalRisk=preparation(p,c.dcs);return {existing,difference:existing-c.dcs,required,equalRisk,nasaMeetsTarget:c.dcs<=target,nasaMinutes:c.dcs<=target?c.pb:null};}
  root.NasaRisk={KEY,source,regressionSource,cases,defaults:()=>({...defaults}),current:()=>({...settings}),validate,load,apply,probability,legacyProfile,preparation,compareCase,get error(){return error;},get modified(){return JSON.stringify(settings)!==JSON.stringify(defaults);}};
  load();
})(globalThis);
