// pions/calculatrice.js V5 — écriture complète : deux plus deux = quatre
import * as mathjs from 'https://esm.sh/mathjs@12.4.2';
const math = mathjs.create(mathjs.all, {});

const UNITS = {zero:0, un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10, onze:11, douze:12, treize:13, quatorze:14, quinze:15, seize:16, 'dix-sept':17, 'dix-huit':18, 'dix-neuf':19, 'dix sept':17, 'dix huit':18, 'dix neuf':19};
const TENS = {vingt:20, vingts:20, trente:30, quarante:40, cinquante:50, soixante:60};

function parseFrenchNumber(words){
  let w = words.map(x=>x.toLowerCase()).filter(x=>x!=='et');
  let out=[];
  for(let i=0;i<w.length;i++){
    if(w[i]==='quatre' && w[i+1] && w[i+1].startsWith('vingt')){ out.push('80'); i++; }
    else out.push(w[i]);
  }
  w=out;
  let total=0, cur=0;
  for(let word of w){
    if(UNITS[word]!==undefined) cur+=UNITS[word];
    else if(TENS[word]!==undefined) cur+=TENS[word];
    else if(!isNaN(parseInt(word))) cur+=parseInt(word);
    else if(word==='cent'||word==='cents'){ if(cur===0) cur=1; cur*=100; total+=cur; cur=0; }
    else if(word==='mille'){ if(cur===0) cur=1; cur*=1000; total+=cur; cur=0; }
    else if(word==='80') cur+=80;
  }
  return total+cur;
}

function numberToLetters(n){
  if(!Number.isFinite(n) ||!Number.isInteger(n)) return null;
  if(n<0) return "moins "+numberToLetters(-n);
  if(n>1000) return null;
  if(n===0) return "zéro";
  if(n<20){
    const arr=["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
    return arr[n];
  }
  if(n<70){
    const ten=Math.floor(n/10), unit=n%10;
    const tenWord={2:"vingt",3:"trente",4:"quarante",5:"cinquante",6:"soixante"}[ten];
    if(unit===0) return tenWord;
    if(unit===1) return tenWord+" et un";
    return tenWord+"-"+numberToLetters(unit);
  }
  if(n<80){
    if(n===70) return "soixante-dix";
    return "soixante-"+numberToLetters(n-60);
  }
  if(n<90){
    if(n===80) return "quatre-vingts";
    return "quatre-vingt-"+numberToLetters(n-80);
  }
  if(n<100){
    return "quatre-vingt-"+numberToLetters(n-80);
  }
  if(n<1000){
    const c=Math.floor(n/100), r=n%100;
    if(c===1) return r===0? "cent" : "cent "+numberToLetters(r);
    return r===0? numberToLetters(c)+" cents" : numberToLetters(c)+" cent "+numberToLetters(r);
  }
  if(n===1000) return "mille";
  return null;
}

function wordsToExpression(raw){
  let s = raw.toLowerCase().replace(/-/g,' ').replace(/'/g,' ').trim();
  s = s.replace(/^(?:calcule|calculatrice|calcul|combien|c'est|résultat)\s*(?:moi)?\s*/g,'').replace(/\?/g,'');
  s = s.replace(/multiplié par/g,' fois ').replace(/multiplie par/g,' fois ')
     .replace(/divisé par/g,' divise ').replace(/divise par/g,' divise ')
     .replace(/au carré/g,' ^2 ').replace(/au cube/g,' ^3 ')
     .replace(/racine carrée de/g,' sqrt ').replace(/racine de/g,' sqrt ')
     .replace(/pour cent de/g,' % de ').replace(/pourcent de/g,' % de ');
  const tokens = s.split(/\s+/).filter(Boolean);
  let expr=''; let numBuf=[];
  const flushNum=()=>{ if(numBuf.length){ const n=parseFrenchNumber(numBuf); if(n!==null) expr+=n; numBuf=[]; } };
  for(let t of tokens){
    if(UNITS[t]!==undefined || TENS[t]!==undefined || t==='cent' || t==='cents' || t==='mille' || t==='vingt' || t==='vingts' || t==='quatre' || t==='et' || t==='80' ||!isNaN(parseInt(t))){
      numBuf.push(t);
    }else{
      flushNum();
      if(t==='plus') expr+='+';
      else if(t==='moins') expr+='-';
      else if(t==='fois' || t==='x' || t==='×') expr+='*';
      else if(t==='divise') expr+='/';
      else if(t==='de') expr+='*';
      else if(/^[0-9\.\+\-\*\/\^\(\)%]+$/.test(t)) expr+=t;
      else if(['sqrt','^','(',')','%'].includes(t)) expr+=t;
    }
  }
  flushNum();
  expr = expr.replace(/,/g,'.').replace(/÷/g,'/').replace(/×/g,'*').replace(/(\d)([a-z])/g,'$1*$2');
  return expr;
}

function solveLinear(expr){
  if(!expr.includes('=')) return null;
  const [l,r]=expr.split('='); if(!l||!r) return null;
  if(!l.includes('x') &&!r.includes('x')) return null;
  try{
    const f=(v)=>math.evaluate(`${l}-(${r})`,{x:v});
    const b=f(0), a=f(1)-b; if(a===0) return null;
    const x=-b/a;
    const lettre=numberToLetters(Math.round(x));
    return lettre? `x = ${x} (${lettre})` : `x = ${x}`;
  }catch(e){ return null; }
}

export async function execute(params){
  let raw = (params.expression || params.text || '').toString().trim();
  if(!raw) return { text: "Ex: deux plus deux, vingt fois trois" };
  const isEq = raw.includes('=') && raw.toLowerCase().includes('x');
  let expr = wordsToExpression(raw);
  const sol = solveLinear(expr);
  if(sol) return { text: `${raw} → ${sol}` };
  try{
    const result = math.evaluate(expr);
    const isWritten = /[a-zA-Zà-ÿ]/.test(raw);
    const num = Number(result);
    if(isWritten && Number.isInteger(num)){
      const lettres = numberToLetters(num);
      if(lettres) return { text: `${raw} = ${num} (${lettres})` };
    }
    return { text: `${raw} = ${result.toString()}` };
  }catch(e){
    return { text: `Je n'ai pas compris "${raw}"` };
  }
}
