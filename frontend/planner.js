/* UI and browser-local persistence; external adapters are deliberately simulated. */
(() => {
  'use strict';
  window.addEventListener('storage',e=>{if(e.key===DevConfig.KEY||e.key===NasaRisk.KEY){DevConfig.load();NasaRisk.load();proposal=null;$('scenarioDialog').close();render();}});
  const M=MissionPlanner,$=id=>document.getElementById(id),KEY='kiwinaut-mission-v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso=t=>new Date(t).toISOString(),dt=t=>iso(t).slice(0,16),time=t=>iso(t).slice(11,16),date=t=>iso(t).slice(0,10);
  let state=M.seed(),view='calendar',editing=null,proposal=null,storageError=false;
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1&&Array.isArray(saved.events)&&saved.crews?.length&&saved.events.every(e=>M.task(e.task)&&Number.isFinite(e.start)&&e.duration>0)&&Number.isFinite(saved.now))state=saved;}catch{storageError=true;}
  for(const event of state.events)event.baselineHR??=state.crews.find(c=>c.id===event.crew)?.hr??62;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}$('saveState').textContent=storageError?'Storage unavailable · changes last this session':'Saved on this browser';}
  const message=t=>{$('feedback').textContent=t;};
  const profile=()=>state.crews.find(c=>c.id===state.crew);
  const current=()=>state.events.find(e=>e.id===state.selected&&e.crew===state.crew);
  const crewEvents=()=>state.events.filter(e=>e.crew===state.crew).sort((a,b)=>a.start-b.start);
  const evas=()=>crewEvents().filter(M.isEVA);
  function selectedEVA(){return evas().find(e=>e.id===state.eva)||evas().find(e=>e.start>=state.now)||evas().at(-1);}
  function status(e){return M.end(e)<=state.now?'Past · simulated':e.start>state.now?'Planned':'In progress · simulated';}
  const stressLabel=n=>`${n>0?'+':''}${n} pts`;
  function setView(v,opts={}){
    const next=v==='recs'?'recs':'calendar';
    const changed=next!==view;
    view=next;
    $('calendarView').hidden=view!=='calendar';
    $('recommendationsView').hidden=view!=='recs';
    $('pageTitle').textContent=view==='calendar'?'Crew calendar':'EVA recommendations';
    $('calendarTab').classList.toggle('active',view==='calendar');
    $('recommendationsTab').classList.toggle('active',view==='recs');
    // Only notify parent on real user-driven view changes — avoids embed reload loops.
    if(changed&&!opts.fromParent&&window.parent!==window){
      window.parent.postMessage({type:'kiwinaut-planner-view',view},location.origin);
    }
    render();
  }
  function render(){
    $('crew').innerHTML=state.crews.map(c=>`<option value="${c.id}" ${c.id===state.crew?'selected':''}>${esc(c.name)} · ${esc(c.role)}</option>`).join('');
    $('clock').value=dt(state.now);$('date').value=state.date;
    $('saveState').textContent=storageError?'Storage unavailable · changes last this session':'Saved on this browser';
    try{renderCalendar();renderDetail();renderRecs();}catch(e){$('recommendations').textContent='Developer equation error: '+e.message;message('Developer configuration error: '+e.message);}
    if($('devState'))$('devState').textContent=DevConfig.error?'Overrides rejected: '+DevConfig.error:'Shared developer engine · browser-local demo settings';
  }
  function renderCalendar(){
    const next=crewEvents().find(e=>M.isEVA(e)&&e.start>state.now),stress=M.stressAt(state,state.crew,state.now);
    $('crewStats').innerHTML=`<div class="stat"><span class="eyebrow">CREW LOAD</span><strong>${stress}<small> /100</small></strong><small>Illustrative stress · last 24 h</small></div><div class="stat"><span class="eyebrow">NEXT EVA</span><strong>${next?((next.start-state.now)/3600000).toFixed(1)+' h':'—'}</strong><small>${next?esc(M.task(next.task).name):'No upcoming EVA scheduled'}</small></div><div class="stat"><span class="eyebrow">MONITOR SIMULATION</span><strong>${Number(state.monitor.bio)+Number(state.monitor.everywear)}<small> /2 enabled</small></strong><small>CSA Bio-Monitor + ESA EveryWear</small></div>`;
    const start=Date.parse(state.date+'T00:00:00Z'),days=+$('period').value;
    $('rangeTitle').textContent=`${new Date(start).toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'UTC'})}${days===7?' – '+new Date(start+6*M.DAY).toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'UTC'}):''}`;
    $('calendar').classList.toggle('day',days===1);
    $('calendar').innerHTML=Array.from({length:days},(_,i)=>{
      const a=start+i*M.DAY,b=a+M.DAY,list=crewEvents().filter(e=>e.start<b&&M.end(e)>a);
      return `<div class="daycol"><div class="dayhead ${date(a)===date(state.now)?'today':''}">${new Date(a).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})}</div>${list.map(e=>`<button class="event ${M.task(e.task).category.toLowerCase()} ${e.id===state.selected?'selected':''}" data-event="${e.id}"><span class="time">${e.start<a?'← ':''}${time(e.start)}–${time(M.end(e))}${M.end(e)>b?' →':''}</span><span class="name">${esc(M.task(e.task).name)}</span><span class="status">${esc(status(e))}</span></button>`).join('')||'<p class="empty">Unscheduled</p>'}</div>`;
    }).join('');
  }
  function renderDetail(){
    const e=current();if(!e){$('detail').innerHTML='<div class="empty">Select an activity to see its schedule and monitor readings.</div>';return;}
    const task=M.task(e.task),samples=M.readings(state,e),bio=state.monitor.bio,wear=state.monitor.everywear,last=samples.filter(x=>x.time<=state.now).at(-1)||samples[0],forecast=last.time>state.now;
    const change=Math.round(task.stress*e.duration/60);
    const chart=bio||wear?`<svg class="trace" viewBox="0 0 300 100" role="img" aria-label="Simulated heart rate across selected activity"><text x="2" y="12">HR ${Math.min(...samples.map(r=>r.hr))}–${Math.max(...samples.map(r=>r.hr))} bpm</text><polyline points="${samples.map((r,i)=>`${10+i/(samples.length-1)*280},${80-(r.hr-40)/150*60}`).join(' ')}"/><text x="2" y="97">${time(e.start)}</text><text x="250" y="97">${time(M.end(e))}</text></svg>`:'<p>Monitor simulators disabled. Enable them in Connections to view traces.</p>';
    $('detail').innerHTML=`<div class="eyebrow">${esc(task.category)} / ${esc(status(e))}</div><h2>${esc(task.name)}</h2><p class="mono">${date(e.start)} ${time(e.start)}–${date(M.end(e))} ${time(M.end(e))} UTC<br>${e.duration} min · ${esc(e.origin)}</p>${M.isEVA(e)?'<button class="primary full" data-review="'+e.id+'">Review this EVA →</button>':''}
      <div class="detail-block"><h3>${forecast?'Expected readings':'Simulated past readings'}</h3><p>${forecast?'Forecast at activity start':'Latest simulated sample at '+time(last.time)+' UTC'}. Not recorded human data.</p><div class="metricgrid"><div class="metric"><small>Heart rate</small><b>${bio||wear?last.hr:'—'}</b><small>bpm · ${bio?'Bio-Monitor':'EveryWear'}</small></div><div class="metric"><small>Respiration</small><b>${bio?last.rr:'—'}</b><small>breaths/min · Bio-Monitor</small></div><div class="metric"><small>Skin temperature</small><b>${bio?last.skin:'—'}</b><small>°C · Bio-Monitor</small></div><div class="metric"><small>Activity index</small><b>${wear?last.activity:'—'}</b><small>demo units · EveryWear</small></div></div>${chart}
      <details><summary>Timestamped samples</summary><div class="tablewrap"><table class="readingtable"><thead><tr><th>UTC</th><th>Type</th><th>HR</th><th>Resp.</th><th>Skin °C</th></tr></thead><tbody>${samples.map(r=>`<tr><td>${iso(r.time).slice(0,19).replace('T',' ')}</td><td>${r.kind}</td><td>${bio||wear?r.hr:'—'}</td><td>${bio?r.rr:'—'}</td><td>${bio?r.skin:'—'}</td></tr>`).join('')}</tbody></table></div></details></div>
      <div class="detail-block"><h3>Activity effects</h3><p>Demo stress contribution: <b>${stressLabel(change)}</b> before 0–100 clamping.<br>${esc(task.effect)}</p><p>${task.oxygen?(e.link?'Linked to an EVA. Credit depends on continuity.':'Not linked to an EVA; no model credit.'):'Supportive effects are separate from the numeric DCS model.'}</p><a href="${task.source}" target="_blank" rel="noopener">NASA task / procedure source ↗</a></div>${e.note?'<p>'+esc(e.note)+'</p>':''}
      <div class="actions detail-block"><button data-edit="${e.id}" ${e.start<=state.now?'disabled':''}>Edit</button><button class="delete" data-delete="${e.id}" ${e.start<=state.now?'disabled':''}>Remove</button></div>${e.start<=state.now?'<p class="muted">Started and historical activities are read-only.</p>':''}`;
  }
  function renderRecs(){
    const eva=selectedEVA();if(!eva){$('nasaComparison').innerHTML='';$('recommendations').innerHTML='<div class="panel empty">No EVA scheduled for this crew member. Add an EVA from the calendar catalogue.</div>';return;}
    const c=M.calculate(state,eva),r=c.result,p=c.p,until=(eva.start-state.now)/3600000;
    const medical=crewEvents().filter(e=>e.task==='medical'&&M.end(e)<=eva.start&&M.end(e)>=eva.start-2*M.DAY),suit=crewEvents().filter(e=>e.task==='suit'&&M.end(e)<=eva.start&&M.end(e)>=eva.start-M.DAY);
    const check=(title,list)=>`<div class="check"><span>${title}</span><span>${list.length?list.map(e=>`${time(e.start)} · ${M.end(e)<=state.now?'simulated complete':'planned'}`).join('<br>'):'Not scheduled in review window'}</span></div>`;
    $('recommendations').innerHTML=`<div class="sectionhead" style="margin:22px 0"><label>Selected EVA<select id="evaSelect">${evas().map(e=>`<option value="${e.id}" ${e.id===eva.id?'selected':''}>${date(e.start)} ${time(e.start)} · ${esc(M.task(e.task).name)}</option>`).join('')}</select></label><span class="badge">${until>0?until.toFixed(1)+' h until EVA':M.end(eva)>state.now?'EVA in progress':'Historical EVA'}</span></div>
      <div class="recgrid"><section class="panel"><div class="eyebrow">EXISTING CALCULATOR / FORWARD MODEL</div><h2>${esc(profile().name)} · ${eva.duration} min EVA</h2><div class="risk">${r.dcs.toFixed(2)}<span style="font-size:24px">%</span></div><p>Modeled DCS probability · demo estimate, not medical clearance or probability of a suit leak.</p><div class="inputs">Uninterrupted oxygen: <b>${c.total} min</b><br>Prebreathe / depressurization: <b>${p.prebreathe} / ${p.decompress} min</b><br>Equivalent exercise: <b>${p.exercise.toFixed(2)} mL/kg/min</b><br>Prior EVAs: <b>${p.priorEVAs}</b> · latest gap: <b>${p.gapHours.toFixed(1)} h</b><br>Expected end-of-EVA demo stress: <b>${c.stress}/100</b></div>${!c.total?'<p class="error">No contiguous linked oxygen preparation. This estimate is not a readiness assessment.</p>':''}${c.ignored?'<p class="error">'+c.ignored+' oxygen segment(s) excluded because of a break before EVA.</p>':''}
      <details><summary>Mission atmosphere assumptions</summary><form id="protocolForm"><div class="protocol"><label>Habitat psia<input name="habP" type="number" min="5" max="15" step="0.1" value="${p.habP}" required></label><label>O₂ fraction<input name="habFO2" type="number" min="0.15" max="1" step="0.01" value="${p.habFO2}" required></label><label>Suit psia<input name="suitP" type="number" min="3" max="8" step="0.1" value="${p.suitP}" required></label></div><p>ISS microgravity assumption. Applies to all demo crew. Values must match the actual mission before operational use.</p><button>Update demo assumptions</button></form></details></section>
      <section class="panel"><div class="eyebrow">BEFORE THIS EVA</div><h2>Preparation and safety review</h2>${check('Medical review · prior 48 h',medical)}${check('Suit / airlock checks · prior 24 h',suit)}${c.linked.map(e=>`<div class="check"><span>${esc(M.task(e.task).name)}</span><span>${date(e.start)} ${time(e.start)}<br>${e.duration} min · ${M.end(e)<=state.now?'simulated complete':'planned'}${M.task(e.task).oxygen&&!c.chain.includes(e)?'<br>not credited':''}</span></div>`).join('')||'<p>No linked preparation activities.</p>'}<p>Scheduled activities are not verified completion. Symptoms, integrity checks and approved protocol adherence still require medical / operational review.</p><button data-add-prep="${eva.id}" ${until<=0?'disabled':''}>+ Schedule a safety activity</button></section></div>
      <h2 style="margin-top:28px">Explore a different plan</h2><p>Compare first, then apply changes to this crew’s calendar. Schedule conflicts prevent application.</p><div class="options">${[
        ['delay','Delay by 24 hours','Move this EVA and linked preparation together. Review recovery time and conflicts.'],
        ['shorten','Shorten external work','Remove up to 60 minutes. Lower workload and oxygen dose; DCS estimate remains unchanged.'],
        ['oxygen','Add oxygen preparation','Insert 30 minutes before the uninterrupted oxygen chain.'],
        ['exercise','Compare light-exercise prebreathe','Replace a resting oxygen segment with a demo light-exercise segment.']
      ].map(([id,title,desc])=>`<article class="option"><h3>${title}</h3><p>${desc}</p><button data-scenario="${id}" ${until<=0?'disabled':''}>Preview change →</button></article>`).join('')}</div><p class="muted" style="font-size:12px">Exercise and oxygen scenarios require mission-specific validation. Hydration, rest and medical checks can be scheduled above; they do not automatically reduce this model’s DCS percentage.</p>${state.log.length?'<details><summary>Recent demo plan changes</summary><div class="history">'+state.log.slice(-8).reverse().map(x=>esc(x)).join('<br>')+'</div></details>':''}`;
    NasaComparison.mount($('nasaComparison'),p,{label:'crew EVA plan',start:eva.start,now:state.now});
    $('evaSelect').onchange=e=>{state.eva=e.target.value;state.selected=state.eva;save();render();};
    $('protocolForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);for(const k of ['habP','habFO2','suitP'])state.protocol[k]=Number(f.get(k));save();render();};
  }
  function fillTasks(query='',selected){const list=M.catalog.filter(t=>(t.name+' '+t.category).toLowerCase().includes(query.toLowerCase()));$('taskType').innerHTML=list.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');if(list.some(t=>t.id===selected))$('taskType').value=selected;taskInfo();}
  function taskInfo(){const t=M.task($('taskType').value);$('taskSource').innerHTML=t?`${esc(t.effect)} <a href="${t.source}" target="_blank" rel="noopener">Source ↗</a>`:'No matching tasks.';}
  function openTask(id=null,link=null){
    editing=id;const e=state.events.find(e=>e.id===id);if(e&&e.start<=state.now)return;
    $('taskHeading').textContent=e?'Edit activity':'Add activity';$('taskSearch').value='';fillTasks('',e?.task||(link?'medical':'science'));
    const start=e?.start??Math.max(Date.parse(state.date+'T10:00:00Z'),state.now+30*M.MIN);
    $('taskStart').value=dt(start);$('taskDuration').value=e?.duration??M.task($('taskType').value).duration;
    $('taskLink').innerHTML='<option value="">No linked EVA</option>'+evas().filter(x=>x.id!==id&&x.start>state.now).map(x=>`<option value="${x.id}">${date(x.start)} ${time(x.start)} · ${esc(M.task(x.task).name)}</option>`).join('');
    $('taskLink').value=e?.link||link||'';$('taskNote').value=e?.note||'';$('taskError').textContent='';$('taskDialog').showModal();
  }
  $('taskSearch').oninput=e=>fillTasks(e.target.value,$('taskType').value);
  $('taskType').onchange=()=>{taskInfo();$('taskDuration').value=M.task($('taskType').value).duration;};
  $('taskForm').onsubmit=e=>{
    e.preventDefault();const old=state.events.find(x=>x.id===editing),event={id:editing||M.uid(),crew:state.crew,task:$('taskType').value,start:Date.parse($('taskStart').value+'Z'),duration:+$('taskDuration').value,link:$('taskLink').value||null,origin:old?.origin||'Crew added',note:$('taskNote').value.trim(),baselineHR:old?.baselineHR??profile().hr};
    let error=M.validate(event,state.events,state.crews);if(event.start<state.now)error='New and edited tasks must start at or after the mission clock.';
    if(old&&M.isEVA(old)&&state.events.some(x=>x.link===old.id)&&(event.start!==old.start||event.task!==old.task))error='This EVA has linked preparation. Use the delay scenario to move the full plan, or remove/relink preparation first.';
    if(M.isEVA(event)&&event.link)error='An EVA cannot be a preparation activity for another EVA.';
    if(error){$('taskError').textContent=error;return;}
    state.events=state.events.filter(x=>x.id!==event.id).concat(event);state.selected=event.id;state.date=date(event.start);if(M.isEVA(event))state.eva=event.id;save();$('taskDialog').close();render();message('Activity saved to the demo calendar.');
  };
  function renderConnections(){
    $('connectionContent').innerHTML=['bio','everywear'].map(k=>`<div class="connection"><h3>${M.adapters[k].name}</h3><p>${k==='bio'?'Synthetic heart rate, respiration and skin temperature.':'Synthetic activity and heart-rate feed through an app adapter.'} No hardware connection.</p><button data-monitor="${k}">${state.monitor[k]?'Disable':'Enable'} simulation</button> <span class="badge">${state.monitor[k]?'SIMULATION ENABLED':'DISABLED'}</span></div>`).join('')+`<div class="connection"><h3>Playbook scheduling</h3><p>Mock connection with idempotent sample-plan import and JSON export. This is a local adapter contract, not an official Playbook API.</p><div class="actions"><button id="connectPlaybook">${state.playbook?'Disconnect mock':'Connect mock'}</button><button id="syncPlaybook" ${!state.playbook?'disabled':''}>Import sample plan</button><button id="exportPlaybook" ${!state.playbook?'disabled':''}>Export demo plan</button></div><p id="syncResult" role="status">${state.playbook?'Mock connected. No external data sent.':'Not connected.'}</p></div>`;
    $('connectPlaybook').onclick=()=>{state.playbook=!state.playbook;save();renderConnections();};
    $('syncPlaybook').onclick=()=>{
      const incoming=M.adapters.playbook.pull(state),fresh=incoming.filter(e=>!state.events.some(x=>x.id===e.id)),errors=M.conflicts([...state.events,...fresh]);
      if(errors.length){$('syncResult').textContent='Import blocked: '+errors[0];return;}
      fresh.forEach(e=>e.baselineHR=state.crews.find(c=>c.id===e.crew).hr);
      state.events.push(...fresh);save();render();$('syncResult').textContent=`Imported ${fresh.length} tasks across ${state.crews.length} crew profiles for 19 Nov. Existing IDs were skipped.`;
    };
    $('exportPlaybook').onclick=()=>{const blob=new Blob([JSON.stringify(M.adapters.playbook.export(state),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kiwinaut-demo-playbook.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('syncResult').textContent='Demo plan exported locally. Nothing sent to Playbook.';};
  }
  function preview(type){try{previewChecked(type);}catch(e){message('Developer equation error: '+e.message);}}
  function previewChecked(type){const eva=selectedEVA(),before=M.calculate(state,eva);proposal=M.scenario(state,eva,type);$('applyScenario').disabled=!!proposal.error||!!proposal.errors?.length;
    if(proposal.error)$('scenarioContent').innerHTML=`<p class="error">${esc(proposal.error)}</p>`;
    else {const after=proposal.calculation;$('scenarioContent').innerHTML=`<p>${esc(proposal.note)}</p><div class="comparison"><div>Current DCS estimate<strong>${before.result.dcs.toFixed(2)}%</strong>${before.total} min oxygen<br>${eva.duration} min EVA<br>${before.stress}/100 end stress</div><div>Proposed DCS estimate<strong>${after.result.dcs.toFixed(2)}%</strong>${after.total} min oxygen<br>${proposal.eva.duration} min EVA<br>${after.stress}/100 end stress</div></div><p>${date(proposal.eva.start)} ${time(proposal.eva.start)} UTC · oxygen exposure ${before.result.H.toFixed(3)} → ${after.result.H.toFixed(3)} kPa·day</p>${proposal.errors.length?'<p class="error">Cannot apply: '+proposal.errors.map(esc).join('<br>')+'</p>':'<p>No calendar conflicts. This remains an unvalidated demo scenario.</p>'}`;}
    $('scenarioContent').insertAdjacentHTML('beforeend','<p><b>NASA method:</b> no new BGI is available for this change, so a NASA risk or preparation-time saving cannot be calculated. Published case estimates do not transfer to this modified plan.</p>');
    $('scenarioDialog').showModal();
  }
  $('applyScenario').onclick=()=>{if(!proposal||proposal.error||proposal.errors.length)return;state.events=proposal.events;state.selected=proposal.eva.id;state.eva=proposal.eva.id;state.date=date(proposal.eva.start);state.log.push(`${dt(state.now)} UTC · ${profile().name}: ${proposal.note}`);save();$('scenarioDialog').close();render();message('Scenario applied to the demo calendar.');proposal=null;};
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.close)$(b.dataset.close).close();
    if(b.dataset.event){state.selected=b.dataset.event;save();renderDetail();renderCalendar();if(M.isEVA(current())){state.eva=current().id;save();setView('recs');}}
    if(b.dataset.review){state.eva=b.dataset.review;save();setView('recs');}
    if(b.dataset.edit)openTask(b.dataset.edit);
    if(b.dataset.delete){const event=state.events.find(x=>x.id===b.dataset.delete);if(event.start<=state.now)return;if(state.events.some(x=>x.link===event.id)){message('Remove or unlink preparation activities before removing this EVA.');return;}state.events=state.events.filter(x=>x.id!==event.id);save();render();message('Activity removed from the demo calendar.');}
    if(b.dataset.addPrep)openTask(null,b.dataset.addPrep);
    if(b.dataset.scenario)preview(b.dataset.scenario);
    if(b.dataset.monitor){state.monitor[b.dataset.monitor]=!state.monitor[b.dataset.monitor];save();renderConnections();render();}
  });
  $('calendarTab').onclick=()=>setView('calendar');$('recommendationsTab').onclick=()=>setView('recs');$('addTask').onclick=()=>openTask();
  $('crew').onchange=e=>{state.crew=e.target.value;state.selected=crewEvents().find(x=>x.start>=state.now)?.id;state.eva=null;save();render();};
  $('clock').onchange=e=>{const n=Date.parse(e.target.value+'Z');if(!Number.isFinite(n)){message('Enter a valid simulation clock.');return;}state.now=n;save();render();};
  $('advance').onclick=()=>{state.now+=30*M.MIN;save();render();};
  $('date').onchange=e=>{if(!e.target.value)return;state.date=e.target.value;save();renderCalendar();};
  $('period').onchange=renderCalendar;
  for(const [id,dir] of [['previous',-1],['next',1]])$(id).onclick=()=>{state.date=date(Date.parse(state.date+'T00:00:00Z')+dir*+$('period').value*M.DAY);save();render();};
  $('today').onclick=()=>{state.date=date(state.now);save();render();};
  $('connections').onclick=()=>{renderConnections();$('connectionDialog').showModal();};
  $('editProfile').onclick=()=>{const c=profile();$('profileName').value=c.name;$('profileRole').value=c.role;$('profileHR').value=c.hr;$('profileStress').value=c.stress;$('profileDialog').showModal();};
  $('profileForm').onsubmit=e=>{e.preventDefault();Object.assign(profile(),{name:$('profileName').value.trim(),role:$('profileRole').value.trim(),hr:+$('profileHR').value,stress:+$('profileStress').value});save();$('profileDialog').close();render();};
  $('sourceLinks').innerHTML=Object.entries(M.sources).map(([k,url])=>`<a href="${url}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join('');
  function applyCrew(id){
    if(!id||!state.crews.some(c=>c.id===id)||state.crew===id)return false;
    state.crew=id;
    state.selected=crewEvents().find(x=>x.start>=state.now)?.id||crewEvents()[0]?.id||null;
    state.eva=null;
    save();
    render();
    message(`${profile().name} signed in · calendar ready.`);
    return true;
  }
  addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==parent||!e.data)return;
    if(e.data.type==='kiwinaut-planner-navigate')setView(e.data.view,{fromParent:true});
    if(e.data.type==='kiwinaut-planner-session'&&e.data.crew)applyCrew(e.data.crew);
  });
  const qs=new URLSearchParams(location.search);
  if(qs.get('crew'))applyCrew(qs.get('crew'));
  setView(qs.get('view'),{fromParent:true});
  save();
})();
