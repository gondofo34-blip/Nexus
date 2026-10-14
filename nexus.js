// nexus.js — V3 Fixed — parseur central NEXUS
// Fix critique: /\bdans (\d{1,3}) .../ -> /\bdans (\d{1,3}) .../  (sans double escape)
// + extractCityAuto robuste sans ville en dur

let DICT = null;
let CFG = { maxDist: 2, minFuzzyLen: 5, propagateDate: true };

export function init(dict){
  DICT = dict;
  if(dict.config) CFG = { ...CFG, ...dict.config };
}

function normalize(s){
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

function levenshtein(a,b){
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(word, keyword){
  const w=normalize(word), k=normalize(keyword);
  if(w.includes(k) || k.includes(w)) return true;
  if(k.length < CFG.minFuzzyLen) return w===k;
  return levenshtein(w,k) <= CFG.maxDist;
}

function detectPions(text){
  const n=normalize(text);
  const tokens=n.split(/\s+/);
  const found=[];
  for(const [pion, keywords] of Object.entries(DICT.pions)){
    for(const kw of keywords){
      const kn=normalize(kw);
      if(kn.includes(" ")){
        if(n.includes(kn)){ found.push(pion); break; }
        const parts=kn.split(" ");
        let matches=0;
        for(const p of parts){ if(tokens.some(t=>fuzzyMatch(t,p))) matches++; }
        if(matches===parts.length){ found.push(pion); break; }
      }else{
        if(tokens.some(t=>fuzzyMatch(t,kn))){ found.push(pion); break; }
      }
    }
  }
  return [...new Set(found)];
}

function extractDate(text){
  const n=normalize(text);
  const now=new Date();

  if(/\bapres-demain\b/.test(n) || n.includes("apres demain")){
    const d=new Date(now); d.setDate(d.getDate()+2);
    return { date: "après-demain", date_iso: d.toISOString().slice(0,10) };
  }
  if(/\bdemain\b/.test(n)){
    const d=new Date(now); d.setDate(d.getDate()+1);
    return { date: "demain", date_iso: d.toISOString().slice(0,10) };
  }
  if(/\baujourd'hui\b/.test(n) || n.includes("aujourdhui") || /\bce soir\b/.test(n)){
    return { date: "aujourd'hui", date_iso: now.toISOString().slice(0,10) };
  }
  if(/\bce week-end\b/.test(n) || /\bweek-end\b/.test(n) || /\bweekend\b/.test(n)){
    const sat=new Date(now); sat.setDate(now.getDate()+(6-now.getDay()));
    return { date: "ce week-end", date_iso: sat.toISOString().slice(0,10) };
  }

  // FIXED — avant c'était /\\d/ qui ne matchait jamais
  const dansMatch=n.match(/\bdans (\d{1,3}) (jour|jours|semaine|semaines|mois)\b/);
  if(dansMatch){
    const num=parseInt(dansMatch[1],10);
    const unit=dansMatch[2];
    const d=new Date(now);
    if(unit.startsWith("jour")) d.setDate(d.getDate()+num);
    if(unit.startsWith("semaine")) d.setDate(d.getDate()+num*7);
    if(unit.startsWith("mois")) d.setMonth(d.getMonth()+num);
    return { date: `dans ${num} ${unit}`, date_iso: d.toISOString().slice(0,10) };
  }

  const mois=DICT.dates.mois.map(m=>normalize(m));
  for(let i=0;i<mois.length;i++){
    const re=new RegExp(`(\\d{1,2})?\\s*${mois[i]}`, "i");
    const m=n.match(re);
    if(m){
      const day=m[1]?parseInt(m[1],10):1;
      const d=new Date(now.getFullYear(), i, day);
      if(d < now) d.setFullYear(d.getFullYear()+1);
      return { date: m[0], date_iso: d.toISOString().slice(0,10) };
    }
  }
  return null;
}

function extractCityAuto(text){
  let t=text;
  const allKeywords=Object.values(DICT.pions).flat();
  for(const kw of allKeywords){
    const re=new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), "ig");
    t=t.replace(re," ");
  }
  const dateWords=[...DICT.dates.mois, ...DICT.dates.jours, ...DICT.dates.relatifs, "dans","jour","jours","semaine","semaines","mois"];
  for(const w of dateWords){
    const re=new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, "ig");
    t=t.replace(re," ");
  }
  for(const sw of DICT.stopwords){
    const re=new RegExp(`\\b${sw}\\b`, "ig");
    t=t.replace(re," ");
  }
  t=t.replace(/[^a-zA-ZÀ-ÿ\- ]/g," ").replace(/\s+/g," ").trim();
  const parts=t.split(" ").filter(Boolean);
  if(parts.length===0) return null;
  if(parts.length>=2){
    const candidate=parts.slice(-2).join(" ");
    return candidate.length>2 ? candidate : parts[parts.length-1];
  }
  return parts[0];
}

export function parse({text}){
  if(!DICT) throw new Error("DICT not initialized - call init(dict)");
  const pions=detectPions(text);
  const dateInfo=extractDate(text);
  const city=extractCityAuto(text);
  if(pions.length===0){
    if(city) return [{ pion: "meteo", params: { city, ...(dateInfo||{}), raw: text } }];
    return [];
  }
  return pions.map(p=>({
    pion: p,
    params: { ...(city?{city}:{}), ...(dateInfo?dateInfo:{}), raw: text }
  }));
}
