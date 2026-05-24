import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import MealList from '../components/food/MealList';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useFoodStore } from '../store/useFoodStore';
import { totalsFromEntries } from '../lib/nutrition';
import { addDays, formatHuman, todayISO, isValidISO } from '../utils/date';
import { fmtNum } from '../utils/format';
import { EMPTY_ARRAY } from '../lib/storage';

export default function History() {
  // Leemos el search string directamente de useLocation (siempre refleja la URL real).
  // Navegamos con History API + popstate manual — la combinación más robusta y
  // a prueba de cualquier interferencia (SW, browser exotic, extensiones).
  const location = useLocation();
  const today = todayISO();

  const rawParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('date');
  }, [location.search]);
  const date = isValidISO(rawParam) ? rawParam : today;

  const allEntries = useFoodStore((s) => s.entries);
  const entries = allEntries[date] || EMPTY_ARRAY;
  const copyDay = useFoodStore((s) => s.copyDay);
  const totals = useMemo(() => totalsFromEntries(entries), [entries]);

  function goToDate(d) {
    // replaceState cambia la URL sin pushear nuevo entry al back-stack.
    // El popstate manual le dice a React Router que useLocation tiene que releerse.
    window.history.replaceState(null, '', `/history?date=${d}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div>
      <Header title="Historial" subtitle="Tu diario" back />

      <div className="px-5 space-y-4">
        <div className="card relative z-10 p-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToDate(addDays(date, -1))}
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:bg-white/15 touch-manipulation select-none flex-none"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(124,92,255,0.4)' }}
            aria-label="Día anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 text-center min-w-0 select-none">
            <p className="text-xs uppercase tracking-wider text-white/40 flex items-center gap-1 justify-center">
              <Calendar size={12} /> {date}
            </p>
            <p className="font-bold">{formatHuman(date)}</p>
          </div>

          <button
            type="button"
            onClick={() => goToDate(addDays(date, 1))}
            disabled={date >= today}
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:bg-white/15 disabled:opacity-30 disabled:pointer-events-none touch-manipulation select-none flex-none"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(124,92,255,0.4)' }}
            aria-label="Día siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {entries.length > 0 && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Total del día</p>
              <p className="text-2xl font-bold">{fmtNum(totals.calories)} <span className="text-sm text-white/40">kcal</span></p>
              <p className="text-xs text-white/50">P {fmtNum(totals.protein, 0)}g · C {fmtNum(totals.carbs, 0)}g · G {fmtNum(totals.fat, 0)}g</p>
            </div>
            {date !== today && (
              <Button variant="ghost" size="sm" onClick={() => { copyDay(date); alert('Copiado al día de hoy'); }}>
                <Copy size={14} /> Copiar a hoy
              </Button>
            )}
          </div>
        )}

        {entries.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin registros este día"
            description={
              date === today
                ? 'No se registraron comidas en esta fecha.'
                : `Pulsa el + para añadir comidas a ${formatHuman(date)}.`
            }
          />
        ) : (
          <MealList entries={entries} date={date} />
        )}
      </div>
    </div>
  );
}
