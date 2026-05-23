import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Coffee, Soup, Cookie, Utensils } from 'lucide-react';
import Header from '../components/layout/Header';
import Segmented from '../components/ui/Segmented';
import NaturalInput from '../components/food/NaturalInput';
import FoodSearch from '../components/food/FoodSearch';
import QuickFoods from '../components/food/QuickFoods';
import { useFoodStore } from '../store/useFoodStore';
import { fmtNum } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

const MEALS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];

export default function LogFood() {
  const nav = useNavigate();
  const addEntries = useFoodStore((s) => s.addEntries);
  const [meal, setMeal] = useState(guessMeal());
  const [pending, setPending] = useState([]); // items aún no confirmados
  const [mode, setMode] = useState('texto'); // texto | buscar | rapidos

  function handleParsed(items) {
    setPending((p) => [...p, ...items]);
  }

  function commitAll() {
    if (!pending.length) return;
    addEntries(pending.map((it) => ({ ...it, meal })));
    nav('/');
  }

  function removePending(idx) {
    setPending((p) => p.filter((_, i) => i !== idx));
  }

  const totalKcal = pending.reduce((s, x) => s + (x.kcal || 0), 0);

  return (
    <div>
      <Header title="Registrar" subtitle="Comida" back />

      <div className="px-5 space-y-4">
        <Segmented
          value={meal}
          onChange={setMeal}
          options={MEALS.map((m) => ({ value: m, label: m }))}
          className="w-full overflow-x-auto"
        />

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'texto', label: 'Texto IA' },
            { value: 'buscar', label: 'Buscar' },
            { value: 'rapidos', label: 'Rápidos' }
          ]}
          className="w-full"
        />

        {mode === 'texto' && <NaturalInput onParsed={handleParsed} />}
        {mode === 'buscar' && <FoodSearch onAdd={(it) => handleParsed([it])} />}
        {mode === 'rapidos' && <QuickFoods onPick={(it) => handleParsed([it])} />}

        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-white/40">Por añadir a {meal}</p>
                <p className="font-bold tabular-nums">{fmtNum(totalKcal)} kcal</p>
              </div>
              <ul className="space-y-1.5">
                {pending.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2">
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
