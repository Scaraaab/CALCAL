import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Auth local (placeholder). Reemplazable por Supabase/Firebase fácilmente.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      login: (email) => set({ user: { email, id: 'local-' + email } }),
      register: (email) => set({ user: { email, id: 'local-' + email } }),
      logout: () => set({ user: null })
    }),
    {
      name: 'calcal:auth',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
