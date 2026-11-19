/* Mission simulation domain. All physiology/stress parameters below are demo assumptions. */
(function (root) {
  'use strict';
  const MIN = 60000, DAY = 86400000;
  const sources = {
    mission: 'https://www.nasa.gov/blogs/stationreport/2023/11/01/iss-daily-summary-report-11-01-2023/',
    medical: 'https://www.nasa.gov/blogs/spacestation/2025/01/14/health-checks-and-suit-installs-before-thursday-spacewalk-for-science-upkeep/',
    protocol: 'https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf',
    dcs: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf',
    bio: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp',
    everywear: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Astronauts/Diet_tracker_in_space',
    playbook: 'https://www.nasa.gov/human-systems-integration-division/human-computer-interaction/schedule-and-planning-interface-for-exploration/'
  };
  const catalog = [
    ['eva','EVA · solar-array installation','EVA',360,7,45,'Pressure exposure; feeds EVA duration and prior-exposure history.','https://www.nasa.gov/blogs/spacestation/2023/06/09/nasa-spacewalkers-complete-solar-array-installation/'],
    ['antenna','EVA · communications hardware repair','EVA',300,7,42,'Pressure exposure; feeds EVA duration and prior-exposure history.',sources.mission],
    ['pb','Oxygen prebreathe · resting','Preparation',60,-1,2,'Direct model input: uninterrupted oxygen minutes.',sources.protocol,0],
    ['isle','Oxygen prebreathe · in-suit light exercise','Preparation',50,2,22,'Direct model input: oxygen washout with light exercise. ISS reference only.',sources.protocol,5.8],
    ['decompress','Crewlock controlled depressurization','Preparation',30,2,5,'Oxygen time and decompression duration; follows the selected procedure.',sources.protocol,0],
    ['medical','Pre-EVA medical evaluation','Medical',20,-1,0,'Readiness check; no numeric DCS reduction assigned.',sources.medical],
    ['suit','Suit and crewlock integrity checks','Preparation',30,2,10,'Equipment readiness for pressure containment; no numeric DCS reduction.',sources.mission],
    ['hydrate','Meal and hydration preparation','Recovery',30,-4,0,'Supportive readiness; no numeric DCS reduction assigned.','https://www.nasa.gov/wp-content/uploads/2023/03/nutritional-biochemistry-of-space-flight.pdf'],
    ['sleep','Sleep / protected rest','Recovery',480,-2,-8,'Recovery supports readiness; no numeric DCS reduction assigned.',sources.protocol],
    ['rest','Post-EVA recovery','Recovery',60,-4,-2,'Recovery and symptom review; no numeric DCS reduction assigned.',sources.medical],
    ['tools','EVA tool configuration','Operations',45,3,12,'Preparation workload; does not remove tissue nitrogen.','https://www.nasa.gov/blogs/stationreport/2023/06/08/iss-daily-summary-report-6-08-2023/'],
    ['brief','EVA procedure review with ground','Operations',30,2,3,'Checklist readiness; no numeric DCS reduction assigned.','https://www.nasa.gov/blogs/stationreport/2023/06/05/iss-daily-summary-report-6-05-2023/'],
    ['robot','Robotics support / workstation setup','Operations',60,4,4,'Cognitive workload; intravehicular crew do not undergo suit decompression.',sources.mission],
    ['ared','ARED resistance exercise','Exercise',45,8,50,'Raises demo workload. Not a substitute for protocol-specific prebreathe exercise.','https://www.nasa.gov/missions/station/iss-research/exercising-in-space/'],
    ['cycle','CEVIS cycle exercise','Exercise',30,6,40,'Routine fitness activity; receives no oxygen-prebreathe credit.','https://www.nasa.gov/missions/station/iss-research/exercising-in-space/'],
    ['science','Station science and sample handling','Science',60,3,6,'Routine workload; no direct modeled DCS effect.',sources.medical]
  ].map(([id,name,category,duration,stress,hr,effect,source,vo2])=>({id,name,category,duration,stress,hr,effect,source,vo2,oxygen:vo2!==undefined}));
  const task=id=>catalog.find(t=>t.id===id);
  const end=e=>e.start+e.duration*MIN;
  const isEVA=e=>task(e.task)?.category==='EVA';
  const uid=()=>root.crypto?.randomUUID?.() || `e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clone=x=>JSON.parse(JSON.stringify(x));
  function seed() {
    const day=Date.parse('2026-11-15T00:00:00Z');
    const crews=[{id:'lee',name:'Jiaqi Chen',role:'Commander',hr:62,stress:28},{id:'rivera',name:'Marco Duchamp',role:'Flight engineer',hr:68,stress:34},{id:'chen',name:'Eduard Dante',role:'Science officer',hr:59,stress:24}];
    const events=[];
    crews.forEach((c,i)=>{
      const add=(t,start,duration,link=null)=>{const x={id:`${c.id}-${events.length}`,crew:c.id,task:t,start:day+start*MIN,duration,origin:'Demo mission',link,baselineHR:c.hr};events.push(x);return x;};
      add('eva',-2*1440+720,180);
      for(let n=0;n<7;n++) {add('sleep',n*1440,420);add('hydrate',n*1440+420,30);if(n!==0){add('science',n*1440+480,60);add('cycle',n*1440+600,30);add('tools',n*1440+780,45);}}
      add('brief',450,30);add('medical',480,20);add('suit',500,30);
      const eva=add(i===2?'antenna':'eva',780, i===2?240:360);
      add('pb',600,60,eva.id);add('isle',660,50,eva.id);add('pb',710,40,eva.id);add('decompress',750,30,eva.id);
      add('rest',780+eva.duration,60);
    });
    return {version:1,crews,events,crew:'lee',selected:events.find(e=>e.crew==='lee'&&isEVA(e)&&e.start>day).id,now:day+540*MIN,date:'2026-11-15',monitor:{bio:true,everywear:true},playbook:false,log:[],protocol:{habP:14.7,habFO2:0.21,suitP:4.3,ambulatory:false}};
  }
  function conflicts(events) {
    const errors=[];
    for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){const a=events[i],b=events[j];if(a.crew===b.crew&&a.start<end(b)&&b.start<end(a))errors.push(`${task(a.task).name} overlaps ${task(b.task).name}`);}
    return errors;
  }
  function validate(e,events,crews) {
    if(!task(e.task)||!crews.some(c=>c.id===e.crew))return 'Choose a valid crew member and task.';
    if(!Number.isFinite(e.start)||!Number.isInteger(e.duration)||e.duration<5||e.duration>1440)return 'Enter a valid UTC start and duration from 5 to 1,440 whole minutes.';
    if(e.link&&!events.some(x=>x.id===e.link&&x.crew===e.crew&&isEVA(x)&&end(e)<=x.start))return 'Preparation must end before its linked EVA and belong to the same crew member.';
    return conflicts([...events.filter(x=>x.id!==e.id),e])[0]||null;
  }
  function prep(events,eva) {return events.filter(e=>e.crew===eva.crew&&e.link===eva.id&&end(e)<=eva.start).sort((a,b)=>a.start-b.start);}
  function calculate(state,eva,events=state.events) {
    const linked=prep(events,eva),oxygen=linked.filter(e=>task(e.task).oxygen);
    // Only the contiguous oxygen chain immediately preceding EVA gets credit. Gaps reset credit.
    let cursor=eva.start, chain=[];
    for(const e of oxygen.slice().reverse()){if(end(e)===cursor){chain.unshift(e);cursor=e.start;}}
    const total=chain.reduce((n,e)=>n+e.duration,0),decompress=chain.filter(e=>e.task==='decompress').reduce((n,e)=>n+e.duration,0);
    // Equivalent exercise gives exactly the same exponential washout as the sequential stages.
    const weighted=chain.reduce((n,e)=>n+e.duration*Math.exp(root.K.exerciseK*task(e.task).vo2),0);
    const exercise=total?Math.log(weighted/total)/root.K.exerciseK:0;
    const effectiveRate=total?chain.reduce((n,e)=>n+e.duration*root.rateConstant(task(e.task).vo2),0)/total:root.rateConstant(0);
    const previous=events.filter(e=>e.crew===eva.crew&&isEVA(e)&&end(e)<=eva.start).sort((a,b)=>end(b)-end(a));
    const p={effectiveRate,...state.protocol,prebreathe:total-decompress,decompress,exercise,outside:eva.duration,priorEVAs:previous.length,gapHours:previous.length?(eva.start-end(previous[0]))/3600000:0};
    return {p,result:root.forward(p),linked,chain,total,ignored:oxygen.length-chain.length,stress:stressAt(state,eva.crew,end(eva),events)};
  }
  function stressAt(state,crew,time,events=state.events){
    let value=state.crews.find(c=>c.id===crew).stress;
    for(const e of events.filter(e=>e.crew===crew&&e.start<time&&end(e)>time-DAY)){
      const minutes=Math.max(0,(Math.min(end(e),time)-Math.max(e.start,time-DAY))/MIN);
      value+=task(e.task).stress*minutes/60;
    }
    return Math.max(0,Math.min(100,Math.round(value)));
  }
  function readings(state,e) {
    const crew=state.crews.find(c=>c.id===e.crew),t=task(e.task),result=[];
    const points=Math.min(49,Math.max(3,Math.ceil(e.duration/5)+1));
    for(let i=0;i<points;i++) {
      const time=Math.round(e.start+(end(e)-e.start)*i/(points-1));
      const baseline=time<=state.now?(e.baselineHR??crew.hr):crew.hr;
      const phase=Math.sin(time/MIN*0.7+baseline), hr=Math.round(baseline+t.hr+phase*3);
      result.push({time,kind:time<=state.now?'Simulated history':'Expected · simulation',hr,rr:Math.round(13+Math.max(0,t.hr)*0.2+phase),skin:+(33.2+Math.max(0,t.hr)*0.015+phase*.15).toFixed(1),activity:Math.max(0,Math.round(t.hr*1.6+phase*2))});
    }return result;
  }
  function scenario(state,eva,type){
    const events=clone(state.events),target=events.find(e=>e.id===eva.id),linked=prep(events,target),ids=new Set([target.id,...linked.map(e=>e.id)]);
    let note='';
    if(target.start<=state.now)return {error:'Historical or active EVAs are read-only. Select a future EVA.'};
    if(type==='delay'){
      if(linked.some(e=>e.start<state.now))return {error:'Preparation has already started. Reschedule a future EVA with unstarted preparation.'};
      events.filter(e=>ids.has(e.id)).forEach(e=>e.start+=DAY);
      note='Moves EVA and its linked preparation by 24 h. Prior-exposure gap changes; delay alone is not prebreathe.';
    }else if(type==='shorten'){
      target.duration=Math.max(30,target.duration-60);note='60 min less external work (minimum 30 min). Existing DCS model is duration-insensitive; oxygen dose and stress change.';
    }else if(type==='oxygen'){
      const chain=calculate(state,target,events).chain,at=chain.length?chain[0].start:target.start;
      if(at-30*MIN<state.now)return {error:'Not enough future time to add 30 minutes before the oxygen chain.'};
      events.push({id:uid(),crew:target.crew,task:'pb',start:at-30*MIN,duration:30,link:target.id,origin:'Scenario',baselineHR:state.crews.find(c=>c.id===target.crew).hr});
      note='Adds 30 min of uninterrupted oxygen before the existing chain. Demo comparison, not an approved protocol extension.';
    }else if(type==='exercise'){
      const eligible=calculate(state,target,events).chain.find(e=>e.task==='pb'&&e.start>=state.now);
      if(!eligible)return {error:'No future resting oxygen segment is available to compare with light exercise.'};
      eligible.task='isle';note=`Replaces one future resting oxygen segment with light exercise at an assumed ${task('isle').vo2} mL/kg/min. Requires protocol validation.`;
    }else return {error:'Unknown scenario.'};
    const errors=conflicts(events);
    return {events,eva:target,calculation:calculate(state,target,events),note,errors};
  }
  const adapters={
    bio:{name:'CSA Bio-Monitor',mode:'simulation',fields:['hr','rr','skin'],read:readings},
    everywear:{name:'ESA EveryWear',mode:'simulation',fields:['hr','activity'],read:readings},
    playbook:{name:'Playbook',mode:'mock',pull(state){return state.crews.flatMap(c=>['brief','science'].map((t,i)=>({id:`playbook-${c.id}-${t}`,crew:c.id,task:t,start:Date.parse('2026-11-19T15:00:00Z')+i*60*MIN,duration:30,link:null,origin:'Playbook mock'})));},export(state){return {schema:'kiwinaut-demo-schedule-v1',service:'Playbook mock; not an official API schema',generatedAt:new Date(state.now).toISOString(),events:clone(state.events)};}}
  };
  root.MissionPlanner={MIN,DAY,sources,catalog,task,end,isEVA,uid,clone,seed,conflicts,validate,prep,calculate,stressAt,readings,scenario,adapters};
})(globalThis);
