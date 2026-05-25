import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, Search, Heart, Camera, UtensilsCrossed, CalendarClock } from 'lucide-react';
import Header from '../components/layout/Header';
import Segmented from '../components/ui/Segmented';
import NaturalInput from '../components/food/NaturalInput';
import FoodSearch from '../components/food/FoodSearch';
import QuickFoods from '../components/food/QuickFoods';
import PhotoLog from '../components/food/PhotoLog';
import SavedMealsRow from '../components/food/SavedMealsRow';
import SavedMealPicker from '../components/food/SavedMealPicker';
import { useFoodStore } from '../store/useFoodStore';
import { fmtNum } from '../utils/format';
import { todayISO, isValidISO, formatHuman } from '../utils/date';
import { motion, AnimatePresence } from 'framer-motion';

const MEALS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];

const MODES = [
  { value: 'texto',   label: 'Texto IA', icon: Sparkles },
  { value: 'foto',    label: 'Foto',     icon: Camera },
  { value: 'mias',    label: 'Mis comidas', icon: UtensilsCrossed },
  { value: 'buscar',  label: 'Buscar',   icon: Search },
  { value: 'rapidos', label: 'Rápidos',  icon: Heart }
];

export default function LogFood() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // Lee la fecha objetivo del query string (?date=YYYY-MM-DD). Si no viene o
  // es inválida, va a hoy. Así el FAB de la BottomNav puede propagar el día
  // desde /history sin que el resto de la app sepa de esta convención.
  const today = todayISO();
  const dateParam = searchParams.get('date');
  const targetDate = isValidISO(dateParam) ? dateParam : today;
  const isAnotherDay = targetDate !== today;

  const addEntries = useFoodStore((s) => s.addEntries);
  const bumpMealUseCount = useFoodStore((s) => s.bumpMealUseCount);
  const [meal, setMeal] = useState(guessMeal());
  const [pending, setPending] = useState([]);
  const [mode, setMode] = useState('texto');
  // Sheet del picker — solo se abre para meals con yieldGrams definido
  const [pickerMeal, setPickerMeal] = useState(null);

  // Tras guardar, vuelve al historial del día si estamos editando un día pasado,
  // o al dashboard si estamos en hoy.
  function backDestination() {
    return isAnotherDay ? `/history?date=${targetDate}` : '/';
  }

  function handleParsed(items) {
    setPending((p) => [...p, ...items]);
  }

  function commitAll() {
    if (!pending.length) return;
    addEntries(pending.map((it) => ({ ...it, meal })), targetDate);
    nav(backDestination());
  }

  function removePending(idx) {
    setPending((p) => p.filter((_, i) => i !== idx));
  }

  /**
   * Selección de comida guardada:
   *  - Si tiene yieldGrams → abre el Sheet picker (porción completa | por gramos)
   *  - Si NO tiene yieldGrams → one-tap: registra la porción completa directamente
   */
  function pickSavedMeal(savedMeal) {
    if (savedMeal.yieldGrams > 0) {
      setPickerMeal(savedMeal);
      return;
    }
    // One-tap clásico
    addEntries([{
      name: savedMeal.name,
      qty: 1,
      unit: 'comida',
      kcal: savedMeal.totals.kcal,
      protein: savedMeal.totals.protein,
      carbs: savedMeal.totals.carbs,
      fat: savedMeal.totals.fat,
      fiber: savedMeal.totals.fiber,
      photo: savedMeal.photo || undefined,
      source: 'meal',
      mealId: savedMeal.id,
      meal
    }], targetDate);
    bumpMealUseCount(savedMeal.id);
    nav(backDestination());
  }

  // Confirmación desde el picker (porción completa o por gramos)
  function confirmFromPicker(entry) {
    addEntries([{ ...entry, meal }], targetDate);
    if (pickerMeal) bumpMealUseCount(pickerMeal.id);
    setPickerMeal(null);
    nav(backDestination());
  }

  const totalKcal = pending.reduce((s, x) => s + (x.kcal || 0), 0);

  return (
    <div>
      <Header
        title="Registrar"
        subtitle={isAnotherDay ? `Para ${formatHuman(targetDate)}` : 'Comida'}
        back
      />

      <div className="px-5 space-y-4">
        {/* Aviso visible cuando estamos editando un día distinto a hoy */}
        {isAnotherDay && (
          <div className="card-soft p-3 flex items-center gap-2 text-sm border !border-brand-500/30 !bg-brand-500/10">
            <CalendarClock size={16} className="text-brand-300 flex-none" />
            <p className="text-white/85">
              Añadiendo a <span className="font-semibold capitalize">{formatHuman(targetDate)}</span>
              <span className="text-white/45"> · {targetDate}</span>
            </p>
          </div>
        )}

        {/* Selección de tipo de comida */}
        <Segmented
          value={meal}
          onChange={setMeal}
          options={MEALS.map((m) => ({ value: m, label: m }))}
          className="w-full overflow-x-auto"
        />

        {/* Fila de comidas guardadas (always-on, one-tap) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="label">Mis comidas · one-tap</p>
          </div>
          <SavedMealsRow onPick={pickSavedMeal} layout="row" />
        </div>

        {/* Selector de modo en pills horizontales */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`flex-none inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition ${
                  active
                    ? 'bg-white text-ink-950 border-white'
                    : 'bg-white/3 text-white/65 border-white/8 hover:text-white'
                }`}
              >
                <Icon size={14} /> {m.label}
              </button>
            );
          })}
        </div>

        {mode === 'texto'   && <NaturalInput onParsed={handleParsed} />}
        {mode === 'foto'    && <PhotoLog onParsed={handleParsed} />}
        {mode === 'mias'    && <SavedMealsRow onPick={pickSavedMeal} layout="grid" />}
        {mode === 'buscar'  && <FoodSearch onAdd={(it) => handleParsed([it])} />}
        {mode === 'rapidos' && <QuickFoods onPick={(it) => handleParsed([it])} />}

        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-white/40">
                  Por añadir a {meal}{isAnotherDay && ` · ${formatHuman(targetDate)}`}
                </p>
                <p className="font-bold tabular-nums">{fmtNum(totalKcal)} kcal</p>
              </div>
              <ul className="space-y-1.5">
                {pending.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2">
                    {it.photo && <img src={it.photo} alt="" className="w-9 h-9 rounded-lg object-cover flex-none" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate capitalize">{it.name}</p>
                      <p className="text-[11px] text-white/45 truncate">
                        {it.qty} {it.unit} · P {fmtNum(it.protein, 0)} · C {fmtNum(it.carbs, 0)} · G {fmtNum(it.fat, 0)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{fmtNum(it.kcal)}</p>
                    <button onClick={() => removePending(i)} className="text-white/40 hover:text-rose-300 text-xs">Quitar</button>
                  </li>
                ))}
              </ul>
              <button onClick={commitAll} className="btn-lime w-full">
                <Check size={18} /> Añadir al diario
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sheet para meals con yieldGrams: porción vs gramos */}
      <SavedMealPicker
        meal={pickerMeal}
        onClose={() => setPickerMeal(null)}
        onConfirm={confirmFromPicker}
      />
    </div>
  );
}

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'Desayuno';
  if (h < 16) return 'Almuerzo';
  if (h < 19) return 'Merienda';
  return 'Cena';
}
