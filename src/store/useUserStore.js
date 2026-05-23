import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { targetCalories, targetMacros, recommendedPace } from '../lib/nutrition';

const defaultProfile = {
  onboarded: false,
  name: '',
  age: 28,
  sex: 'male',          // 'male' | 'female'
  heightCm: 175,
  weightKg: 75,
  startWeightKg: 75,
  activity: 'moderate', // sedentary | light | moderate | high | athlete
  goal: 'maintain',     // cut | maintain | bulk
  experience: 'intermediate',
  mealsPerDay: 4,
  restrictions: [],     // ['vegetariano','vegano','sin gluten','sin lactosa','keto']
  calorieDelta: null,   // override manual sobre el goal default
  units: 'metric',
  waterDailyGoalMl: 2500
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      computed: { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30 },

      setProfile: (patch) => {
        const next = { ...get().profile, ...patch };
        const computed = targetMacros(next);
        set({ profile: next, computed });
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
      },

      recomputeTargets: () => {
        const p = get().profile;
        set({ computed: targetMacros(p) });
      },

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
