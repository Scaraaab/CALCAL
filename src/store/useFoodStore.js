import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { todayISO } from '../utils/date';
import { uuid } from '../utils/format';
import * as db from '../lib/db';

// ─────────────────────────────────────────────────────────────
//  DEBUG LOGGING
//  Filtrable en DevTools con: [CalCal:store]
// ─────────────────────────────────────────────────────────────
const log = (label, ...args) => console.log(`%c[CalCal:store] ${label}`, 'color:#c8ff3d;font-weight:bold', ...args);
const logErr = (label, ...args) => console.error(`%c[CalCal:store] ${label}`, 'color:#ff6b9d;font-weight:bold', ...args);

/**
 * Estado de alimentos, agua, peso, ingredientes, comidas compuestas.
 * Patrón: Zustand persist sigue activo (offline cache + fast paint), pero cada
 * mutación dispara un write-through a Supabase. Al hidratar tras login, el
 * servidor reemplaza completamente el state.
 *
 * Datos solo-locales (no sincronizados): favorites, streakData, planner,
 * recipes, shoppingList. Se quedan como state app, no como datos del dominio.
 */
export const useFoodStore = create(
  persist(
    (set, get) => ({
      entries: {},        // { [iso]: [{ id, ... }] }
      water: {},          // { [iso]: ml }
      weights: [],        // [{ date, kg }]
      favorites: [],      // local
      streakData: { lastLoggedDate: null, current: 0, best: 0 }, // local
      planner: {},        // local
      recipes: [],        // local
      shoppingList: [],   // local
      customIngredients: [],
      customMeals: [],

      // Nombre del usuario para etiquetar contribuciones a community.
      // Lo setea App.jsx tras hydrate. Underscore prefix → no se persiste lógicamente.
      _communityUserName: '',

      // ============ ENTRIES ============
      addEntry: (entry, date = todayISO()) => {
        const e = { id: uuid(), meal: entry.meal || guessMeal(), createdAt: Date.now(), ...entry };
        set((s) => ({ entries: { ...s.entries, [date]: [...(s.entries[date] || []), e] } }));
        get()._bumpStreak(date);
        db.upsertEntry(date, e);
      },

      addEntries: (items, date = todayISO()) => {
        const stamped = items.map((it) => ({
          id: uuid(), meal: it.meal || guessMeal(), createdAt: Date.now(), ...it
        }));
        set((s) => ({ entries: { ...s.entries, [date]: [...(s.entries[date] || []), ...stamped] } }));
        get()._bumpStreak(date);
        db.upsertEntries(date, stamped);
      },

      removeEntry: (id, date) => {
        set((s) => ({
          entries: { ...s.entries, [date]: (s.entries[date] || []).filter((e) => e.id !== id) }
        }));
        db.removeEntry(id);
      },

      updateEntry: (id, date, patch) => {
        let updated = null;
        set((s) => ({
          entries: {
            ...s.entries,
            [date]: (s.entries[date] || []).map((e) => {
              if (e.id !== id) return e;
              updated = { ...e, ...patch };
              return updated;
            })
          }
        }));
        if (updated) db.upsertEntry(date, updated);
      },

      copyDay: (fromIso, toIso = todayISO()) => {
        const src = get().entries[fromIso] || [];
        if (!src.length) return 0;
        const copied = src.map((e) => ({ ...e, id: uuid(), createdAt: Date.now() }));
        set((s) => ({ entries: { ...s.entries, [toIso]: [...(s.entries[toIso] || []), ...copied] } }));
        get()._bumpStreak(toIso);
        db.upsertEntries(toIso, copied);
        return copied.length;
      },

      // ============ WATER ============
      addWater: (ml, date = todayISO()) => {
        const next = (get().water[date] || 0) + ml;
        set((s) => ({ water: { ...s.water, [date]: next } }));
        db.upsertWater(date, next);
      },
      setWater: (ml, date = todayISO()) => {
        const next = Math.max(0, ml);
        set((s) => ({ water: { ...s.water, [date]: next } }));
        db.upsertWater(date, next);
      },

      // ============ WEIGHT ============
      addWeight: (kg, date = todayISO()) => {
        const k = Number(kg);
        set((s) => ({ weights: [...s.weights.filter((w) => w.date !== date), { date, kg: k }] }));
        db.upsertWeight(date, k);
      },
      removeWeight: (date) => {
        set((s) => ({ weights: s.weights.filter((w) => w.date !== date) }));
        db.removeWeight(date);
      },

      // ============ FAVORITES (local) ============
      toggleFavorite: (item) => {
        const exists = get().favorites.find((f) => f.name?.toLowerCase() === item.name?.toLowerCase());
        if (exists) {
          set((s) => ({ favorites: s.favorites.filter((f) => f.id !== exists.id) }));
        } else {
          set((s) => ({
            favorites: [...s.favorites, {
              id: uuid(), name: item.name, kcal: item.kcal, protein: item.protein,
              carbs: item.carbs, fat: item.fat, fiber: item.fiber || 0,
              serving: item.serving || item.unit || ''
            }]
          }));
        }
      },

      // ============ STREAK (local, derivable) ============
      _bumpStreak: (date) => {
        const s = get().streakData;
        if (s.lastLoggedDate === date) return;
        const today = todayISO();
        if (date !== today) return;
        const prev = s.lastLoggedDate;
        const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
        let current = 1;
        if (prev === yesterday) current = s.current + 1;
        else if (prev === today) current = s.current;
        const best = Math.max(s.best, current);
        set({ streakData: { lastLoggedDate: today, current, best } });
      },

      // ============ PLANNER / RECIPES / SHOPPING (local) ============
      setPlan: (date, plan) => set((s) => ({ planner: { ...s.planner, [date]: plan } })),
      removePlan: (date) => set((s) => { const cp = { ...s.planner }; delete cp[date]; return { planner: cp }; }),
      addRecipe: (r) => set((s) => ({ recipes: [{ id: uuid(), ...r }, ...s.recipes] })),
      removeRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),
      setShopping: (list) => set({ shoppingList: list }),
      toggleShoppingItem: (id) => set((s) => ({
        shoppingList: s.shoppingList.map((it) => it.id === id ? { ...it, done: !it.done } : it)
      })),
      addShoppingItem: (name) => set((s) => ({
        shoppingList: [...s.shoppingList, { id: uuid(), name, done: false }]
      })),
      clearShopping: () => set({ shoppingList: [] }),

      // ============ CUSTOM INGREDIENTS ============
      addIngredient: (ing) => {
        log('addIngredient → recibido', ing);
        const clean = {
          id: uuid(),
          shareId: uuid(), // ← share_id único global para emparejar con community
          name: (ing.name || '').trim(),
          measureType: ing.measureType || 'per100g',
          baseQty: ing.measureType === 'per100g' ? 100 : 1,
          servingLabel: ing.servingLabel || defaultServingLabel(ing.measureType),
          kcal: Number(ing.kcal) || 0,
          protein: Number(ing.protein) || 0,
          carbs: Number(ing.carbs) || 0,
          fat: Number(ing.fat) || 0,
          fiber: Number(ing.fiber) || 0,
          photo: ing.photo || null,
          createdAt: Date.now()
        };
        if (!clean.name) {
          logErr('addIngredient → ABORTADO: nombre vacío');
          return null;
        }
        const before = get().customIngredients.length;
        set((s) => ({ customIngredients: [clean, ...s.customIngredients] }));
        const after = get().customIngredients.length;
        log(`addIngredient → local: ${before} → ${after}`, { id: clean.id, name: clean.name });

        // write-through con verificación (personal)
        db.upsertIngredient(clean).then((res) => {
          if (res?.ok) {
            log(`addIngredient → Supabase OK: ${clean.name}`);
          } else {
            logErr(`addIngredient → Supabase FALLÓ (${res?.reason}). El ingrediente está SOLO en local y se perderá al recargar.`, res);
          }
        }).catch((err) => {
          logErr('addIngredient → upsert promise rechazada', err);
        });

        // Publicar a community (fire-and-forget, ignoreDuplicates si ya existe)
        const userName = get()._communityUserName || '';
        db.pushCommunityIngredient(clean, userName);

        return clean;
      },
      updateIngredient: (id, patch) => {
        let updated = null;
        set((s) => ({
          customIngredients: s.customIngredients.map((i) => {
            if (i.id !== id) return i;
            updated = { ...i, ...patch };
            return updated;
          })
        }));
        if (updated) {
          db.upsertIngredient(updated);
          // Propaga edición a community si tiene shareId. RLS filtra: solo el
          // creador puede actualizar; para otros usuarios es un no-op silencioso.
          if (updated.shareId) db.updateCommunityIngredient(updated);
        }
      },
      removeIngredient: (id) => {
        const target = get().customIngredients.find((i) => i.id === id);
        log('removeIngredient →', { id, name: target?.name });
        // Identifica comidas afectadas para re-upsertarlas (perdieron un ingrediente)
        const affectedMeals = get().customMeals
          .filter((m) => m.items.some((it) => it.ingredientId === id))
          .map((m) => ({
            ...m,
            items: m.items.filter((it) => it.ingredientId !== id)
          }));
        const before = get().customIngredients.length;
        set((s) => ({
          customIngredients: s.customIngredients.filter((i) => i.id !== id),
          customMeals: s.customMeals
            .map((m) => m.items.some((it) => it.ingredientId === id)
              ? { ...m, items: m.items.filter((it) => it.ingredientId !== id) }
              : m)
            .filter((m) => m.items.length > 0)
        }));
        log(`removeIngredient → local: ${before} → ${get().customIngredients.length}`);
        db.removeIngredient(id);
        affectedMeals.forEach((m) => {
          if (m.items.length === 0) db.removeMeal(m.id);
          else db.upsertMeal({ ...m, totals: computeMealTotals(m.items) });
        });
      },

      // ============ CUSTOM MEALS ============
      addMeal: (meal) => {
        const totals = computeMealTotals(meal.items || []);
        const yieldGrams = meal.yieldGrams != null && Number(meal.yieldGrams) > 0
          ? Number(meal.yieldGrams)
          : null;
        const clean = {
          id: uuid(),
          shareId: uuid(), // ← share_id único global
          name: (meal.name || '').trim() || 'Sin nombre',
          photo: meal.photo || null,
          items: meal.items || [],
          totals,
          yieldGrams,
          useCount: 0,
          createdAt: Date.now()
        };
        set((s) => ({ customMeals: [clean, ...s.customMeals] }));
        db.upsertMeal(clean);
        // Publicar a community (fire-and-forget)
        const userName = get()._communityUserName || '';
        db.pushCommunityMeal(clean, userName);
        return clean;
      },
      updateMeal: (id, patch) => {
        let updated = null;
        set((s) => ({
          customMeals: s.customMeals.map((m) => {
            if (m.id !== id) return m;
            const items = patch.items || m.items;
            const yieldGrams = patch.yieldGrams !== undefined
              ? (patch.yieldGrams != null && Number(patch.yieldGrams) > 0 ? Number(patch.yieldGrams) : null)
              : m.yieldGrams;
            updated = { ...m, ...patch, items, yieldGrams, totals: computeMealTotals(items) };
            return updated;
          })
        }));
        if (updated) {
          db.upsertMeal(updated);
          if (updated.shareId) db.updateCommunityMeal(updated);
        }
      },

      /**
       * Borra una fila de community SIN tocar la copia personal.
       * Solo el creador puede; RLS lo enforza.
       */
      removeFromCommunity: (kind, shareId) => {
        if (!shareId) return;
        if (kind === 'ingredient') db.removeCommunityIngredient(shareId);
        else if (kind === 'meal')  db.removeCommunityMeal(shareId);
      },
      removeMeal: (id) => {
        set((s) => ({ customMeals: s.customMeals.filter((m) => m.id !== id) }));
        db.removeMeal(id);
      },
      bumpMealUseCount: (id) => {
        let updated = null;
        set((s) => ({
          customMeals: s.customMeals.map((m) => {
            if (m.id !== id) return m;
            updated = { ...m, useCount: (m.useCount || 0) + 1 };
            return updated;
          })
        }));
        if (updated) db.upsertMeal(updated);
      },

      // ============ HYDRATION / RESET ============

      /**
       * Reemplaza el state con datos del servidor (al iniciar sesión).
       *
       * Importante: usamos `??` en vez de `||`. Si una sección viene `null` significa
       * que el fetch falló (red, cuota, RLS) — en ese caso mantenemos el cache local
       * para no perder datos. Sólo reemplazamos cuando el server devolvió algo,
       * aunque ese algo sea un array/objeto vacío legítimo.
       */
      hydrate: ({ entries, weights, water, ingredients, meals }) => {
        const cur = get();
        console.group('%c[CalCal:store] hydrate ← Supabase', 'color:#c8ff3d;font-weight:bold');
        console.log('Recibido del servidor:', {
          entries:     entries === null ? 'NULL (fetch falló)' : `${Object.keys(entries || {}).length} días`,
          weights:     weights === null ? 'NULL (fetch falló)' : `${weights?.length ?? 0} pesajes`,
          water:       water === null ? 'NULL (fetch falló)' : `${Object.keys(water || {}).length} días`,
          ingredients: ingredients === null ? 'NULL (fetch falló)' : `${ingredients?.length ?? 0} items`,
          meals:       meals === null ? 'NULL (fetch falló)' : `${meals?.length ?? 0} items`
        });
        console.log('Estado local actual:', {
          entries:           `${Object.keys(cur.entries).length} días`,
          weights:           `${cur.weights.length} pesajes`,
          water:             `${Object.keys(cur.water).length} días`,
          customIngredients: `${cur.customIngredients.length} items`,
          customMeals:       `${cur.customMeals.length} items`
        });

        // Decisión por slice
        if (ingredients === null) {
          log('hydrate.customIngredients → mantengo local (server falló)');
        } else if (ingredients.length === 0 && cur.customIngredients.length > 0) {
          logErr(`hydrate.customIngredients → ATENCIÓN: server devolvió [] pero local tiene ${cur.customIngredients.length}. REEMPLAZANDO con [].`);
          logErr('  Causa probable: upserts anteriores fallaron silenciosamente.');
          logErr('  Local que se va a perder:', cur.customIngredients.map((i) => i.name));
        } else {
          log(`hydrate.customIngredients → ${cur.customIngredients.length} → ${ingredients.length}`);
        }

        set({
          entries:           entries     ?? cur.entries,
          weights:           weights     ?? cur.weights,
          water:             water       ?? cur.water,
          customIngredients: ingredients ?? cur.customIngredients,
          customMeals:       meals       ?? cur.customMeals
          // favorites / streakData / planner / recipes / shoppingList: locales, no se tocan
        });

        log('Estado tras hydrate:', {
          customIngredients: get().customIngredients.length,
          customMeals:       get().customMeals.length
        });
        console.groupEnd();
      },

      /**
       * Migra los ingredientes y comidas personales a la base de datos comunitaria.
       *
       * Diseño:
       *  - SE EJECUTA UNA SOLA VEZ POR USUARIO en toda la vida de la app.
       *  - Marca de finalización en localStorage por userId: si el flag existe,
       *    short-circuit total (no toca Supabase ni siquiera para verificar).
       *  - Para los ítems que no tienen shareId: genera uno, lo guarda en local
       *    y en la copia personal de Supabase.
       *  - Para todos los ítems con shareId: upsert batch en community con
       *    ignoreDuplicates (los que ya existen no se tocan; los que faltan se
       *    insertan).
       *  - Tras la migración, los nuevos ingredientes/comidas se publican en
       *    tiempo real desde addIngredient/addMeal. Las ediciones se propagan
       *    desde updateIngredient/updateMeal. Esta función ya no hace falta.
       *
       * Idempotente y silencioso (solo loggea, nunca lanza al caller).
       */
      syncToCommunity: async (userName, userId) => {
        // Guardamos el nombre para futuras publicaciones (addIngredient/addMeal).
        set({ _communityUserName: userName || '' });

        if (!userId) {
          log('syncToCommunity → SKIP: sin userId');
          return;
        }

        // Flag persistente por usuario. Si ya migramos antes, salta.
        const flagKey = `calcal:community_migrated:${userId}`;
        if (typeof localStorage !== 'undefined' && localStorage.getItem(flagKey)) {
          log(`syncToCommunity → SKIP: ya migrado (${userId.slice(0, 8)}…)`);
          return;
        }

        const state = get();
        const personalIngs = state.customIngredients;
        const personalMeals = state.customMeals;

        if (personalIngs.length === 0 && personalMeals.length === 0) {
          log('syncToCommunity → SKIP: usuario sin items personales');
          // Aun así marcamos el flag para no volver a comprobar
          if (typeof localStorage !== 'undefined') localStorage.setItem(flagKey, String(Date.now()));
          return;
        }

        log(`syncToCommunity → INICIANDO migración: ${personalIngs.length} ingr, ${personalMeals.length} comidas`);

        // 1. Genera shareId para los que no tienen
        const ingFixes = [];
        const ingsWithIds = personalIngs.map((i) => {
          if (i.shareId) return i;
          const shareId = uuid();
          ingFixes.push({ id: i.id, shareId });
          return { ...i, shareId };
        });
        const mealFixes = [];
        const mealsWithIds = personalMeals.map((m) => {
          if (m.shareId) return m;
          const shareId = uuid();
          mealFixes.push({ id: m.id, shareId });
          return { ...m, shareId };
        });

        // 2. Actualiza local con los nuevos shareIds
        if (ingFixes.length || mealFixes.length) {
          log(`syncToCommunity → ${ingFixes.length} ingr + ${mealFixes.length} comidas necesitan shareId`);
          set((s) => ({
            customIngredients: s.customIngredients.map((i) => {
              const f = ingFixes.find((x) => x.id === i.id);
              return f ? { ...i, shareId: f.shareId } : i;
            }),
            customMeals: s.customMeals.map((m) => {
              const f = mealFixes.find((x) => x.id === m.id);
              return f ? { ...m, shareId: f.shareId } : m;
            })
          }));
        }

        // 3. Persiste shareIds en personal + publica en community.
        // Si algo falla NO marcamos el flag → reintenta al siguiente login.
        try {
          if (ingFixes.length) await db.upsertIngredientsBatch(ingsWithIds);
          if (mealFixes.length) await db.upsertMealsBatch(mealsWithIds);
          await db.pushCommunityIngredientsBatch(ingsWithIds, userName);
          await db.pushCommunityMealsBatch(mealsWithIds, userName);

          if (typeof localStorage !== 'undefined') localStorage.setItem(flagKey, String(Date.now()));
          log(`syncToCommunity → ✅ OK (${ingsWithIds.length} ingr, ${mealsWithIds.length} comidas). Flag persistido.`);
        } catch (err) {
          logErr('syncToCommunity → ❌ error (reintentará en próximo login)', err);
        }
      },

      /** Limpia todo (logout). */
      reset: () => {
        const cur = get();
        logErr(`reset() llamado. Borrando: ${cur.customIngredients.length} ingredientes, ${cur.customMeals.length} comidas, ${cur.weights.length} pesajes, ${Object.keys(cur.entries).length} días de comida`);
        console.trace('reset() stack trace ↑'); // saber quién lo invocó
        set({
          entries: {}, water: {}, weights: [],
          favorites: [],
          streakData: { lastLoggedDate: null, current: 0, best: 0 },
          planner: {}, recipes: [], shoppingList: [],
          customIngredients: [], customMeals: []
        });
      }
    }),
    {
      name: 'calcal:food',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// ─────────────────────────────────────────────────────────────
//  CENTINELA: cualquier cambio en customIngredients se loguea.
//  Si pasa de N>0 a 0, imprime un stack trace para identificar
//  quién está borrando los ingredientes.
// ─────────────────────────────────────────────────────────────
{
  let prev = useFoodStore.getState().customIngredients;
  log(`centinela inicial: customIngredients = ${prev.length} items`, prev.map((i) => i.name));
  useFoodStore.subscribe((state) => {
    const next = state.customIngredients;
    if (next === prev) return;
    if (next.length !== prev.length) {
      if (next.length === 0 && prev.length > 0) {
        logErr(`⚠️ customIngredients VACIADO: ${prev.length} → 0`);
        console.trace('Quién vació customIngredients ↑');
      } else {
        log(`customIngredients: ${prev.length} → ${next.length}`);
      }
    } else {
      log(`customIngredients: contenido actualizado (mismo count: ${next.length})`);
    }
    prev = next;
  });
}

// Expone el store en window para inspección manual desde la consola:
//   __store.customIngredients
//   __store // estado completo
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__store', {
    get: () => useFoodStore.getState(),
    configurable: true
  });
}

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'Desayuno';
  if (h < 16) return 'Almuerzo';
  if (h < 19) return 'Merienda';
  return 'Cena';
}

