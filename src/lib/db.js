// Capa de persistencia en Supabase. Encapsula el mapeo entre el shape de los
// stores Zustand (camelCase) y el de las tablas Postgres (snake_case), y expone
// dos tipos de funciones:
//
//   - hydrate*: leen TODOS los datos del usuario actual (al iniciar sesión).
//   - upsert/remove: write-through llamado desde cada action del store.
//
// Todas las funciones son tolerantes a errores: si Supabase no está configurado
// o la red falla, registran en consola y devuelven sin lanzar — la app sigue
// funcionando en modo offline contra el cache local de Zustand.

import { supabase, isSupabaseConfigured } from './supabase';

function warn(label, err) {
  // eslint-disable-next-line no-console
  console.warn('[db]', label, err?.message || err);
}

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

// ============================================================
//  PROFILE
// ============================================================

/** Map fila -> objeto store (profile). */
function rowToProfile(r) {
  if (!r) return null;
  return {
    name: r.name || '',
    age: r.age,
    sex: r.sex,
    heightCm: r.height_cm,
    weightKg: Number(r.weight_kg) || 0,
    startWeightKg: Number(r.start_weight_kg) || 0,
    activity: r.activity,
    goal: r.goal,
    experience: r.experience,
    mealsPerDay: r.meals_per_day,
    restrictions: r.restrictions || [],
    calorieDelta: r.calorie_delta != null ? Number(r.calorie_delta) : null,
    waterDailyGoalMl: r.water_daily_goal_ml ?? 2500,
    onboarded: Boolean(r.onboarded),
    units: 'metric'
  };
}

function profileToRow(userId, p) {
  return {
    user_id: userId,
    name: p.name,
    age: p.age,
    sex: p.sex,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    start_weight_kg: p.startWeightKg,
    activity: p.activity,
    goal: p.goal,
    experience: p.experience,
    meals_per_day: p.mealsPerDay,
    restrictions: p.restrictions || [],
    calorie_delta: p.calorieDelta,
    water_daily_goal_ml: p.waterDailyGoalMl,
    onboarded: Boolean(p.onboarded),
    updated_at: new Date().toISOString()
  };
}

export async function fetchProfile() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { warn('fetchProfile', error); return null; } // null = error → hydrate ignora
  return rowToProfile(data); // null si no hay perfil aún (primera vez), pero hydrate también lo respeta
}

export async function upsertProfile(profile) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('profiles')
    .upsert(profileToRow(userId, profile), { onConflict: 'user_id' });
  if (error) warn('upsertProfile', error);
}

// ============================================================
//  FOOD ENTRIES
// ============================================================

function rowToEntry(r) {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    name: r.name,
    qty: Number(r.qty) || 0,
    unit: r.unit,
    kcal: Number(r.kcal) || 0,
    protein: Number(r.protein) || 0,
    carbs: Number(r.carbs) || 0,
    fat: Number(r.fat) || 0,
    fiber: Number(r.fiber) || 0,
    photo: r.photo || undefined,
    source: r.source || undefined,
    mealId: r.meal_id || undefined,
    ingredientId: r.ingredient_id || undefined,
    createdAt: new Date(r.created_at).getTime()
  };
}

function entryToRow(userId, e, date) {
  return {
    id: e.id,
    user_id: userId,
    date,
    meal: e.meal,
    name: e.name,
    qty: e.qty || 0,
    unit: e.unit,
    kcal: e.kcal || 0,
    protein: e.protein || 0,
    carbs: e.carbs || 0,
    fat: e.fat || 0,
    fiber: e.fiber || 0,
    photo: e.photo || null,
    source: e.source || null,
    meal_id: e.mealId || null,
    ingredient_id: e.ingredientId || null
  };
}

export async function fetchEntries() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { warn('fetchEntries', error); return null; }
  // Reagrupa por fecha
  const out = {};
  (data || []).forEach((r) => {
    const e = rowToEntry(r);
    out[e.date] = out[e.date] || [];
    out[e.date].push(e);
  });
  return out;
}

export async function upsertEntry(date, entry) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('food_entries')
    .upsert(entryToRow(userId, entry, date), { onConflict: 'id' });
  if (error) warn('upsertEntry', error);
}

export async function upsertEntries(date, entries) {
  if (!isSupabaseConfigured || !entries?.length) return;
  const userId = await currentUserId();
  if (!userId) return;
  const rows = entries.map((e) => entryToRow(userId, e, date));
  const { error } = await supabase.from('food_entries').upsert(rows, { onConflict: 'id' });
  if (error) warn('upsertEntries', error);
}

export async function removeEntry(entryId) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('food_entries').delete().eq('id', entryId);
  if (error) warn('removeEntry', error);
}

// ============================================================
//  WEIGHTS
// ============================================================

export async function fetchWeights() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('weights')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) { warn('fetchWeights', error); return null; }
  return (data || []).map((r) => ({ date: r.date, kg: Number(r.kg) }));
}

export async function upsertWeight(date, kg) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('weights')
    .upsert({ user_id: userId, date, kg }, { onConflict: 'user_id,date' });
  if (error) warn('upsertWeight', error);
}

export async function removeWeight(date) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('weights')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);
  if (error) warn('removeWeight', error);
}

// ============================================================
//  WATER
// ============================================================

export async function fetchWater() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId);
  if (error) { warn('fetchWater', error); return null; }
  const out = {};
  (data || []).forEach((r) => { out[r.date] = r.ml; });
  return out;
}

