import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Plus, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import CalorieRing from '../components/dashboard/CalorieRing';
import MacroBars from '../components/dashboard/MacroBars';
import WaterTracker from '../components/dashboard/WaterTracker';
import WeightCard from '../components/dashboard/WeightCard';
import StreakCard from '../components/dashboard/StreakCard';
import MealList from '../components/food/MealList';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { totalsFromEntries } from '../lib/nutrition';
import { todayISO, formatHuman } from '../utils/date';

export default function Dashboard() {
  const today = todayISO();
  const entries = useFoodStore((s) => s.entries[today] || []);
  const profile = useUserStore((s) => s.profile);
  const targets = useUserStore((s) => s.computed);
  const totals = useMemo(() => totalsFromEntries(entries), [entries]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <div>
      <Header
        title={`${greeting}${profile.name ? `, ${profile.name.split(' ')[0]}` : ''}`}
        subtitle={formatHuman(today)}
        action="settings"
      />

      <div className="px-5 space-y-5">
        {/* Hero */}
        <Card className="p-6 flex flex-col items-center text-center">
          <CalorieRing consumed={totals.calories} target={targets.calories} />
          <div className="mt-5 w-full">
            <MacroBars totals={totals} targets={targets} />
          </div>
        </Card>

        {/* Quick row */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/log" className="card p-4 active:scale-[0.98] transition">
            <div className="w-10 h-10 mb-3 rounded-2xl bg-lime/20 text-lime flex items-center justify-center">
              <Plus size={20} />
            </div>
            <p className="font-semibold">Registrar</p>
            <p className="text-xs text-white/50">Texto, búsqueda o favorito</p>
          </Link>
          <Link to="/coach" className="card p-4 active:scale-[0.98] transition">
            <div className="w-10 h-10 mb-3 rounded-2xl bg-brand-500/20 text-brand-300 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <p className="font-semibold">Coach IA</p>
            <p className="text-xs text-white/50">Pregunta lo que sea</p>
          </Link>
        </div>

        <WaterTracker />

        <div className="grid grid-cols-1 gap-3">
          <WeightCard />
          <StreakCard />
        </div>

        {/* Hoy */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold">Comidas de hoy</h2>
            <Link to="/history" className="text-xs text-brand-300 flex items-center gap-1">Ver historial <ChevronRight size={14} /></Link>
          </div>
          {entries.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Aún no has registrado nada"
              description="Empieza con tu primera comida del día. Puedes escribirla en lenguaje natural."
              action={<Link to="/log" className="btn-lime">Registrar comida</Link>}
            />
          ) : (
            <MealList entries={entries} date={today} />
          )}
        </section>
      </div>
    </div>
  );
}
