// pions/weather.js - NEXUS
// 20 villes avec coords de dictionaries.json
const COORDS = {
  "Paris": [48.85, 2.35],
  "Lyon": [45.75, 4.85],
  "Marseille": [43.29, 5.37],
  "Barcelone": [41.38, 2.17],
  "Madrid": [40.41, -3.70],
  "Londres": [51.50, -0.12],
  "Rome": [41.90, 12.49],
  "Berlin": [52.52, 13.40],
  "Lisbonne": [38.72, -9.13],
  "Amsterdam": [52.37, 4.89],
  "Bruxelles": [50.85, 4.35],
  "Marrakech": [31.62, -7.99],
  "New York": [40.71, -74.00],
  "Tokyo": [35.67, 139.65],
  "Dublin": [53.34, -6.26],
  "Prague": [50.07, 14.43],
  "Vienne": [48.20, 16.37],
  "Athènes": [37.98, 23.72],
  "Nice": [43.70, 7.26],
  "Bordeaux": [44.84, -0.58]
};

export async function execute(params) {
  const city = params.city;
  if (!city) {
    return { text: "Pour quelle ville tu veux la météo ?" };
  }

  const coords = COORDS[city];
  if (!coords) {
    return { text: `Je n'ai pas les coords pour ${city}, dis-moi une grande ville proche.` };
  }

  const [lat, lon] = coords;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.current_weather) {
      const w = data.current_weather;
      return {
        text: `${city}: ${w.temperature}°C, vent ${w.windspeed} km/h. Code météo ${w.weathercode}.`
      };
    }
  } catch (e) {}

  // fallback si offline
  return {
    text: `${city}: ~21°C en ce moment, vent léger. (données simulées - API indisponible)`
  };
}
