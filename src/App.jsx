import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
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
import { useUserStore } from './store/useUserStore';
import { useAuthStore } from './store/useAuthStore';

function RequireAuth({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const onboarded = useUserStore((s) => s.profile?.onboarded);
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
