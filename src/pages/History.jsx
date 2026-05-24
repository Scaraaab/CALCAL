import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  // Fecha viaja por URL ?date=YYYY-MM-DD. Así:
  //  - El back-button del browser funciona entre días.
  //  - La BottomNav puede leer la fecha actual sin acoplarse al state de este componente.
  //  - Los enlaces son shareables / bookmarkeables.
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const rawParam = params.get('date');
  const date = isValidISO(rawParam) ? rawParam : today;

  function goToDate(d) {
    // Si el destino es hoy, limpiamos el param para mantener la URL bonita.
    if (d === today) setParams({}, { replace: true });
    else setParams({ date: d }, { replace: true });
  }

  const allEntries = useFoodStore((s) => s.entries);
  const entries = allEntries[date] || EMPTY_ARRAY;
  const copyDay = useFoodStore((s) => s.copyDay);
  const totals = useMemo(() => totalsFromEntries(entries), [entries]);

  return (
    <div>
      <Header title="Historial" subtitle="Tu diario" back />

      <div className="px-5 space-y-4">
        <div className="card p-3 flex items-center justify-between">
          <button onClick={() => goToDate(addDays(date, -1))} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/40 flex items-center gap-1 justify-center">
              <Calendar size={12} /> {date}
            </p>
            <p className="font-bold">{formatHuman(date)}</p>
          </div>
          <button onClick={() => goToDate(addDays(date, 1))} disabled={date >= today} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"><ChevronRight size={18} /></button>
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
