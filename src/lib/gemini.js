// Wrapper de Gemini Vision (Google Generative Language API).
// Usado para identificar comidas en fotos. Modelo: gemini-2.5-flash (rápido y barato).
import { dataUrlToBase64, mimeFromDataUrl } from './image';

const MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiKey() {
  return (
    localStorage.getItem('calcal:gemini_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  );
}

export function hasGeminiKey() {
  return Boolean(getGeminiKey());
}

export function setGeminiKey(key) {
  if (key) localStorage.setItem('calcal:gemini_key', key);
  else localStorage.removeItem('calcal:gemini_key');
}

const SYSTEM_PROMPT = `Eres un nutricionista experto en identificar alimentos a partir de una foto.
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
- No incluyas texto fuera del JSON, ni comentarios.
- En español.`;

/**
 * Analiza una foto y devuelve los items detectados.
 * @param {string} dataUrl - imagen en base64 dataUrl
 * @returns {Promise<{title:string, items:Array, confidence:string}>}
 */
export async function analyzeFood(dataUrl) {
  const key = getGeminiKey();
  if (!key) throw new Error('Falta API key de Gemini. Configúrala en Ajustes → Coach IA.');
  if (!dataUrl) throw new Error('No hay imagen');

  const url = `${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeFromDataUrl(dataUrl),
              data: dataUrlToBase64(dataUrl)
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: 'application/json'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || 'Comida detectada',
      items: (parsed.items || []).map(normalizeItem),
      confidence: parsed.confidence || 'media'
    };
  } catch {
    // Intenta extraer JSON entre llaves
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        return {
          title: parsed.title || 'Comida detectada',
          items: (parsed.items || []).map(normalizeItem),
          confidence: parsed.confidence || 'media'
        };
      } catch { /* noop */ }
    }
    throw new Error('Gemini devolvió un formato inesperado.');
  }
}

function normalizeItem(it) {
  return {
    name: String(it.name || 'Ingrediente'),
    qty: Number(it.qty) || 1,
    unit: String(it.unit || 'porción'),
    kcal: Math.round(Number(it.kcal) || 0),
    protein: Math.round((Number(it.protein) || 0) * 10) / 10,
    carbs: Math.round((Number(it.carbs) || 0) * 10) / 10,
    fat: Math.round((Number(it.fat) || 0) * 10) / 10,
    fiber: Math.round((Number(it.fiber) || 0) * 10) / 10
  };
}
