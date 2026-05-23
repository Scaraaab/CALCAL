import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { todayISO } from '../utils/date';
import { uuid } from '../utils/format';

// Estado de alimentos, agua, peso, favoritos, rachas, planner.
export const useFoodStore = create(
  persist(
    (set, get) => ({
      // entries: { [iso]: [{ id, name, meal, kcal, protein, carbs, fat, fiber, qty, unit, createdAt }] }
      entries: {},
      water: {},   // { [iso]: ml }
      weights: [], // [{ date, kg }]
      favorites: [], // [{ id, name, kcal, protein, carbs, fat, fiber, serving }]
      streakData: { lastLoggedDate: null, current: 0, best: 0 },
      planner: {}, // { [iso]: [{ name, items: [...] }] }
      recipes: [], // [{ id, name, body, kcal, protein, ... }]
      shoppingList: [], // [{ id, name, qty, done }]

      // customIngredients: ingredientes propios del usuario.
      // shape: { id, name, measureType: 'per100g'|'serving'|'unit',
      //         baseQty (numérico de referencia), kcal, protein, carbs, fat, fiber,
      //         servingLabel (texto opcional), createdAt }
      customIngredients: [],

      // customMeals: comidas compuestas guardadas (one-tap en LogFood).
      // shape: { id, name, photo (dataUrl|null),
      //         items: [{ name, qty, unit, kcal, protein, carbs, fat, fiber, ingredientId? }],
      //         totals: { kcal, protein, carbs, fat, fiber },
      //         useCount, createdAt }
      customMeals: [],

      // ---- ENTRIES ----
      addEntry: (entry, date = todayISO()) => {
        const e = {
          id: uuid(),
          meal: entry.meal || guessMeal(),
          createdAt: Date.now(),
          ...entry
        };
        set((s) => ({
          entries: { ...s.entries, [date]: [...(s.entries[date] || []), e] }
        }));
        get()._bumpStreak(date);
      },

      addEntries: (items, date = todayISO()) => {
        const stamped = items.map((it) => ({
          id: uuid(),
          meal: it.meal || guessMeal(),
          createdAt: Date.now(),
          ...it
        }));
        set((s) => ({
          entries: { ...s.entries, [date]: [...(s.entries[date] || []), ...stamped] }
        }));
        get()._bumpStreak(date);
      },

      removeEntry: (id, date) => {
        set((s) => ({
          entries: {
            ...s.entries,
            [date]: (s.entries[date] || []).filter((e) => e.id !== id)
          }
        }));
      },

      updateEntry: (id, date, patch) => {
        set((s) => ({
          entries: {
            ...s.entries,
            [date]: (s.entries[date] || []).map((e) => e.id === id ? { ...e, ...patch } : e)
          }
        }));
      },

      copyDay: (fromIso, toIso = todayISO()) => {
        const src = get().entries[fromIso] || [];
        if (!src.length) return 0;
        const copied = src.map((e) => ({ ...e, id: uuid(), createdAt: Date.now() }));
        set((s) => ({
          entries: { ...s.entries, [toIso]: [...(s.entries[toIso] || []), ...copied] }
        }));
        get()._bumpStreak(toIso);
        return copied.length;
      },

      // ---- WATER ----
      addWater: (ml, date = todayISO()) => {
        set((s) => ({ water: { ...s.water, [date]: (s.water[date] || 0) + ml } }));
      },
      setWater: (ml, date = todayISO()) => {
        set((s) => ({ water: { ...s.water, [date]: Math.max(0, ml) } }));
      },

      // ---- WEIGHT ----
      addWeight: (kg, date = todayISO()) => {
        set((s) => {
          const filtered = s.weights.filter((w) => w.date !== date);
          return { weights: [...filtered, { date, kg: Number(kg) }] };
        });
      },
      removeWeight: (date) => set((s) => ({ weights: s.weights.filter((w) => w.date !== date) })),

      // ---- FAVORITES ----
      toggleFavorite: (item) => {
        const exists = get().favorites.find((f) => f.name?.toLowerCase() === item.name?.toLowerCase());
        if (exists) {
          set((s) => ({ favorites: s.favorites.filter((f) => f.id !== exists.id) }));
        } else {
          set((s) => ({
            favorites: [...s.favorites, {
              id: uuid(),
              name: item.name,
              kcal: item.kcal,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber || 0,
              serving: item.serving || item.unit || ''
            }]
          }));
        }
      },
      // ---- STREAK ----
      _bumpStreak: (date) => {
        const s = get().streakData;
        if (s.lastLoggedDate === date) return;
        // Si la fecha es hoy
        const today = todayISO();
        if (date !== today) return; // solo bumpea por el día actual
        const prev = s.lastLoggedDate;
        const yesterday = (() => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          return d.toISOString().slice(0, 10);
        })();
        let current = 1;
        if (prev === yesterday) current = s.current + 1;
        else if (prev === today) current = s.current;
        const best = Math.max(s.best, current);
        set({ streakData: { lastLoggedDate: today, current, best } });
      },

      // ---- PLANNER ----
      setPlan: (date, plan) => set((s) => ({ planner: { ...s.planner, [date]: plan } })),
      removePlan: (date) => set((s) => {
        const cp = { ...s.planner };
        delete cp[date];
        return { planner: cp };
      }),

      // ---- RECIPES ----
      addRecipe: (r) => set((s) => ({ recipes: [{ id: uuid(), ...r }, ...s.recipes] })),
      removeRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      // ---- SHOPPING LIST ----
      setShopping: (list) => set({ shoppingList: list }),
      toggleShoppingItem: (id) => set((s) => ({
        shoppingList: s.shoppingList.map((it) => it.id === id ? { ...it, done: !it.done } : it)
      })),
      addShoppingItem: (name) => set((s) => ({
        shoppingList: [...s.shoppingList, { id: uuid(), name, done: false }]
      })),
      clearShopping: () => set({ shoppingList: [] }),

      // ---- CUSTOM INGREDIENTS ----
      addIngredient: (ing) => {
        const clean = {
          id: uuid(),
          name: (ing.name || '').trim(),
          measureType: ing.measureType || 'per100g', // 'per100g' | 'serving' | 'unit'
          baseQty: ing.measureType === 'per100g' ? 100 : 1,
          servingLabel: ing.servingLabel || defaultServingLabel(ing.measureType),
          kcal: Number(ing.kcal) || 0,
          protein: Number(ing.protein) || 0,
          carbs: Number(ing.carbs) || 0,
          fat: Number(ing.fat) || 0,
          fiber: Number(ing.fiber) || 0,
          createdAt: Date.now()
        };
        if (!clean.name) return null;
        set((s) => ({ customIngredients: [clean, ...s.customIngredients] }));
        return clean;
      },
      updateIngredient: (id, patch) => set((s) => ({
        customIngredients: s.customIngredients.map((i) => i.id === id ? { ...i, ...patch } : i)
      })),
      removeIngredient: (id) => set((s) => ({
        customIngredients: s.customIngredients.filter((i) => i.id !== id),
        // también limpia comidas que solo referenciaban este ingrediente borrado
        customMeals: s.customMeals.map((m) => ({
          ...m,
          items: m.items.filter((it) => it.ingredientId !== id)
        })).filter((m) => m.items.length > 0)
      })),

      // ---- CUSTOM MEALS (compound meals) ----
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
        return clean;
      },
      updateMeal: (id, patch) => set((s) => ({
        customMeals: s.customMeals.map((m) => {
          if (m.id !== id) return m;
          const items = patch.items || m.items;
          return { ...m, ...patch, items, totals: computeMealTotals(items) };
        })
      })),
      removeMeal: (id) => set((s) => ({
        customMeals: s.customMeals.filter((m) => m.id !== id)
      })),
      bumpMealUseCount: (id) => set((s) => ({
        customMeals: s.customMeals.map((m) => m.id === id ? { ...m, useCount: (m.useCount || 0) + 1 } : m)
      }))
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

/**
 * Convierte un ingrediente personalizado en formato compatible con FoodSearch.
 * (mismo shape que FOOD_DB de foodDB.js)
 */
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
    fiber: ing.fiber
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
