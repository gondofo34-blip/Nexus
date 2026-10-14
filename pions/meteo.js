// pions/meteo.js V2 BLINDÉ
const DATE_WORDS = ['aujourd\'hui','demain','apres-demain','apres demain','ce soir','ce matin','demain matin','demain soir','demain apres-midi','cette semaine','semaine prochaine','week-end','ce week-end','lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche','janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre','matin','midi','apres-midi','soir','nuit'];

function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }

function extractCityAndDate(raw){
  let text = String(raw||'').toLowerCase();
  let date = null;

  // trouve date
  for(let w of DATE_WORDS.sort((a,b)=>b.length-a.length)){
    if(text.includes(w)){ date = w; break; }
  }
  // enlève date de la ville
  let city = text;
  for(let w of DATE_WORDS){ city = city.replace(w,' '); }
  city = city.replace(/météo|meteo|à|a|de|pour|sur|quelle|quel temps|il fait/gi,' ').replace(/\s+/g,' ').trim();

  // "paris matin" -> "paris"
  city = city.split(' ').filter(Boolean)[0] || city;

  return { city: city.trim() || 'Paris', date: date || 'aujourd\'hui' };
}

export async function execute(params){
  const { city, date } = extractCityAndDate(params.text || params.city || '');

  // si params.city existe déjà depuis nexus.js
  let finalCity = params.city || city;
  let finalDate = params.date || date;

  finalCity = finalCity.replace(/matin|midi|soir|nuit/gi,'').trim();

  //... ton fetch météo ici
  // pour test:
  return { text: `météo • ${finalCity} (${finalDate}) - OK découpe` };
}
