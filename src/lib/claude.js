// Wrapper de Google Gemini 1.5 Flash. Pese a su nombre histórico (claude.js), este
// archivo es el cliente unificado de IA para CalCal: coach nutricional, parser de
// alimentos en texto, generación de planes y recetas, y análisis de fotos (Vision).
//
// Una sola API key configura todas las capacidades (texto + visión).
// La key se almacena bajo 'calcal:gemini_key' para compartirla con cualquier otro
// módulo que la consulte.

import { dataUrlToBase64, mimeFromDataUrl } from './image';

const TEXT_MODEL   = 'gemini-2.0-flash-001';
const VISION_MODEL = 'gemini-2.0-flash-001'; // mismo modelo, soporta multimodal
const API_BASE = 'https://generativelanguage.googleapis.com/v1/models';
const STORAGE_KEY = 'calcal:gemini_key';

// ---------- API key ----------
export function getApiKey() {
  return (
    localStorage.getItem(STORAGE_KEY) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  );
}
export function hasApiKey() {
  return Boolean(getApiKey());
}
export function setApiKey(key) {
  if (key) localStorage.setItem(STORAGE_KEY, key);
  else     localStorage.removeItem(STORAGE_KEY);
}

// ---------- Helpers ----------
/**
 * Convierte un historial estilo Claude (role: 'user' | 'assistant') al formato
 * que espera Gemini (role: 'user' | 'model', parts: [{ text }]).
 */
function toGeminiContents(messages = []) {
  return messages
    .filter((m) => m && m.content)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }]
    }));
}

/**
 * Llamada principal a la API de Gemini.
 */
async function callGemini({
  model = TEXT_MODEL,
  contents,
  systemInstruction,
  temperature = 0.4,
  maxOutputTokens = 800,
  responseMimeType
}) {
  const key = getApiKey();
  if (!key) throw new Error('Falta API key de Gemini. Configúrala en Ajustes → Coach IA.');

  const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens }
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Extrae el primer bloque JSON razonable de un texto.
 */
function safeJsonParse(text) {
  if (!text) return null;
  try { return JSON.parse(text.trim()); } catch { /* noop */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* noop */ }
  }
  return null;
}

// ---------- System prompts ----------
const SYSTEM_COACH = `Eres un coach nutricional experto, amable y motivador llamado CalCal.
Hablas en español por defecto, breve y concreto. Tus consejos son prácticos, basados en evidencia (déficit/superávit calórico, proteína 1.6-2.4 g/kg, distribución de macros, adherencia).
Nunca das consejos médicos; recomiendas consultar un profesional para condiciones clínicas.
Cuando el usuario te comparta sus números (peso, calorías, macros, objetivo), úsalos para personalizar.
Responde con bullets cuando ayuden a leer rápido. Usa emojis con mesura. Máximo 180 palabras.`;

const SYSTEM_PARSER = `Eres un parser de alimentos en español. Recibes una frase como "2 huevos con avena y leche" y devuelves SOLO JSON válido con esta forma:
{"items":[{"name":"huevo","qty":2,"unit":"unidad","kcal":156,"protein":12,"carbs":1.2,"fat":10,"fiber":0}]}
Estima valores nutricionales típicos. No incluyas texto fuera del JSON.`;

const SYSTEM_VISION = `Eres un nutricionista experto en identificar alimentos a partir de una foto.
Analiza la foto y estima los ingredientes principales con sus cantidades aproximadas.
Devuelve SOLO JSON válido con esta forma exacta:
{
  "title": "nombre breve del plato",
  "items": [
    { "name": "alimento", "qty": 100, "unit": "g", "kcal": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }
  ],
  "confidence": "alta" | "media" | "baja"
}
Reglas:
- Estima en gramos, ml o unidades según corresponda.
- Si no puedes ver bien, marca confidence "baja" y sé conservador.
- Texto en español.
- No incluyas texto fuera del JSON.`;

const SYSTEM_NUTRITION_LABEL = `Eres un OCR especializado en tablas nutricionales de etiquetas de alimentos.
Analiza la foto y extrae los valores de la tabla "Información nutricional".
Devuelve SOLO JSON válido con esta forma:
{
  "kcal": número entero (energía en kcal),
  "protein": número (proteínas en gramos),
  "carbs": número (hidratos de carbono en gramos),
  "fat": número (grasas en gramos),
  "fiber": número (fibra en gramos, opcional),
  "servingSize": "texto descriptivo (ej: '100 g', '1 vaso 240ml', '1 yogur 125g')",
  "perWhat": "per100g" | "serving" | "unit"
}
Reglas:
- Si la tabla muestra "Por 100 g" o "Per 100g" → perWhat = "per100g".
- Si muestra valores por porción/ración (ej: "Por porción", "Per serving") → perWhat = "serving" y servingSize con la cantidad.
- Si valores por unidad/pieza → perWhat = "unit".
- Si solo hay un valor energético en kJ, conviértelo a kcal (kJ ÷ 4.184).
- Si un valor no es claro o no aparece, omítelo del JSON (no inventes).
- Decimales con punto, no coma.
- No incluyas texto fuera del JSON.`;

