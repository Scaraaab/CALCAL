import { useState } from 'react';
import { CalendarDays, Sparkles, Loader2, ShoppingCart } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { generateMealPlan, hasApiKey } from '../lib/claude';
import { weekDates, formatShort } from '../utils/date';
import { uuid } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function MealPlanner() {
  const nav = useNavigate();
  const planner = useFoodStore((s) => s.planner);
  const setPlan = useFoodStore((s) => s.setPlan);
  const setShopping = useFoodStore((s) => s.setShopping);
  const profile = useUserStore((s) => s.profile);
  const targets = useUserStore((s) => s.computed);
  const week = weekDates();
  const [activeDate, setActiveDate] = useState(week[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function generate() {
    if (!hasApiKey()) {
      setErr('Activa el Coach IA en Ajustes para generar planes automáticos.');
      return;
    }
    setErr('');
    setLoading(true);
    try {
      const plan = await generateMealPlan({ profile, targets });
      setPlan(activeDate, plan.meals);
      buildShoppingFromWeek({ ...planner, [activeDate]: plan.meals });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildShoppingFromWeek(allPlans) {
    const counts = {};
    Object.values(allPlans).forEach((meals) => {
      (meals || []).forEach((m) => {
        (m.items || []).forEach((it) => {
          const key = (it.food || '').toLowerCase();
          if (!key) return;
          counts[key] = counts[key] || { id: uuid(), name: it.food, qty: 0, done: false };
          counts[key].qty++;
        });
      });
    });
    setShopping(Object.values(counts));
  }

  const plan = planner[activeDate] || [];

  return (
    <div>
      <Header title="Meal Planner" subtitle="Semana" back />

      <div className="px-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {week.map((d) => {
            const isActive = d === activeDate;
            const has = (planner[d] || []).length > 0;
            return (
              <button
                key={d}
                onClick={() => setActiveDate(d)}
                className={`flex-none w-16 py-2.5 rounded-2xl border ${
                  isActive ? 'bg-brand-500/15 border-brand-500/40 text-white' : 'bg-white/3 border-white/5 text-white/60'
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider">{formatShort(d).split(' ')[0]}</p>
                <p className="text-lg font-bold">{d.slice(-2)}</p>
                <div className={`mx-auto mt-1 w-1.5 h-1.5 rounded-full ${has ? 'bg-lime' : 'bg-white/15'}`} />
              </button>
            );
          })}
        </div>

        {err && <Card className="p-3 text-sm text-rose-300">{err}</Card>}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generando…</> : <><Sparkles size={16} /> Generar día</>}
          </Button>
          <Button variant="ghost" onClick={() => nav('/settings')}>
            <ShoppingCart size={16} /> Lista compras
          </Button>
        </div>

        {plan.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin plan para este día"
            description="Genera un plan personalizado con tu objetivo calórico actual."
          />
        ) : (
          <div className="space-y-3">
            {plan.map((meal, i) => (
              <Card key={i} className="p-4">
                <p className="font-semibold mb-2">{meal.name}</p>
                <ul className="space-y-1">
                  {(meal.items || []).map((it, j) => (
                    <li key={j} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{it.food} {it.qty ? <span className="text-white/40">· {it.qty}</span> : null}</span>
                      <span className="text-white/50 tabular-nums">{it.kcal} kcal</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
