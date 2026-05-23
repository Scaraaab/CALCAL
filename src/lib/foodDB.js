// Mini base de datos de alimentos comunes (valores por porción estándar).
// Cada alimento define una porción base; el parser escala según cantidad detectada.
// kcal / proteína (g) / carbos (g) / grasa (g) / fibra (g)

export const FOOD_DB = [
  // Huevos y proteínas
  { id: 'huevo',        names: ['huevo','huevos','egg'],                  unit: 'unidad',  baseQty: 1,   serving: '1 huevo (50g)',   kcal: 78,  protein: 6,   carbs: 0.6, fat: 5,   fiber: 0 },
  { id: 'clara',        names: ['clara','claras','egg white'],            unit: 'unidad',  baseQty: 1,   serving: '1 clara (33g)',   kcal: 17,  protein: 3.6, carbs: 0.2, fat: 0.1, fiber: 0 },
  { id: 'pollo',        names: ['pollo','pechuga','chicken','breast'],    unit: 'g',       baseQty: 100, serving: '100g pollo',      kcal: 165, protein: 31,  carbs: 0,   fat: 3.6, fiber: 0 },
  { id: 'atun',         names: ['atun','atún','tuna'],                    unit: 'g',       baseQty: 100, serving: '100g atún',       kcal: 116, protein: 26,  carbs: 0,   fat: 1,   fiber: 0 },
  { id: 'salmon',       names: ['salmon','salmón'],                       unit: 'g',       baseQty: 100, serving: '100g salmón',     kcal: 208, protein: 20,  carbs: 0,   fat: 13,  fiber: 0 },
  { id: 'carne_res',    names: ['carne','res','beef','ternera'],          unit: 'g',       baseQty: 100, serving: '100g carne magra',kcal: 250, protein: 26,  carbs: 0,   fat: 17,  fiber: 0 },
  { id: 'cerdo',        names: ['cerdo','lomo','pork'],                   unit: 'g',       baseQty: 100, serving: '100g cerdo',      kcal: 242, protein: 27,  carbs: 0,   fat: 14,  fiber: 0 },
  { id: 'pavo',         names: ['pavo','turkey'],                         unit: 'g',       baseQty: 100, serving: '100g pavo',       kcal: 135, protein: 30,  carbs: 0,   fat: 1,   fiber: 0 },

  // Lácteos
  { id: 'leche',        names: ['leche','milk'],                          unit: 'ml',      baseQty: 250, serving: '1 vaso (250ml)',  kcal: 122, protein: 8,   carbs: 12,  fat: 5,   fiber: 0 },
  { id: 'leche_desc',   names: ['leche desnatada','leche descremada','skim'], unit: 'ml',  baseQty: 250, serving: '250ml desnatada', kcal: 83,  protein: 8,   carbs: 12,  fat: 0.5, fiber: 0 },
  { id: 'yogur',        names: ['yogur','yogurt','yoghurt'],              unit: 'g',       baseQty: 125, serving: '1 yogur (125g)',  kcal: 75,  protein: 4,   carbs: 11,  fat: 1.5, fiber: 0 },
  { id: 'yogur_griego', names: ['yogur griego','greek yogurt','griego'],  unit: 'g',       baseQty: 170, serving: '1 yogur griego',  kcal: 100, protein: 17,  carbs: 6,   fat: 0.7, fiber: 0 },
  { id: 'queso',        names: ['queso','cheese'],                        unit: 'g',       baseQty: 30,  serving: '30g queso',       kcal: 113, protein: 7,   carbs: 1,   fat: 9,   fiber: 0 },
  { id: 'queso_fresco', names: ['queso fresco','cottage','cottage cheese'], unit: 'g',     baseQty: 100, serving: '100g queso fresco', kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },

  // Carbohidratos
  { id: 'avena',        names: ['avena','oats','oatmeal'],                unit: 'g',       baseQty: 40,  serving: '40g avena (taza)',kcal: 152, protein: 5,   carbs: 27,  fat: 3,   fiber: 4 },
  { id: 'arroz',        names: ['arroz','rice'],                          unit: 'g',       baseQty: 100, serving: '100g cocido',     kcal: 130, protein: 2.7, carbs: 28,  fat: 0.3, fiber: 0.4 },
  { id: 'arroz_int',    names: ['arroz integral','brown rice'],           unit: 'g',       baseQty: 100, serving: '100g integral',   kcal: 112, protein: 2.6, carbs: 24,  fat: 0.9, fiber: 1.8 },
  { id: 'pasta',        names: ['pasta','espagueti','macarrones','spaghetti'], unit: 'g', baseQty: 100, serving: '100g cocida',     kcal: 131, protein: 5,   carbs: 25,  fat: 1.1, fiber: 1.8 },
  { id: 'pan',          names: ['pan','bread','rebanada'],                unit: 'rebanada',baseQty: 1,   serving: '1 rebanada (28g)',kcal: 79,  protein: 3.6, carbs: 14,  fat: 1,   fiber: 1 },
  { id: 'tortilla',     names: ['tortilla','tortilla maíz','tortilla maiz'], unit: 'unidad', baseQty: 1, serving: '1 tortilla',     kcal: 60,  protein: 1.5, carbs: 12,  fat: 0.7, fiber: 1.5 },
  { id: 'papa',         names: ['papa','patata','potato'],                unit: 'g',       baseQty: 150, serving: '1 papa (150g)',   kcal: 116, protein: 3,   carbs: 26,  fat: 0.2, fiber: 3 },
  { id: 'batata',       names: ['batata','camote','boniato','sweet potato'], unit: 'g',   baseQty: 150, serving: '1 batata (150g)', kcal: 129, protein: 2.4, carbs: 30,  fat: 0.2, fiber: 4.5 },
  { id: 'quinoa',       names: ['quinoa','quinua'],                       unit: 'g',       baseQty: 100, serving: '100g cocida',     kcal: 120, protein: 4.4, carbs: 21,  fat: 1.9, fiber: 2.8 },
  { id: 'frijoles',     names: ['frijoles','judías','judias','beans'],    unit: 'g',       baseQty: 100, serving: '100g',            kcal: 127, protein: 9,   carbs: 23,  fat: 0.5, fiber: 7 },
  { id: 'lentejas',     names: ['lentejas','lentils'],                    unit: 'g',       baseQty: 100, serving: '100g cocidas',    kcal: 116, protein: 9,   carbs: 20,  fat: 0.4, fiber: 7.9 },

  // Frutas
  { id: 'banana',       names: ['banana','plátano','platano','banano'],   unit: 'unidad',  baseQty: 1,   serving: '1 banana (118g)', kcal: 105, protein: 1.3, carbs: 27,  fat: 0.4, fiber: 3 },
  { id: 'manzana',      names: ['manzana','apple'],                       unit: 'unidad',  baseQty: 1,   serving: '1 manzana',       kcal: 95,  protein: 0.5, carbs: 25,  fat: 0.3, fiber: 4.4 },
  { id: 'fresa',        names: ['fresa','fresas','strawberry'],           unit: 'g',       baseQty: 100, serving: '100g fresas',     kcal: 32,  protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { id: 'arandanos',    names: ['arándanos','arandanos','blueberries'],   unit: 'g',       baseQty: 100, serving: '100g',            kcal: 57,  protein: 0.7, carbs: 14,  fat: 0.3, fiber: 2.4 },
  { id: 'naranja',      names: ['naranja','orange'],                      unit: 'unidad',  baseQty: 1,   serving: '1 naranja',       kcal: 62,  protein: 1.2, carbs: 15,  fat: 0.2, fiber: 3.1 },
  { id: 'uva',          names: ['uva','uvas','grapes'],                   unit: 'g',       baseQty: 100, serving: '100g',            kcal: 69,  protein: 0.7, carbs: 18,  fat: 0.2, fiber: 0.9 },
  { id: 'aguacate',     names: ['aguacate','palta','avocado'],            unit: 'unidad',  baseQty: 1,   serving: '1 aguacate',      kcal: 234, protein: 2.9, carbs: 12,  fat: 21,  fiber: 9.8 },

  // Verduras
  { id: 'brocoli',      names: ['brócoli','brocoli','broccoli'],          unit: 'g',       baseQty: 100, serving: '100g',            kcal: 34,  protein: 2.8, carbs: 7,   fat: 0.4, fiber: 2.6 },
  { id: 'espinaca',     names: ['espinaca','spinach'],                    unit: 'g',       baseQty: 100, serving: '100g',            kcal: 23,  protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { id: 'tomate',       names: ['tomate','tomato','jitomate'],            unit: 'unidad',  baseQty: 1,   serving: '1 tomate',        kcal: 22,  protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5 },
  { id: 'lechuga',      names: ['lechuga','lettuce'],                     unit: 'g',       baseQty: 100, serving: '100g',            kcal: 15,  protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  { id: 'zanahoria',    names: ['zanahoria','carrot'],                    unit: 'unidad',  baseQty: 1,   serving: '1 zanahoria',     kcal: 25,  protein: 0.6, carbs: 6,   fat: 0.1, fiber: 1.7 },
  { id: 'cebolla',      names: ['cebolla','onion'],                       unit: 'g',       baseQty: 100, serving: '100g',            kcal: 40,  protein: 1.1, carbs: 9,   fat: 0.1, fiber: 1.7 },

  // Grasas / frutos secos
  { id: 'aceite_oliva', names: ['aceite de oliva','aceite oliva','olive oil'], unit: 'ml', baseQty: 10,  serving: '1 cda (10ml)',    kcal: 90,  protein: 0,   carbs: 0,   fat: 10,  fiber: 0 },
  { id: 'mantequilla',  names: ['mantequilla','butter'],                  unit: 'g',       baseQty: 10,  serving: '10g',             kcal: 72,  protein: 0.1, carbs: 0,   fat: 8.1, fiber: 0 },
  { id: 'mani',         names: ['maní','mani','cacahuete','peanuts'],     unit: 'g',       baseQty: 30,  serving: '30g',             kcal: 170, protein: 7,   carbs: 5,   fat: 14,  fiber: 2.4 },
  { id: 'almendras',    names: ['almendras','almonds'],                   unit: 'g',       baseQty: 30,  serving: '30g',             kcal: 173, protein: 6.3, carbs: 6.5, fat: 14.9,fiber: 3.7 },
  { id: 'mantequilla_mani', names: ['mantequilla de maní','peanut butter','crema de cacahuate'], unit: 'g', baseQty: 16, serving: '1 cda', kcal: 94, protein: 4, carbs: 3, fat: 8, fiber: 1 },

  // Bebidas
  { id: 'cafe',         names: ['café','cafe','coffee'],                  unit: 'ml',      baseQty: 240, serving: '1 taza',          kcal: 2,   protein: 0.3, carbs: 0,   fat: 0,   fiber: 0 },
  { id: 'cerveza',      names: ['cerveza','beer'],                        unit: 'ml',      baseQty: 330, serving: '330ml',           kcal: 142, protein: 1.6, carbs: 11,  fat: 0,   fiber: 0 },
  { id: 'vino',         names: ['vino','wine'],                           unit: 'ml',      baseQty: 150, serving: '1 copa',          kcal: 125, protein: 0.1, carbs: 4,   fat: 0,   fiber: 0 },
  { id: 'jugo_naranja', names: ['jugo de naranja','zumo de naranja','orange juice'], unit: 'ml', baseQty: 250, serving: '1 vaso', kcal: 110, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5 },
  { id: 'proteina_whey',names: ['whey','proteína','proteina','batido proteína','protein shake'], unit: 'g', baseQty: 30, serving: '1 scoop', kcal: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },

  // Comidas comunes
  { id: 'pizza',        names: ['pizza','rebanada de pizza'],             unit: 'unidad',  baseQty: 1,   serving: '1 porción',       kcal: 285, protein: 12,  carbs: 36,  fat: 10,  fiber: 2 },
  { id: 'hamburguesa',  names: ['hamburguesa','burger'],                  unit: 'unidad',  baseQty: 1,   serving: '1 hamburguesa',   kcal: 354, protein: 17,  carbs: 29,  fat: 17,  fiber: 1.5 },
  { id: 'sandwich',     names: ['sandwich','sándwich'],                   unit: 'unidad',  baseQty: 1,   serving: '1 sándwich',      kcal: 300, protein: 15,  carbs: 35,  fat: 12,  fiber: 2 },
  { id: 'taco',         names: ['taco','tacos'],                          unit: 'unidad',  baseQty: 1,   serving: '1 taco',          kcal: 170, protein: 9,   carbs: 14,  fat: 9,   fiber: 1.5 },
  { id: 'ensalada',     names: ['ensalada','salad'],                      unit: 'unidad',  baseQty: 1,   serving: '1 plato',         kcal: 150, protein: 5,   carbs: 12,  fat: 9,   fiber: 4 },
  { id: 'sushi',        names: ['sushi','roll'],                          unit: 'unidad',  baseQty: 1,   serving: '1 pieza',         kcal: 45,  protein: 1.5, carbs: 8,   fat: 0.5, fiber: 0.3 },
  { id: 'chocolate',    names: ['chocolate','chocolate negro'],           unit: 'g',       baseQty: 30,  serving: '30g',             kcal: 170, protein: 2,   carbs: 13,  fat: 12,  fiber: 3 }
];

export function findFood(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return null;
  // Exact match primero
  for (const f of FOOD_DB) {
    if (f.names.some((n) => n.toLowerCase() === q)) return f;
  }
  // Contains
  for (const f of FOOD_DB) {
    if (f.names.some((n) => q.includes(n.toLowerCase()) || n.toLowerCase().includes(q))) return f;
  }
  return null;
}

export function searchFoods(query, limit = 12) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return FOOD_DB.slice(0, limit);
  const scored = FOOD_DB.map((f) => {
    let score = 0;
    for (const n of f.names) {
      const ln = n.toLowerCase();
      if (ln === q) score += 100;
      else if (ln.startsWith(q)) score += 50;
      else if (ln.includes(q)) score += 20;
    }
    return { f, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.f);
}
