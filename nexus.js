// NEXUS V3.3 — fix calculatrice + ville "Deux" - VERSION STABLE
const DEFAULTS = { maxDist: 2, minFuzzyLen: 5, propagateDate: true };
const SPLIT = /\s*(?:[,;]|\b(?:et aussi|ainsi que|puis|ensuite|et)\b)\s*/;
let defaultDicts = null;
const indexCache = new WeakMap();
export function init(dictionaries){ defaultDicts=dictionaries; getIndex(dictionaries); }
export function normalize(s){
  return String(s ?? '').toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g,'$3/$2/$1').replace(/(?<!\d)(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})(?!\d)/g,'$1/$2/$3').replace(/['’`´\-_]/g,' ').replace(/[^a-z0-9,;\/\+\-\*\(\)\^%!\.×÷ ]/g,' ').replace(/\s+/g,' ').trim().replace(/entre (?:le )?(\d{1,2}) et (?:le )?(\d{1,2})(?= |$)/g,'du $1 au $2');
}
function isMathRaw(s){
  const raw = String(s).trim();
  if(raw.length<2) return false;
  if(!/^[\d\s\.\,\+\-\*\/\^\(\)×÷%!xX]+$/.test(raw)) return false;
  if(!/\d/.test(raw)) return false;
  if(!/[×÷\*\/\+\-\^%!xX]/.test(raw)) return false;
  return true;
}
function lev(a,b,max){
  if(a===b) return 0; const la=a.length, lb=b.length;
  if(Math.abs(la-lb)>max) return max+1;
  let prev=new Array(lb+1); for(let j=0;j<=lb;j++) prev[j]=j;
  for(let i=1;i<=la;i++){ const cur=[i]; let rowMin=i;
    for(let j=1;j<=lb;j++){ const cost=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1; const v=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost); cur[j]=v; if(v<rowMin) rowMin=v; }
    if(rowMin>max) return max+1; prev=cur;
  } return prev[lb];
}
function getIndex(d){
  let idx=indexCache.get(d); if(idx) return idx;
  const exact=new Map(); const byCount=[[],[],[],[]];
  const stop=new Set((d.stopwords||[]).map(normalize));
  const add=(raw,type,id)=>{ const term=normalize(raw); if(!term) return; const n=term.split(' ').length; if(n>3||exact.has(term)) return; const entry={term,type,id}; exact.set(term,entry); byCount[n].push(entry); };
  for(const v of d.villes||[]) add(v,'ville',v);
  for(const [pion,words] of Object.entries(d.pions||{})){ for(const w of words) add(w,'pion',pion); }
  const dt=d.dates||{}; for(const w of dt.mois||[]) add(w,'date',w); for(const w of dt.jours||[]) add(w,'date',w); for(const w of dt.relatifs||[]) add(w,'date',w);
  const mois=(dt.mois||[]).map(normalize); const jours=(dt.jours||[]).map(normalize); const rel=(dt.relatifs||[]).map(normalize).sort((a,b)=>b.length-a.length);
  const mo=mois.join('|')||'(?!)'; const jo=jours.join('|')||'(?!)'; const re=rel.length?rel.join('|'):'(?! )';
  idx={ exact, byCount, stop, mois, jours, re:{
    range:new RegExp(`\\bdu (\\d{1,2}|1er)(?: (${mo}))? au (\\d{1,2}|1er) (${mo})(?: (\\d{4}))?\\b`),
    day:new RegExp(`\\b(?:le )?(\\d{1,2}|1er) (${mo})(?: (\\d{4}))?\\b`),
    num:/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
    dans:/\bdans (\d{1,3}) (jour|jours|semaine|semaines|mois)\b/,
    rel:new RegExp(`\\b(${re})\\b`),
    jour:new RegExp(`\\b(${jo})(?: (prochain))?\\b`),
    mois:new RegExp(`\\b(?:(?:en|au mois de|mois de) )?(${mo})(?: (\\d{4}))?\\b`),
  }};
  indexCache.set(d,idx); return idx;
}
function toTitleCase(s){ return s.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').trim(); }
function cleanCandidate(cand, idx){
  let parts=cand.split(' ').filter(Boolean);
  parts=parts.filter(p=>{ const e=idx.exact.get(p); if(!e) return true; return e.type!=='date' && e.type!=='pion'; });
  parts=parts.filter(p=>!['stp','svp','plait','please'].includes(p));
  return parts.join(' ').trim();
}
function extractCityAuto(segmentNorm, idx){
  const re=/(?:\b(?:a|au|aux|vers|pour|sur|en|chez|de|du|des|d)\s+)([a-z\-]+(?:\s+[a-z\-]+){0,3})/g;
  let m, candidates=[];
  while((m=re.exec(segmentNorm))!==null){
    let cand=cleanCandidate(m[1].trim(), idx);
    cand=cand.replace(/^(?:a|d|l|m|t|s)\s+/i,'').trim();
    if(cand.length>=2 && cand.length<=40){
      cand=cand.replace(/\s+(?:stp|svp|plait)$/i,'').trim();
      if(cand) candidates.push(cand);
    }
  }
  if(candidates.length){ return toTitleCase(candidates[candidates.length-1]); }
  const tokens=segmentNorm.split(' ').filter(Boolean);
  if(tokens.length===1){
    const t=tokens[0]; const e=idx.exact.get(t);
    if(!e && !idx.stop.has(t) && t.length>=2) return toTitleCase(t);
  }
  const connectors=new Set(['en','de','du','des','la','le','les','saint','sainte','d','sables','aix']);
  const rest=tokens.filter(t=>{
    if(t.length<2 && !connectors.has(t)) return false;
    const e=idx.exact.get(t);
    if(e && (e.type==='pion'||e.type==='date')) return false;
    if(['stp','svp','plait','please'].includes(t)) return false;
    if(/^\d+$/.test(t)) return false;
    if(idx.stop.has(t) && !connectors.has(t)) return false;
    return true;
  });
  if(rest.length){
    if(rest.length>=3 && rest[rest.length-2]==='en'){ return toTitleCase([rest[rest.length-3],'en',rest[rest.length-1]].join(' ')); }
    if(rest.length>=2){
      const last=rest[rest.length-1]; const prev=rest[rest.length-2];
      if(['la','le','les','saint','sainte'].includes(prev)){ return toTitleCase(prev+' '+last); }
    }
    return toTitleCase(rest[rest.length-1]);
  }
  return null;
}
function matchAt(tokens,i,idx,cfg){
  const maxN=Math.min(3,tokens.length-i);
  for(let n=maxN;n>=1;n--){ const e=idx.exact.get(tokens.slice(i,i+n).join(' ')); if(e) return {entry:e,n,dist:0}; }
  let best=null;
  for(let n=maxN;n>=1;n--){ const slice=tokens.slice(i,i+n); if(slice.every(t=>idx.stop.has(t)||/^[0-9/]+$/.test(t))) continue; const cand=slice.join(' '); if(cand.length<cfg.minFuzzyLen) continue; const max=Math.min(cfg.maxDist,cand.length>=7?2:1); for(const e of idx.byCount[n]){ const dist=lev(cand,e.term,max); if(dist<=max && (!best||dist<best.dist)) best={entry:e,n,dist}; } }
  return best;
}
function analyse(segment,idx,cfg){
  const tokens=segment.split(' '); const out=[]; const matches=[]; const corrections=[]; let i=0;
  while(i<tokens.length){ const m=matchAt(tokens,i,idx,cfg); if(m){ matches.push(m); out.push(m.entry.term); if(m.dist>0) corrections.push([tokens.slice(i,i+m.n).join(' '),m.entry.term]); i+=m.n; }else{ out.push(tokens[i]); i++; } }
  return {text:out.join(' '),matches,corrections};
}
function pickPion(matches){
  const scores={}; for(const m of matches){ if(m.entry.type!=='pion') continue; const s=(1-0.25*m.dist)*(1+0.5*(m.n-1)); scores[m.entry.id]=(scores[m.entry.id]||0)+s; }
  let best=null,bestScore=0,second=0; for(const [pion,s] of Object.entries(scores)){ if(s>bestScore){ second=bestScore; best=pion; bestScore=s; }else if(s>second) second=s; } return {pion:best,score:bestScore,second};
}
const pad=n=>String(n).padStart(2,'0'); const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; const num=s=>s==='1er'?1:parseInt(s,10);
function mk(y,m,d){ const dt=new Date(y,m-1,d); return dt.getMonth()===m-1&&dt.getDate()===d?dt:null; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function resolveDay(day,month,year,today){ const y=year?(year<100?2000+year:year):today.getFullYear(); let dt=mk(y,month,day); if(dt&&!year&&dt<today) dt=mk(y+1,month,day); return dt; }
function extractDate(text,idx,today){
  const R=idx.re; let m;
  if((m=R.range.exec(text))){ const d1=num(m[1]),d2=num(m[3]); const m2=idx.mois.indexOf(m[4])+1; const m1=m[2]?idx.mois.indexOf(m[2])+1:m2; const year=m[5]?parseInt(m[5],10):null; const start=resolveDay(d1,m1,year,today); let end=start?mk(start.getFullYear(),m2,d2):null; if(start&&end&&end<start) end=mk(start.getFullYear()+1,m2,d2); return {text:m[0],iso:start&&ymd(start),endIso:end&&ymd(end)}; }
  if((m=R.day.exec(text))){ const dt=resolveDay(num(m[1]),idx.mois.indexOf(m[2])+1,m[3]?parseInt(m[3],10):null,today); return {text:m[0].replace(/^le /,''),iso:dt&&ymd(dt)}; }
  if((m=R.num.exec(text))){ const dt=resolveDay(parseInt(m[1]),parseInt(m[2]),m[3]?parseInt(m[3],10):null,today); return {text:m[0],iso:dt&&ymd(dt)}; }
  if((m=R.dans.exec(text))){ const n=parseInt(m[1],10); let dt; if(m[2].startsWith('jour')) dt=addDays(today,n); else if(m[2].startsWith('semaine')) dt=addDays(today,7*n); else{ dt=new Date(today); dt.setMonth(dt.getMonth()+n); } return {text:m[0],iso:ymd(dt)}; }
  if((m=R.rel.exec(text))){ const w=m[1],dow=today.getDay(); let dt=null; if(w==='demain'||w==='demain matin'||w==='demain soir') dt=addDays(today,1); else if(w==='apres demain') dt=addDays(today,2); else if(['aujourd hui','ce soir','ce matin','matin','midi','apres midi','soir','nuit'].includes(w)) dt=today; else if(w==='ce week end'||w==='week end') dt=addDays(today,dow===0?0:(6-dow+7)%7); else if(w==='semaine prochaine') dt=addDays(today,((1-dow+7)%7)||7); return {text:w,iso:dt&&ymd(dt)}; }
  if((m=R.jour.exec(text))){ const target=[1,2,3,4,5,6,0][idx.jours.indexOf(m[1])]; let diff=(target-today.getDay()+7)%7; if(m[2]&&diff===0) diff=7; return {text:m[0],iso:ymd(addDays(today,diff))}; }
  if((m=R.mois.exec(text))){ return {text:m[0].replace(/^(?:en|au mois de|mois de) /,''),iso:null}; }
  return null;
}
function toToday(now){ const d=now?new Date(now):new Date(); const base=Number.isNaN(d.getTime())?new Date():d; return new Date(base.getFullYear(),base.getMonth(),base.getDate()); }
export function parse(input,dictionaries){
  const obj=input&&typeof input==='object'?input:{}; const original=typeof input==='string'?input:String(obj.text??''); const debug=!!obj.debug;
  const generic=()=>{ const el={pion:'generic',params:{text:original}}; if(debug) el.confidence=0; return [el]; };
  const d=dictionaries||defaultDicts; if(!d) throw new Error('NEXUS : dictionnaires non chargés. Fais init(dict) avant parse()');
  try{
    if(isMathRaw(original)){ return [{pion:'calculatrice', params:{text:original, expression:original}}]; }
    const idx=getIndex(d); const cfg={...DEFAULTS,...(d.config||{})}; const today=toToday(obj.now); const clean=normalize(original); if(!clean) return generic();
    const segs=clean.split(SPLIT).map(s=>s.trim()).filter(Boolean).map(segment=>{
      const a=analyse(segment,idx,cfg); const p=pickPion(a.matches);
      let cityMatch=a.matches.find(m=>m.entry.type==='ville');
      let autoCity=extractCityAuto(segment,idx);
      if(p.pion==='calculatrice'){ cityMatch=null; autoCity=null; }
      return {segment,...a,...p,inherited:false,city:cityMatch?cityMatch.entry.id:autoCity,date:extractDate(a.text,idx,today)};
    });
    let last=null; for(const s of segs){ if(s.pion) last=s; else if(s.city&&last){ s.pion=last.pion; s.score=last.score*0.6; s.second=0; s.inherited=true; } }
    const propagate=key=>{ segs.forEach((s,i)=>{ if(s[key]) return; for(let j=i-1;j>=0;j--) if(segs[j][key]){ s[key]=segs[j][key]; return; } for(let j=i+1;j<segs.length;j++) if(segs[j][key]){ s[key]=segs[j][key]; return; } }); };
    propagate('city'); if(cfg.propagateDate) propagate('date');
    const seen=new Set(); const result=[];
    for(const s of segs){
      if(!s.pion) continue;
      const params={}; 
      if(s.city) params.city=s.city; 
      if(s.date){ params.date=s.date.text; if(s.date.iso) params.date_iso=s.date.iso; if(s.date.endIso) params.date_end_iso=s.date.endIso; }
      params.text=s.segment;
      params.expression=s.segment;
      const key=s.pion+JSON.stringify({city:params.city,date:params.date}); if(seen.has(key)) continue; seen.add(key);
      const el={pion:s.pion,params}; if(debug){ const c=0.45+0.25*s.score+0.15*(s.score-s.second)+(s.city?0.1:0); el.confidence=Math.round(Math.min(0.99,c)*100)/100; el.segment=s.segment; if(s.corrections.length) el.corrections=s.corrections; if(s.inherited) el.inherited=true; }
      result.push(el);
    }
    return result.length?result:generic();
  }catch(e){ console.error(e); return generic(); }
}
