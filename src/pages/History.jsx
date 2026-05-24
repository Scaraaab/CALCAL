import { useEffect, useMemo, useState } from 'react';
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
  // Bypass total de React Router para la navegación de fechas. Usamos History
  // API nativa + popstate manual. React Router lee la nueva location via
  // useLocation y se actualiza solo.
  //
  // Por qué: con Link/useNavigate/setSearchParams el pushState llegaba pero
  // algo (Opera GX? SW residual? extensión del browser?) lo revertía antes
  // de que React Router se enterara. La History API directa es bulletproof
  // — la URL CAMBIA en la barra del browser, sin intermediarios.
  const location = useLocation();
  const today = todayISO();

  // Lee directamente de window.location.search (no de useSearchParams) para
  // garantizar que reflejamos la URL real, no un estado memoizado de RR.
  // location.search es reactivo porque cambia cuando popstate se dispara.
  const rawParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('date');
  }, [location.search]);
  const date = isValidISO(rawParam) ? rawParam : today;

  const allEntries = useFoodStore((s) => s.entries);
  const entries = allEntries[date] || EMPTY_ARRAY;
  const copyDay = useFoodStore((s) => s.copyDay);
  const totals = useMemo(() => totalsFromEntries(entries), [entries]);

  const datesWithData = useMemo(
    () => Object.keys(allEntries)
      .filter((d) => (allEntries[d]?.length || 0) > 0)
      .sort()
      .reverse()
      .slice(0, 14),
    [allEntries]
  );

  // Track del URL real del browser para mostrarlo en el panel de debug.
  // Útil para ver si la URL realmente cambia o no después del tap.
  const [liveUrl, setLiveUrl] = useState(typeof window !== 'undefined' ? window.location.href : '');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLiveUrl(window.location.href);
    window.__hist = {
      date,
      entriesForCurrentDate: entries.length,
      allDatesWithData: datesWithData,
      rawParam,
      locationSearch: location.search,
      windowSearch: window.location.search,
      windowHref: window.location.href
    };
    console.log(
      '%c[History] date=' + date + ' entries=' + entries.length,
      'color:#7c5cff;font-weight:bold',
      { rawParam, locationSearch: location.search, datesWithData }
    );
  }, [date, entries.length, datesWithData, rawParam, location.search]);

  function goToDate(d) {
    console.log('%c[History] goToDate', 'color:#c8ff3d', { from: date, to: d });
    const newUrl = `/history?date=${d}`;

    // 1. Cambia URL en el browser (siempre funciona, no pasa por React Router)
    window.history.replaceState(null, '', newUrl);

    // 2. Notifica a React Router para que actualice useLocation()
    // popstate es el evento que dispara el browser cuando cambias el historial.
    // Lo disparamos manualmente porque replaceState NO lo dispara solo.
    window.dispatchEvent(new PopStateEvent('popstate'));

    // 3. Actualiza el state local del live URL display (para ver el cambio al instante)
    setLiveUrl(window.location.href);

    console.log('%c[History] URL ahora:', 'color:#c8ff3d', window.location.href);
  }

  return (
    <div>
      <Header title="Historial" subtitle="Tu diario" back />

      <div className="px-5 space-y-4">
        {/* ──── PANEL DIAGNÓSTICO ────
            Muestra qué días tienen datos en el store y resalta el actual.
            Tap en un día → navega directo (sin depender de las flechas).
            Quitar cuando se resuelva el debugging. */}
        <details className="card p-3" open>
          <summary className="text-xs uppercase tracking-wider text-white/40 cursor-pointer select-none">
            🔧 Diagnóstico — pulsa un día para ir directo
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-white/60">
              Viendo: <span className="font-bold text-brand-300">{date}</span>
              {' · '}
              {entries.length} entradas en este día
            </p>
            <p className="text-[10px] text-white/40 break-all font-mono">
              URL: {liveUrl.replace(/^https?:\/\/[^/]+/, '')}
            </p>
            <p className="text-[10px] text-white/40">
              Días con datos en el store: {datesWithData.length === 0 ? 'ninguno' : `${datesWithData.length}`}
            </p>
            {datesWithData.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {datesWithData.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => goToDate(d)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono touch-manipulation ${
                      d === date
                        ? 'bg-brand-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {d.slice(5)} ({allEntries[d]?.length || 0})
                  </button>
                ))}
              </div>
            )}
          </div>
        </details>

        {/* Navegación de día con History API directa. Sin Link, sin
            useNavigate, sin setSearchParams. window.history.replaceState
            siempre cambia la URL del browser; popstate notifica a RR. */}
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
