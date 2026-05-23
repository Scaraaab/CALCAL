import { useMemo, useState } from 'react';
import { Search, Minus, Plus, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchFoods } from '../../lib/foodDB';
import { useFoodStore, ingredientToFood } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

export default function FoodSearch({ onAdd }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null);
  const [qty, setQty] = useState(1);
  const customIngredients = useFoodStore((s) => s.customIngredients);

  const results = useMemo(() => {
    const dbResults = searchFoods(q, 14);
    const query = q.trim().toLowerCase();
    const customMatches = customIngredients
      .filter((i) => !query || i.name.toLowerCase().includes(query))
      .slice(0, 8)
      .map(ingredientToFood);
    return [...customMatches, ...dbResults].slice(0, 18);
  }, [q, customIngredients]);

  // Cantidad inicial sugerida cuando se selecciona un alimento
  function initialQty(food) {
    if (food.unit === 'g' || food.unit === 'ml') return food.baseQty; // 100 g por defecto
    return 1; // 1 unidad / porción
  }

  function scaleOf(food, quantity) {
    if (food.unit === 'g' || food.unit === 'ml') return quantity / food.baseQty;
    return quantity;
  }

  function commit() {
    if (!active) return;
    const scale = scaleOf(active, qty);
    onAdd?.({
      name: active.names[0],
      qty,
      unit: active.unit === 'porcion' ? 'porción' : active.unit,
      serving: active.serving,
      ingredientId: active.isCustom ? active.id : undefined,
      photo: active.photo || undefined, // hereda la foto del ingrediente personalizado
      kcal:    Math.round(active.kcal    * scale),
      protein: Math.round(active.protein * scale * 10) / 10,
      carbs:   Math.round(active.carbs   * scale * 10) / 10,
      fat:     Math.round(active.fat     * scale * 10) / 10,
      fiber:   Math.round((active.fiber || 0) * scale * 10) / 10
    });
    setActive(null);
    setQty(1);
    setQ('');
  }

  const preview = active ? (() => {
    const s = scaleOf(active, qty);
    return {
      kcal:    Math.round(active.kcal * s),
      protein: Math.round(active.protein * s * 10) / 10,
      carbs:   Math.round(active.carbs * s * 10) / 10,
      fat:     Math.round(active.fat * s * 10) / 10
    };
  })() : null;

  const isWeight = active && (active.unit === 'g' || active.unit === 'ml');
  const step = isWeight ? 10 : 0.5;

  return (
    <div className="card p-4 space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (pollo, avena, mis ingredientes…)"
          className="input pl-11"
        />
      </div>

      {!active && (
        <>
          {results.length > 0 ? (
            <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActive(f); setQty(initialQty(f)); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 text-left flex items-center gap-3"
                >
                  {f.photo && (
                    <img src={f.photo} alt="" className="w-9 h-9 rounded-xl object-cover flex-none" />
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {f.isCustom && !f.photo && <span className="chip !text-[9px] !py-0.5 !px-2">Mío</span>}
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{f.names[0]}</p>
                      <p className="text-xs text-white/40 truncate">{f.serving}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums whitespace-nowrap">{fmtNum(f.kcal)} kcal</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-white/40 py-4">Sin resultados.</p>
          )}
          <Link to="/ingredients" className="block text-xs text-brand-300 text-center pt-1 hover:underline">
            <LinkIcon size={11} className="inline mr-1" /> Gestionar mis ingredientes
          </Link>
        </>
      )}

      {active && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-3">
            {active.photo ? (
              <img src={active.photo} alt="" className="w-12 h-12 rounded-2xl object-cover flex-none" />
            ) : active.isCustom ? (
              <span className="chip !text-[10px]">Mío</span>
            ) : null}
            <div className="min-w-0">
              <p className="font-semibold capitalize truncate">{active.names[0]}</p>
              <p className="text-xs text-white/45 truncate">{active.serving}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-ink-700/60 rounded-2xl p-2">
            <button onClick={() => setQty((q) => Math.max(step, +(q - step).toFixed(2)))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Minus size={16} /></button>
            <input
              type="number"
              step={step}
              value={qty}
              onChange={(e) => setQty(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="bg-transparent text-center font-bold text-2xl w-24 outline-none"
            />
            <span className="text-xs text-white/40 pr-2">{active.unit === 'porcion' ? 'porción' : active.unit}</span>
            <button onClick={() => setQty((q) => +(q + step).toFixed(2))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Plus size={16} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Mini label="kcal" val={preview.kcal} />
            <Mini label="P" val={preview.protein} suffix="g" />
            <Mini label="C" val={preview.carbs} suffix="g" />
            <Mini label="G" val={preview.fat} suffix="g" />
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
      <p className="font-bold tabular-nums">{fmtNum(val, 1)}{suffix}</p>
    </div>
  );
}
