var S={mode:"assess",fix:"pb",
  pre:32.00,post:31.61,noPre:0,noPost:0,hb:13.3,dust:0,kDust:0,
  pb:15,ex:0,dc:15,sp:4.3,out:360,tgt:8,lim:15,
  habP:8.2,habFO2:0.34,oxThr:21,ambWalk:1.5772,ambMicro:0.2945,walking:true,prior:0,gap:24,
  nDays:7,gapH:24,day:{}};

function D(i){return document.getElementById(i)}
/* habitat atmospheres NASA has specified the xEVA system to operate from,
   EVA-EXP-0075. the exploration atmosphere is the Artemis baseline. */
var ATMOS={
  expl:{p:8.2, f:0.34, name:"Exploration atmosphere"},
  mid :{p:10.2,f:0.265,name:"Intermediate"},
  iss :{p:14.7,f:0.21, name:"ISS standard"}
};
function prof(o){
  K.oxThr=S.oxThr; K.ambWalk=S.ambWalk; K.ambMicro=S.ambMicro;
  var p={habP:S.habP,habFO2:S.habFO2,suitP:S.sp,prebreathe:S.pb,exercise:S.ex,
         decompress:S.dc,outside:S.out,ambulatory:S.walking,priorEVAs:S.prior,gapHours:S.gap};
  if(o) for(var k in o) p[k]=o[k];
  return p;
}
function col(d){return d>K.dcsAccept*1.5?"var(--crit)":d>K.dcsAccept?"var(--warn)":"var(--ok)"}

/* the crew member's measured burden relative to the model, from the readings */
function personalFactor(){
  var r=inverse(prof(),{pre:S.pre,post:S.post,hb:S.hb,dust:S.dust,kDust:S.kDust});
  return r.usable? Math.min(4,Math.max(0.25,r.factor)) : 1;
}
/* ---------------------------------------------------------------------
   WHAT THE MEASUREMENT BUYS
   Blind  = the protocol you would fly knowing nothing about this person.
   Informed = the protocol that puts THIS person on the target.
   Time is the difference in oxygen time. Risk is what the blind protocol
   would actually have done to them.
   --------------------------------------------------------------------- */
function buys(nEVAs){
  var F=personalFactor(), p=prof(), t=S.tgt;
  var tBlind=oxygenTimeFor(t,p,S.ex,S.sp,1);
  var tInfo =oxygenTimeFor(t,p,S.ex,S.sp,F);
  var vgeBlind=forward(prof({prebreathe:tBlind,decompress:0})).vge;
  var actual=experiencedDCS(vgeBlind,F);
  var n=nEVAs||1;
  /* one quantity physiologically, two entries on an operational timeline.
     the decompression floor is held and prebreathe absorbs the remainder. */
  var dcInfo=Math.min(S.dc,tInfo), pbInfo=Math.max(0,tInfo-dcInfo);
  var dcBlind=Math.min(S.dc,tBlind), pbBlind=Math.max(0,tBlind-dcBlind);
  return { factor:F, tBlind:tBlind, tInfo:tInfo,
           pbBlind:pbBlind, pbInfo:pbInfo, dcBlind:dcBlind, dcInfo:dcInfo,
           dTime:(tInfo-tBlind)*n, dRisk:actual-t, actual:actual, n:n };
}
function buysBlock(nEVAs,scope){
  var b=buys(nEVAs);
  if(Math.abs(b.factor-1)<0.005)
    return '<div class="buys"><h4>What the measurement buys</h4>'+
      '<div><div class="k">Time</div><div class="v" style="color:var(--muted)">0<u>min</u></div>'+
      '<div class="s">This crew member reads as the model assumes, so the protocol does not move.</div></div>'+
      '<div><div class="k">Risk</div><div class="v" style="color:var(--muted)">0<u>pts</u></div>'+
      '<div class="s">Measuring confirmed the model rather than correcting it, which is itself worth knowing.</div></div></div>';
  var saves=b.dTime<0, avoids=b.dRisk>0;
  return '<div class="buys"><h4>What the measurement buys'+(b.n>1?", across "+b.n+" EVAs":"")+'</h4>'+
    '<div><div class="k">EVA time '+(saves?"saved":"added")+'</div>'+
      '<div class="v" style="color:'+(saves?"var(--ok)":"var(--warn)")+'">'+
      (saves?"":"+")+Math.round(b.dTime)+'<u>min</u></div>'+
      '<div class="s">Blind you would fly <b>'+b.pbBlind.toFixed(0)+'</b> prebreathe plus <b>'+
      b.dcBlind.toFixed(0)+'</b> decompression'+
      (b.n>1?" a day":"")+'. This crew member needs <b>'+b.pbInfo.toFixed(0)+' plus '+
      b.dcInfo.toFixed(0)+' min</b>'+
      (saves?', so measuring hands back '+Math.abs(Math.round(b.dTime))+' minutes'+(b.n>1?" over the mission":"")+'.'
            :', so measuring costs '+Math.round(b.dTime)+' minutes'+(b.n>1?" over the mission":"")+'.')+'</div></div>'+
    '<div><div class="k">DCS risk '+(avoids?"avoided":"traded away")+'</div>'+
      '<div class="v" style="color:'+(avoids?"var(--ok)":"var(--muted)")+'">'+
      (avoids?"−":"+")+Math.abs(b.dRisk).toFixed(2)+'<u>pts</u></div>'+
      '<div class="s">Flown blind, this crew member would sit at <b>'+b.actual.toFixed(2)+
      '%</b> against the <b>'+S.tgt.toFixed(1)+'%</b> intended'+
      (avoids?'. Measuring removes that gap.':'. They were already inside it, which is where the time comes from.')+'</div></div></div>';
}

