import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Minus, Plus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchFoods } from '../../lib/foodDB';
import { useFoodStore, ingredientToFood, mealToFood } from '../../store/useFoodStore';
import { fetchCommunityIngredients, fetchCommunityMeals } from '../../lib/db';
import { fmtNum, sanitizeDecimal, parseDecimal } from '../../utils/format';

export default function FoodSearch({ onAdd }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null);
  const [qtyStr, setQtyStr] = useState('');
  const qtyNum = parseDecimal(qtyStr);
  const customIngredients = useFoodStore((s) => s.customIngredients);
  const customMeals = useFoodStore((s) => s.customMeals);

  // Estado para búsqueda comunitaria (async, debounced)
  const [communityIngs, setCommunityIngs] = useState([]);
  const [communityMls, setCommunityMls] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const currentQuery = useRef(q);
  currentQuery.current = q;

  // Debounced fetch a community
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setCommunityIngs([]);
      setCommunityMls([]);
      setCommunityLoading(false);
      return;
    }
    setCommunityLoading(true);
    const handle = setTimeout(async () => {
      const qAtFire = query;
      try {
        const [ings, mls] = await Promise.all([
          fetchCommunityIngredients(qAtFire, 10),
          fetchCommunityMeals(qAtFire, 6)
        ]);
        // Race protection: solo actualizamos si la query sigue siendo la misma
        if (currentQuery.current.trim() === qAtFire) {
          setCommunityIngs(ings);
          setCommunityMls(mls.filter((m) => m.yieldGrams > 0));
        }
      } catch (e) {
        console.warn('[FoodSearch] community fetch error', e);
      } finally {
        if (currentQuery.current.trim() === qAtFire) {
          setCommunityLoading(false);
        }
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dbResults = searchFoods(q, 14);

    // Ingredientes personalizados (chip "Mío")
    const customMatches = customIngredients
      .filter((i) => !query || i.name.toLowerCase().includes(query))
      .slice(0, 8)
      .map(ingredientToFood);

    // Recetas escalables propias (chip "Receta")
    const recipeMatches = customMeals
      .filter((m) => m.yieldGrams > 0 && (!query || m.name.toLowerCase().includes(query)))
      .slice(0, 8)
      .map(mealToFood)
      .filter(Boolean);

    // Set de shareIds que el usuario YA tiene en sus copias personales,
    // para no mostrar duplicados en los resultados de community.
    const ownedShareIds = new Set([
      ...customIngredients.map((i) => i.shareId).filter(Boolean),
      ...customMeals.map((m) => m.shareId).filter(Boolean)
    ]);

    // Community ingredients (chip "CalCal")
    const communityIngMatches = communityIngs
      .filter((c) => !ownedShareIds.has(c.shareId))
      .map((c) => ({
        id: 'comm-ing-' + c.shareId,
        isCommunity: true,
        communityShareId: c.shareId,
        createdByName: c.createdByName,
        names: [c.name],
        unit: c.measureType === 'per100g' ? 'g' : c.measureType === 'unit' ? 'unidad' : 'porcion',
        baseQty: c.measureType === 'per100g' ? 100 : 1,
        serving: c.servingLabel || (c.measureType === 'per100g' ? '100g' : c.measureType === 'unit' ? '1 unidad' : '1 porción'),
        kcal: c.kcal,
        protein: c.protein,
        carbs: c.carbs,
        fat: c.fat,
        fiber: c.fiber,
        photo: c.photo
      }));

    // Community recipes (chip "CalCal" + "Receta")
    const communityRecipeMatches = communityMls
      .filter((c) => !ownedShareIds.has(c.shareId))
      .map((c) => {
        const f = 100 / c.yieldGrams;
        return {
          id: 'comm-meal-' + c.shareId,
          isCommunity: true,
          isRecipe: true,
          communityShareId: c.shareId,
          createdByName: c.createdByName,
          names: [c.name],
          unit: 'g',
          baseQty: 100,
          serving: `Receta · rinde ${c.yieldGrams}g · ${c.createdByName}`,
          kcal:    Math.round(c.totals.kcal * f),
          protein: Math.round(c.totals.protein * f * 10) / 10,
          carbs:   Math.round(c.totals.carbs * f * 10) / 10,
          fat:     Math.round(c.totals.fat * f * 10) / 10,
          fiber:   Math.round((c.totals.fiber || 0) * f * 10) / 10,
          photo: c.photo
        };
      });

    // Orden: recetas propias → ingredientes propios → recetas comunidad → ingredientes comunidad → DB built-in
    return [
      ...recipeMatches,
      ...customMatches,
      ...communityRecipeMatches,
      ...communityIngMatches,
      ...dbResults
    ].slice(0, 30);
  }, [q, customIngredients, customMeals, communityIngs, communityMls]);

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
    // Conversión string → number SOLO aquí. Si está vacío usa 1 como fallback.
    const qty = parseDecimal(qtyStr) || 1;
    if (qty <= 0) return;
    const scale = scaleOf(active, qty);
    onAdd?.({
      name: active.names[0],
      qty,
      unit: active.unit === 'porcion' ? 'porción' : active.unit,
      serving: active.serving,
      ingredientId: active.isCustom ? active.id : undefined,
      mealId: active.isRecipe && !active.isCommunity ? (active.mealId || active.id) : undefined,
      communityShareId: active.isCommunity ? active.communityShareId : undefined,
      source: active.isCommunity ? 'community' : active.isRecipe ? 'meal-grams' : undefined,
      photo: active.photo || undefined,
      kcal:    Math.round(active.kcal    * scale),
      protein: Math.round(active.protein * scale * 10) / 10,
      carbs:   Math.round(active.carbs   * scale * 10) / 10,
      fat:     Math.round(active.fat     * scale * 10) / 10,
      fiber:   Math.round((active.fiber || 0) * scale * 10) / 10
    });
    setActive(null);
    setQtyStr('');
    setQ('');
  }

  const preview = active ? (() => {
    const s = scaleOf(active, qtyNum);
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
          placeholder="Buscar (pollo, avena, comunidad CalCal…)"
          className="input pl-11 pr-10"
        />
        {communityLoading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 animate-spin" />
        )}
      </div>

      {!active && (
        <>
          {results.length > 0 ? (
            <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActive(f); setQtyStr(String(initialQty(f))); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 text-left flex items-center gap-3"
                >
                  {f.photo && (
                    <img src={f.photo} alt="" className="w-9 h-9 rounded-xl object-cover flex-none" />
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {f.isCommunity && (
                      <span className="chip !text-[9px] !py-0.5 !px-2 !bg-brand-500/15 !border-brand-500/30 !text-brand-300 flex-none">
                        CalCal
                      </span>
                    )}
                    {f.isRecipe && !f.isCommunity && (
                      <span className="chip !text-[9px] !py-0.5 !px-2 !bg-lime/15 !border-lime/30 !text-lime flex-none">Receta</span>
                    )}
                    {f.isCustom && !f.photo && !f.isRecipe && !f.isCommunity && (
                      <span className="chip !text-[9px] !py-0.5 !px-2 flex-none">Mío</span>
                    )}
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
            ) : active.isCommunity ? (
              <span className="chip !text-[10px] !bg-brand-500/15 !border-brand-500/30 !text-brand-300">CalCal</span>
            ) : active.isRecipe ? (
              <span className="chip !text-[10px] !bg-lime/15 !border-lime/30 !text-lime">Receta</span>
            ) : active.isCustom ? (
              <span className="chip !text-[10px]">Mío</span>
            ) : null}
            <div className="min-w-0">
              <p className="font-semibold capitalize truncate">{active.names[0]}</p>
              <p className="text-xs text-white/45 truncate">{active.serving}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-ink-700/60 rounded-2xl p-2">
            <button
              onClick={() => setQtyStr(String(Math.max(step, +(qtyNum - step).toFixed(2))))}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={qtyStr}
              onChange={(e) => setQtyStr(sanitizeDecimal(e.target.value))}
              placeholder="0"
              className="bg-transparent text-center font-bold text-2xl w-24 outline-none"
            />
            <span className="text-xs text-white/40 pr-2">{active.unit === 'porcion' ? 'porción' : active.unit}</span>
            <button
              onClick={() => setQtyStr(String(+((qtyNum || 0) + step).toFixed(2)))}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
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
