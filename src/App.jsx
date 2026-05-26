import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/ui/Toast';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import LogFood from './pages/LogFood';
import History from './pages/History';
import Progress from './pages/Progress';
import MealPlanner from './pages/MealPlanner';
import Recipes from './pages/Recipes';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Ingredients from './pages/Ingredients';
import Meals from './pages/Meals';
import MealBuilder from './pages/MealBuilder';
import MealDetail from './pages/MealDetail';
import { useUserStore } from './store/useUserStore';
import { useAuthStore, initAuthListener } from './store/useAuthStore';
import { useFoodStore } from './store/useFoodStore';
import { hydrateAll } from './lib/db';

function Splash({ label = 'Cargando…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 text-white gap-3">
      <Loader2 size={28} className="animate-spin text-brand-300" />
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const user = useAuthStore((s) => s.user);
  if (user === undefined) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const onboarded = useUserStore((s) => s.profile?.onboarded);
  const hydrated = useAuthStore((s) => s.hydrated);
  // Mientras no hidratamos del servidor, no decidimos (evita redirigir a onboarding por error)
  if (!hydrated) return <Splash label="Sincronizando tus datos…" />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  // Listener global de Supabase: en cada cambio de sesión, hidratamos o limpiamos
  // Track del último usuario hidratado. Evita re-hidratar en cada TOKEN_REFRESHED
  // (que dispara cada ~hora y podría pisar datos creados entre medias) y en cada
  // INITIAL_SESSION duplicado del listener.
  const hydratedUserId = useRef(null);

  useEffect(() => {
    const unsub = initAuthListener(async (session) => {
      const auth = useAuthStore.getState();
      const userId = session?.user?.id || null;

      if (userId) {
        // Same user already hydrated → skip (evita pisar mutaciones en vuelo)
        if (hydratedUserId.current === userId) {
          auth.setHydrated(true);
          return;
        }
        try {
          const data = await hydrateAll();
          if (data) {
            if (data.profile) useUserStore.getState().replaceProfile(data.profile);
            useFoodStore.getState().hydrate({
              entries:     data.entries,
              weights:     data.weights,
              water:       data.water,
              ingredients: data.ingredients,
              meals:       data.meals
            });
            // Migración one-time a community (fire-and-forget; flag persistente
            // por userId — solo corre la primera vez para cada usuario).
            const userName = data.profile?.name
              || auth.user?.name
              || auth.user?.email?.split('@')[0]
              || 'Anónimo';
            useFoodStore.getState().syncToCommunity(userName, userId).catch((err) => {
              console.warn('[CalCal] syncToCommunity falló (no bloqueante)', err);
            });
          }
          hydratedUserId.current = userId;
        } catch (e) {
          console.error('[CalCal] Hydrate error', e);
        } finally {
          auth.setHydrated(true);
        }
      } else {
        hydratedUserId.current = null;
        useFoodStore.getState().reset();
        useUserStore.getState().resetProfile();
        auth.setHydrated(true);
      }
    });
    return () => unsub?.();
  }, []);

  return (
    <ErrorBoundary>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <RequireOnboarded>
                <Layout />
              </RequireOnboarded>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/planner" element={<MealPlanner />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/meals/new" element={<MealBuilder />} />
          <Route path="/meals/edit/:id" element={<MealBuilder />} />
          <Route path="/meals/:id" element={<MealDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
