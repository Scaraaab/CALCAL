import { useMemo } from 'react';
import { Coffee, Utensils, Cookie, Soup, UtensilsCrossed, Carrot, Camera, Scale } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { useFoodStore } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

const MEAL_ICONS = {
  Desayuno: Coffee,
  Almuerzo: Utensils,
  Merienda: Cookie,
  Cena: Soup
};

const SOURCE_BADGES = {
  meal:        { label: 'Comida guardada',  cls: '!bg-lime/15 !border-lime/30 !text-lime',          icon: UtensilsCrossed },
  'meal-grams':{ label: 'Receta · por g',    cls: '!bg-lime/15 !border-lime/30 !text-lime',          icon: Scale },
  photo:       { label: 'Foto IA',           cls: '!bg-brand-500/15 !border-brand-500/30 !text-brand-300', icon: Camera },
  'photo-ref': { label: 'Foto referencia',   cls: '!bg-white/5 !border-white/15 !text-white/70',     icon: Camera },
  community:   { label: 'CalCal',            cls: '!bg-brand-500/15 !border-brand-500/30 !text-brand-300', icon: null }
};

/**
 * Sheet read-only que muestra el detalle de una entrada del diario.
 * Sin acciones de editar/borrar — solo info + cerrar.
 */
export default function EntryDetail({ entry, onClose }) {
  const customMeals = useFoodStore((s) => s.customMeals);

  // Si la entry vino de una comida guardada, busca la versión completa para
  // mostrar la lista de ingredientes.
  const linkedMeal = useMemo(
    () => entry?.mealId ? customMeals.find((m) => m.id === entry.mealId) : null,
    [entry?.mealId, customMeals]
  );

  if (!entry) return null;

  const MealIcon = MEAL_ICONS[entry.meal] || Utensils;
  const sourceBadge = entry.source ? SOURCE_BADGES[entry.source] : null;

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title={null}
      footer={<Button fullWidth variant="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div className="pb-2">
        {/* Hero — foto o gradiente */}
        <div className="relative -mx-5 -mt-2 mb-4 aspect-[16/9] overflow-hidden">
          {entry.photo ? (
            <img src={entry.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500/30 via-brand-700/20 to-lime/20 flex items-center justify-center">
              <MealIcon size={64} className="text-white/35" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900 via-ink-900/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="chip !text-[10px]">
                <MealIcon size={11} /> {entry.meal}
              </span>
              {sourceBadge && (
                <span className={`chip !text-[10px] ${sourceBadge.cls}`}>
                  {sourceBadge.icon && <sourceBadge.icon size={11} />}
                  {sourceBadge.label}
                </span>
              )}
              {entry.qty != null && entry.unit && (
                <span className="chip !text-[10px]">
                  {entry.qty} {entry.unit}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white capitalize text-balance">
              {entry.name}
            </h2>
          </div>
        </div>

        {/* Hero kcal */}
        <div className="card p-5 mb-3">
          <p className="label mb-1">Calorías</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
              {fmtNum(entry.kcal)}
            </p>
            <p className="text-sm text-white/40">kcal</p>
          </div>
        </div>

        {/* Macros grid 4 cols */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MacroCard label="Proteína" value={entry.protein} color="text-macro-protein" bg="bg-macro-protein/10" border="border-macro-protein/30" />
          <MacroCard label="Carbos"   value={entry.carbs}   color="text-macro-carbs"   bg="bg-macro-carbs/10"   border="border-macro-carbs/30" />
          <MacroCard label="Grasas"   value={entry.fat}     color="text-macro-fat"     bg="bg-macro-fat/10"     border="border-macro-fat/30" />
          <MacroCard label="Fibra"    value={entry.fiber || 0} color="text-white/80"   bg="bg-white/5"          border="border-white/10" />
        </div>

        {/* Si la entry vino de una comida guardada, mostramos sus ingredientes */}
        {linkedMeal && linkedMeal.items.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="label">Ingredientes de "{linkedMeal.name}" ({linkedMeal.items.length})</p>
              {linkedMeal.yieldGrams > 0 && (
                <p className="text-[10px] text-white/40">{linkedMeal.yieldGrams}g total</p>
              )}
            </div>
            <div className="card overflow-hidden">
              {linkedMeal.items.map((it, i) => {
                const pct = linkedMeal.totals.kcal > 0
                  ? Math.round((it.kcal / linkedMeal.totals.kcal) * 100)
                  : 0;
                return (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                    {it.photo ? (
                      <img src={it.photo} alt="" className="w-10 h-10 rounded-xl object-cover flex-none" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-300 flex items-center justify-center flex-none">
                        <Carrot size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{it.name}</p>
                      <p className="text-[11px] text-white/45 truncate">
                        {it.qty} {it.unit} · P {fmtNum(it.protein, 0)} · C {fmtNum(it.carbs, 0)} · G {fmtNum(it.fat, 0)}
                      </p>
                    </div>
                    <div className="text-right flex-none">
                      <p className="text-sm font-bold tabular-nums">{fmtNum(it.kcal)}</p>
                      <p className="text-[10px] text-white/35">kcal · {pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function MacroCard({ label, value, color, bg, border }) {
  return (
    <div className={`rounded-2xl p-2.5 border ${bg} ${border} text-center`}>
      <p className="text-[9px] uppercase tracking-wider text-white/45 truncate">{label}</p>
      <p className={`text-base font-extrabold tabular-nums ${color}`}>{fmtNum(value, 1)}</p>
      <p className="text-[9px] text-white/40">g</p>
    </div>
  );
}