// ---------- Coach (chat) ----------
export async function coachChat(messages, userContext = '') {
  const system = userContext
    ? `${SYSTEM_COACH}\n\nContexto del usuario:\n${userContext}`
    : SYSTEM_COACH;
  const contents = toGeminiContents(messages);
  if (!contents.length) throw new Error('Sin mensajes');
  return callGemini({
    systemInstruction: system,
    contents,
    temperature: 0.6,
    maxOutputTokens: 600
  });
}

// ---------- Parser de texto natural ----------
export async function parseWithAI(text) {
  const out = await callGemini({
    systemInstruction: SYSTEM_PARSER,
    contents: [{ role: 'user', parts: [{ text }] }],
    temperature: 0.2,
    maxOutputTokens: 500,
    responseMimeType: 'application/json'
  });
  const json = safeJsonParse(out);
  return json?.items || [];
}

// ---------- Meal plan ----------
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

  const out = await callGemini({
    systemInstruction: 'Eres un nutricionista. Devuelves SOLO JSON válido, sin texto adicional.',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    temperature: 0.4,
    maxOutputTokens: 1500,
    responseMimeType: 'application/json'
  });
  return safeJsonParse(out) || { meals: [] };
}

// ---------- Recetas ----------
export async function generateRecipe({ name, targets }) {
  const prompt = `Crea una receta llamada "${name}" optimizada para:
- ~${targets.calories || 500} kcal
- ~${targets.protein || 35}g proteína
Devuelve markdown breve: ingredientes con cantidades, pasos numerados, macros totales al final.`;

  return callGemini({
    systemInstruction: 'Eres un chef nutricionista. Respuestas en español, prácticas, sin paja.',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    temperature: 0.6,
    maxOutputTokens: 700
  });
}

// ---------- Vision: análisis de fotos ----------
/**
 * Analiza una foto y devuelve los alimentos detectados con estimaciones.
 * @param {string} dataUrl - imagen como data URL (base64 con prefix)
 * @returns {Promise<{title:string, items:Array, confidence:string}>}
 */
export async function analyzeFood(dataUrl) {
  if (!dataUrl) throw new Error('No hay imagen para analizar');

  const out = await callGemini({
    model: VISION_MODEL,
    systemInstruction: SYSTEM_VISION,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Identifica los alimentos en esta foto y estima sus macros.' },
          {
            inline_data: {
              mime_type: mimeFromDataUrl(dataUrl),
              data: dataUrlToBase64(dataUrl)
            }
          }
        ]
      }
    ],
    temperature: 0.2,
    maxOutputTokens: 800,
    responseMimeType: 'application/json'
  });

  const parsed = safeJsonParse(out);
  if (!parsed) throw new Error('Gemini devolvió un formato inesperado.');

  return {
    title: parsed.title || 'Comida detectada',
    items: (parsed.items || []).map(normalizeItem),
    confidence: parsed.confidence || 'media'
  };
}

function normalizeItem(it) {
  return {
    name: String(it.name || 'Ingrediente'),
    qty: Number(it.qty) || 1,
    unit: String(it.unit || 'porción'),
    kcal: Math.round(Number(it.kcal) || 0),
    protein: Math.round((Number(it.protein) || 0) * 10) / 10,
    carbs:   Math.round((Number(it.carbs)   || 0) * 10) / 10,
    fat:     Math.round((Number(it.fat)     || 0) * 10) / 10,
    fiber:   Math.round((Number(it.fiber)   || 0) * 10) / 10
  };
}

// ---------- Vision: OCR de tabla nutricional ----------
/**
 * Lee una etiqueta nutricional y extrae los macros para autorrellenar el form.
 * @param {string} dataUrl - foto de la tabla (data URL)
 * @returns {Promise<{kcal?:number, protein?:number, carbs?:number, fat?:number,
 *                    fiber?:number, servingSize?:string, perWhat?:string}>}
 */
export async function analyzeNutritionLabel(dataUrl) {
  if (!dataUrl) throw new Error('No hay imagen para analizar');

  const out = await callGemini({
    model: VISION_MODEL,
    systemInstruction: SYSTEM_NUTRITION_LABEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Extrae los valores nutricionales de esta tabla.' },
          {
            inline_data: {
              mime_type: mimeFromDataUrl(dataUrl),
              data: dataUrlToBase64(dataUrl)
            }
          }
        ]
      }
    ],
    temperature: 0.1,
    maxOutputTokens: 500,
    responseMimeType: 'application/json'
  });

  const parsed = safeJsonParse(out);
  if (!parsed) throw new Error('No pude leer la tabla nutricional. Prueba con otra foto.');

  return {
    kcal:        toNum(parsed.kcal),
    protein:     toNum(parsed.protein),
    carbs:       toNum(parsed.carbs),
    fat:         toNum(parsed.fat),
    fiber:       toNum(parsed.fiber),
    servingSize: parsed.servingSize ? String(parsed.servingSize) : undefined,
    perWhat:     ['per100g', 'serving', 'unit'].includes(parsed.perWhat) ? parsed.perWhat : undefined
  };
}

function toNum(v) {
  if (v == null || v === '') return undefined;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? undefined : n;
}