/* ---------- ASSESSMENT ---------- */
function renderAssess(){
  var r=inverse(prof(),{pre:S.pre,post:S.post,hb:S.hb,dust:S.dust,kDust:S.kDust});
  var f=r.forward;
  D("k1").textContent="Decompression risk assessment index";
  D("v1").textContent=r.vge.toFixed(0);
  D("v1").style.color=col(r.dcs);
  D("k2").textContent="DCS probability";
  D("v2").textContent=r.dcs.toFixed(2)+"%";
  D("v2").style.color=col(r.dcs);
  D("k3").textContent="Model expected";
  D("v3").textContent=f.vge.toFixed(0);
  D("v3").style.color="var(--muted)";

  var over=r.dcs>K.dcsAccept;
  D("verdict").style.color=over?"var(--crit)":"var(--ok)";
  D("verdictTxt").textContent=over?"Over NASA's 15% limit":"Inside NASA's 15% limit";

  var noTxt="";
  if(S.noPre>0&&S.noPost>0){
    var noPct=100*(S.noPost-S.noPre)/S.noPre, vc=r.dPct-noPct;
    noTxt=" Nitric oxide splits that into "+noPct.toFixed(2)+"% membrane and "+
      (vc>=0?"+":"")+vc.toFixed(2)+"% capillary blood volume.";
  }
  D("note").innerHTML = r.rising
    ? "The reading rose from <b>"+S.pre.toFixed(2)+"</b> to <b>"+S.post.toFixed(2)+"</b>. The lung does not improve across an EVA, so the earlier value understated this crew member's baseline. Carry <b>"+S.post.toFixed(2)+"</b> forward and score this EVA as zero."
    : "Diffusing capacity fell <b>"+Math.abs(r.dPct).toFixed(2)+"%</b>, from <b>"+S.pre.toFixed(2)+
      "</b> to <b>"+S.post.toFixed(2)+"</b>. Taking off the part explained by oxygen exposure"+
      (S.kDust*S.dust?", dust":"")+" and haemoglobin leaves <b>"+(-r.residual).toFixed(3)+
      "%</b> attributable to bubbles, which is an index of <b>"+r.vge.toFixed(0)+
      "</b> and a decompression sickness probability of <b>"+r.dcs.toFixed(2)+"%</b>. The protocol flown was modelled to give <b>"+
      f.vge.toFixed(0)+"</b>, so this crew member reads "+
      (r.usable?("<b>"+r.factor.toFixed(2)+"&#215;</b> the modelled burden."):"a burden the model cannot be compared against.")+noTxt;

  D("buys").innerHTML="";
  D("plot").innerHTML=barPlot(r.vge,f.vge);
}
function barPlot(meas,model){
  var W=760,H=92,L=4,w=W-8;
  function x(v){return L+w*Math.min(100,v)/100}
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';
  s+='<rect x="'+L+'" y="34" width="'+w+'" height="8" rx="4" fill="#171f2a"/>';
  s+='<rect x="'+L+'" y="34" width="'+(x(meas)-L)+'" height="8" rx="4" fill="'+(meas>model?"#e0a53a":"#46c97e")+'"/>';
  s+='<line x1="'+x(model)+'" y1="27" x2="'+x(model)+'" y2="49" stroke="#74849a" stroke-width="2"/>';
  s+='<text x="'+x(model)+'" y="20" fill="#74849a" font-size="11" font-family="monospace" text-anchor="middle">model '+model.toFixed(0)+'</text>';
  s+='<text x="'+x(meas)+'" y="66" fill="#e9eff6" font-size="11" font-family="monospace" text-anchor="middle">measured '+meas.toFixed(0)+'</text>';
  s+='<text x="'+L+'" y="84" fill="#74849a" font-size="10" font-family="monospace">0</text>';
  s+='<text x="'+(W-4)+'" y="84" fill="#74849a" font-size="10" font-family="monospace" text-anchor="end">100</text>';
  return s+'</svg>';
}

