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
import { toast } from '../store/useToastStore';

function warn(label, err) {
  // eslint-disable-next-line no-console
  console.warn('[db]', label, err?.message || err);
}

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

/**
 * Clasifica un error de Supabase y emite un toast user-friendly.
 * Devuelve true si el error es crítico (write falla, datos en riesgo).
 */
function reportWriteError(operation, error) {
  if (!error) return false;
  const code = error.code || '';
  const msg  = error.message || '';

  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    toast.error(`Falta una tabla en Supabase. Ejecuta el schema.sql.\n(${operation})`);
  } else if (code === '42703' || /column .* does not exist/i.test(msg)) {
    toast.error(`Falta una columna en Supabase. Ejecuta el schema.sql.\n(${operation}: ${msg})`);
  } else if (code === '42501' || /row-level security/i.test(msg) || /policy/i.test(msg)) {
    toast.error(`Supabase rechazó por RLS. Revisa las policies.\n(${operation})`);
  } else if (code === 'PGRST301' || /JWT/i.test(msg) || /authentication/i.test(msg)) {
    toast.error('Sesión expirada o no autenticado. Cierra sesión y vuelve a entrar.', 9000);
  } else if (/Failed to fetch/i.test(msg) || /NetworkError/i.test(msg)) {
    toast.error(`Sin conexión a Supabase. Revisa tu red.\n(${operation})`);
  } else {
    toast.error(`Error al guardar (${operation}): ${msg.slice(0, 80)}`, 8000);
  }
  return true;
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
  if (error) { warn('upsertProfile', error); reportWriteError('perfil', error); }
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
  if (!isSupabaseConfigured) return { ok: false, reason: 'no-supabase' };
  const userId = await currentUserId();
  if (!userId) { toast.error('No autenticado. La comida no se guardó.'); return { ok: false, reason: 'no-auth' }; }
  const row = entryToRow(userId, entry, date);
  const { data, error } = await supabase
    .from('food_entries')
    .upsert(row, { onConflict: 'id' })
    .select(); // confirma que la fila quedó (RLS no bloqueó silenciosamente)
  if (error) {
    warn('upsertEntry', error);
    reportWriteError('comida', error);
    return { ok: false, reason: 'rpc-error', error };
  }
  if (!data || data.length === 0) {
    warn('upsertEntry: 0 filas devueltas (RLS bloqueó silenciosamente)', row);
    toast.error('La comida no quedó guardada (RLS rechazó). Revisa Settings → Diagnóstico.', 10000);
    return { ok: false, reason: 'no-rows' };
  }
  return { ok: true, data };
}

export async function upsertEntries(date, entries) {
  if (!isSupabaseConfigured || !entries?.length) return { ok: false, reason: 'no-supabase' };
  const userId = await currentUserId();
  if (!userId) { toast.error('No autenticado. Las comidas no se guardaron.'); return { ok: false, reason: 'no-auth' }; }
  const rows = entries.map((e) => entryToRow(userId, e, date));
  const { data, error } = await supabase
    .from('food_entries')
    .upsert(rows, { onConflict: 'id' })
    .select(); // confirma que las filas quedaron
  if (error) {
    warn('upsertEntries', error);
    reportWriteError('comidas', error);
    return { ok: false, reason: 'rpc-error', error };
  }
  if (!data || data.length === 0) {
    warn('upsertEntries: 0 filas devueltas (RLS bloqueó silenciosamente)', { rowCount: rows.length });
    toast.error('Las comidas no quedaron guardadas (RLS rechazó). Revisa Settings → Diagnóstico.', 10000);
    return { ok: false, reason: 'no-rows' };
  }
  return { ok: true, data, count: data.length };
}

export async function removeEntry(entryId) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('food_entries').delete().eq('id', entryId);
  if (error) { warn('removeEntry', error); reportWriteError('borrar comida', error); }
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
  if (!userId) { toast.error('No autenticado. El peso no se guardó.'); return; }
  const { error } = await supabase
    .from('weights')
    .upsert({ user_id: userId, date, kg }, { onConflict: 'user_id,date' });
  if (error) { warn('upsertWeight', error); reportWriteError('peso', error); }
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
  if (error) { warn('removeWeight', error); reportWriteError('borrar peso', error); }
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
  if (!userId) { toast.error('No autenticado. El agua no se guardó.'); return; }
  const { error } = await supabase
    .from('water_logs')
    .upsert({ user_id: userId, date, ml }, { onConflict: 'user_id,date' });
  if (error) { warn('upsertWater', error); reportWriteError('agua', error); }
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
    shareId: r.share_id || null,
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
    photo: i.photo || null,
    share_id: i.shareId || null
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
 * Upsert con feedback explícito. Devuelve { ok, reason?, data?, error? } para
 * que el caller pueda detectar fallos silenciosos (no-auth, RLS bloqueando, etc.).
 */
