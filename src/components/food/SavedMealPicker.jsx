import { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, Check, Scale, Pizza } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { scaleMealByGrams } from '../../store/useFoodStore';
import { fmtNum, sanitizeDecimal, parseDecimal } from '../../utils/format';

/**
 * Sheet que aparece al tap una comida guardada CON yieldGrams.
 * Permite registrar la porción completa o por gramos.
 *
 * Para comidas SIN yieldGrams el caller debe registrar directamente (one-tap)
 * sin pasar por este componente.
 */
export default function SavedMealPicker({ meal, onClose, onConfirm }) {
  // mode: 'portion' | 'grams'
  const [mode, setMode] = useState('portion');
  const [gramsStr, setGramsStr] = useState('');

  // Reset cada vez que cambia la comida (al abrir otra)
  useEffect(() => {
    if (meal) {
      setMode('portion');
      // Pre-rellena con el rendimiento como sugerencia para que sea fácil
      // hacer "todo dividido entre 4" mentalmente.
      setGramsStr('');
    }
  }, [meal?.id]);

  const grams = parseDecimal(gramsStr);
  const scaled = useMemo(() => {
    if (mode !== 'grams' || !meal || grams <= 0) return null;
    return scaleMealByGrams(meal, grams);
  }, [mode, meal, grams]);

  if (!meal) return null;

  const canConfirm = mode === 'portion' || (mode === 'grams' && grams > 0);

  function handleConfirm() {
    if (!canConfirm) return;
    if (mode === 'portion') {
      onConfirm({
        name: meal.name,
        qty: 1,
        unit: 'porción',
        kcal: meal.totals.kcal,
        protein: meal.totals.protein,
        carbs: meal.totals.carbs,
        fat: meal.totals.fat,
        fiber: meal.totals.fiber || 0,
        photo: meal.photo || undefined,
        source: 'meal',
        mealId: meal.id
      });
    } else {
      onConfirm({
        name: meal.name,
        qty: grams,
        unit: 'g',
        ...scaled,
        photo: meal.photo || undefined,
        source: 'meal-grams',
        mealId: meal.id
      });
    }
  }

  return (
    <Sheet
      open={!!meal}
      onClose={onClose}
      title={null}
      footer={
        <button onClick={handleConfirm} disabled={!canConfirm} className="btn-lime w-full">
          <Check size={18} />
          {mode === 'portion'
            ? `Añadir porción · ${fmtNum(meal.totals.kcal)} kcal`
            : scaled
              ? `Añadir ${grams}g · ${fmtNum(scaled.kcal)} kcal`
              : 'Introduce los gramos'}
        </button>
      }
    >
      <div className="space-y-4 pt-1 pb-4">
        {/* Header con foto + nombre */}
        <div className="flex items-center gap-3">
          {meal.photo ? (
            <img src={meal.photo} alt="" className="w-14 h-14 rounded-2xl object-cover flex-none" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/30 to-lime/20 flex items-center justify-center flex-none">
              <UtensilsCrossed size={22} className="text-white/60" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-lg capitalize truncate">{meal.name}</p>
            <p className="text-xs text-white/45">Rinde {meal.yieldGrams}g · {meal.totals.kcal} kcal total</p>
          </div>
        </div>

        {/* Selector de modo — botones grandes (≥44px) con touch-action */}
        <div className="flex p-1 rounded-2xl bg-ink-700/60 border border-white/5 gap-1">
          <button
            type="button"
            onClick={() => setMode('portion')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-1.5 touch-manipulation ${
              mode === 'portion' ? 'bg-white text-ink-950' : 'text-white/60'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <Pizza size={14} /> Porción
          </button>
          <button
            type="button"
            onClick={() => setMode('grams')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-1.5 touch-manipulation ${
              mode === 'grams' ? 'bg-white text-ink-950' : 'text-white/60'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <Scale size={14} /> Por gramos
          </button>
        </div>

        {/* Cuerpo según modo */}
        {mode === 'portion' ? (
          <div className="space-y-2">
            <p className="label">Vas a añadir</p>
            <div className="card-soft p-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
                  {fmtNum(meal.totals.kcal)}
                </p>
                <p className="text-sm text-white/40">kcal</p>
              </div>
              <p className="text-xs text-white/55 mt-1">
                P {fmtNum(meal.totals.protein, 0)}g · C {fmtNum(meal.totals.carbs, 0)}g · G {fmtNum(meal.totals.fat, 0)}g
              </p>
              <p className="text-[10px] text-white/35 mt-2">La receta entera ({meal.yieldGrams}g)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="label block">Gramos consumidos</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={gramsStr}
                  onChange={(e) => setGramsStr(sanitizeDecimal(e.target.value))}
                  placeholder={`Ej: ${Math.round(meal.yieldGrams / 4)}`}
                  className="input pr-12 touch-manipulation text-lg"
                  style={{ touchAction: 'manipulation' }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none">g</span>
              </div>
            </div>

            {/* Quick chips para fracciones comunes. py-2.5 + text-sm para touch
                target ≥44px en móvil. */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: '¼',    frac: 0.25 },
                { label: '⅓',    frac: 0.33 },
                { label: '½',    frac: 0.5 },
                { label: '¾',    frac: 0.75 },
                { label: '100g', value: 100 }
              ].map((q) => {
                const g = q.value ?? Math.round(meal.yieldGrams * q.frac);
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setGramsStr(String(g))}
                    className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation flex flex-col items-center"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <span className="text-sm">{q.label}</span>
                    <span className="text-[9px] text-white/40">{g}g</span>
                  </button>
                );
              })}
            </div>

            {scaled && (
              <div className="card-soft p-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
                    {fmtNum(scaled.kcal)}
                  </p>
                  <p className="text-sm text-white/40">kcal</p>
                </div>
                <p className="text-xs text-white/55 mt-1">
                  P {fmtNum(scaled.protein, 0)}g · C {fmtNum(scaled.carbs, 0)}g · G {fmtNum(scaled.fat, 0)}g
                </p>
                <p className="text-[10px] text-white/35 mt-2">{grams}g de {meal.yieldGrams}g totales</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
