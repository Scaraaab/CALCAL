import { Plus, UtensilsCrossed, Trash2, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { fmtNum } from '../utils/format';

export default function Meals() {
  const nav = useNavigate();
  const meals = useFoodStore((s) => s.customMeals);
  const removeMeal = useFoodStore((s) => s.removeMeal);

  function destroy(m) {
    if (!confirm(`¿Eliminar "${m.name}"?`)) return;
    removeMeal(m.id);
  }

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
            <Card key={m.id} className="overflow-hidden">
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
                      <p className="font-semibold truncate capitalize">{m.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{m.items.length} ingrediente{m.items.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => nav(`/meals/edit/${m.id}`)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => destroy(m)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-300">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