function defaultServingLabel(measureType) {
  if (measureType === 'per100g') return '100 g';
  if (measureType === 'unit') return '1 unidad';
  return '1 porción';
}

/** Convierte un ingrediente personalizado al shape de FOOD_DB (para reutilizar FoodSearch). */
export function ingredientToFood(ing) {
  if (!ing) return null;
  const unit = ing.measureType === 'per100g' ? 'g'
             : ing.measureType === 'unit'    ? 'unidad'
             : 'porcion';
  const baseQty = ing.measureType === 'per100g' ? 100 : 1;
  return {
    id: ing.id,
    isCustom: true,
    names: [ing.name],
    unit,
    baseQty,
    serving: ing.servingLabel,
    kcal: ing.kcal,
    protein: ing.protein,
    carbs: ing.carbs,
    fat: ing.fat,
    fiber: ing.fiber,
    photo: ing.photo || null
  };
}

export function computeMealTotals(items = []) {
  return items.reduce(
    (acc, it) => ({
      kcal:    acc.kcal    + (Number(it.kcal)    || 0),
      protein: round1(acc.protein + (Number(it.protein) || 0)),
      carbs:   round1(acc.carbs   + (Number(it.carbs)   || 0)),
      fat:     round1(acc.fat     + (Number(it.fat)     || 0)),
      fiber:   round1(acc.fiber   + (Number(it.fiber)   || 0))
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Convierte una comida compuesta CON yieldGrams en formato compatible con FOOD_DB.
 * La receta se presenta como un alimento "por 100g" en el buscador.
 *
 *   meal.totals.kcal      ÷ meal.yieldGrams × 100 = kcal por 100g
 *
 * @returns {object|null} food shape o null si la comida no tiene yieldGrams.
 */
export function mealToFood(meal) {
  if (!meal?.yieldGrams || meal.yieldGrams <= 0) return null;
  const f = 100 / meal.yieldGrams;
  return {
    id: meal.id,
    isRecipe: true,
    names: [meal.name],
    unit: 'g',
    baseQty: 100,
    serving: `Receta · rinde ${meal.yieldGrams}g`,
    kcal:    Math.round(meal.totals.kcal * f),
    protein: round1(meal.totals.protein * f),
    carbs:   round1(meal.totals.carbs * f),
    fat:     round1(meal.totals.fat * f),
    fiber:   round1((meal.totals.fiber || 0) * f),
    photo: meal.photo || null,
    mealId: meal.id // para que la entry resultante pueda referenciar la receta
  };
}

/**
 * Devuelve los macros de una receta para X gramos consumidos.
 * Útil al añadir al diario "por gramos".
 */
export function scaleMealByGrams(meal, grams) {
  if (!meal?.yieldGrams || meal.yieldGrams <= 0) return null;
  const f = Number(grams) / meal.yieldGrams;
  return {
    kcal:    Math.round(meal.totals.kcal * f),
    protein: round1(meal.totals.protein * f),
    carbs:   round1(meal.totals.carbs * f),
    fat:     round1(meal.totals.fat * f),
    fiber:   round1((meal.totals.fiber || 0) * f)
  };
}

function round1(n) { return Math.round(n * 10) / 10; }
