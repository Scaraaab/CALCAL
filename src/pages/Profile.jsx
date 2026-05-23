import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Calendar, Sparkles, ChevronRight, Target, ChefHat, BookOpen } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useFoodStore } from '../store/useFoodStore';
import { GOALS } from '../lib/nutrition';

export default function Profile() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const profile = useUserStore((s) => s.profile);
  const targets = useUserStore((s) => s.computed);
  const streak = useFoodStore((s) => s.streakData);

  function handleLogout() {
    logout();
    nav('/login');
  }

  return (
    <div>
      <Header title="Perfil" action="settings" />

      <div className="px-5 space-y-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-lime flex items-center justify-center text-white">
            <User size={26} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">{profile.name || user?.email || 'Usuario'}</p>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
            <p className="text-xs text-white/40 mt-0.5">Objetivo: <span className="text-brand-300">{GOALS[profile.goal]?.label}</span></p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Mini label="Cal/día" value={targets.calories} />
          <Mini label="Racha" value={`${streak.current}d`} />
          <Mini label="Mejor" value={`${streak.best}d`} />
        </div>

        <Card className="overflow-hidden">
          <Row to="/onboarding" icon={Target} label="Reconfigurar objetivos" />
          <Row to="/planner"     icon={Calendar} label="Meal planner" />
          <Row to="/recipes"     icon={ChefHat}  label="Mis recetas" />
          <Row to="/history"     icon={BookOpen} label="Historial completo" />
          <Row to="/coach"       icon={Sparkles} label="Coach IA" />
          <Row to="/settings"    icon={User}     label="Ajustes y datos" />
        </Card>

        <button
          onClick={handleLogout}
          className="btn-danger w-full"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>

        <p className="text-center text-xs text-white/30 pt-2">CalCal v1.0 · Hecho con ❤</p>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Row({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
        <Icon size={16} />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-white/30" />
    </Link>
  );
}