/* ---------- PLANNING ----------
   One lever is held where you put it. The other two are driven: move either
   and the remaining one is re-solved so the target DCS probability is kept.
   Suit pressure is a constant here, set in Advanced.
   ------------------------------------------------------------------------ */
var LEV={ pb:{label:"Prebreathe",unit:"min",min:0,max:480,dp:0},
          ex:{label:"Prebreathe exercise",unit:"mL/kg/min",min:0,max:25,dp:1},
          dc:{label:"Decompression time",unit:"min",min:0,max:120,dp:0} };
var LAST="ex";                    /* which free lever the user touched last */
function clamp(v,L){ return Math.max(L.min,Math.min(L.max,v)); }

/* re-solve the one free lever the user did not just touch */
function rebalance(){
  var p=prof(), t=S.tgt;
  var free=["pb","ex","dc"].filter(function(k){ return k!==S.fix; });
  var drive = (free.indexOf(LAST)>=0) ? free[1-free.indexOf(LAST)] : free[1];
  var v;
  if(drive==="ex"){
    v=exerciseFor(t,p,S.pb+S.dc,S.sp);
  } else {                                   /* pb or dc, both are oxygen time */
    var need=oxygenTimeFor(t,p,S.ex,S.sp);
    v = (drive==="pb") ? need-S.dc : need-S.pb;
  }
  S[drive]=isFinite(v)?clamp(v,LEV[drive]):LEV[drive].max;
  var el=D(drive); el.value=S[drive];
  D("o"+drive.toUpperCase()).innerHTML=S[drive].toFixed(LEV[drive].dp)+
    ' <span>'+LEV[drive].unit+'</span>';
  return drive;
}

