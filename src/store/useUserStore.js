import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { targetCalories, targetMacros, recommendedPace } from '../lib/nutrition';
import { upsertProfile } from '../lib/db';

const defaultProfile = {
  onboarded: false,
  name: '',
  age: 28,
  sex: 'male',
  heightCm: 175,
  weightKg: 75,
  startWeightKg: 75,
  activity: 'moderate',
  goal: 'maintain',
  experience: 'intermediate',
  mealsPerDay: 4,
  restrictions: [],
  calorieDelta: null,
  units: 'metric',
  waterDailyGoalMl: 2500
};

// El cache local sigue activo para offline + arranque rápido. Server gana en login.
export const useUserStore = create(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      computed: { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30 },

      setProfile: (patch) => {
        const next = { ...get().profile, ...patch };
        const computed = targetMacros(next);
        set({ profile: next, computed });
        upsertProfile(next); // write-through (fire-and-forget)
      },

      completeOnboarding: (data) => {
        const next = {
          ...get().profile,
          ...data,
          onboarded: true,
          startWeightKg: data.weightKg ?? get().profile.weightKg
        };
        const computed = targetMacros(next);
        set({ profile: next, computed });
        upsertProfile(next);
      },

      // Reemplaza completamente el profile (usado al hidratar desde Supabase)
      replaceProfile: (serverProfile) => {
        if (!serverProfile) return;
        const next = { ...defaultProfile, ...serverProfile };
        set({ profile: next, computed: targetMacros(next) });
      },

      recomputeTargets: () => set({ computed: targetMacros(get().profile) }),

      pace: () => recommendedPace(get().profile),
      tdee: () => targetCalories({ ...get().profile, calorieDelta: 0 }),

      resetProfile: () => set({ profile: defaultProfile, computed: targetMacros(defaultProfile) })
    }),
    {
      name: 'calcal:user',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
