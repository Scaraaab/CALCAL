import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, Search, Heart, Camera, UtensilsCrossed, CalendarClock, Coffee, Soup, Cookie, Utensils, Trash2 } from 'lucide-react';
import Header from '../components/layout/Header';
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

const MEALS = [
  { value: 'Desayuno', icon: Coffee },
  { value: 'Almuerzo', icon: Utensils },
  { value: 'Merienda', icon: Cookie },
  { value: 'Cena',     icon: Soup }
];

const MODES = [
  { value: 'texto',   label: 'Texto IA',      icon: Sparkles,        hint: 'Describe la comida' },
  { value: 'foto',    label: 'Foto',          icon: Camera,          hint: 'Saca/sube una foto' },
  { value: 'mias',    label: 'Mis comidas',   icon: UtensilsCrossed, hint: 'Recetas guardadas' },
  { value: 'buscar',  label: 'Buscar',        icon: Search,          hint: 'Comunidad + DB' },
  { value: 'rapidos', label: 'Rápidos',       icon: Heart,           hint: 'Favoritos y frecuentes' }
];

export default function LogFood() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const today = todayISO();
  const dateParam = searchParams.get('date');
  const targetDate = isValidISO(dateParam) ? dateParam : today;
  const isAnotherDay = targetDate !== today;

  const addEntries = useFoodStore((s) => s.addEntries);
  const bumpMealUseCount = useFoodStore((s) => s.bumpMealUseCount);
  const customMeals = useFoodStore((s) => s.customMeals);
  const [meal, setMeal] = useState(guessMeal());
  const [pending, setPending] = useState([]);
  const [mode, setMode] = useState('texto');
  const [pickerMeal, setPickerMeal] = useState(null);

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

  function pickSavedMeal(savedMeal) {
    if (savedMeal.yieldGrams > 0) {
      setPickerMeal(savedMeal);
      return;
    }
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

  function confirmFromPicker(entry) {
    addEntries([{ ...entry, meal }], targetDate);
    if (pickerMeal) bumpMealUseCount(pickerMeal.id);
    setPickerMeal(null);
    nav(backDestination());
  }

  const totalKcal = pending.reduce((s, x) => s + (x.kcal || 0), 0);
  const totalProtein = pending.reduce((s, x) => s + (x.protein || 0), 0);

  return (
    <div className={pending.length > 0 ? 'pb-44' : ''}>
      <Header
        title="Registrar"
        subtitle={isAnotherDay ? `Para ${formatHuman(targetDate)}` : 'Comida'}
        back
      />

      <div className="px-5 space-y-6">
        {/* Banner cuando estamos editando un día distinto a hoy */}
        {isAnotherDay && (
          <div className="card-soft p-3 flex items-center gap-2 text-sm border !border-brand-500/30 !bg-brand-500/10">
            <CalendarClock size={16} className="text-brand-300 flex-none" />
            <p className="text-white/85">
              Añadiendo a <span className="font-semibold capitalize">{formatHuman(targetDate)}</span>
              <span className="text-white/45"> · {targetDate}</span>
            </p>
          </div>
        )}

        {/* HERO — qué momento del día */}
        <section>
          <p className="label mb-2">Momento del día</p>
          <div className="grid grid-cols-4 gap-2">
            {MEALS.map((m) => {
              const Icon = m.icon;
              const active = m.value === meal;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMeal(m.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition active:scale-[0.96] ${
                    active
                      ? 'bg-gradient-to-br from-brand-500/30 to-brand-700/20 border-brand-500/60 text-white shadow-glow'
                      : 'bg-white/3 border-white/5 text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[11px] font-medium">{m.value}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mis comidas — solo si hay alguna guardada */}
        {customMeals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="label">Mis comidas · 1 tap</p>
              <span className="text-[10px] text-white/35">{customMeals.length} guardadas</span>
            </div>
            <SavedMealsRow onPick={pickSavedMeal} layout="row" />
          </section>
        )}

        {/* MÉTODO de registro */}
        <section>
          <p className="label mb-2">¿Cómo lo registras?</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = m.value === mode;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition active:scale-[0.97] ${
                    active
                      ? 'bg-white text-ink-950 border-white shadow-card'
                      : 'bg-white/3 border-white/5 text-white/65 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[11px] font-semibold leading-tight text-center">{m.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-white/40 text-center mt-2">{MODES.find((x) => x.value === mode)?.hint}</p>
        </section>

        {/* Contenido del modo activo */}
        <section className="animate-fade-in">
          {mode === 'texto'   && <NaturalInput onParsed={handleParsed} />}
          {mode === 'foto'    && <PhotoLog onParsed={handleParsed} />}
          {mode === 'mias'    && <SavedMealsRow onPick={pickSavedMeal} layout="grid" />}
          {mode === 'buscar'  && <FoodSearch onAdd={(it) => handleParsed([it])} />}
          {mode === 'rapidos' && <QuickFoods onPick={(it) => handleParsed([it])} />}
        </section>
      </div>

      {/* Pending bar — sticky en la parte inferior cuando hay items */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent"
          >
            <div className="max-w-md mx-auto card p-3 shadow-card">
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Por añadir a {meal}{isAnotherDay && ` · ${formatHuman(targetDate)}`}</p>
                  <p className="text-base font-bold">{pending.length} ítem{pending.length === 1 ? '' : 's'} · <span className="tabular-nums">{fmtNum(totalKcal)}</span> kcal <span className="text-xs text-white/40 ml-1">· P {fmtNum(totalProtein, 0)}g</span></p>
                </div>
              </div>
              {/* Mini lista de items (max 3 visibles, resto contador) */}
              <ul className="space-y-1 max-h-40 overflow-y-auto mb-2">
                {pending.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 bg-white/3 rounded-xl px-2.5 py-1.5">
                    {it.photo && <img src={it.photo} alt="" className="w-7 h-7 rounded-lg object-cover flex-none" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">{it.name}</p>
                      <p className="text-[10px] text-white/40 truncate">
                        {it.qty} {it.unit} · {fmtNum(it.kcal)} kcal
                      </p>
                    </div>
                    <button onClick={() => removePending(i)} aria-label="Quitar" className="w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-300 flex-none">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={commitAll} className="btn-lime w-full">
                <Check size={18} /> Añadir al diario
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
