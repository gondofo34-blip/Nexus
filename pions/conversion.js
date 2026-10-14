// pions/conversion.js — convertit tout : monnaie, longueur, poids, temp, volume
const UNIT_MAP = {
  // monnaie
  euro: 'EUR', euros: 'EUR', eur: 'EUR', '€': 'EUR',
  dollar: 'USD', dollars: 'USD', usd: 'USD', '$': 'USD',
  livre: 'GBP', livres: 'GBP', gbp: 'GBP', '£': 'GBP', sterling: 'GBP',
  yen: 'JPY', yens: 'JPY', jpy: 'JPY',
  franc: 'CHF', francs: 'CHF', chf: 'CHF', 'franc suisse': 'CHF',
  cad: 'CAD', 'dollar canadien': 'CAD',
  // longueur base = m
  m: 'm', metre: 'm', metres: 'm', meter: 'm',
  km: 'km', kilometre: 'km', kilometres: 'km',
  cm: 'cm', centimetre: 'cm',
  mm: 'mm', millimetre: 'mm',
  mile: 'mi', miles: 'mi', mi: 'mi',
  pied: 'ft', pieds: 'ft', foot: 'ft', feet: 'ft', ft: 'ft',
  pouce: 'in', pouces: 'in', inch: 'in', inches: 'in', in: 'in',
  yard: 'yd', yards: 'yd',
  // poids base = kg
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramme: 'kg',
  g: 'g', gramme: 'g', grammes: 'g',
  mg: 'mg', milligramme: 'mg',
  tonne: 't', tonnes: 't', t: 't',
  lb: 'lb', livre: 'lb', livres: 'lb', lbs: 'lb',
  oz: 'oz', once: 'oz', onces: 'oz',
  // volume base = L
  l: 'L', litre: 'L', litres: 'L',
  ml: 'mL', millilitre: 'mL',
  cl: 'cL', centilitre: 'cL',
  gallon: 'gal', gallons: 'gal', gal: 'gal',
  // temp
  c: 'C', celsius: 'C', degre: 'C', degres: 'C', '°c': 'C',
  f: 'F', fahrenheit: 'F', '°f': 'F',
  k: 'K', kelvin: 'K'
};

const FACTORS = {
  // longueur -> m
  m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048, in: 0.0254, yd: 0.9144,
  // poids -> kg
  kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.453592, oz: 0.0283495,
  // volume -> L
  L: 1, mL: 0.001, cL: 0.01, gal: 3.78541
};

const CURRENCY_FALLBACK = { EUR:1, USD:1.08, GBP:0.85, JPY:162, CHF:0.95, CAD:1.47 };

function normalizeUnit(s){
  s = String(s).toLowerCase().trim().replace(/s$/,'');
  if(UNIT_MAP[s]) return UNIT_MAP[s];
  // essaye sans accents
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return UNIT_MAP[s] || null;
}

function parseFrenchNumberSimple(words){
  const UNITS={zero:0,un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,trente:30,quarante:40,cinquante:50,soixante:60,cent:100,mille:1000};
  let total=0, cur=0;
  for(let w of words){
    if(w==='et') continue;
    if(w==='quatre' && words[words.indexOf(w)+1]==='vingt'){ cur+=80; continue; }
    if(UNITS[w]!==undefined){
      if(w==='cent' || w==='mille'){ if(cur===0) cur=1; cur*=UNITS[w]; total+=cur; cur=0; }
      else cur+=UNITS[w];
    }
  }
  return total+cur;
}

function extractConversion(raw){
  let t = String(raw).toLowerCase().replace(/-/g,' ').trim();
  t = t.replace(/^(?:convertis|convertir|conversion|converti|transforme)\s*/g,'').trim();
  // coupe sur " en " ou " vers "
  let parts = t.split(/\s+en\s+|\s+vers\s+/);
  if(parts.length<2) return null;
  let left = parts[0].trim();
  let right = parts[1].trim();

  // nombre dans left
  let num = null;
  let m = left.match(/-?\d+([.,]\d+)?/);
  if(m){ num = parseFloat(m[0].replace(',','.')); left = left.replace(m[0],'').trim(); }
  else{
    // essaie mots français
    const tokens = left.split(/\s+/);
    let numWords=[];
    for(let tok of tokens){
      if(['zero','un','une','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','vingt','trente','quarante','cinquante','soixante','cent','mille','et'].includes(tok)){
        numWords.push(tok);
      }
    }
    if(numWords.length){ num = parseFrenchNumberSimple(numWords); left = left.replace(numWords.join(' '),'').trim(); }
  }
  if(num===null) num=1;
  return { num, fromRaw: left, toRaw: right };
}

function convertTemp(val, from, to){
  let c;
  if(from==='C') c=val;
  else if(from==='F') c=(val-32)*5/9;
  else if(from==='K') c=val-273.15;
  else return null;
  if(to==='C') return c;
  if(to==='F') return c*9/5+32;
  if(to==='K') return c+273.15;
  return null;
}

export async function execute(params){
  const raw = (params.text || params.expression || '').toString();
  const parsed = extractConversion(raw);
  if(!parsed) return { text: "Ex: convertis 20 euros en dollars, 100 km en miles, 20 degrés en fahrenheit" };

  const from = normalizeUnit(parsed.fromRaw);
  const to = normalizeUnit(parsed.toRaw);

  if(!from ||!to) return { text: `Je ne connais pas "${parsed.fromRaw}" ou "${parsed.toRaw}". Essaie : euros, dollars, km, miles, kg, livres, celsius, fahrenheit, litres` };

  // monnaie
  const currencies = ['EUR','USD','GBP','JPY','CHF','CAD'];
  if(currencies.includes(from) && currencies.includes(to)){
    try{
      const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      const data = await r.json();
      const rate = data.rates[to];
      const result = parsed.num * rate;
      return { text: `${parsed.num} ${from} = ${result.toFixed(2)} ${to}` };
    }catch(e){
      const rate = CURRENCY_FALLBACK[to]/CURRENCY_FALLBACK[from];
      return { text: `${parsed.num} ${from} ≈ ${(parsed.num*rate).toFixed(2)} ${to} (taux approximatif)` };
    }
  }

  // température
  if(['C','F','K'].includes(from) && ['C','F','K'].includes(to)){
    const result = convertTemp(parsed.num, from, to);
    return { text: `${parsed.num}°${from} = ${result.toFixed(1)}°${to}` };
  }

  // même famille
  if(FACTORS[from] && FACTORS[to]){
    const base = parsed.num * FACTORS[from];
    const result = base / FACTORS[to];
    return { text: `${parsed.num} ${from} = ${result.toFixed(3)} ${to}` };
  }

  return { text: `Je ne peux pas convertir ${from} en ${to}. Famille différente.` };
}
