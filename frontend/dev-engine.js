/* Shared developer configuration. Expressions are parsed, never evaluated as JavaScript. */
(function(root){
  'use strict';
  const KEY='kiwinaut-developer-v1',copy=x=>JSON.parse(JSON.stringify(x));
  const constants=copy(root.K);
  const definitions=[
    ['rate','Nitrogen elimination rate','1/min','exp(exerciseK * vo2) / tau',['vo2']],
    ['vge','VGE transform','%','100 * pow(max(0, R - anchor), vgeN) / (pow(max(0, R - anchor), vgeN) + vgeC)',['R']],
    ['dcs','DCS transform','%','100 * pow(max(0, R - anchor), dcsN) / (pow(max(0, R - anchor), dcsN) + dcsC)',['R']],
    ['vgeInverse','Inverse VGE transform','ratio','anchor + pow((vgeC * p / 100) / (1 - p / 100), 1 / vgeN)',['p']],
    ['dcsInverse','Inverse DCS transform','ratio','anchor + pow((dcsC * p / 100) / (1 - p / 100), 1 / dcsN)',['p']],
    ['hb','Haemoglobin correction','factor','(10.22 + hb) / (1.7 * hb)',['hb']],
    ['carryDecay','Carryover decay','fraction','pow(0.5, gapHours / carryHalf)',['gapHours']],
    ['carryStep','Accumulated prior-exposure load','index','load * decay + 1',['load','decay']],
    ['carry','Carryover multiplier','factor','1 + carryPer * load * decay',['load','decay']],
    ['initialN2','Initial tissue nitrogen','atm','habP / ATM * (1 - habFO2)',['habP','habFO2']],
    ['oxygenTime','Total oxygen time','min','prebreathe + decompress',['prebreathe','decompress']],
    ['remainingN2','Remaining tissue nitrogen','atm','initialN2 * exp(-rate * oxygenTime)',['initialN2','rate','oxygenTime']],
    ['Rrest','Resting tissue ratio','ratio','remainingN2 / (suitP / ATM)',['remainingN2','suitP']],
    ['Reff','Effective tissue ratio','ratio','Rrest * (1 + ambulatory * (amb - 1)) * carry',['Rrest','ambulatory','carry']],
    ['H','Hyperoxic exposure','kPa.day','max(0, habP / ATM * KPA - oxThr) * oxygenTime / 1440 + max(0, suitP / ATM * KPA - oxThr) * outside / 1440',['habP','suitP','oxygenTime','outside']],
    ['dBubble','Bubble-related DLCO change','%','-kBub * vge / 100',['vge']],
    ['dOxygen','Oxygen-related DLCO change','%','-kOx * H',['H']],
    ['dDLCO','Combined predicted DLCO change','%','dBubble + dOxygen',['dBubble','dOxygen']],
    ['dPct','Observed DLCO change','%','100 * (post - pre) / pre',['post','pre']],
    ['corrected','Hb-corrected DLCO change','%','dPct * hbFactor / standardHbFactor',['dPct','hbFactor','standardHbFactor']],
    ['explained','Explained DLCO change','%','kOx * H + kDust * dust',['H','kDust','dust']],
    ['residual','Residual DLCO change','%','-(corrected + explained)',['corrected','explained']],
    ['inverseVGE','Inferred VGE','%','min(100, max(0, 100 * residual / kBub))',['residual']],
    ['factor','Personal factor','ratio','vge / predictedVGE',['vge','predictedVGE']],
    ['restingRatio','Target resting ratio','ratio','inverseVGE / ((1 + ambulatory * (amb - 1)) * carry)',['inverseVGE','ambulatory','carry']],
    ['q','Solver nitrogen fraction','fraction','targetRatio * (suitP / ATM) / ((habP / ATM) * (1 - habFO2))',['targetRatio','suitP','habP','habFO2']],
    ['solveOxygen','Required oxygen time','min','-log(q) / rate',['q','rate']],
    ['solveExercise','Required exercise','mL/kg/min','log(-tau * log(q) / oxygenTime) / exerciseK',['q','oxygenTime']],
    ['solvePressure','Required suit pressure','psia','ATM * (habP / ATM) * (1 - habFO2) * exp(-rate * oxygenTime) / targetRatio',['habP','habFO2','rate','oxygenTime','targetRatio']]
  ].map(([id,label,unit,expression,variables])=>({id,label,unit,expression,variables}));
  const functions={exp:Math.exp,log:Math.log,pow:Math.pow,min:Math.min,max:Math.max,abs:Math.abs,sqrt:Math.sqrt};
  function parse(source,allowed){
    if(typeof source!=='string'||source.length>1200)throw Error('Expression must contain at most 1,200 characters.');
    const tokens=[];let pos=0;
    while(pos<source.length){const m=/^\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z_0-9]*)|([+\-*/^(),]))/.exec(source.slice(pos));if(!m){if(!source.slice(pos).trim())break;throw Error('Unsupported syntax at character '+(pos+1));}tokens.push(m[1]?{n:Number(m[1])}:{v:m[2]||m[3]});pos+=m[0].length;}
    let i=0,depth=0;const peek=()=>tokens[i]?.v,consume=v=>{if(peek()!==v)throw Error('Expected '+v);i++;};
    function expr(min=0){if(++depth>60)throw Error('Expression is too deeply nested.');let left;const tok=tokens[i++];if(!tok)throw Error('Incomplete expression.');
      if(tok.n!==undefined)left=()=>tok.n;
      else if(tok.v==='-'||tok.v==='+'){const a=expr(25);left=env=>tok.v==='-'?-a(env):a(env);}
      else if(tok.v==='('){left=expr();consume(')');}
      else if(Object.hasOwn(functions,tok.v)&&peek()==='('){i++;const args=[expr()];while(peek()===','){i++;args.push(expr());}consume(')');const count=tok.v==='pow'?2:['min','max'].includes(tok.v)?null:1;if(count&&args.length!==count)throw Error(tok.v+' expects '+count+' argument(s).');left=env=>functions[tok.v](...args.map(a=>a(env)));}
      else if(allowed.includes(tok.v))left=env=>env[tok.v];else throw Error('Unknown variable or function: '+tok.v);
      while(true){const op=peek(),precedence={'+':10,'-':10,'*':20,'/':20,'^':30}[op];if(precedence===undefined||precedence<min)break;i++;const right=expr(precedence+(op==='^'?0:1)),a=left;left=env=>{const x=a(env),y=right(env);return op==='+'?x+y:op==='-'?x-y:op==='*'?x*y:op==='/'?x/y:Math.pow(x,y);};}depth--;return left;
    }
    const fn=expr();if(i!==tokens.length)throw Error('Unexpected token.');return env=>{const n=fn(env);if(!Number.isFinite(n))throw Error('Expression returned a non-finite result.');return n;};
  }
  const defaults={version:1,constants,expressions:Object.fromEntries(definitions.map(d=>[d.id,d.expression])),tasks:[]};
  let active=copy(defaults),compiled={},lastError='';
  function validate(config){
    if(config?.version!==1)throw Error('Unsupported configuration version.');
    const c={version:1,constants:{},expressions:{},tasks:[]},fns={};
    for(const key of Object.keys(constants)){const value=config.constants?.[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>10000||(['tau','exerciseK','vgeN','vgeC','dcsN','dcsC','carryHalf','hbStd','kBub'].includes(key)&&value===0))throw Error('Invalid constant '+key);c.constants[key]=value;}
    for(const d of definitions){const expression=config.expressions?.[d.id];fns[d.id]=parse(expression,[...Object.keys(constants),'ATM','KPA',...d.variables]);c.expressions[d.id]=expression;}
    if(!Array.isArray(config.tasks))throw Error('Tasks must be an array.');
    const seen=new Set();for(const t of config.tasks){if(!root.MissionPlanner?.catalog.some(x=>x.id===t.id)||seen.has(t.id))throw Error('Unknown or duplicate task ID: '+t.id);seen.add(t.id);
      if(!['EVA','Preparation','Medical','Recovery','Operations','Exercise','Science'].includes(t.category))throw Error('Invalid task category.');
      for(const [key,min,max] of [['duration',5,1440],['stress',-50,50],['hr',-30,150],['vo2',0,50]])if(key!=='vo2'||t.oxygen){if(!Number.isFinite(t[key])||t[key]<min||t[key]>max)throw Error('Invalid '+key+' for '+t.id);}
      if(!Number.isInteger(t.duration)||typeof t.oxygen!=='boolean'||!t.name?.trim()||t.name.length>120||typeof t.effect!=='string'||t.effect.length>800)throw Error('Invalid task specification: '+t.id);
      let url;try{url=new URL(t.source);}catch{throw Error('Task source must be an HTTPS URL.');}if(url.protocol!=='https:')throw Error('Task source must use HTTPS.');
      c.tasks.push({id:t.id,name:t.name,category:t.category,duration:t.duration,stress:t.stress,hr:t.hr,oxygen:t.oxygen,vo2:t.oxygen?t.vo2:0,effect:t.effect,source:t.source});
    }return {config:c,fns};
  }
  function install(config){const v=validate(config);active=v.config;compiled=v.fns;Object.assign(root.K,active.constants);if(root.MissionPlanner){for(const t of originalTasks)Object.assign(root.MissionPlanner.task(t.id),copy(t));for(const t of active.tasks)Object.assign(root.MissionPlanner.task(t.id),t);}return copy(active);}
  function value(id,vars){try{return compiled[id]({...root.K,ATM:root.ATM,KPA:root.KPA,...vars});}catch(e){throw Error(id+': '+e.message);}}
  const originalTasks=[];
  function attachTasks(){if(!originalTasks.length)originalTasks.push(...copy(root.MissionPlanner.catalog));}
  function load(){try{const raw=root.localStorage?.getItem(KEY);install(raw?JSON.parse(raw):defaults);smoke();lastError='';}catch(e){install(defaults);lastError=e.message;}return lastError;}
  function apply(config){const before=copy(active);try{install(config);smoke();root.localStorage.setItem(KEY,JSON.stringify(active));lastError='';}catch(e){install(before);throw e;}root.dispatchEvent?.(new Event('kiwinaut-dev-change'));}
  function trace(p){
    const v={...p,ambulatory:p.ambulatory?1:0};const steps=[];const add=(id,vars=v)=>{v[id]=value(id,vars);steps.push({id,value:v[id],expression:active.expressions[id]});};
    v.rate=p.effectiveRate??root.rateConstant(p.exercise);steps.push({id:'rate',value:v.rate,expression:active.expressions.rate});v.carry=root.carryover(p.priorEVAs,p.gapHours);
    for(const id of ['initialN2','oxygenTime','remainingN2','Rrest','Reff','H'])add(id);
    v.vge=root.hillVGE(v.Reff);v.dcs=root.hillDCS(v.Reff);steps.push({id:'vge',value:v.vge,expression:active.expressions.vge},{id:'dcs',value:v.dcs,expression:active.expressions.dcs});
    for(const id of ['dBubble','dOxygen','dDLCO'])add(id);
    if(v.vge<0||v.vge>100||v.dcs<0||v.dcs>100||v.remainingN2<0||v.H<0)throw Error('Model output is outside its physical/probability bounds.');
    return {result:Object.fromEntries(['Rrest','Reff','H','vge','dcs','dBubble','dOxygen','dDLCO'].map(k=>[k,v[k]])),steps};
  }
  root.rateConstant=vo2=>value('rate',{vo2});root.hillVGE=R=>value('vge',{R});root.hillDCS=R=>value('dcs',{R});
  root.hillVGEinv=p=>value('vgeInverse',{p:Math.min(99.99,Math.max(1e-9,p))});root.hillDCSinv=p=>value('dcsInverse',{p:Math.min(99.99,Math.max(1e-9,p))});root.hbFactor=hb=>value('hb',{hb});
  root.carryover=(n,gapHours)=>{if(!n||n<=0)return 1;const decay=value('carryDecay',{gapHours});let load=0;for(let i=0;i<n;i++)load=value('carryStep',{load,decay});return value('carry',{load,decay});};
  root.forward=p=>trace(p).result;
  root.inverse=(p,m)=>{const f=root.forward(p),dPct=m.pre>0?value('dPct',m):0,rising=m.post>m.pre,corrected=value('corrected',{dPct,hbFactor:root.hbFactor(m.hb),standardHbFactor:root.hbFactor(root.K.hbStd)}),explained=value('explained',{H:f.H,kDust:m.kDust||0,dust:m.dust||0}),residual=value('residual',{corrected,explained}),vge=rising?0:value('inverseVGE',{residual});return {forward:f,dPct,rising,corrected,explained,residual,vge,dcs:root.hillDCS(root.hillVGEinv(vge)),usable:f.vge>=1,factor:f.vge>=1?value('factor',{vge,predictedVGE:f.vge}):NaN};};
  root.restingRatioFor=(target,p,factor)=>value('restingRatio',{inverseVGE:root.hillVGEinv(Math.min(99.9,root.hillVGE(root.hillDCSinv(target))/(factor||1))),ambulatory:p.ambulatory?1:0,carry:root.carryover(p.priorEVAs,p.gapHours)});
  const solverQ=(target,p,suitP,factor)=>value('q',{targetRatio:root.restingRatioFor(target,p,factor),suitP,habP:p.habP,habFO2:p.habFO2});
  root.oxygenTimeFor=(target,p,exercise,suitP,factor)=>{const q=solverQ(target,p,suitP,factor);return q>=1?0:value('solveOxygen',{q,rate:root.rateConstant(exercise)});};
  root.exerciseFor=(target,p,oxygenTime,suitP,factor)=>{const q=solverQ(target,p,suitP,factor);return q>=1?0:oxygenTime<=0?Infinity:value('solveExercise',{q,oxygenTime});};
  root.suitPressureFor=(target,p,oxygenTime,exercise,factor)=>value('solvePressure',{habP:p.habP,habFO2:p.habFO2,rate:root.rateConstant(exercise),oxygenTime,targetRatio:root.restingRatioFor(target,p,factor)});
  function smoke(){for(const exercise of [0,5.8,25])for(const prebreathe of [0,60,240]){const p={habP:14.7,habFO2:.21,suitP:4.3,prebreathe,exercise,decompress:30,outside:360,ambulatory:false,priorEVAs:1,gapHours:24};trace(p);root.inverse(p,{pre:32,post:31,hb:13.3,dust:0,kDust:0});for(const target of [1,3,15]){root.oxygenTimeFor(target,p,exercise,4.3,1);root.exerciseFor(target,p,120,4.3,1);root.suitPressureFor(target,p,120,exercise,1);}}}
  function preview(config,p){const before=copy(active);try{install(config);smoke();return trace(p);}finally{install(before);}}
  root.DevConfig={KEY,definitions,defaults:()=>copy(defaults),current:()=>copy(active),originalTasks:()=>copy(originalTasks),parse,validate,install,apply,load,attachTasks,trace,preview,get error(){return lastError;}};
  install(defaults);
})(globalThis);