export async function upsertWater(date, ml) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('water_logs')
    .upsert({ user_id: userId, date, ml }, { onConflict: 'user_id,date' });
  if (error) warn('upsertWater', error);
}

// ============================================================
//  CUSTOM INGREDIENTS
// ============================================================

function rowToIngredient(r) {
  return {
    id: r.id,
    name: r.name,
    measureType: r.measure_type,
    baseQty: Number(r.base_qty) || (r.measure_type === 'per100g' ? 100 : 1),
    servingLabel: r.serving_label || '',
    kcal: Number(r.kcal) || 0,
    protein: Number(r.protein) || 0,
    carbs: Number(r.carbs) || 0,
    fat: Number(r.fat) || 0,
    fiber: Number(r.fiber) || 0,
    photo: r.photo || null,
    createdAt: new Date(r.created_at).getTime()
  };
}

function ingredientToRow(userId, i) {
  return {
    id: i.id,
    user_id: userId,
    name: i.name,
    measure_type: i.measureType,
    base_qty: i.baseQty,
    serving_label: i.servingLabel,
    kcal: i.kcal,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
    fiber: i.fiber,
    photo: i.photo || null
  };
}

export async function fetchIngredients() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('custom_ingredients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { warn('fetchIngredients', error); return null; }
  return (data || []).map(rowToIngredient);
}

/**
 * Upsert con feedback explícito. Devuelve { ok, reason?, data?, error? } para que
 * el caller pueda decidir qué hacer si falla, y loggea todo de forma muy visible.
 */
export async function upsertIngredient(ing) {
  if (!isSupabaseConfigured) {
    console.error('%c[db] upsertIngredient → ABORTADO: Supabase no configurado', 'color:#ff6b9d;font-weight:bold');
    return { ok: false, reason: 'no-supabase' };
  }
  const userId = await currentUserId();
  if (!userId) {
    console.error('%c[db] upsertIngredient → ABORTADO: sin user_id (no autenticado)', 'color:#ff6b9d;font-weight:bold', ing);
    return { ok: false, reason: 'no-auth' };
  }
  const row = ingredientToRow(userId, ing);
  console.log('%c[db] upsertIngredient → enviando a Supabase', 'color:#7c5cff', { id: row.id, name: row.name, user_id: row.user_id });
  const { data, error } = await supabase
    .from('custom_ingredients')
    .upsert(row, { onConflict: 'id' })
    .select(); // devuelve la fila insertada/actualizada para verificar que pasó la RLS
  if (error) {
    console.error('%c[db] upsertIngredient → ERROR', 'color:#ff6b9d;font-weight:bold', error.message, error);
    return { ok: false, reason: 'rpc-error', error };
  }
  if (!data || data.length === 0) {
    // Sin error pero sin filas devueltas suele significar RLS bloqueando silenciosamente
    console.error('%c[db] upsertIngredient → 0 filas devueltas (¿RLS bloqueó?)', 'color:#ff6b9d;font-weight:bold', { sent: row });
    return { ok: false, reason: 'no-rows', data };
  }
  console.log('%c[db] upsertIngredient → OK', 'color:#c8ff3d', data[0]);
  return { ok: true, data };
}

export async function removeIngredient(id) {
  if (!isSupabaseConfigured) {
    console.warn('[db] removeIngredient: Supabase no configurado');
    return;
  }
  console.log('%c[db] removeIngredient', 'color:#7c5cff', id);
  const { error } = await supabase.from('custom_ingredients').delete().eq('id', id);
  if (error) console.error('%c[db] removeIngredient → ERROR', 'color:#ff6b9d;font-weight:bold', error.message, error);
}

// ============================================================
//  CUSTOM MEALS (composite)
// ============================================================

function rowToMeal(r) {
  return {
    id: r.id,
    name: r.name,
    photo: r.photo || null,
    items: Array.isArray(r.items) ? r.items : [],
    totals: r.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    yieldGrams: r.yield_grams != null ? Number(r.yield_grams) : null,
    useCount: Number(r.use_count) || 0,
    createdAt: new Date(r.created_at).getTime()
  };
}

function mealToRow(userId, m) {
  return {
    id: m.id,
    user_id: userId,
    name: m.name,
    photo: m.photo || null,
    items: m.items || [],
    totals: m.totals || {},
    yield_grams: m.yieldGrams != null ? Number(m.yieldGrams) : null,
    use_count: m.useCount || 0
  };
}

export async function fetchMeals() {
  if (!isSupabaseConfigured) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('custom_meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { warn('fetchMeals', error); return null; }
  return (data || []).map(rowToMeal);
}

export async function upsertMeal(meal) {
  if (!isSupabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('custom_meals')
    .upsert(mealToRow(userId, meal), { onConflict: 'id' });
  if (error) warn('upsertMeal', error);
}

export async function removeMeal(id) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('custom_meals').delete().eq('id', id);
  if (error) warn('removeMeal', error);
}

// ============================================================
//  HYDRATE ALL (on sign-in)
// ============================================================

export async function hydrateAll() {
  if (!isSupabaseConfigured) return null;
  const [profile, entries, weights, water, ingredients, meals] = await Promise.all([
    fetchProfile(),
    fetchEntries(),
    fetchWeights(),
    fetchWater(),
    fetchIngredients(),
    fetchMeals()
  ]);
  return { profile, entries, weights, water, ingredients, meals };
}
