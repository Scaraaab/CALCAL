import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, Search, Heart, Camera, UtensilsCrossed, CalendarClock, Coffee, Soup, Cookie, Utensils, Trash2, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import NaturalInput from '../components/food/NaturalInput';
import FoodSearch from '../components/food/FoodSearch';
import QuickFoods from '../components/food/QuickFoods';
import PhotoLog from '../components/food/PhotoLog';
import SavedMealsRow from '../components/food/SavedMealsRow';
import SavedMealPicker from '../components/food/SavedMealPicker';
import { useFoodStore } from '../store/useFoodStore';
import { toast } from '../store/useToastStore';
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
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null); // mensaje inline en pending bar

  function handleParsed(items) {
    setPending((p) => [...p, ...items]);
    setCommitError(null); // limpiar error al añadir items nuevos
  }

  /**
   * Guarda los items pendientes. Siempre navega a "/" (Dashboard) tras éxito —
   * más predecible que volver al historial. Si falla, muestra error inline + toast
   * y NO navega para que el user pueda reintentar.
   *
   * Timeout de 12s: si Supabase tarda más, asumimos network rota y mostramos error.
   */
  async function commitAll() {
    if (!pending.length || committing) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const items = pending.map((it) => ({ ...it, meal }));

      // Race contra timeout de 12s
      const result = await Promise.race([
        addEntries(items, targetDate),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 12s — Supabase no responde')), 12000))
      ]);

      // Si retorna ok:false (RLS/auth/red), no navegamos
      if (result && result.ok === false) {
        const reason = result.reason || 'desconocido';
        setCommitError(`No se guardó: ${reason}. Revisa Settings → Diagnóstico.`);
        return;
      }

      // ÉXITO
      toast.success(`${items.length} ítem${items.length === 1 ? '' : 's'} guardado${items.length === 1 ? '' : 's'} ✓`);
      setPending([]);
      // SIEMPRE navega a Dashboard (más predecible que al historial)
      nav('/');
    } catch (err) {
      setCommitError(err.message || 'Error desconocido al guardar');
      toast.error(err.message || 'Error al guardar');
    } finally {
      setCommitting(false);
    }
  }

  function removePending(idx) {
    setPending((p) => p.filter((_, i) => i !== idx));
  }

  /**
   * Selección de comida guardada — SIEMPRE abre el picker.
   * UX unificada con el resto de modos: tap → picker → confirmar → al pending.
   * El user puede seguir añadiendo y al final pulsar "Añadir al diario".
   */
  function pickSavedMeal(savedMeal) {
    setPickerMeal(savedMeal);
  }

  function confirmFromPicker(entry) {
    handleParsed([entry]);
    if (pickerMeal) bumpMealUseCount(pickerMeal.id);
    setPickerMeal(null);
  }

  const totalKcal = pending.reduce((s, x) => s + (x.kcal || 0), 0);
  const totalProtein = pending.reduce((s, x) => s + (x.protein || 0), 0);

  // Reserva espacio en el scroll del contenido cuando la barra de pending está
  // visible. Mide aprox 11rem (header + lista compacta + botón + safe-area).
  const contentPaddingBottom = pending.length > 0 ? 'pb-[14rem]' : '';

  return (
    <div className={contentPaddingBottom}>
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

      {/* Pending bar — fija al fondo cuando hay items.
          z-40 va POR ENCIMA del BottomNav (z-30) para que el botón sea tappable.
          Fondo sólido (no gradient) para cubrir completamente el área de la nav. */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-40 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-ink-950/95 backdrop-blur-xl border-t border-white/10"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 truncate">
                    Por añadir a {meal}{isAnotherDay && ` · ${formatHuman(targetDate)}`}
                  </p>
                  <p className="text-sm font-bold">
                    {pending.length} ítem{pending.length === 1 ? '' : 's'} ·{' '}
                    <span className="tabular-nums">{fmtNum(totalKcal)}</span> kcal
                    <span className="text-xs text-white/40 ml-1">· P {fmtNum(totalProtein, 0)}g</span>
                  </p>
                </div>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto mb-3">
                {pending.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-2.5 py-1.5">
                    {it.photo && <img src={it.photo} alt="" className="w-7 h-7 rounded-lg object-cover flex-none" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">{it.name}</p>
                      <p className="text-[10px] text-white/40 truncate">
                        {it.qty} {it.unit} · {fmtNum(it.kcal)} kcal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      aria-label="Quitar"
                      className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-rose-300 flex-none touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              {commitError && (
                <div className="mb-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
                  ⚠ {commitError}
                </div>
              )}
              <button
                type="button"
                onClick={commitAll}
                disabled={committing}
                className={`w-full touch-manipulation ${commitError ? 'btn-danger' : 'btn-lime'}`}
                style={{ touchAction: 'manipulation' }}
              >
                {committing
                  ? <><Loader2 size={18} className="animate-spin" /> Guardando…</>
                  : commitError
                    ? <><Check size={18} /> Reintentar</>
                    : <><Check size={18} /> Añadir al diario</>}
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
