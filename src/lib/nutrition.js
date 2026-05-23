// Cálculos nutricionales (Mifflin-St Jeor + ajustes inteligentes)

export const ACTIVITY = {
  sedentary:  { label: 'Sedentario', factor: 1.2,  desc: 'Trabajo de oficina, poco ejercicio' },
  light:      { label: 'Ligero',     factor: 1.375, desc: 'Ejercicio 1-3 días/semana' },
  moderate:   { label: 'Moderado',   factor: 1.55,  desc: 'Ejercicio 3-5 días/semana' },
  high:       { label: 'Alto',       factor: 1.725, desc: 'Ejercicio 6-7 días/semana' },
  athlete:    { label: 'Atleta',     factor: 1.9,   desc: 'Doble entreno o trabajo físico' }
};

export const GOALS = {
  cut:      { label: 'Perder grasa',  deltaPctRange: [-0.25, -0.10], defaultDelta: -0.20, paceLabel: 'Déficit moderado' },
  maintain: { label: 'Mantener peso', deltaPctRange: [0, 0],          defaultDelta: 0,     paceLabel: 'Mantenimiento' },
  bulk:     { label: 'Ganar músculo', deltaPctRange: [0.05, 0.20],    defaultDelta: 0.12,  paceLabel: 'Volumen limpio' }
};

export const EXPERIENCE = {
  beginner:     { label: 'Principiante',  proteinMultiplier: 1.6 },
  intermediate: { label: 'Intermedio',    proteinMultiplier: 1.9 },
  advanced:     { label: 'Avanzado',      proteinMultiplier: 2.2 }
};

/**
 * Mifflin-St Jeor BMR
 * @param {{sex:'male'|'female', age:number, weightKg:number, heightCm:number}} p
 */
export function bmr({ sex, age, weightKg, heightCm }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

export function tdee(profile) {
  const factor = ACTIVITY[profile.activity]?.factor ?? 1.4;
  return Math.round(bmr(profile) * factor);
}

/**
 * Devuelve calorías objetivo según objetivo + delta personalizado.
 */
export function targetCalories(profile) {
  const base = tdee(profile);
  const goal = GOALS[profile.goal] ?? GOALS.maintain;
  const delta = profile.calorieDelta ?? goal.defaultDelta;
  return Math.max(1200, Math.round(base * (1 + delta)));
}

/**
 * Distribución de macros inteligente:
 *  - Proteína = bodyweight * multiplier (según experiencia y objetivo)
 *  - Grasas   = 25-30% de las calorías
 *  - Carbos   = resto
 */
export function targetMacros(profile) {
  const cals = targetCalories(profile);
  const expMult = EXPERIENCE[profile.experience]?.proteinMultiplier ?? 1.8;
  let proteinGrams;
  if (profile.goal === 'cut') {
    proteinGrams = Math.round(profile.weightKg * Math.max(expMult, 2.0));
  } else if (profile.goal === 'bulk') {
    proteinGrams = Math.round(profile.weightKg * expMult);
  } else {
    proteinGrams = Math.round(profile.weightKg * expMult);
  }
  const fatPct = profile.goal === 'bulk' ? 0.28 : 0.30;
  const fatGrams = Math.round((cals * fatPct) / 9);
  const remainingCals = cals - (proteinGrams * 4 + fatGrams * 9);
  const carbsGrams = Math.max(50, Math.round(remainingCals / 4));
  return {
    calories: cals,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
    fiber: Math.round((cals / 1000) * 14) // 14g/1000kcal
  };
}

/**
 * Velocidad recomendada por semana
 */
export function recommendedPace(profile) {
  if (profile.goal === 'cut') {
    return { kgPerWeek: -profile.weightKg * 0.0075, label: 'Pérdida de 0.5-0.75% del peso/semana' };
  }
  if (profile.goal === 'bulk') {
    return { kgPerWeek: profile.weightKg * 0.0025, label: 'Ganancia limpia 0.25% peso/semana' };
  }
  return { kgPerWeek: 0, label: 'Mantenimiento estable' };
}

/**
 * Ajuste automático tipo MacroFactor: cada 7-14 días compara progreso real vs esperado.
 * Devuelve nuevas calorías y razón.
 */
export function autoAdjustCalories(profile, weightHistory) {
  if (!weightHistory || weightHistory.length < 7) {
    return { newCalories: targetCalories(profile), changed: false, reason: 'Necesitas al menos 7 días de pesajes' };
  }
  const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-7);
  const older  = sorted.slice(-14, -7);
  if (older.length < 3) {
    return { newCalories: targetCalories(profile), changed: false, reason: 'Necesitas dos semanas para auto-ajustar' };
  }
  const avg = (arr) => arr.reduce((s, x) => s + x.kg, 0) / arr.length;
  const actualDelta = avg(recent) - avg(older);
  const pace = recommendedPace(profile);
  const expectedDelta = pace.kgPerWeek;
  const diff = actualDelta - expectedDelta;

  const current = targetCalories(profile);
  // 1 kg de grasa ≈ 7700 kcal. Repartido en 7 días ≈ 1100/día.
  // Aplicamos ajuste suave: 100-200 kcal max
  let adjustment = 0;
  if (profile.goal === 'cut' && diff > 0.15)        adjustment = -100; // perdiendo menos de lo esperado
  else if (profile.goal === 'cut' && diff < -0.30)  adjustment = +100; // perdiendo demasiado rápido
  else if (profile.goal === 'bulk' && diff < -0.05) adjustment = +150;
  else if (profile.goal === 'bulk' && diff > 0.30)  adjustment = -100;
  else if (profile.goal === 'maintain' && Math.abs(diff) > 0.30) adjustment = diff > 0 ? -100 : +100;

  return {
    newCalories: current + adjustment,
    changed: adjustment !== 0,
    adjustment,
    actualDelta: actualDelta.toFixed(2),
    expectedDelta: expectedDelta.toFixed(2),
    reason: adjustment === 0
      ? 'Vas en línea con tu objetivo. Sin cambios.'
      : adjustment < 0
        ? 'Tu progreso es más lento de lo esperado. Bajamos calorías.'
        : 'Estás progresando más rápido de lo planeado. Subimos calorías.'
  };
}

/**
 * Calcula totales nutricionales de un array de entries.
 */
export function totalsFromEntries(entries = []) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein:  acc.protein  + (e.protein  || 0),
      carbs:    acc.carbs    + (e.carbs    || 0),
      fat:      acc.fat      + (e.fat      || 0),
      fiber:    acc.fiber    + (e.fiber    || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function pct(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export function remaining(target, consumed) {
  return Math.max(0, Math.round(target - consumed));
}
