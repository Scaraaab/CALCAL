import { useMemo, useState } from 'react';
import { Search, Minus, Plus } from 'lucide-react';
import { searchFoods } from '../../lib/foodDB';
import { fmtNum } from '../../utils/format';

export default function FoodSearch({ onAdd }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // food being adjusted
  const [qty, setQty] = useState(1);

  const results = useMemo(() => searchFoods(q, 14), [q]);

  function commit() {
    if (!active) return;
    const scale = active.unit === 'unidad' || active.unit === 'rebanada'
      ? qty
      : (qty * active.baseQty) / active.baseQty; // qty es multiplicador de porción
    onAdd?.({
      name: active.names[0],
      qty: qty,
      unit: active.unit,
      serving: active.serving,
      kcal:    Math.round(active.kcal    * scale),
      protein: Math.round(active.protein * scale * 10) / 10,
      carbs:   Math.round(active.carbs   * scale * 10) / 10,
      fat:     Math.round(active.fat     * scale * 10) / 10,
      fiber:   Math.round(active.fiber   * scale * 10) / 10
    });
    setActive(null);
    setQty(1);
    setQ('');
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alimento (pollo, avena, leche…)"
          className="input pl-11"
        />
      </div>

      {!active && results.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
          {results.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActive(f); setQty(1); }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 text-left flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize truncate">{f.names[0]}</p>
                <p className="text-xs text-white/40 truncate">{f.serving}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums whitespace-nowrap pl-3">{fmtNum(f.kcal)} kcal</p>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="space-y-3 pt-1">
          <div>
            <p className="font-semibold capitalize">{active.names[0]}</p>
            <p className="text-xs text-white/45">{active.serving}</p>
          </div>
          <div className="flex items-center justify-between bg-ink-700/60 rounded-2xl p-2">
            <button onClick={() => setQty((q) => Math.max(0.5, +(q - 0.5).toFixed(2)))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Minus size={16} /></button>
            <input
              type="number"
              step="0.5"
              value={qty}
              onChange={(e) => setQty(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="bg-transparent text-center font-bold text-2xl w-20 outline-none"
            />
            <button onClick={() => setQty((q) => +(q + 0.5).toFixed(2))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Plus size={16} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Mini label="kcal" val={Math.round(active.kcal * qty)} />
            <Mini label="P" val={Math.round(active.protein * qty)} suffix="g" />
            <Mini label="C" val={Math.round(active.carbs * qty)} suffix="g" />
            <Mini label="G" val={Math.round(active.fat * qty)} suffix="g" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActive(null)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={commit} className="btn-lime flex-1">Añadir</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, val, suffix = '' }) {
  return (
    <div className="bg-white/5 rounded-xl py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="font-bold tabular-nums">{val}{suffix}</p>
    </div>
  );
}
