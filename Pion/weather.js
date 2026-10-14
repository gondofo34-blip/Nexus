// pions/weather.js — V4 Vraie météo complète, zéro ville en dur
const WEATHER_CODE = {
  0: "ciel dégagé", 1: "plutôt dégagé", 2: "partiellement nuageux", 3: "couvert",
  45: "brouillard", 48: "brouillard givrant", 51: "bruine", 53: "bruine modérée", 55: "forte bruine",
  61: "pluie légère", 63: "pluie modérée", 65: "forte pluie",
  71: "neige légère", 73: "neige", 75: "forte neige",
  80: "averses légères", 81: "averses", 82: "fortes averses",
  95: "orage", 96: "orage avec grêle"
};

async function geocode(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`);
  const j = await r.json();
  if (!j.results?.[0]) return null;
  const g = j.results[0];
  return { lat: g.latitude, lon: g.longitude, name: g.name, country: g.country, admin: g.admin1 || '' };
}

export async function execute(params) {
  const cityRaw = params.city || 'Paris';
  const dateIso = params.date_iso; // ex: 2026-05-13
  const isTomorrow = dateIso ? true : false;

  const geo = await geocode(cityRaw);
  if (!geo) return { text: `Je ne trouve pas "${cityRaw}" sur la carte.` };

  // On demande tout : actuel + journalier
  const base = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&timezone=auto`;
  const currentFields = `current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weathercode,wind_speed_10m,wind_gusts_10m`;
  const dailyFields = `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,wind_speed_10m_max,sunrise,sunset`;
  
  let url;
  if (dateIso) {
    url = `${base}&${dailyFields}&start_date=${dateIso}&end_date=${dateIso}`;
  } else {
    url = `${base}&${currentFields}&${dailyFields}&forecast_days=1`;
  }

  const res = await fetch(url);
  const data = await res.json();

  // Données journalières (toujours présentes)
  const d = data.daily;
  const tMax = Math.round(d.temperature_2m_max[0]);
  const tMin = Math.round(d.temperature_2m_min[0]);
  const code = d.weathercode[0];
  const desc = WEATHER_CODE[code] || 'temps variable';
  const precip = d.precipitation_sum[0];
  const precipProb = d.precipitation_probability_max ? d.precipitation_probability_max[0] : 0;
  const windMax = Math.round(d.wind_speed_10m_max[0]);
  const sunrise = d.sunrise[0] ? d.sunrise[0].split('T')[1].slice(0,5) : '';
  const sunset = d.sunset[0] ? d.sunset[0].split('T')[1].slice(0,5) : '';

  // Données actuelles si on est aujourd'hui
  let nowTxt = '';
  if (data.current) {
    const c = data.current;
    nowTxt = `Actuellement ${Math.round(c.temperature_2m)}°C (ressenti ${Math.round(c.apparent_temperature)}°C), humidité ${c.relative_humidity_2m}%, vent ${Math.round(c.wind_speed_10m)} km/h. `;
  }

  const dateLabel = params.date || (dateIso ? `le ${dateIso.split('-').reverse().join('/')}` : "aujourd'hui");

  // 3 variantes pour ne pas avoir toujours la même phrase
  const variants = [
    `À ${geo.name} ${dateLabel} : ${desc}, ${tMin}°C / ${tMax}°C. ${precip>0?`Pluie ${precip}mm (${precipProb}%). `:''}Vent max ${windMax} km/h. Lever ${sunrise} - Coucher ${sunset}. ${nowTxt}`,
    `${geo.name} (${geo.country}) ${dateLabel} -> ${desc}. Min ${tMin}°C, max ${tMax}°C, vent ${windMax} km/h. ${precipProb>20?`Risque de pluie ${precipProb}%. `:''}${nowTxt}Lever du soleil à ${sunrise}.`,
    `Météo ${geo.name} ${dateLabel} : ${desc}. ${tMin} à ${tMax}°C, ${precip>0?`${precip}mm de pluie, `:''}vent ${windMax} km/h, lever ${sunrise} coucher ${sunset}. ${nowTxt}`.trim()
  ];

  const text = variants[Math.floor(Math.random()*variants.length)];
  return { text };
}