function renderPlan(){
  var drive=rebalance();
  var free=["pb","ex","dc"].filter(function(k){ return k!==S.fix; });
  var slide=free.filter(function(k){ return k!==drive; })[0];
  var f=forward(prof());
  var miss=Math.abs(f.dcs-S.tgt)>0.05;

  ["pb","ex","dc"].forEach(function(k){
    var c=D("c"+k.toUpperCase()), tag=D("d"+k.toUpperCase());
    c.classList.toggle("held",k===S.fix);
    tag.textContent = k===S.fix?"held fixed" : k===drive?"solved to hold the target":"slide me";
    tag.style.color = k===S.fix?"var(--gas)" : k===drive?"var(--accent)":"var(--muted)";
  });
  D("fixNote").innerHTML="Holding <b style='color:var(--gas)'>"+LEV[S.fix].label.toLowerCase()+
    "</b>. Move <b>"+LEV[slide].label.toLowerCase()+"</b> and <b style='color:var(--accent)'>"+
    LEV[drive].label.toLowerCase()+"</b> follows to keep "+S.tgt.toFixed(1)+"%.";

  D("k1").textContent="DCS probability";
  D("v1").innerHTML=f.dcs.toFixed(2)+'<u>%</u>';
  D("v1").style.color=col(f.dcs);
  D("k2").textContent="Index";
  D("v2").textContent=f.vge.toFixed(0); D("v2").style.color="var(--muted)";
  D("k3").textContent="Tissue ratio";
  D("v3").textContent=f.Reff.toFixed(3);
  D("v3").style.color=f.Reff>K.rLimit?"var(--crit)":"var(--muted)";

  /* why the target is unreachable, when it is. every lever here only lowers risk,
     so a held lever that already over-protects can never be climbed back out of. */
  var needTotal = oxygenTimeFor(S.tgt,prof(),S.ex,S.sp,1);
  var heldVal2  = S[S.fix];
  var overProtect = miss && f.dcs < S.tgt;
  var reason="";
  if(miss && overProtect){
    if(S.fix==="dc"||S.fix==="pb"){
      var maxHold=Math.max(0,needTotal);
      reason = heldVal2>maxHold
        ? LEV[S.fix].label+" of "+heldVal2.toFixed(0)+" min already over-protects. "+
          "This target needs <b>"+needTotal.toFixed(0)+" min</b> of oxygen time in total, so "+
          LEV[S.fix].label.toLowerCase()+" cannot exceed <b>"+maxHold.toFixed(0)+" min</b> and still allow it. "+
          "Lower it, or lower the target."
        : "Nothing left to give. The habitat alone already meets this target.";
    } else {
      reason = "Exercise only speeds nitrogen clearance, so it cannot raise risk back to the target. "+
               "Lower the target or shorten the time on oxygen.";
    }
    if(needTotal<=0) reason = "At <b>"+S.tgt.toFixed(1)+"%</b> the habitat needs no prebreathe at all, so any "+
      "oxygen time at all over-protects. The lowest risk this atmosphere gives with no intervention is <b>"+
      forward(prof({prebreathe:0,decompress:0,exercise:0})).dcs.toFixed(2)+"%</b>. Lower the target to tune a protocol.";
  }
  D("verdict").style.color=miss?"var(--warn)":"var(--ok)";
  D("verdictTxt").textContent=miss
    ? (overProtect?"Target unreachable, this protocol is safer at "+f.dcs.toFixed(2)+"%"
                  :"Target unreachable, nearest is "+f.dcs.toFixed(2)+"%")
    : "On target";

  var deg=(S.fix==="ex");
  if(reason){ D("note").innerHTML="<b style='color:var(--warn)'>Why.</b> "+reason; D("buys").innerHTML=""; D("plot").innerHTML=tradeCurve(LEV[slide],LEV[drive],slide,drive); return; }
  D("note").innerHTML="Suit at <b>"+S.sp.toFixed(1)+" psid</b>. Holding "+
    LEV[S.fix].label.toLowerCase()+" at <b>"+S[S.fix].toFixed(LEV[S.fix].dp)+" "+LEV[S.fix].unit+
    "</b>, the protocol that lands on <b>"+S.tgt.toFixed(1)+"%</b> is "+
    LEV[slide].label.toLowerCase()+" <b>"+S[slide].toFixed(LEV[slide].dp)+" "+LEV[slide].unit+
    "</b> with "+LEV[drive].label.toLowerCase()+" <b>"+S[drive].toFixed(LEV[drive].dp)+" "+
    LEV[drive].unit+"</b>."+
    (miss?" That is the closest reachable, since "+LEV[drive].label.toLowerCase()+
          " ran to its "+(S[drive]<=LEV[drive].min+1e-6?"floor":"ceiling")+".":"")+
    (deg?" Prebreathe and decompression are the same lever in effect, both being time on oxygen, so this pair trades one for one.":"");

  D("buys").innerHTML=buysBlock(1);
  D("plot").innerHTML=tradeCurve(LEV[slide],LEV[drive],slide,drive);
}

