// pions/conversion.js V2 — tout + vrai taux + "fait combien"
const UNIT_MAP = {
  euro:'EUR', euros:'EUR', eur:'EUR', '€':'EUR',
  dollar:'USD', dollars:'USD', usd:'USD', '$':'USD',
  cad:'CAD', 'dollar canadien':'CAD', 'dollars canadien':'CAD',
  gbp:'GBP', livre:'GBP', livres:'GBP', sterling:'GBP', '£':'GBP',
  yen:'JPY', yens:'JPY', jpy:'JPY',
  chf:'CHF', franc:'CHF', francs:'CHF', 'franc suisse':'CHF',
  m:'m', metre:'m', metres:'m',
  km:'km', kilometre:'km', kilometres:'km', 'kilomètre':'km', 'kilomètres':'km',
  cm:'cm', centimetre:'cm', 'centimètre':'cm',
  mm:'mm', millimetre:'mm',
  mi:'mi', mile:'mi', miles:'mi',
  ft:'ft', pied:'ft', pieds:'ft', foot:'ft',
  in:'in', pouce:'in', pouces:'in', inch:'in',
  yd:'yd', yard:'yd',
  kg:'kg', kilo:'kg', kilos:'kg', kilogramme:'kg', kilogrammes:'kg',
  g:'g', gramme:'g', grammes:'g',
  mg:'mg', tonne:'t', tonnes:'t', t:'t',
  lb:'lb', lbs:'lb',
  oz:'oz', once:'oz', onces:'oz',
  L:'L', l:'L', litre:'L', litres:'L',
  mL:'mL', ml:'mL', millilitre:'mL',
  cL:'cL', cl:'cL', centilitre:'cL',
  gal:'gal', gallon:'gal', gallons:'gal',
  C:'C', c:'C', celsius:'C', '°c':'C', degre:'C', degres:'C', degré:'C', degrés:'C',
  F:'F', f:'F', fahrenheit:'F', '°f':'F',
  K:'K', k:'K', kelvin:'K'
};
const FACTORS = { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.34, ft:0.3048, in:0.0254, yd:0.9144, kg:1, g:0.001, mg:0.000001, t:1000, lb:0.453592, oz:0.0283495, L:1, mL:0.001, cL:0.01, gal:3.78541 };
const FILLER = new Set(['fait','combien','ca','ça','vaut','valent','font','c','est','combien','le','la','les','un','une','de','du','des','en','pour','a','à']);

function normUnit(s){
  if(!s) return null;
  s = s.toLowerCase().trim().replace(/s$/,'').replace(/\s+/g,' ');
  if(UNIT_MAP[s]) return UNIT_MAP[s];
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // prend le dernier mot si phrase
  const parts = s.split(' ').filter(w=>!FILLER.has(w));
  for(let i=parts.length-1;i>=0;i--){
    const w = parts.slice(i).join(' ');
    if(UNIT_MAP[w]) return UNIT_MAP[w];
    if(UNIT_MAP[parts[i]]) return UNIT_MAP[parts[i]];
  }
  return null;
}

function extractNum(text){
  let m = text.match(/-?\d+([.,]\d+)?/);
  if(m) return { num: parseFloat(m[0].replace(',','.')), rest: text.replace(m[0],'') };
  // mots français
  const map={zero:0,un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,trente:30,quarante:40,cinquante:50,soixante:60,cent:100,mille:1000};
  let cur=0,total=0,found=false;
  for(let w of text.split(/\s+/)){
    if(map[w]!==undefined){ found=true; if(w==='cent'||w==='mille'){ if(cur===0) cur=1; cur*=map[w]; total+=cur; cur=0; } else cur+=map[w]; }
  }
  if(found) return { num: total+cur, rest: text };
  return { num: 1, rest: text };
}

function convertTemp(v,f,t){
  let c = f==='C'?v : f==='F'?(v-32)*5/9 : v-273.15;
  if(t==='C') return c;
  if(t==='F') return c*9/5+32;
  if(t==='K') return c+273.15;
  return null;
}

export async function execute(params){
  let raw = (params.text||'').toLowerCase().replace(/-/g,' ').trim();
  raw = raw.replace(/^(?:convertis|convertir|conversion|transforme|transformer|change|changer)\s*/,'').trim();
  let parts = raw.split(/\s+en\s+|\s+vers\s+/);
  if(parts.length<2) return { text:"Ex: 20 euros en dollars, 100 km en miles, 25 degrés en fahrenheit" };

  let left = parts[0], right = parts[1];
  let { num, rest } = extractNum(left);
  let fromRaw = rest.replace(/fait combien|ça fait combien|ca fait combien|c'est combien|combien vaut|vaut combien|combien/g,'').trim();
  let toRaw = right;

  let from = normUnit(fromRaw);
  let to = normUnit(toRaw);

  // si from vide, devine C pour "25 degrés en fahrenheit"
  if(!from && to && ['C','F','K'].includes(to) && fromRaw.includes('degr')) from='C';
  if(!from) from = normUnit(left) || 'EUR';
  if(!to) return { text:`Je ne comprends pas "${toRaw}". Essaie : euros, cad, usd, km, miles, kg, celsius` };
  if(!from) return { text:`Je ne comprends pas "${fromRaw}".` };

  // MONNAIE - vrai taux
  const CUR = ['EUR','USD','CAD','GBP','JPY','CHF'];
  if(CUR.includes(from) && CUR.includes(to)){
    try{
      // API 1 : Frankfurter
      let r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if(r.ok){ let d=await r.json(); if(d.rates && d.rates[to]) return { text:`${num} ${from} = ${(num*d.rates[to]).toFixed(2)} ${to} (taux réel)` }; }
    }catch(e){}
    try{
      // API 2 : fawazahmed0 - gratuite sans clé
      let r2 = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`);
      if(r2.ok){ let d2=await r2.json(); let rate=d2[from.toLowerCase()][to.toLowerCase()]; if(rate) return { text:`${num} ${from} = ${(num*rate).toFixed(2)} ${to} (taux réel)` }; }
    }catch(e){}
    return { text:`${num} ${from} ≈ ${(num*1.08).toFixed(2)} ${to} (offline)` };
  }

  if(['C','F','K'].includes(from) && ['C','F','K'].includes(to)){
    const res = convertTemp(num, from, to);
    return { text:`${num}°${from} = ${res.toFixed(1)}°${to}` };
  }

  if(FACTORS[from] && FACTORS[to]){
    const base = num * FACTORS[from];
    return { text:`${num} ${from} = ${(base/FACTORS[to]).toFixed(3)} ${to}` };
  }

  return { text:`Je ne peux pas convertir ${from} → ${to}` };
}
