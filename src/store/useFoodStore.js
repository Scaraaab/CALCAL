import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { todayISO } from '../utils/date';
import { uuid } from '../utils/format';
import * as db from '../lib/db';

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
        const clean = {
          id: uuid(),
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
        if (!clean.name) return null;
        set((s) => ({ customIngredients: [clean, ...s.customIngredients] }));
        db.upsertIngredient(clean);
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
        if (updated) db.upsertIngredient(updated);
      },
      removeIngredient: (id) => {
        // Identifica comidas afectadas para re-upsertarlas (perdieron un ingrediente)
        const affectedMeals = get().customMeals
          .filter((m) => m.items.some((it) => it.ingredientId === id))
          .map((m) => ({
            ...m,
            items: m.items.filter((it) => it.ingredientId !== id)
          }));
        set((s) => ({
          customIngredients: s.customIngredients.filter((i) => i.id !== id),
          customMeals: s.customMeals
            .map((m) => m.items.some((it) => it.ingredientId === id)
              ? { ...m, items: m.items.filter((it) => it.ingredientId !== id) }
              : m)
            .filter((m) => m.items.length > 0)
        }));
        db.removeIngredient(id);
        // Sync de las comidas afectadas (las que se quedaron vacías hay que borrarlas)
        affectedMeals.forEach((m) => {
          if (m.items.length === 0) db.removeMeal(m.id);
          else db.upsertMeal({ ...m, totals: computeMealTotals(m.items) });
        });
      },

      // ============ CUSTOM MEALS ============
      addMeal: (meal) => {
        const totals = computeMealTotals(meal.items || []);
        const clean = {
          id: uuid(),
          name: (meal.name || '').trim() || 'Sin nombre',
          photo: meal.photo || null,
          items: meal.items || [],
          totals,
          useCount: 0,
          createdAt: Date.now()
        };
        set((s) => ({ customMeals: [clean, ...s.customMeals] }));
        db.upsertMeal(clean);
        return clean;
      },
      updateMeal: (id, patch) => {
        let updated = null;
        set((s) => ({
          customMeals: s.customMeals.map((m) => {
            if (m.id !== id) return m;
            const items = patch.items || m.items;
            updated = { ...m, ...patch, items, totals: computeMealTotals(items) };
            return updated;
          })
        }));
        if (updated) db.upsertMeal(updated);
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

      /** Reemplaza el state con datos del servidor (al iniciar sesión). */
      hydrate: ({ entries, weights, water, ingredients, meals }) => {
        set({
          entries: entries || {},
          weights: weights || [],
          water: water || {},
          customIngredients: ingredients || [],
          customMeals: meals || []
          // favorites / streakData / planner / recipes / shoppingList: locales, no se tocan
        });
      },

      /** Limpia todo (logout). */
      reset: () => set({
        entries: {}, water: {}, weights: [],
        favorites: [],
        streakData: { lastLoggedDate: null, current: 0, best: 0 },
        planner: {}, recipes: [], shoppingList: [],
        customIngredients: [], customMeals: []
      })
    }),
    {
      name: 'calcal:food',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

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

function round1(n) { return Math.round(n * 10) / 10; }