/* every combination of the two free levers that meets the target */
function partnerOf(slideKey,driveKey,v){
  var p=prof(), t=S.tgt;
  var pb=S.pb, ex=S.ex, dc=S.dc;
  if(slideKey==="pb") pb=v; else if(slideKey==="ex") ex=v; else dc=v;
  if(driveKey==="ex") return exerciseFor(t,p,pb+dc,S.sp);
  var need=oxygenTimeFor(t,p,ex,S.sp);
  return (driveKey==="pb") ? need-dc : need-pb;
}
function tradeCurve(A,B,aKey,bKey){
  var W=760,H=380,L=66,R=24,T=22,Bm=48,w=W-L-R,h=H-T-Bm,N=160;
  var xv=function(v){return L+w*(v-A.min)/(A.max-A.min)};
  var yv=function(v){return T+h-h*(Math.max(B.min,Math.min(B.max,v))-B.min)/(B.max-B.min)};
  var pts=[],i,a,b;
  for(i=0;i<=N;i++){
    a=A.min+(A.max-A.min)*i/N; b=partnerOf(aKey,bKey,a);
    if(isFinite(b)) pts.push([a,b]);
  }
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">',g,gv;
  for(g=0;g<=5;g++){ gv=B.min+(B.max-B.min)*g/5;
    s+='<line x1="'+L+'" y1="'+yv(gv)+'" x2="'+(W-R)+'" y2="'+yv(gv)+'" stroke="#1f2935"/>'+
       '<text x="'+(L-8)+'" y="'+(yv(gv)+4)+'" fill="#74849a" font-size="10" font-family="monospace" text-anchor="end">'+gv.toFixed(B.dp)+'</text>'; }
  for(g=0;g<=5;g++){ gv=A.min+(A.max-A.min)*g/5;
    s+='<line x1="'+xv(gv)+'" y1="'+T+'" x2="'+xv(gv)+'" y2="'+(T+h)+'" stroke="#1f2935"/>'+
       '<text x="'+xv(gv)+'" y="'+(T+h+18)+'" fill="#74849a" font-size="10" font-family="monospace" text-anchor="middle">'+gv.toFixed(A.dp)+'</text>'; }
  var inr=pts.filter(function(p){return p[1]>=B.min-1e-9 && p[1]<=B.max+1e-9;});
  if(inr.length>1){
    var d=inr.map(function(p,i){return (i?"L":"M")+xv(p[0])+" "+yv(p[1])}).join(" ");
    s+='<path d="'+d+' L'+xv(inr[inr.length-1][0])+' '+yv(B.max)+' L'+xv(inr[0][0])+' '+yv(B.max)+' Z" fill="rgba(70,201,126,.10)"/>';
    s+='<path d="'+d+'" fill="none" stroke="#58c2d4" stroke-width="2.5"/>';
  }
  s+='<circle cx="'+xv(S[aKey])+'" cy="'+yv(S[bKey])+'" r="6.5" fill="#ff9f45" stroke="#080b10" stroke-width="2"/>';
  s+='<text x="'+(L+w/2)+'" y="'+(H-10)+'" fill="#74849a" font-size="11" text-anchor="middle">'+A.label+' ('+A.unit+')</text>';
  s+='<text transform="translate(18,'+(T+h/2)+') rotate(-90)" fill="#74849a" font-size="11" text-anchor="middle">'+B.label+' ('+B.unit+')</text>';
  s+='<text x="'+(W-R)+'" y="'+(T+12)+'" fill="#46c97e" font-size="11" font-family="monospace" text-anchor="end">shaded side is safer than '+S.tgt.toFixed(1)+'%</text>';
  return s+'</svg>';
}

/* ---------- MISSION ----------
   The same protocol every day. Each day is predicted using only the days
   before it, so every prediction is out of sample before it becomes data.
   ------------------------------------------------------------------------ */
