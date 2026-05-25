import { Plus, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { fmtNum } from '../utils/format';

export default function Meals() {
  const nav = useNavigate();
  const meals = useFoodStore((s) => s.customMeals);

  return (
    <div>
      <Header
        title="Mis comidas"
        subtitle="Combinaciones guardadas"
        back
        right={
          <Link to="/meals/new" className="w-10 h-10 rounded-full bg-lime text-ink-950 shadow-limeGlow flex items-center justify-center" aria-label="Nueva comida">
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-5 space-y-3">
        {meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Aún sin comidas guardadas"
            description="Combina ingredientes en una comida y la podrás registrar con un solo tap."
            action={<Link to="/meals/new" className="btn-lime"><Plus size={16} /> Crear la primera</Link>}
          />
        ) : (
          meals.map((m) => (
            <Card key={m.id} className="overflow-hidden cursor-pointer active:scale-[0.99] hover:border-white/15 transition" onClick={() => nav(`/meals/${m.id}`)}>
              <div className="flex">
                {m.photo ? (
                  <img src={m.photo} alt="" className="w-24 h-24 object-cover flex-none" />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-lime/20 flex-none">
                    <UtensilsCrossed size={28} className="text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0 p-3 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate capitalize">{m.name}</p>
                        {m.yieldGrams > 0 && (
                          <span className="chip !text-[9px] !py-0.5 !px-1.5 !bg-lime/15 !border-lime/30 !text-lime">Receta</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 truncate">
                        {m.items.length} ingrediente{m.items.length === 1 ? '' : 's'}
                        {m.yieldGrams > 0 && ` · rinde ${m.yieldGrams}g`}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-white/30 flex-none mt-0.5" />
                  </div>
                  <div className="mt-auto pt-2 flex items-baseline gap-2">
                    <p className="font-bold tabular-nums">{fmtNum(m.totals.kcal)} <span className="text-[11px] text-white/40">kcal</span></p>
                    <p className="text-[11px] text-white/50 truncate">P {fmtNum(m.totals.protein, 0)} · C {fmtNum(m.totals.carbs, 0)} · G {fmtNum(m.totals.fat, 0)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
