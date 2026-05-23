// Parser de lenguaje natural para comidas: "2 huevos con avena y leche"
import { FOOD_DB, findFood } from './foodDB';

const NUMBER_WORDS = {
  un: 1, una: 1, uno: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  media: 0.5, medio: 0.5
};

// Convierte fracciones unicode y palabras a número
function tokenToNumber(tok) {
  if (!tok) return null;
  const t = tok.toLowerCase();
  if (NUMBER_WORDS[t] !== undefined) return NUMBER_WORDS[t];
  const fracs = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.66 };
  if (fracs[t]) return fracs[t];
  const n = parseFloat(t.replace(',', '.'));
  return isNaN(n) ? null : n;
}

const UNIT_REGEX = /(\d+(?:[.,]\d+)?|½|¼|¾|⅓|⅔|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|media|medio)?\s*(gramos|gramo|gr|grs|g|kilos|kilo|kg|mililitros|mililitro|ml|litros|litro|l|tazas|taza|cucharadas|cucharada|cda|cdas|cdita|cditas|onzas|onza|oz|scoops|scoop|porciones|porcion|porción|rebanadas|rebanada|unidades|unidad|piezas|pieza)?\b/i;

const UNIT_FACTORS = {
  g: 1, gr: 1, grs: 1, gramo: 1, gramos: 1,
  kg: 1000, kilo: 1000, kilos: 1000,
  ml: 1, mililitro: 1, mililitros: 1,
  l: 1000, litro: 1000, litros: 1000,
  oz: 28.35, onza: 28.35, onzas: 28.35,
  taza: 240, tazas: 240,
  cda: 15, cdas: 15, cucharada: 15, cucharadas: 15,
  cdita: 5, cditas: 5,
  scoop: 30, scoops: 30
};

const CONNECTORS = /\s+(con|y|,|\+|más|mas|junto a|acompañado de|y un poco de|y una|y dos)\s+/i;

/**
 * Parsea un texto y devuelve array de items detectados:
 * [{ name, qty, unit, matchedFood, kcal, protein, carbs, fat, fiber, confidence }]
 */
export function parseNaturalLanguage(text) {
  if (!text || !text.trim()) return [];
  const cleaned = text.toLowerCase().trim().replace(/\./g, '');
  // Divide en posibles items por conectores
  const parts = cleaned.split(CONNECTORS).filter((p) => {
    const t = p.trim();
    return t && !/^(con|y|\+|más|mas|junto a|acompañado de|,|y un poco de|y una|y dos)$/i.test(t);
  });

  return parts.map((part) => parsePart(part.trim())).filter(Boolean);
}

function parsePart(part) {
  if (!part) return null;
  let qty = null;
  let unit = null;
  let foodText = part;

  // Detectar cantidad + unidad al inicio
  const m = part.match(UNIT_REGEX);
  if (m && m[0].trim()) {
    const numCandidate = tokenToNumber(m[1]);
    if (numCandidate !== null) {
      qty = numCandidate;
      unit = m[2] ? m[2].toLowerCase() : null;
      foodText = part.replace(m[0], '').trim();
    }
  }
  if (!foodText) return null;

  // Limpia palabras irrelevantes
  foodText = foodText.replace(/^(de|del|la|el|los|las|unos|unas)\s+/i, '').trim();

  const food = findFood(foodText);
  if (!food) {
    return {
      name: foodText,
      qty: qty ?? 1,
      unit: unit || 'porción',
      matchedFood: null,
      kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      confidence: 0
    };
  }

  // Calcular escala
  let scale = 1;
  if (qty !== null) {
    if (unit && UNIT_FACTORS[unit]) {
      // Convertir a la unidad base del alimento
      if (food.unit === 'g' || food.unit === 'ml') {
        scale = (qty * UNIT_FACTORS[unit]) / food.baseQty;
      } else if (food.unit === 'unidad' || food.unit === 'rebanada') {
        scale = qty;
      } else {
        scale = qty;
      }
    } else {
      // Sin unidad explícita: si la base es 'unidad', qty = unidades
      // Si la base es g/ml y la cantidad es pequeña (<20), asumimos unidades; si es grande, gramos
      if (food.unit === 'unidad' || food.unit === 'rebanada') scale = qty;
      else if (qty <= 10) scale = qty; // "2 huevos", "2 manzanas" etc - pero food.unit es g; raro
      else scale = qty / food.baseQty;
    }
  }
  if (scale <= 0 || isNaN(scale)) scale = 1;

  return {
    name: foodText,
    qty: qty ?? food.baseQty,
    unit: unit || food.unit,
    matchedFood: food.id,
    serving: food.serving,
    kcal:    Math.round(food.kcal    * scale),
    protein: Math.round(food.protein * scale * 10) / 10,
    carbs:   Math.round(food.carbs   * scale * 10) / 10,
    fat:     Math.round(food.fat     * scale * 10) / 10,
    fiber:   Math.round(food.fiber   * scale * 10) / 10,
    confidence: 0.85
  };
}

/**
 * Sugerencias mientras escribe (autocomplete).
 */
export function suggestFoods(query, limit = 6) {
  if (!query) return [];
  const q = query.toLowerCase();
  const out = [];
  for (const f of FOOD_DB) {
    for (const n of f.names) {
      if (n.toLowerCase().startsWith(q) || n.toLowerCase().includes(q)) {
        out.push({ ...f, displayName: n });
        break;
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}
