/* EVKIWI crew health core: sample crew data, DRI scoring (Decompress rules), week plan,
   recommendations that rewrite the calendar, shared state, simple SVG charts.
   All numbers are illustrative sample data, not crew measurements. */
(function(root){
'use strict';
const KEY='evkiwi-crew-v1',SESSION='evkiwi-role',LEGACY_SESSION='evkiwi-session';
const DEMO_PIN='2026';
const CREW=[
  {id:'lee',name:'Jiaqi Chen',first:'Jiaqi',role:'Commander',initials:'JC',evaDay:3},
  {id:'rivera',name:'Marco Duchamp',first:'Marco',role:'Flight engineer',initials:'MD',evaDay:3},
  {id:'chen',name:'Eduard Dante',first:'Eduard',role:'Science officer',initials:'ED',evaDay:4}
];
const PLANNER={id:'morgan',name:'Morgan Bettre',first:'Morgan',role:'Mission planner',initials:'MB',kind:'planner',crew:'lee'};
const PLANNER_MED={id:'riley',name:'Med Evikiwi',first:'Med',role:'Mission ops',initials:'ME',kind:'planner',crew:'lee'};
const PLANNERS=[PLANNER,PLANNER_MED];
/* sample readings per crew member */
const SAMPLE={
  lee:{dlco:[-0.8,-1.5,-1.1,-2.0,-1.2],bone:{now:98.6,landing:97.9},hr:[62,64,61,63,66,65,64],hrv:[68,66,70,64,61,63,65],water:1900,bub:0,rad:92},
  rivera:{dlco:[-2.0,-3.5,-5.2,-6.8,-8.4],bone:{now:97.4,landing:95.8},hr:[68,71,73,72,75,74,76],hrv:[58,54,52,50,47,49,46],water:1250,bub:1,rad:104},
  chen:{dlco:[-3.0,-5.8,-8.9,-11.2,-13.1],bone:{now:96.8,landing:94.9},hr:[59,63,66,69,71,72,74],hrv:[64,57,52,46,42,40,38],water:1000,bub:2,rad:131}
};
const DLCO_TESTS=['d32','d60','d88','d120','d148'];
const MISSION_DAY=150,MISSION_LEN=210,WATER_GOAL=2500,RAD_BUDGET=250,BONE_TARGET=97;
const SYMPTOMS=[['joint','Joint pain'],['itch','Itch · skin'],['fatigue','Fatigue'],['chokes','Chokes · breathing']];
const LEVEL={green:{word:'Ready',color:'#5ef0c2',name:'GREEN'},yellow:{word:'Caution',color:'#ffc857',name:'YELLOW'},orange:{word:'Rest',color:'#ff8a3d',name:'ORANGE'},red:{word:'Rest',color:'#ff5d6c',name:'RED'}};

/* ---------- state (browser-local) ---------- */
let mem=null;
function blank(){return{v:1,crew:Object.fromEntries(CREW.map(c=>[c.id,{recs:{},feel:null}]))}}
function load(){if(mem)return mem;try{const s=JSON.parse(localStorage.getItem(KEY));mem=s&&s.v===1&&s.crew?s:blank()}catch{mem=blank()}
  for(const c of CREW)mem.crew[c.id]??={recs:{},feel:null};return mem}
function save(){try{localStorage.setItem(KEY,JSON.stringify(mem))}catch{}}
function reset(){mem=blank();save()}
function cs(id){return load().crew[id]}

/* ---------- session (shared with the main flow at /index.html) ---------- */
function getSession(){try{const s=JSON.parse(localStorage.getItem(SESSION));if(s&&((s.kind==='planner'&&PLANNERS.some(p=>p.id===s.id))||CREW.some(c=>c.id===s.id)))return s}catch{}return null}
function setSession(s){try{localStorage.setItem(SESSION,JSON.stringify(s))}catch{}
  try{sessionStorage.setItem(LEGACY_SESSION,JSON.stringify({id:s.id,name:s.name,role:s.role,kind:s.kind,crew:s.kind==='planner'?(s.crew||'lee'):s.id}))}catch{}}
function clearSession(){try{localStorage.removeItem(SESSION)}catch{}try{sessionStorage.removeItem(LEGACY_SESSION)}catch{}}
function signInAstronaut(id){const c=CREW.find(x=>x.id===id);if(!c)return null;const s={kind:'astronaut',id:c.id,name:c.name,role:c.role};setSession(s);return s}
function signInPlannerId(id){const p=PLANNERS.find(x=>x.id===id);if(!p)return null;const s={kind:'planner',id:p.id,name:p.name,role:p.role,crew:p.crew||'lee'};setSession(s);return s}
function signInPlanner(pin){if(String(pin).trim()!==DEMO_PIN)return null;return signInPlannerId(PLANNER.id)}

/* ---------- health + DRI score (same thresholds as the Decompress view) ---------- */
function feel(id){return cs(id).feel||{symptoms:[],water:SAMPLE[id].water}}
function metrics(id){const s=SAMPLE[id],f=feel(id);
  return{...s,dlcoNow:s.dlco[s.dlco.length-1],water:f.water,hydration:Math.round(Math.min(100,f.water/WATER_GOAL*100)),symptoms:f.symptoms||[]}}
function score(id){
  const m=metrics(id),drop=Math.max(0,-m.dlcoNow),parts=[];let s=8;
  const add=(label,v,push)=>{s+=v;parts.push({label,v:Math.round(v),push:!!push||v>=8})};
  if(drop<=0)add('DLCO at baseline',0);else if(drop<5)add(`DLCO −${drop.toFixed(1)}%`,drop*2.2);else if(drop<=10)add(`DLCO −${drop.toFixed(1)}%`,18+(drop-5)*3.5,true);else if(drop<=15)add(`DLCO −${drop.toFixed(1)}%`,40+(drop-10)*4,true);else add(`DLCO −${drop.toFixed(1)}%`,62+(drop-15)*2.5,true);
  add(`Bubbles G${m.bub}`,m.bub*10,m.bub>=2);
  const h=m.hydration,hp=h>=70?0:h>=45?(70-h)*.45:12+(45-h)*.7;add(h>=70?'Hydration good':h>=45?'Hydration low':'Hydration very low',hp,h<55);
  const sym=m.symptoms.length>0;if(sym){s=Math.max(s,88);add('Symptoms: '+m.symptoms.map(k=>SYMPTOMS.find(x=>x[0]===k)[1].toLowerCase()).join(', '),25,true)}
  s=Math.max(0,Math.min(100,Math.round(s)));
  const level=sym&&drop>0?'red':drop>10||s>=75?'orange':drop>=5||s>=50?'yellow':'green';
  return{s,level,parts:parts.sort((a,b)=>b.v-a.v),drop,...LEVEL[level]};
}

/* ---------- week plan (rolling 7 days from today) ---------- */
const DAYMS=86400000;
function day0(){const d=new Date();d.setHours(0,0,0,0);return d}
function dayDate(d){return new Date(day0().getTime()+d*DAYMS)}
function dayName(d,long){return dayDate(d).toLocaleDateString('en-GB',long?{weekday:'long',day:'numeric',month:'short'}:{weekday:'short'})}
const TYPES={eva:'EVA',pre:'Prebreathe',ared:'ARED',t2:'T2 treadmill',cevis:'CEVIS bike',dlco:'DLCO test',rest:'Rest',water:'Hydrate',work:'Station work',sleep:'Sleep',med:'Medical'};
function basePlan(id){
  const c=CREW.find(x=>x.id===id),E=c.evaDay,ev=[];let n=0;
  const add=(day,start,dur,type,title,sub='')=>ev.push({id:`${id}-${n++}`,day,start,dur,type,title:title||TYPES[type],sub});
  for(let d=0;d<7;d++){
    add(d,7.75,.25,'water','Water · 500 ml');add(d,14,.25,'water','Water · 500 ml');
    add(d,21.5,.5,'sleep','Sleep','22:00 – 06:00');
    if(d===E){add(d,7,2,'pre','Exercise prebreathe','O₂ + cycle');add(d,9,6.5,'eva','EVA · 6.5 h','spacewalk');add(d,16,1,'rest','Recovery');add(d,18.5,.34,'dlco','DLCO retest +3 h');continue}
    if(d===E+1){add(d,10,1,'rest','Recovery');add(d,15.5,.34,'dlco','DLCO retest +24 h');add(d,12.5,2,'work','Station work');continue}
    add(d,12.5,2,'work','Station work');
    if(d%2===0&&d!==E-1)add(d,10,.75,'ared','ARED · heavy squats','bone load');else add(d,10,.5,'t2','T2 treadmill','harness 70%');
    if(d!==E-1)add(d,17,.5,'cevis','CEVIS bike','heart');
  }
  add(E-1,16,.75,'ared','ARED · heavy lifts','bone load');   // the conflict: heavy loading < 24 h before the EVA
  return ev;
}
const REC_DEFS={
  ared:{title:'Move heavy ARED away from the EVA',h:1,why:'heavy loading less than 24 h before the pressure drop raises bubble risk'},
  pb:{title:'Extend prebreathe +45 min',h:6.5,scrub:1,why:'a longer prebreathe avoids scrubbing the 6.5 h EVA'},
  h2o:{title:'Drink 500 ml before the airlock',h:1,why:'good hydration lowers bubble risk'},
  lite:{title:'Lighter EVA task list (−1 h)',h:2,why:'keeps you outside instead of ending early'},
  delay:{title:'Move the EVA 24 h later',h:6.5,scrub:1,why:'turns a likely abort into a full EVA'},
  mo:{title:'Check-in with the medical officer',h:.5,why:'medical confirms before the airlock schedule slips'},
  noeva:{title:'No EVA until DLCO is back to baseline',h:0,why:'protects health first'}
};
function conflicts(plan){const out=[];for(const e of plan.filter(x=>x.type==='ared')){for(const v of plan.filter(x=>x.type==='eva')){const gap=(v.day*24+v.start)-(e.day*24+e.start+e.dur);if(gap>=0&&gap<24)out.push({ared:e,eva:v,gap})}}return out}
/* each recommendation is an operation on the plan */
function applyOp(plan,op,id){
  const P=plan.map(e=>({...e}));const eva=P.find(e=>e.type==='eva');const E=eva?eva.day:CREW.find(c=>c.id===id).evaDay;
  const mark=(e)=>{e.changed=op;return e};
  if(op==='ared'){for(const c of conflicts(P)){const a=c.ared;const free=[E+2,E+3,E-2].find(d=>d>=0&&d<7&&!P.some(x=>x.day===d&&x.type==='ared'&&x.start===16))??E+2;a.day=free;a.start=16;a.sub='moved · was < 24 h before EVA';mark(a)}}
  if(op==='pb'){const p=P.find(e=>e.type==='pre');if(p){p.start-=.75;p.dur+=.75;p.title='Exercise prebreathe +45';mark(p)}}
  if(op==='h2o'&&eva){P.push(mark({id:id+'-h2o',day:E,start:6.25,dur:.25,type:'water',title:'Water · +500 ml',sub:'before airlock'}))}
  if(op==='lite'&&eva){eva.dur-=1;eva.title='EVA · 5.5 h · lighter tasks';mark(eva)}
  if(op==='delay'){for(const e of P.filter(x=>x.day===E&&['pre','eva','rest','dlco'].includes(x.type))){e.day=Math.min(6,E+1);mark(e)}
    for(const e of P.filter(x=>x.day===E+1&&x.type==='dlco'&&!x.changed)){e.day=Math.min(6,E+2);mark(e)}}
  if(op==='mo')P.push(mark({id:id+'-mo',day:Math.max(0,E-1),start:9,dur:.5,type:'med',title:'Medical officer',sub:'check-in'}));
  if(op==='noeva'){for(const e of P.filter(x=>x.type==='eva'||x.type==='pre')){e.cancelled=true;mark(e)}P.push(mark({id:id+'-noeva',day:E,start:9,dur:1,type:'rest',title:'Rest · medical review',sub:'no EVA'}))}
  return P;
}
function recList(id){
  const sc=score(id),m=metrics(id),base=basePlan(id),st=cs(id).recs,out=[];
  const add=(op,reason)=>{const d=REC_DEFS[op],s=st[op]||{};out.push({op,id:op,...d,reason,status:s.status||'open',by:s.by||null})};
  if(conflicts(base).length)add('ared',`heavy ARED ${dayName(CREW.find(c=>c.id===id).evaDay-1)} 16:00, under 24 h before the EVA`);
  if(m.hydration<70)add('h2o',`hydration ${m.hydration}% of goal today`);
  if(sc.level==='yellow'||sc.level==='orange')add('pb',`DLCO ${m.dlcoNow}% vs your baseline`);
  if(sc.level==='yellow')add('lite',`score ${sc.s} · ${sc.name}`);
  if(sc.level==='orange')add('delay',`DLCO ${m.dlcoNow}% · ${sc.name}`);
  if(sc.level==='orange'||sc.level==='red')add('mo',`${sc.name} decision support`);
  if(sc.level==='red')add('noeva','symptoms reported with a DLCO drop');
  return out;
}
function plan(id){let P=basePlan(id);for(const r of recList(id))if(r.status==='accepted')P=applyOp(P,r.op,id);return P}
function ghost(id,op){const cur=plan(id),next=applyOp(cur,op,id);return next.filter(e=>{const o=cur.find(x=>x.id===e.id);return !o||o.day!==e.day||o.start!==e.start||o.dur!==e.dur||(!!o.cancelled)!==(!!e.cancelled)})}
function act(id,op,action,by){const st=cs(id).recs;if(action==='reset')delete st[op];else st[op]={status:action==='accept'?'accepted':action==='snooze'?'snoozed':'rejected',by,at:Date.now()};save()}
function hours(id){let h=0,scrubbed=false;for(const r of recList(id))if(r.status==='accepted'){if(r.scrub){if(scrubbed)continue;scrubbed=true}h+=r.h}return h}
function nextEva(id){const e=plan(id).filter(x=>x.type==='eva'&&!x.cancelled).sort((a,b)=>a.day-b.day||a.start-b.start)[0];return e?{...e,label:`${dayName(e.day)} ${fmtTime(e.start)}`,inDays:e.day}:null}
function setFeel(id,f){cs(id).feel=f;save()}
const fmtTime=h=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;

/* ---------- series for the graphs ---------- */
function boneSeries(id){const b=SAMPLE[id].bone,pts=[];for(let d=0;d<=MISSION_DAY;d+=10){const u=d/MISSION_DAY;pts.push([d,100-(100-b.now)*Math.pow(u,1.15)])}
  const proj=[[MISSION_DAY,b.now],[MISSION_LEN,b.landing]];return{pts,proj}}
function radSeries(id){const tot=SAMPLE[id].rad,pts=[];for(let d=0;d<=MISSION_DAY;d+=6){const storm=d>=96?tot*.12:0;pts.push([d,(tot-tot*.12)*d/MISSION_DAY+storm])}pts[pts.length-1][1]=tot;return pts}

/* ---------- tiny SVG charts ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function lineChart({series,xMin,xMax,yMin,yMax,refs=[],xTicks=[],yUnit='',w=320,h=150}){
  const L=34,R=8,T=10,B=22,X=v=>L+(v-xMin)/(xMax-xMin)*(w-L-R),Y=v=>T+(1-(v-yMin)/(yMax-yMin))*(h-T-B);
  let s=`<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  for(let k=0;k<=3;k++){const v=yMin+(yMax-yMin)*k/3;s+=`<line x1="${L}" x2="${w-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${+v.toFixed(v%1?1:0)}${k===3?yUnit:''}</text>`}
  for(const [v,l] of xTicks)s+=`<text x="${X(v)}" y="${h-6}" class="ax" text-anchor="middle">${esc(l)}</text>`;
  for(const r of refs)s+=`<line x1="${L}" x2="${w-R}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="${r.color}" stroke-dasharray="4 4" stroke-width="1"/><text x="${w-R}" y="${Y(r.y)-4}" class="ax" text-anchor="end" fill="${r.color}">${esc(r.label)}</text>`;
  for(const sr of series){const d=sr.pts.map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
    if(sr.fill)s+=`<path d="${d} L${X(sr.pts.at(-1)[0])} ${Y(yMin)} L${X(sr.pts[0][0])} ${Y(yMin)} Z" fill="${sr.color}" opacity=".12"/>`;
    s+=`<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.width||2}" ${sr.dash?`stroke-dasharray="${sr.dash}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if(sr.dot!==false){const p=sr.pts.at(-1);s+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="${sr.color}"/>`}}
  return s+'</svg>';
}
function barChart({vals,labels,yMin,yMax,refs=[],color,w=320,h=150,unit='%'}){
  const L=34,R=8,T=10,B=22,n=vals.length,bw=(w-L-R)/n,Y=v=>T+(1-(v-yMin)/(yMax-yMin))*(h-T-B);
  let s=`<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  for(let k=0;k<=3;k++){const v=yMin+(yMax-yMin)*k/3;s+=`<line x1="${L}" x2="${w-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-5}" y="${Y(v)+3}" class="ax" text-anchor="end">${Math.round(v)}${unit}</text>`}
  for(const r of refs)s+=`<line x1="${L}" x2="${w-R}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="${r.color}" stroke-dasharray="4 4"/><text x="${L+4}" y="${Y(r.y)+11}" class="ax" fill="${r.color}">${esc(r.label)}</text>`;
  vals.forEach((v,i)=>{const x=L+i*bw+bw*.22,y0=Y(0),y1=Y(v),c=typeof color==='function'?color(v,i):color;
    s+=`<rect x="${x}" y="${Math.min(y0,y1)}" width="${bw*.56}" height="${Math.abs(y1-y0)}" rx="3" fill="${c}" opacity="${i===n-1?1:.55}"/><text x="${x+bw*.28}" y="${h-6}" class="ax" text-anchor="middle">${esc(labels[i])}</text>`;
    if(i===n-1)s+=`<text x="${x+bw*.28}" y="${y1+(v<0?13:-5)}" class="val" text-anchor="middle">${v}${unit}</text>`});
  return s+'</svg>';
}
function meter({value,max,goal,color,unit,label}){const p=Math.min(100,value/max*100),g=goal!=null?Math.min(100,goal/max*100):null;
  return`<div class="meter"><div class="meter-track"><i style="width:${p}%;background:${color}"></i>${g!=null?`<b style="left:${g}%"></b>`:''}</div><div class="meter-row"><span><strong>${value.toLocaleString('en-GB')}</strong> ${unit}</span><span>${esc(label)}</span></div></div>`}
const dlcoColor=v=>v>-5?'#5ef0c2':v>-10?'#ffc857':v>-15?'#ff8a3d':'#ff5d6c';

/* graphs for one crew member: [{key,title,big,sub,svg}] */
function graphs(id,opts={}){
  const m=metrics(id),b=boneSeries(id),rp=radSeries(id),days=Array.from({length:7},(_,i)=>i-6);
  const dayLbl=i=>i===0?'now':dayDate(i).toLocaleDateString('en-GB',{weekday:'short'}).slice(0,2);
  return[
    {key:'bone',title:'Bone density',big:`${m.bone.now.toFixed(1)}%`,sub:`vs launch · landing forecast ${m.bone.landing}% · target ≥ ${BONE_TARGET}%`,ok:m.bone.landing>=BONE_TARGET,
     svg:lineChart({series:[{pts:b.pts,color:'#8ee04f',fill:true},{pts:b.proj,color:'#8ee04f',dash:'5 5',dot:true}],xMin:0,xMax:MISSION_LEN,yMin:93,yMax:100.5,refs:[{y:BONE_TARGET,label:'target',color:'#ffc857'}],xTicks:[[0,'launch'],[MISSION_DAY,'today'],[MISSION_LEN,'Mars']],yUnit:'%',...(opts.wideBone?{w:660,h:200}:{})})},
    {key:'heart',title:'Heart · 7 days',big:`${m.hr.at(-1)} bpm`,sub:`resting HR · HRV ${m.hrv.at(-1)} ms (dashed)`,ok:m.hrv.at(-1)>=50,
     svg:lineChart({series:[{pts:m.hr.map((v,i)=>[days[i],v]),color:'#c6f27a'},{pts:m.hrv.map((v,i)=>[days[i],v]),color:'#5ef0c2',dash:'5 4'}],xMin:-6,xMax:0,yMin:30,yMax:85,xTicks:days.map(i=>[i,dayLbl(i)])})},
    {key:'water',title:'Hydration today',big:`${m.water.toLocaleString('en-GB')} ml`,sub:`goal ${WATER_GOAL.toLocaleString('en-GB')} ml · ${m.hydration}%`,ok:m.hydration>=70,
     svg:meter({value:m.water,max:3000,goal:WATER_GOAL,color:m.hydration>=70?'#5ef0c2':m.hydration>=45?'#ffc857':'#ff8a3d',unit:'ml',label:`goal ${WATER_GOAL} ml`})},
    {key:'dlco',title:'DLCO vs your baseline',big:`${m.dlcoNow}%`,sub:'last 5 tests · −5% caution · −10% hold',ok:m.dlcoNow>-5,
     svg:barChart({vals:m.dlco,labels:DLCO_TESTS,yMin:-16,yMax:2,color:dlcoColor,refs:[{y:-5,label:'−5%',color:'#ffc857'},{y:-10,label:'−10%',color:'#ff8a3d'}]})},
    {key:'rad',title:'Radiation dose',big:`${m.rad} mSv`,sub:`budget ${RAD_BUDGET} mSv · ${Math.round(m.rad/RAD_BUDGET*100)}% used · storm d96`,ok:m.rad/RAD_BUDGET<.6,
     svg:lineChart({series:[{pts:rp,color:'#ffc857',fill:true}],xMin:0,xMax:MISSION_LEN,yMin:0,yMax:RAD_BUDGET,refs:[{y:RAD_BUDGET*.999,label:'budget',color:'#ff8a3d'}],xTicks:[[0,'launch'],[MISSION_DAY,'today'],[MISSION_LEN,'Mars']],yUnit:''})}
  ];
}

/* week calendar: 7 columns, 06:00–22:00 */
const H0=6,H1=22.5;
function weekHtml(id,{interactive=true,compact=false}={}){
  const P=plan(id),recs=recList(id).filter(r=>r.status==='open'),ghosts=recs.flatMap(r=>ghost(id,r.op).map(g=>({...g,rec:r})));
  const conf=new Set(conflicts(P).map(c=>c.ared.id));
  const px=compact?22:30,hgt=(H1-H0)*px;
  let s=`<div class="week" style="--h:${hgt}px">`;
  s+=`<div class="hraxis">${Array.from({length:9},(_,i)=>`<span style="top:${i*2*px}px">${String(H0+i*2).padStart(2,'0')}</span>`).join('')}</div>`;
  for(let d=0;d<7;d++){
    s+=`<div class="day${d===0?' is-today':''}"><div class="dh">${d===0?'Today':dayName(d)}<small>${dayDate(d).getDate()}</small></div><div class="col">`;
    for(const e of P.filter(x=>x.day===d)){const top=(e.start-H0)*px,h=Math.max(e.dur*px,14);
      s+=`<div class="blk t-${e.type}${e.cancelled?' cancelled':''}${e.changed?' changed':''}${conf.has(e.id)?' conflict':''}" style="top:${top}px;height:${h}px" title="${esc(e.title)} · ${fmtTime(e.start)}–${fmtTime(e.start+e.dur)}"><b>${esc(e.title)}</b>${h>26?`<span>${fmtTime(e.start)}${e.sub?' · '+esc(e.sub):''}</span>`:''}</div>`}
    for(const g of ghosts.filter(x=>x.day===d)){const top=(g.start-H0)*px,h=Math.max(g.dur*px,14);
      s+=`<div class="blk ghost${g.cancelled?' cancelled':''}"${interactive?` data-rec="${g.rec.op}"`:''} style="top:${top}px;height:${h}px" title="Suggested: ${esc(g.rec.title)}"><b>${g.cancelled?'Cancel · ':''}${esc(g.title)}</b>${h>26?`<span>suggested</span>`:''}</div>`}
    s+=`</div></div>`;
  }
  return s+'</div>';
}
function todayList(id){const P=plan(id).filter(e=>e.day===0).sort((a,b)=>a.start-b.start);const recs=recList(id).filter(r=>r.status==='open');
  return P.map(e=>`<li class="t-${e.type}${e.cancelled?' cancelled':''}"><time>${fmtTime(e.start)}</time><span>${esc(e.title)}${e.sub?`<small>${esc(e.sub)}</small>`:''}</span></li>`).join('')}

root.EVK={CREW,PLANNER,PLANNER_MED,PLANNERS,DEMO_PIN,SYMPTOMS,LEVEL,MISSION_DAY,WATER_GOAL,REC_DEFS,TYPES,
  load,save,reset,getSession,setSession,clearSession,signInAstronaut,signInPlanner,signInPlannerId,
  metrics,score,feel,setFeel,basePlan,plan,recList,ghost,act,hours,conflicts,nextEva,graphs,weekHtml,todayList,dayName,dayDate,fmtTime,esc};
})(globalThis);
