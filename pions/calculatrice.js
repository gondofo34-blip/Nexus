// pions/calculatrice.js — V1 maths complexes, garde tes acquis NEXUS
import * as mathjs from 'https://esm.sh/mathjs@12.4.2';

const math = mathjs.create(mathjs.all, {});

export async function execute(params) {
  // le texte brut arrive dans params.text (ex: "calcule 2+2*3")
  let expr = (params.expression || params.text || params.calcul || '').toString();

  // nettoyage : on vire les mots déclencheurs
  expr = expr.toLowerCase()
    .replace(/^(?:calcule|calculatrice|calcul|combien|résultat|c'est)\s*(?:moi)?\s*/g,'')
    .replace(/^(?:font|fait|font|egal|=)\s*/g,'')
    .replace(/\?/g,'')
    .replace(/x/g,'*')
    .replace(/÷/g,'/')
    .replace(/,/g,'.') // virgule FR -> point
    .trim();

  // si vide
  if (!expr) return { text: "Donne-moi un calcul : ex `calcule sin(pi/2) + sqrt(16)`" };

  try {
    // mathjs gère : complexe, matrices, trig, log, factorielle, etc.
    const result = math.evaluate(expr);
    
    // format joli
    let out = result;
    if (typeof result === 'object' && result.toString) out = result.toString();
    
    // 3 variantes
    const variants = [
      `${expr} = ${out}`,
      `Résultat : ${expr} = ${out}`,
      `${expr} → ${out}`
    ];
    return { text: variants[Math.floor(Math.random()*variants.length)] };
  } catch (e) {
    return { text: `Je n'ai pas compris "${expr}". Essaie : 2^8, sqrt(-4), sin(45 deg), factorial(5), det([[1,2],[3,4]])` };
  }
}
