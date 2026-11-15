(() => {
  'use strict';const N=NasaRisk,$=id=>document.getElementById(id);
  function draw(){const c=N.current();$('b0').value=c.b0;$('b1').value=c.b1;$('expression').value=c.expression;$('status').textContent=N.error?'Saved configuration rejected: '+N.error:N.modified?'Developer overrides active. Published case values remain fixed.':'Published regression defaults loaded.';}
  function draft(){return {version:1,b0:$('b0').value===''?NaN:Number($('b0').value),b1:$('b1').value===''?NaN:Number($('b1').value),expression:$('expression').value};}
  function preview(){if($('bgi').value==='')throw Error('Enter a BGI.');const n=Number($('bgi').value),c=draft(),risk=N.probability(n,c);$('result').textContent=`BGI ${n} → ${risk.toFixed(4)}% DCS. Draft coefficients: b0 ${c.b0}, b1 ${c.b1}. This predicts probability from BGI only, not BGI from an EVA plan.`;return c;}
  $('preview').onclick=()=>{try{preview();$('status').textContent='Draft validated; not saved.';}catch(e){$('status').textContent=e.message;}};
  $('apply').onclick=()=>{try{N.apply(preview());$('status').textContent='Applied locally. Open comparison screens refresh automatically; published reference risks stay unchanged.';}catch(e){$('status').textContent=e.message;}};
  $('reset').onclick=()=>{try{N.apply(N.defaults());draw();preview();$('status').textContent='Published regression defaults restored.';}catch(e){$('status').textContent=e.message;}};
  window.addEventListener('storage',e=>{if(e.key===N.KEY){N.load();$('apply').disabled=true;$('status').textContent='Configuration changed in another tab. Reload before applying this draft.';}});
  draw();
})();
