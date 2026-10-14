// pions/meteo.js V4 - FIX DEFINITIF
const DATE_WORDS = ['demain matin','demain soir','apres-demain','aujourd\'hui','demain','ce soir','ce matin','matin','midi','apres-midi','soir','nuit'];

function cleanCity(s){
  let t = String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  DATE_WORDS.sort((a,b)=>b.length-a.length).forEach(w=>{ t = t.replaceAll(w,' ') });
  t = t.replace(/\b(meteo|temps|temperature|prevision)\b/gi,' ');
  t = t.replace(/\b(a|au|aux|pour|sur|en|de|du|des|le|la|les|un|une)\b/gi,' ');
  t = t.replace(/\s+/g,' ').trim();
  return t.split(' ').slice(0,2).join(' ') || 'Paris';
}
export async function execute(params){
  const city = cleanCity(params.city || params.text || '');
  const date = params.date || 'demain';
  return { text: `meteo • ${city} (${date})` };
}