export async function upsertIngredient(ing) {
  if (!isSupabaseConfigured) return { ok: false, reason: 'no-supabase' };
  const userId = await currentUserId();
  if (!userId) {
    warn('upsertIngredient: sin user_id (no autenticado)', ing.name);
    toast.error('No autenticado. El ingrediente no se guardó.');
    return { ok: false, reason: 'no-auth' };
  }
  const row = ingredientToRow(userId, ing);
  const { data, error } = await supabase
    .from('custom_ingredients')
    .upsert(row, { onConflict: 'id' })
    .select(); // verifica que pasó RLS
  if (error) {
    warn('upsertIngredient', error);
    reportWriteError('ingrediente', error);
    return { ok: false, reason: 'rpc-error', error };
  }
  if (!data || data.length === 0) {
    warn('upsertIngredient: 0 filas devueltas (¿RLS bloqueó?)', row);
    toast.error('Supabase no devolvió la fila guardada. Posible bloqueo de RLS.');
    return { ok: false, reason: 'no-rows', data };
  }
  return { ok: true, data };
}

export async function removeIngredient(id) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('custom_ingredients').delete().eq('id', id);
  if (error) { warn('removeIngredient', error); reportWriteError('borrar ingrediente', error); }
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
    shareId: r.share_id || null,
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
    use_count: m.useCount || 0,
    share_id: m.shareId || null
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
  if (!userId) { toast.error('No autenticado. La comida no se guardó.'); return; }
  const { error } = await supabase
    .from('custom_meals')
    .upsert(mealToRow(userId, meal), { onConflict: 'id' });
  if (error) { warn('upsertMeal', error); reportWriteError('comida compuesta', error); }
}

export async function removeMeal(id) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('custom_meals').delete().eq('id', id);
  if (error) { warn('removeMeal', error); reportWriteError('borrar comida', error); }
}

// ============================================================
//  COMMUNITY — base de datos compartida por toda la comunidad
// ============================================================

function rowToCommunityIngredient(r) {
  return {
    shareId: r.share_id,
    createdBy: r.created_by,
    createdByName: r.created_by_name || 'Anónimo',
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
    isCommunity: true
  };
}

function communityIngredientToRow(ing, userId, userName) {
  return {
    share_id: ing.shareId,
    created_by: userId,
    created_by_name: userName || 'Anónimo',
    name: ing.name,
    measure_type: ing.measureType,
    base_qty: ing.baseQty,
    serving_label: ing.servingLabel,
    kcal: ing.kcal,
    protein: ing.protein,
    carbs: ing.carbs,
    fat: ing.fat,
    fiber: ing.fiber,
    photo: ing.photo || null
  };
}

function rowToCommunityMeal(r) {
  return {
    shareId: r.share_id,
    createdBy: r.created_by,
    createdByName: r.created_by_name || 'Anónimo',
    name: r.name,
    photo: r.photo || null,
    items: Array.isArray(r.items) ? r.items : [],
    totals: r.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    yieldGrams: r.yield_grams != null ? Number(r.yield_grams) : null,
    isCommunity: true
  };
}

function communityMealToRow(m, userId, userName) {
  return {
    share_id: m.shareId,
    created_by: userId,
    created_by_name: userName || 'Anónimo',
    name: m.name,
    photo: m.photo || null,
    items: m.items || [],
    totals: m.totals || {},
    yield_grams: m.yieldGrams != null ? Number(m.yieldGrams) : null
  };
}

/**
 * Búsqueda async por nombre en la tabla comunitaria.
 * Usa ILIKE — case-insensitive, sustring match.
 * @param {string} query - texto a buscar (mínimo 2 chars para no hacer scan masivo)
 * @param {number} limit
 */
