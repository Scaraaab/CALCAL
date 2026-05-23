import { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Segmented from '../components/ui/Segmented';
import WeightChart from '../components/charts/WeightChart';
import CaloriesChart from '../components/charts/CaloriesChart';
import AdherenceChart from '../components/charts/AdherenceChart';
import Button from '../components/ui/Button';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { totalsFromEntries, autoAdjustCalories } from '../lib/nutrition';
import { lastNDays, formatShort } from '../utils/date';
import { fmtNum, fmtKg } from '../utils/format';

export default function Progress() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const targets = useUserStore((s) => s.computed);
  const entries = useFoodStore((s) => s.entries);
  const weights = useFoodStore((s) => s.weights);
  const streak = useFoodStore((s) => s.streakData);
  const latestWeight = useMemo(() => {
    if (!weights.length) return null;
    return [...weights].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [weights]);

  const [range, setRange] = useState('7'); // 7 | 14 | 30
  const days = useMemo(() => lastNDays(parseInt(range)), [range]);

  const caloriesData = days.map((d) => {
    const t = totalsFromEntries(entries[d] || []);
    return { date: d, label: formatShort(d).slice(0, 1), kcal: Math.round(t.calories) };
  });

  const adherenceDays = days.map((d) => {
    const t = totalsFromEntries(entries[d] || []);
    return { date: d, kcal: Math.round(t.calories) };
  });

  const adjust = useMemo(() => autoAdjustCalories(profile, weights), [profile, weights]);
  const startKg = profile.startWeightKg;
  const currentKg = latestWeight?.kg ?? startKg;
  const deltaKg = currentKg - startKg;

  return (
    <div>
      <Header title="Progreso" subtitle="Análisis" />

      <div className="px-5 space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2">
          <Mini label="Inicio" value={fmtKg(startKg)} />
          <Mini label="Actual" value={fmtKg(currentKg)} highlight />
          <Mini label="Δ" value={`${deltaKg > 0 ? '+' : ''}${deltaKg.toFixed(1)} kg`} />
        </div>

        {/* Peso */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold flex items-center gap-2"><TrendingUp size={18} className="text-brand-300" /> Peso</h2>
          </div>
          <WeightChart data={weights} />
        </Card>

        {/* Calorías */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold flex items-center gap-2"><Flame size={18} className="text-orange-400" /> Calorías</h2>
            <Segmented
              value={range}
              onChange={setRange}
              options={[{ value: '7', label: '7d' }, { value: '14', label: '14d' }, { value: '30', label: '30d' }]}
            />
          </div>
          <CaloriesChart data={caloriesData} target={targets.calories} />
        </Card>

        {/* Adherencia */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Adherencia</h2>
            <p className="text-xs text-white/40">Racha {streak.current}d · Mejor {streak.best}d</p>
          </div>
          <AdherenceChart days={adherenceDays} target={targets.calories} />
          <div className="flex gap-3 mt-3 text-[11px]">
            <Legend color="bg-emerald-500/80" label="Adherente" />
            <Legend color="bg-yellow-500/60" label="Bajo" />
            <Legend color="bg-rose-500/70"   label="Sobre" />
          </div>
        </Card>

        {/* Auto-ajuste */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-300">
              <Sparkles size={18} />
            </div>
            <h2 className="font-bold">Ajuste inteligente</h2>
          </div>
          <p className="text-sm text-white/60 mb-3">{adjust.reason}</p>
          {adjust.changed && (
            <div className="flex items-center justify-between bg-ink-700/60 rounded-xl p-3 mb-3">
              <div>
                <p className="text-xs text-white/40">Nuevas calorías</p>
                <p className="text-lg font-bold">{adjust.newCalories} kcal</p>
              </div>
              <span className={`text-sm font-semibold ${adjust.adjustment > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {adjust.adjustment > 0 ? '+' : ''}{adjust.adjustment}
              </span>
            </div>
          )}
          {adjust.changed && (
            <Button
              fullWidth
              onClick={() => {
                const cals = targets.calories;
                const newDelta = (adjust.newCalories / cals - 1) + (profile.calorieDelta ?? 0);
                setProfile({ calorieDelta: newDelta });
              }}
            >
              Aplicar ajuste
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, highlight = false }) {
  return (
    <div className={`card p-3 text-center ${highlight ? 'ring-1 ring-brand-500/40' : ''}`}>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return <div className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${color}`} /><span className="text-white/50">{label}</span></div>;
}