function missionDays(){
  var out=[], factor=1, n=0, sum=0;
  for(var d=1;d<=S.nDays;d++){
    var p=prof({priorEVAs:d-1,gapHours:S.gapH});
    var model=forward(p);
    /* the personal factor is a ratio of LIKELIHOODS, not of tissue ratios.
       apply it to the venous gas emboli likelihood, then invert back to a
       ratio so the decompression sickness fit can be read off the same point. */
    var vge=Math.min(99.9,model.vge*factor);
    var R=hillVGEinv(vge);
    var rec={day:d,model:model,
             predDcs:hillDCS(R),predVge:vge,factor:factor,
             expPost:S.pre*(1+(-(K.kBub*vge/100+K.kOx*model.H))/100)};
    var v=S.day["d"+d];
    if(v!=null&&v>0){
      var r=inverse(p,{pre:S.pre,post:v,hb:S.hb,dust:S.dust,kDust:S.kDust});
      rec.post=v; rec.meas=r;
      if(r.usable){ sum+=Math.min(4,Math.max(0.25,r.factor)); n++; factor=sum/n; }
    }
    out.push(rec);
  }
  return out;
}
function renderCamp(){
  K.dcsAccept=S.lim;          /* the mission panel sets its own limit */
  var days=missionDays(), last=days[days.length-1];
  var breach=0; for(var i=0;i<days.length;i++) if(days[i].predDcs>K.dcsAccept){breach=days[i].day;break;}
  var fitted=days.filter(function(d){return d.meas&&d.meas.usable}).length;

  D("k1").textContent="Days inside "+S.lim.toFixed(1)+"%";
  D("v1").innerHTML=(breach===1?"0":breach?String(breach-1):String(S.nDays)+"+")+'<u>days</u>';
  D("v1").style.color=breach===1?"var(--crit)":breach?"var(--warn)":"var(--ok)";
  D("k2").textContent="Day "+S.nDays+" DCS";
  D("v2").textContent=last.predDcs.toFixed(2)+"%"; D("v2").style.color=col(last.predDcs);
  D("k3").textContent="Calibrated on";
  D("v3").textContent=fitted; D("v3").style.color="var(--muted)";

  D("verdict").style.color=breach?"var(--warn)":"var(--ok)";
  D("verdictTxt").textContent=breach===1?"Over 15% on the first day"
    :breach?"Over 15% from day "+breach:"Inside 15% for the whole mission";

  D("note").innerHTML="The same protocol flown "+S.nDays+" days running, "+S.gapH+
    " hours apart. Carryover from the bubble nuclei left by each EVA reaches <b>"+
    last.model.Reff.toFixed(3)+"</b> on the tissue ratio by the last day, against <b>"+
    days[0].model.Reff.toFixed(3)+"</b> on the first."+
    (fitted? " Calibrated on <b>"+fitted+"</b> measured day"+(fitted===1?"":"s")+
             ", personal factor <b>"+last.factor.toFixed(2)+"</b>."
           : " No readings entered, so the blue path is the model alone.");

  var rows="<tr><th>Day</th><th>Predicted DCS</th><th>Expected DL<sub>CO</sub></th><th>Measured</th><th>Measured DCS</th></tr>";
  days.forEach(function(d){
    rows+="<tr"+(d.meas?" class='has'":"")+"><td>"+d.day+"</td>"+
      "<td style='color:"+col(d.predDcs)+"'>"+d.predDcs.toFixed(2)+"%</td>"+
      "<td>"+d.expPost.toFixed(2)+"</td>"+
      "<td><input type='number' step='0.01' data-day='"+d.day+"' value='"+(d.post!=null?d.post:"")+"' placeholder='"+d.expPost.toFixed(2)+"'></td>"+
      "<td>"+(d.meas?"<span style='color:"+col(d.meas.dcs)+"'>"+d.meas.dcs.toFixed(2)+"%</span>":"—")+"</td></tr>";
  });
  D("buys").innerHTML=buysBlock(S.nDays);
  D("limNote").innerHTML = Math.abs(S.lim-15)<0.01
    ? "15% is NASA-STD-3001 [V2 6008], per person per EVA at 95% confidence."
    : (S.lim<15 ? "Tighter than NASA's 15% limit. This is the margin a flight surgeon might choose to hold."
                : "Looser than NASA's 15% limit, shown for comparison only.");
  D("plot").innerHTML=missionChart(days)+"<table class='days'>"+rows+"</table>";

  Array.prototype.forEach.call(D("plot").querySelectorAll("input[data-day]"),function(el){
    el.addEventListener("change",function(){
      var v=parseFloat(this.value);
      if(isFinite(v)&&v>0) S.day["d"+this.dataset.day]=v; else delete S.day["d"+this.dataset.day];
      render();
    });
  });
}
function missionChart(days){
  var W=760,H=300,L=52,R=20,T=18,Bm=40,w=W-L-R,h=H-T-Bm;
  var vals=days.map(function(d){return Math.max(d.predDcs,d.meas?d.meas.dcs:0)});
  var maxY=Math.max(K.dcsAccept*1.5,1.15*Math.max.apply(null,vals));
  var xv=function(i){return L+(days.length<2?w/2:w*i/(days.length-1))};
  var yv=function(v){return T+h-h*Math.min(v,maxY)/maxY};
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">',g;
  for(g=0;g<=4;g++){ var gv=maxY*g/4;
    s+='<line x1="'+L+'" y1="'+yv(gv)+'" x2="'+(W-R)+'" y2="'+yv(gv)+'" stroke="#1f2935"/>'+
       '<text x="'+(L-8)+'" y="'+(yv(gv)+4)+'" fill="#74849a" font-size="10" font-family="monospace" text-anchor="end">'+gv.toFixed(1)+'</text>'; }
  var ay=yv(K.dcsAccept);
  s+='<line x1="'+L+'" y1="'+ay+'" x2="'+(W-R)+'" y2="'+ay+'" stroke="#e35d5d" stroke-width="1.5" stroke-dasharray="5 4"/>'+
     '<text x="'+(W-R-2)+'" y="'+(ay-6)+'" fill="#e35d5d" font-size="10" font-family="monospace" text-anchor="end">NASA 15% limit</text>';
  s+='<polyline points="'+days.map(function(d,i){return xv(i)+","+yv(d.predDcs)}).join(" ")+'" fill="none" stroke="#58c2d4" stroke-width="2"/>';
  days.forEach(function(d,i){
    s+='<circle cx="'+xv(i)+'" cy="'+yv(d.predDcs)+'" r="3.5" fill="#58c2d4"/>'+
       '<text x="'+xv(i)+'" y="'+(H-12)+'" fill="#74849a" font-size="10" font-family="monospace" text-anchor="middle">'+d.day+'</text>'; });
  var mp=days.map(function(d,i){return d.meas?xv(i)+","+yv(d.meas.dcs):null}).filter(Boolean);
  if(mp.length>1) s+='<polyline points="'+mp.join(" ")+'" fill="none" stroke="#ff9f45" stroke-width="2"/>';
  days.forEach(function(d,i){ if(d.meas) s+='<circle cx="'+xv(i)+'" cy="'+yv(d.meas.dcs)+'" r="4.5" fill="#ff9f45"/>'; });
  s+='<text x="'+(W-R)+'" y="'+(T+10)+'" fill="#58c2d4" font-size="10" font-family="monospace" text-anchor="end">predicted</text>';
  if(mp.length) s+='<text x="'+(W-R)+'" y="'+(T+24)+'" fill="#ff9f45" font-size="10" font-family="monospace" text-anchor="end">measured</text>';
  s+='<text transform="translate(14,'+(T+h/2)+') rotate(-90)" fill="#74849a" font-size="11" text-anchor="middle">DCS probability (%)</text>';
  return s+'</svg>';
}

