// Auth store wired a Supabase. La sesión la persiste el cliente Supabase
// en localStorage automáticamente (sb-...-auth-token).
//
// Estados:
//   user === undefined → todavía no sabemos (loading inicial)
//   user === null      → no autenticado
//   user (obj)         → autenticado
//   hydrated           → true cuando ya hidratamos los datos del usuario
//                        desde Supabase tras el sign-in
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  user: undefined,
  session: null,
  hydrated: false,
  configured: isSupabaseConfigured,

  setSession: (session) => {
    const user = session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          avatar: session.user.user_metadata?.avatar_url || null
        }
      : null;
    set({ session, user });
  },

  setHydrated: (v) => set({ hydrated: Boolean(v) }),

  signInWithGoogle: async () => {
    if (!supabase) throw new Error('Supabase no configurado.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, session: null, hydrated: false });
  }
}));

/**
 * Inicializa el listener de Supabase. Llamar UNA vez al boot de la app.
 * @param {(session:object|null, event:string) => Promise<void>|void} onChange
 *        Callback que el caller usa para hidratar / limpiar stores.
 */
export function initAuthListener(onChange) {
  if (!supabase) {
    useAuthStore.setState({ user: null, session: null, hydrated: true });
    return () => {};
  }

  // Carga inicial de la sesión persistida
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session || null);
    onChange?.(data.session || null, 'INITIAL_SESSION');
  });

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.getState().setSession(session || null);
    onChange?.(session || null, event);
  });

  return () => sub?.subscription?.unsubscribe?.();
}
