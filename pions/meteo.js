// pions/meteo.js V5 - 0 ville en dur, prêt pour vraie API
const DATE_WORDS = ['demain matin','demain soir','apres-demain','aujourd\'hui','demain','ce soir','ce matin','cette semaine','semaine prochaine','week-end','ce week-end','matin','midi','apres-midi','soir','nuit'];

function cleanCityFromText(s){
  let t = String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  [...DATE_WORDS].sort((a,b)=>b.length-a.length).forEach(w=>{ t = t.split(w).join(' '); });
  t = t.replace(/\b(meteo|temperature|pluie|soleil|temps|prevision|quel|quelle|il fait|degres)\b/gi,' ');
  t = t.replace(/\b(a|au|aux|vers|pour|sur|en|chez|de|du|des|d|le|la|les|un|une|stp|svp)\b/gi,' ');
  t = t.replace(/\s+/g,' ').trim();
  return t.split(' ').filter(Boolean).slice(0,3).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').trim();
}

export async function execute(params){
  let city = params.city || cleanCityFromText(params.text || '');
  if(!city){
    return { text: "Tu veux la météo de quelle ville ?" };
  }
  const date = params.date || 'demain';
  // EXEMPLE VRAI API - décommente et mets ta clé
  // const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=TA_CLE&units=metric&lang=fr`);
  // const data = await res.json();
  // return { text: `Météo à ${city} (${date}): ${data.weather[0].description}, ${data.main.temp}°C` };
  return { text: `meteo • ${city} (${date})` };
}