/* ---------- wiring ---------- */
function syncAtm(){
  var hit=null;
  for(var k in ATMOS) if(Math.abs(ATMOS[k].p-S.habP)<0.05&&Math.abs(ATMOS[k].f-S.habFO2)<0.005) hit=k;
  Array.prototype.forEach.call(D("atmSel").querySelectorAll("button"),function(b){
    b.setAttribute("aria-pressed",String(b.dataset.a===hit)); });
  var R=forward(prof()).Rrest;
  D("atmNote").innerHTML = "Tissue nitrogen at equilibrium <b>"+(S.habP*(1-S.habFO2)).toFixed(2)+
    " psi</b>. NASA gives 5.4 psi for 8.2 at 34% and 11.6 psi for 14.7 at 21%."+
    (hit?"":" Custom, edit in Advanced.")+
    (R>1.6?" <b style='color:var(--warn)'>Ratio "+R.toFixed(2)+" is far outside the 1.22 to 1.49 band the risk fits were checked against. This atmosphere needs hours of prebreathe, not minutes, and the number shown is not trustworthy until it does.</b>":"");
}
function render(){
  syncAtm();
  /* the model is Haldanean. it compares dissolved nitrogen against ambient
     pressure at the endpoint and has no term for the rate of the drop. a fast
     decompression excites more micronuclei into growing bubbles at the same
     dissolved load, so the risk shown below is an underestimate at short times,
     and a very fast drop is a barotrauma hazard before it is a bubble one. */
  D("dcWarn").innerHTML = S.dc<=3
    ? "<b style='color:var(--crit)'>Below 3 minutes this is a rapid decompression.</b> Ear, sinus and lung barotrauma become the limiting hazard, and the bubble risk shown is an underestimate because this model has no term for the rate of the pressure drop."
    : S.dc<10
    ? "<b style='color:var(--warn)'>Short.</b> A fast drop excites more bubble nuclei at the same dissolved nitrogen load. This model does not represent that, so the risk shown is an underestimate here."
    : "";
  K.oxThr=S.oxThr; K.ambWalk=S.ambWalk; K.ambMicro=S.ambMicro;
  var plan=S.mode==="plan", camp=S.mode==="camp", assess=S.mode==="assess";
  D("measBlock").classList.toggle("hide",plan);
  D("targetBlock").classList.toggle("hide",!plan);
  D("campBlock").classList.toggle("hide",!camp);
  D("cOUT").classList.toggle("hide",plan);
  ["dPB","dEX","dDC"].forEach(function(i){ D(i).style.display=plan?"block":"none"; });
  if(!plan) ["cPB","cEX","cDC"].forEach(function(i){ D(i).classList.remove("held"); });
  D("evaHead").textContent=plan?"The EVA":camp?"The daily protocol":"The EVA that was flown";
  if(camp) renderCamp(); else { K.dcsAccept=15; if(plan) renderPlan(); else renderAssess(); }
}
function br(id,out,key,unit,dp){
  var el=D(id),o=D(out);
  function u(){S[key]=parseFloat(el.value);
    if(key==="pb"||key==="ex"||key==="dc") LAST=key;
    o.innerHTML=(dp!=null?S[key].toFixed(dp):S[key])+(unit?' <span>'+unit+'</span>':'');render()}
  el.addEventListener("input",u);u();
}
br("pb","oPB","pb","min"); br("ex","oEX","ex","mL/kg/min",1);
br("dc","oDC","dc","min"); br("sp","oSP","sp","psid",2);
br("out","oOUT","out","min"); br("tgt","oTgt","tgt","% DCS",1);
br("nDays","oNDays","nDays","days"); br("gapH","oGapH","gapH","hours");
br("lim","oLim","lim","% DCS",1);
["pre","post","noPre","noPost","hb","dust","kDust","habP","habFO2","oxThr","ambWalk","ambMicro","prior","gap"]
 .forEach(function(k){D(k).addEventListener("input",function(){S[k]=parseFloat(this.value)||0;render()})});
function seg(id,fn){D(id).addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  this.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});
  fn(b);render()})}
seg("gravSel",function(b){S.walking=(b.dataset.g==="1")});
seg("atmSel",function(b){ var A=ATMOS[b.dataset.a];
  S.habP=A.p; S.habFO2=A.f; D("habP").value=A.p; D("habFO2").value=A.f; });
seg("fixSel",function(b){S.fix=b.dataset.f;
  LAST=["pb","ex","dc"].filter(function(k){return k!==S.fix})[0];});
seg("modes",function(b){S.mode=b.dataset.m});
try{if(window.claude&&window.claude.hot)window.claude.hot.snapshot(function(){return S})}catch(e){}
render();
