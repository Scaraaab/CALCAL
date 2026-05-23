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
      isFavorite: (name) => get().favorites.some((f) => f.name?.toLowerCase() === (name || '').toLowerCase()),

      // ---- FREQUENT (computed) ----
      frequentFoods: () => {
        const counts = {};
        Object.values(get().entries).forEach((arr) => {
          arr.forEach((e) => {
            const key = (e.name || '').toLowerCase();
            if (!key) return;
            counts[key] = counts[key] || { ...e, count: 0 };
            counts[key].count++;
          });
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12);
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

      // ---- DERIVED ----
      entriesByDate: (date) => get().entries[date] || [],
      waterByDate: (date) => get().water[date] || 0,
      latestWeight: () => {
        const ws = get().weights;
        if (!ws.length) return null;
        return [...ws].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      }
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
