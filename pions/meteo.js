// pions/meteo.js V3 FIX FINAL
const DIRTY = ['demain matin','demain soir','demain apres-midi','apres-demain','apres demain',"aujourd'hui",'demain','ce soir','ce matin','cette semaine','semaine prochaine','week-end','ce week-end','matin','midi','apres-midi','soir','nuit','lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

function cleanCity(s){
  let t = String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  DIRTY.sort((a,b)=>b.length-a.length).forEach(w=>{
    t = t.replaceAll(w,' ');
  });
  t = t.replace(/meteo|temps|quelle|quel|il fait|a|à|pour|de|sur|en|au|aux|le|la|les|un|une/gi,' ');
  t = t.replace(/\s+/g,' ').trim();
  // garde 2 mots max pour New York / Los Angeles
  t = t.split(' ').filter(Boolean).slice(0,2).join(' ');
  return t || 'Paris';
}

export async function execute(params){
  // on nettoie TOUJOURS params.city, on l'ignore pas
  const raw = params.city || params.text || '';
  const city = cleanCity(raw);
  const date = params.date || (String(params.text||'').toLowerCase().includes('demain')? 'demain' : "aujourd'hui");

  return { text: `meteo • ${city} (${date}) - OK découpe` };
}
