// Wrapper de la Claude API. Permite usar env var o key guardada en localStorage.
// IMPORTANTE: para producción, mover a un backend (serverless function en Vercel)
// usando ANTHROPIC_API_KEY como secret. Esta versión cliente es para desarrollo / demo.

const MODEL = 'claude-sonnet-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

export function getApiKey() {
  return (
    localStorage.getItem('calcal:anthropic_key') ||
    import.meta.env.VITE_ANTHROPIC_API_KEY ||
    ''
  );
}

export function hasApiKey() {
  return Boolean(getApiKey());
}

export function setApiKey(key) {
  if (key) localStorage.setItem('calcal:anthropic_key', key);
  else     localStorage.removeItem('calcal:anthropic_key');
}

const SYSTEM_COACH = `Eres un coach nutricional experto, amable y motivador llamado CalCal.
Hablas en español por defecto, breve y concreto. Tus consejos son prácticos, basados en evidencia (déficit/superávit calórico, proteína 1.6-2.4 g/kg, distribución de macros, adherencia).
Nunca das consejos médicos; recomiendas consultar un profesional para condiciones clínicas.
Cuando el usuario te comparta sus números (peso, calorías, macros, objetivo), úsalos para personalizar.
Responde con bullets cuando ayuden a leer rápido. Usa emojis con mesura. Máximo 180 palabras.`;

const SYSTEM_PARSER = `Eres un parser de alimentos en español. Recibes una frase como "2 huevos con avena y leche" y devuelves SOLO JSON válido con esta forma:
{"items":[{"name":"huevo","qty":2,"unit":"unidad","kcal":156,"protein":12,"carbs":1.2,"fat":10,"fiber":0}]}
Estima valores nutricionales típicos. No incluyas texto fuera del JSON.`;

async function callClaude({ messages, system, max_tokens = 700 }) {
  const key = getApiKey();
  if (!key) throw new Error('Falta API key de Claude. Configúrala en Ajustes.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: MODEL, max_tokens, system, messages })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

export async function coachChat(messages, userContext = '') {
  const system = userContext
    ? `${SYSTEM_COACH}\n\nContexto del usuario:\n${userContext}`
    : SYSTEM_COACH;
  return callClaude({ system, messages, max_tokens: 600 });
}

export async function parseWithAI(text) {
  const out = await callClaude({
    system: SYSTEM_PARSER,
    messages: [{ role: 'user', content: text }],
    max_tokens: 500
  });
  try {
    const json = JSON.parse(out.trim());
    return json.items || [];
  } catch {
    // Intenta extraer JSON entre llaves
    const m = out.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]).items || [];
      } catch { /* noop */ }
    }
    return [];
  }
}

export async function generateMealPlan({ profile, targets, preferences = '' }) {
  const prompt = `Genera un plan de comidas para 1 día con esta configuración:
- Objetivo: ${profile.goal}
- Calorías: ${targets.calories} kcal
- Proteína: ${targets.protein}g | Carbos: ${targets.carbs}g | Grasas: ${targets.fat}g
- Comidas/día: ${profile.mealsPerDay || 4}
- Restricciones: ${profile.restrictions?.join(', ') || 'ninguna'}
- Preferencias: ${preferences || 'flexibles'}

Devuelve SOLO JSON:
{"meals":[{"name":"Desayuno","items":[{"food":"...","qty":"...","kcal":0,"protein":0,"carbs":0,"fat":0}]}]}`;

  const out = await callClaude({
    system: 'Eres un nutricionista que devuelve solo JSON válido.',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500
  });
  try {
    const m = out.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { meals: [] };
  } catch {
    return { meals: [] };
  }
}

export async function generateRecipe({ name, targets }) {
  const prompt = `Crea una receta llamada "${name}" optimizada para:
- ~${targets.calories || 500} kcal
- ~${targets.protein || 35}g proteína
Devuelve markdown breve: ingredientes con cantidades, pasos numerados, macros totales al final.`;

  return callClaude({
    system: 'Eres un chef nutricionista. Respuestas en español, prácticas, sin paja.',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 700
  });
}