export async function fetchCommunityIngredients(query, limit = 12) {
  if (!isSupabaseConfigured) return [];
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('community_ingredients')
    .select('*')
    .ilike('name', `%${escapeLike(q)}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { warn('fetchCommunityIngredients', error); return []; }
  return (data || []).map(rowToCommunityIngredient);
}

export async function fetchCommunityMeals(query, limit = 12) {
  if (!isSupabaseConfigured) return [];
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('community_meals')
    .select('*')
    .ilike('name', `%${escapeLike(q)}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { warn('fetchCommunityMeals', error); return []; }
  return (data || []).map(rowToCommunityMeal);
}

/**
 * Publica un ingrediente a community. ignoreDuplicates → no sobreescribe
 * si ya existe (otro usuario ya lo había publicado con el mismo share_id).
 */
export async function pushCommunityIngredient(ing, userName) {
  if (!isSupabaseConfigured || !ing?.shareId) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('community_ingredients')
    .upsert(communityIngredientToRow(ing, userId, userName), {
      onConflict: 'share_id',
      ignoreDuplicates: true
    });
  if (error) { warn('pushCommunityIngredient', error); throw error; }
}

export async function pushCommunityMeal(meal, userName) {
  if (!isSupabaseConfigured || !meal?.shareId) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('community_meals')
    .upsert(communityMealToRow(meal, userId, userName), {
      onConflict: 'share_id',
      ignoreDuplicates: true
    });
  if (error) { warn('pushCommunityMeal', error); throw error; }
}

/**
 * Versión batch — más eficiente para sync inicial.
 * Lanza error si Supabase responde con error para que el caller (syncToCommunity)
 * NO marque el flag de migración como completada en caso de fallo.
 */
export async function pushCommunityIngredientsBatch(ingredients, userName) {
  if (!isSupabaseConfigured || !ingredients?.length) return;
  const userId = await currentUserId();
  if (!userId) return;
  const rows = ingredients.filter((i) => i.shareId).map((i) => communityIngredientToRow(i, userId, userName));
  if (!rows.length) return;
  const { error } = await supabase
    .from('community_ingredients')
    .upsert(rows, { onConflict: 'share_id', ignoreDuplicates: true });
  if (error) { warn('pushCommunityIngredientsBatch', error); throw error; }
}

export async function pushCommunityMealsBatch(meals, userName) {
  if (!isSupabaseConfigured || !meals?.length) return;
  const userId = await currentUserId();
  if (!userId) return;
  const rows = meals.filter((m) => m.shareId).map((m) => communityMealToRow(m, userId, userName));
  if (!rows.length) return;
  const { error } = await supabase
    .from('community_meals')
    .upsert(rows, { onConflict: 'share_id', ignoreDuplicates: true });
  if (error) { warn('pushCommunityMealsBatch', error); throw error; }
}

/**
 * Actualiza una fila comunitaria. RLS solo permite al creador original.
 * Si el user no es el creador, el update no afecta filas (no-op silencioso).
 */
export async function updateCommunityIngredient(ing) {
  if (!isSupabaseConfigured || !ing?.shareId) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('community_ingredients')
    .update({
      name: ing.name,
      measure_type: ing.measureType,
      base_qty: ing.baseQty,
      serving_label: ing.servingLabel,
      kcal: ing.kcal,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      fiber: ing.fiber,
      photo: ing.photo || null
    })
    .eq('share_id', ing.shareId);
  if (error) warn('updateCommunityIngredient', error);
}

export async function updateCommunityMeal(meal) {
  if (!isSupabaseConfigured || !meal?.shareId) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('community_meals')
    .update({
      name: meal.name,
      photo: meal.photo || null,
      items: meal.items || [],
      totals: meal.totals || {},
      yield_grams: meal.yieldGrams != null ? Number(meal.yieldGrams) : null
    })
    .eq('share_id', meal.shareId);
  if (error) warn('updateCommunityMeal', error);
}

/** Borra de community. RLS solo permite al creador. */
export async function removeCommunityIngredient(shareId) {
  if (!isSupabaseConfigured || !shareId) return;
  const { error } = await supabase.from('community_ingredients').delete().eq('share_id', shareId);
  if (error) warn('removeCommunityIngredient', error);
}

export async function removeCommunityMeal(shareId) {
  if (!isSupabaseConfigured || !shareId) return;
  const { error } = await supabase.from('community_meals').delete().eq('share_id', shareId);
  if (error) warn('removeCommunityMeal', error);
}

/**
 * Devuelve info mínima de la fila comunitaria (para saber si el user es creador).
 * @returns {Promise<{share_id, created_by, created_by_name}|null>}
 */
export async function fetchCommunityIngredientByShareId(shareId) {
  if (!isSupabaseConfigured || !shareId) return null;
  const { data, error } = await supabase
    .from('community_ingredients')
    .select('share_id, created_by, created_by_name, created_at')
    .eq('share_id', shareId)
    .maybeSingle();
  if (error) { warn('fetchCommunityIngredientByShareId', error); return null; }
  return data;
}

export async function fetchCommunityMealByShareId(shareId) {
  if (!isSupabaseConfigured || !shareId) return null;
  const { data, error } = await supabase
    .from('community_meals')
    .select('share_id, created_by, created_by_name, created_at')
    .eq('share_id', shareId)
    .maybeSingle();
  if (error) { warn('fetchCommunityMealByShareId', error); return null; }
  return data;
}

/**
 * Versión batch para upsert de los personales (cuando hay que escribir share_ids
 * recién generados de golpe en muchos registros).
 */
export async function upsertIngredientsBatch(ingredients) {
  if (!isSupabaseConfigured || !ingredients?.length) return;
  const userId = await currentUserId();
  if (!userId) return;
  const rows = ingredients.map((i) => ingredientToRow(userId, i));
  const { error } = await supabase
    .from('custom_ingredients')
    .upsert(rows, { onConflict: 'id' });
  if (error) { warn('upsertIngredientsBatch', error); throw error; }
}

export async function upsertMealsBatch(meals) {
  if (!isSupabaseConfigured || !meals?.length) return;
  const userId = await currentUserId();
  if (!userId) return;
  const rows = meals.map((m) => mealToRow(userId, m));
  const { error } = await supabase
    .from('custom_meals')
    .upsert(rows, { onConflict: 'id' });
  if (error) { warn('upsertMealsBatch', error); throw error; }
}

/** Escapa caracteres especiales del patrón LIKE/ILIKE. */
function escapeLike(s) {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
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

// ============================================================
//  DIAGNÓSTICO — para el panel de Settings
// ============================================================

/**
 * Hace un health-check completo de Supabase. Devuelve un objeto con flags y
 * mensajes que el panel de Settings renderiza para que el user vea qué falla.
 */
export async function runDiagnostic() {
  const result = {
    configured: isSupabaseConfigured,
    authOk:     false,
    userId:     null,
    userEmail:  null,
    tablesOk:   {},     // { profiles: true/false, food_entries: true/false, ... }
    writeOk:    false,
    writeError: null
  };

  if (!isSupabaseConfigured) {
    result.error = 'Variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configuradas en Vercel.';
    return result;
  }

  // 1) Auth
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    result.authOk    = !!data?.session;
    result.userId    = data?.session?.user?.id || null;
    result.userEmail = data?.session?.user?.email || null;
  } catch (e) {
    result.authError = e.message;
  }

  // 2) Tablas (lectura mínima — count head)
  const tables = ['profiles', 'food_entries', 'weights', 'water_logs',
                  'custom_ingredients', 'custom_meals',
                  'community_ingredients', 'community_meals'];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).select('*', { count: 'exact', head: true }).limit(1);
      result.tablesOk[t] = !error;
      if (error) result.tablesOk[t + '_error'] = error.message;
    } catch (e) {
      result.tablesOk[t] = false;
      result.tablesOk[t + '_error'] = e.message;
    }
  }

  // 3) Test de escritura completo: water_logs + food_entries (la tabla "problema")
  // Si food_entries falla mientras water_logs pasa, hay RLS específica rota.
  if (result.authOk && result.userId) {
    const probeDate = '1970-01-01';

    // 3a) water_logs (test base)
    try {
      const { data, error } = await supabase
        .from('water_logs')
        .upsert({ user_id: result.userId, date: probeDate, ml: 1 }, { onConflict: 'user_id,date' })
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('0 filas devueltas (RLS silenciosa)');
      await supabase.from('water_logs').delete().eq('user_id', result.userId).eq('date', probeDate);
      result.writeOk = true;
    } catch (e) {
      result.writeError = e.message;
    }

    // 3b) food_entries (test específico — esta es la tabla que reporta el bug)
    const probeId = '00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .upsert({
          id: probeId,
          user_id: result.userId,
          date: probeDate,
          name: '__diagnostic_probe__',
          meal: 'Desayuno',
          kcal: 0
        }, { onConflict: 'id' })
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('0 filas devueltas (RLS bloqueó silenciosamente)');
      // Limpieza
      await supabase.from('food_entries').delete().eq('id', probeId);
      result.foodEntriesWriteOk = true;
    } catch (e) {
      result.foodEntriesWriteError = e.message;
      result.foodEntriesWriteOk = false;
    }
  }

  // 4) localStorage size REAL (no el bucket total — ese reporta IndexedDB+Cache+etc).
  //    localStorage tiene un cap fijo de ~5MB por origen aunque el bucket sea de 39GB.
  if (typeof localStorage !== 'undefined') {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      // UTF-16: cada char = 2 bytes
      bytes += (k.length + v.length) * 2;
    }
    result.localStorageBytes = bytes;
    result.localStorageMB    = Math.round(bytes / 1024 / 1024 * 100) / 100;
    // Detalle: tamaño de la key principal (calcal:food)
    const foodRaw = localStorage.getItem('calcal:food') || '';
    result.foodCacheMB = Math.round((foodRaw.length * 2) / 1024 / 1024 * 100) / 100;
    // Browsers típicamente dan 5MB de localStorage. >4MB = riesgo
    result.localStorageNearLimit = bytes > 4 * 1024 * 1024;
  }

  // 5) Bucket total (solo informativo — NO usar como límite de localStorage)
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      result.bucketUsedMB  = Math.round((est.usage  || 0) / 1024 / 1024 * 10) / 10;
      result.bucketQuotaMB = Math.round((est.quota  || 0) / 1024 / 1024);
    } catch { /* noop */ }
  }

  return result;
}
