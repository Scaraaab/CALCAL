import { UtensilsCrossed, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useFoodStore } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

/**
 * Fila horizontal de comidas guardadas. Un tap = añade al día.
 * Si layout="grid", renderiza como grid de 2 columnas (vista expandida).
 */
export default function SavedMealsRow({ onPick, layout = 'row' }) {
  const meals = useFoodStore((s) => s.customMeals);

  const sorted = useMemo(() => {
    return [...meals].sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
  }, [meals]);

  if (sorted.length === 0) {
    return (
      <Link
        to="/meals/new"
        className="card p-4 flex items-center gap-3 hover:border-white/15"
      >
        <div className="w-11 h-11 rounded-2xl bg-lime/20 text-lime flex items-center justify-center">
          <Plus size={20} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Crea tu primera comida guardada</p>
          <p className="text-xs text-white/45">Combina ingredientes y añádela con un tap.</p>
        </div>
      </Link>
    );
  }

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((m) => <MealCard key={m.id} meal={m} onPick={onPick} />)}
        <Link
          to="/meals/new"
          className="card p-4 flex flex-col items-center justify-center text-center min-h-[120px] border-2 border-dashed !border-white/10 hover:!border-white/25 hover:bg-white/3"
        >
          <Plus size={22} className="text-white/50 mb-1" />
          <span className="text-xs text-white/60">Nueva comida</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-snap-x -mx-5 px-5 pb-1">
      {sorted.map((m) => (
        <button
          key={m.id}
          onClick={() => onPick(m)}
          className="snap-start flex-none w-40 card-soft overflow-hidden text-left hover:border-white/15 transition active:scale-[0.98]"
        >
          {m.photo ? (
            <img src={m.photo} alt="" className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 bg-gradient-to-br from-brand-500/30 to-lime/20 flex items-center justify-center">
              <UtensilsCrossed size={22} className="text-white/50" />
            </div>
          )}
          <div className="p-2.5">
            <p className="text-xs font-semibold truncate capitalize">{m.name}</p>
            <p className="text-[10px] text-white/45 truncate">{m.items.length} ingr.</p>
            <p className="text-sm font-bold tabular-nums mt-0.5">
              {fmtNum(m.totals.kcal)} <span className="text-[10px] text-white/40 font-normal">kcal</span>
            </p>
          </div>
        </button>
      ))}
      <Link
        to="/meals/new"
        className="snap-start flex-none w-40 card-soft p-3 flex flex-col items-center justify-center text-center text-white/50 border-2 border-dashed !border-white/10 hover:!border-white/25"
      >
        <Plus size={22} className="mb-1" />
        <span className="text-xs">Nueva</span>
      </Link>
    </div>
  );
}

function MealCard({ meal, onPick }) {
  return (
    <button
      onClick={() => onPick(meal)}
      className="card overflow-hidden text-left hover:border-white/15 transition active:scale-[0.98]"
    >
      {meal.photo ? (
        <img src={meal.photo} alt="" className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-brand-500/30 to-lime/20 flex items-center justify-center">
          <UtensilsCrossed size={28} className="text-white/50" />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold truncate capitalize">{meal.name}</p>
        <p className="text-[11px] text-white/45 truncate">{meal.items.length} ingrediente{meal.items.length === 1 ? '' : 's'}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-lg font-bold tabular-nums">{fmtNum(meal.totals.kcal)}</span>
          <span className="text-[10px] text-white/40">kcal</span>
        </div>
      </div>
    </button>
  );
}
