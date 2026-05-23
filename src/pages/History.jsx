import { useMemo, useState } from 'react';
import { Calendar, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import MealList from '../components/food/MealList';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useFoodStore } from '../store/useFoodStore';
import { totalsFromEntries } from '../lib/nutrition';
import { addDays, formatHuman, todayISO } from '../utils/date';
import { fmtNum } from '../utils/format';

export default function History() {
  const [date, setDate] = useState(todayISO());
  const entries = useFoodStore((s) => s.entries[date] || []);
  const copyDay = useFoodStore((s) => s.copyDay);
  const totals = useMemo(() => totalsFromEntries(entries), [entries]);

  return (
    <div>
      <Header title="Historial" subtitle="Tu diario" back />

      <div className="px-5 space-y-4">
        <div className="card p-3 flex items-center justify-between">
          <button onClick={() => setDate(addDays(date, -1))} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/40 flex items-center gap-1 justify-center">
              <Calendar size={12} /> {date}
            </p>
            <p className="font-bold">{formatHuman(date)}</p>
          </div>
          <button onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>

        {entries.length > 0 && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Total del día</p>
              <p className="text-2xl font-bold">{fmtNum(totals.calories)} <span className="text-sm text-white/40">kcal</span></p>
              <p className="text-xs text-white/50">P {fmtNum(totals.protein, 0)}g · C {fmtNum(totals.carbs, 0)}g · G {fmtNum(totals.fat, 0)}g</p>
            </div>
            {date !== todayISO() && (
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
            description="No se registraron comidas en esta fecha."
          />
        ) : (
          <MealList entries={entries} date={date} readOnly={date !== todayISO()} />
        )}
      </div>
    </div>
  );
}
