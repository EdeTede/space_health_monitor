/* Separate local-only developer editors, using the same engine as the app. */
(() => {
  'use strict';
  const D=DevConfig, $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tasks=document.body.dataset.screen==='tasks';
  let base=D.current();
  const p={habP:14.7,habFO2:.21,suitP:4.3,prebreathe:150,exercise:1.8,decompress:30,outside:360,ambulatory:false,priorEVAs:1,gapHours:48};
  const units={tau:'min',exerciseK:'per mL/kg/min',anchor:'ratio',vgeN:'exponent',vgeC:'Hill constant',dcsN:'exponent',dcsC:'Hill constant',amb:'multiplier',kBub:'% DLCO / VGE fraction',kOx:'% DLCO / kPa.day',oxThr:'kPa',hbStd:'g/dL',carryPer:'multiplier per EVA',carryHalf:'h',rLimit:'ratio',dcsAccept:'%'};
  const status=(s,error=false)=>{$('status').textContent=s;$('status').className=error?'notice error':'notice';};
  function draw(){
    base=D.current();
    if(tasks){
      $('editor').innerHTML=MissionPlanner.catalog.map(t=>`<details class="panel task" data-id="${t.id}"><summary>${esc(t.name)} <span class="muted">· ${t.id}</span></summary><div class="formgrid">${field('name','Task name',t.name)}<label>Category<select data-field="category">${['EVA','Preparation','Medical','Recovery','Operations','Exercise','Science'].map(c=>`<option ${c===t.category?'selected':''}>${c}</option>`).join('')}</select></label>${field('duration','Default duration (min)',t.duration,'number')}${field('stress','Stress change (points/hour)',t.stress,'number')}${field('hr','Heart-rate offset (bpm)',t.hr,'number')}${field('vo2','Oxygen exercise (mL/kg/min)',t.vo2??0,'number')}<label>Credits continuous oxygen time<select data-field="oxygen"><option value="false" ${!t.oxygen?'selected':''}>No</option><option value="true" ${t.oxygen?'selected':''}>Yes · protocol simulation</option></select></label>${field('source','Source URL (HTTPS)',t.source)}<label class="wide">Effect / assumption<textarea data-field="effect" rows="3">${esc(t.effect)}</textarea></label></div></details>`).join('');
      $('taskSearch').oninput=()=>document.querySelectorAll('.task').forEach(el=>el.hidden=!el.textContent.toLowerCase().includes($('taskSearch').value.toLowerCase()));
    }else{
      $('constants').innerHTML=Object.entries(base.constants).map(([k,v])=>`<label>${esc(k)} · ${units[k]||'number'}<input type="number" step="any" data-constant="${k}" value="${v}" required></label>`).join('');
      $('editor').innerHTML=D.definitions.map(d=>`<div class="formula panel"><label>${esc(d.label)} <span class="muted">${d.id} · ${d.unit}</span><textarea data-expression="${d.id}" rows="2" spellcheck="false">${esc(base.expressions[d.id])}</textarea></label><p>Inputs: <code>${esc(d.variables.join(', ')||'constants only')}</code>. All constants and ATM, KPA are also available.</p></div>`).join('');
      $('profile').value=JSON.stringify(p,null,2);
    }
  }
  function field(id,label,value,type='text'){return `<label>${label}<input data-field="${id}" type="${type}" ${type==='number'?'step="any"':''} value="${esc(value)}" required></label>`;}
  function collect(){
    const c=JSON.parse(JSON.stringify(base));
    if(tasks)c.tasks=[...document.querySelectorAll('.task')].map(el=>{const t={id:el.dataset.id};el.querySelectorAll('[data-field]').forEach(f=>t[f.dataset.field]=f.type==='number'?(f.value===''?NaN:Number(f.value)):f.dataset.field==='oxygen'?f.value==='true':f.value);return t;});
    else {document.querySelectorAll('[data-constant]').forEach(f=>c.constants[f.dataset.constant]=f.value===''?NaN:Number(f.value));document.querySelectorAll('[data-expression]').forEach(f=>c.expressions[f.dataset.expression]=f.value);}
    return c;
  }
  function profile(){const v=tasks?p:JSON.parse($('profile').value);for(const key of Object.keys(p)){if(key==='ambulatory'){if(typeof v[key]!=='boolean')throw Error('ambulatory must be true or false.');}else if(!Number.isFinite(v[key])||v[key]<0)throw Error('Invalid profile input: '+key);}if(v.habP<=0||v.suitP<=0||v.habFO2>=1||v.priorEVAs>100||!Number.isInteger(v.priorEVAs))throw Error('Check positive pressures, oxygen fraction < 1, and priorEVAs integer 0–100.');return v;}
  function preview(){const c=collect(),r=D.preview(c,profile());if(tasks){const changes=c.tasks.filter(t=>JSON.stringify(t)!==JSON.stringify(D.originalTasks().find(x=>x.id===t.id)));$('results').textContent=`Validated ${c.tasks.length} task definitions. Duration changes affect new tasks only. Monitor offsets, stress and oxygen credit recalculate existing activities. Preview DCS at the lab sample: ${r.result.dcs.toFixed(4)}%.`;}
    else $('results').innerHTML=`<h2>Forward trace · unsaved draft</h2><p>DCS ${r.result.dcs.toFixed(4)}% · VGE ${r.result.vge.toFixed(4)}% · DLCO ${r.result.dDLCO.toFixed(4)}%</p><table class="readingtable"><thead><tr><th>Step</th><th>Value</th><th>Expression</th></tr></thead><tbody>${r.steps.map(s=>`<tr><td>${s.id}</td><td>${s.value.toPrecision(8)}</td><td><code>${esc(s.expression)}</code></td></tr>`).join('')}</tbody></table>`;
    return c;
  }
  $('preview').onclick=()=>{try{preview();status('Draft validated. Nothing has been saved.');}catch(e){status(e.message,true);}};
  $('apply').onclick=()=>{try{const c=preview();D.apply(c);base=D.current();status('Applied to this browser. Open planner and calculator tabs update automatically.');}catch(e){status(e.message,true);}};
  $('reset').onclick=()=>{try{const c=D.current(),defaults=D.defaults();if(tasks)c.tasks=[];else {c.constants=defaults.constants;c.expressions=defaults.expressions;}D.apply(c);draw();$('results').textContent='';status('Restored defaults for this screen.');}catch(e){status(e.message,true);}};
  $('export').onclick=()=>{try{const c=collect();D.validate(c);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(c,null,2)],{type:'application/json'}));a.download='kiwinaut-developer.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status('Exported the current draft. Export does not apply changes.');}catch(e){status(e.message,true);}};
  $('import').onchange=async e=>{try{const c=JSON.parse(await e.target.files[0].text());D.preview(c,p);D.apply(c);draw();status('Imported and applied developer configuration (both screens).');}catch(err){status(err.message,true);}e.target.value='';};
  window.addEventListener('storage',e=>{if(e.key===D.KEY){D.load();status('Configuration changed in another tab. Reload this screen before applying your draft.',true);$('apply').disabled=true;}});
  draw();if(D.error)status('Saved overrides rejected; defaults loaded: '+D.error,true);
})();
