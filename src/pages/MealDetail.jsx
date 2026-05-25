import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, UtensilsCrossed, Globe, Loader2, Scale, Carrot } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import { useFoodStore } from '../store/useFoodStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchCommunityMealByShareId } from '../lib/db';
import { fmtNum } from '../utils/format';

export default function MealDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const meal = useFoodStore((s) => s.customMeals.find((m) => m.id === id));
  const removeMeal = useFoodStore((s) => s.removeMeal);
  const removeFromCommunity = useFoodStore((s) => s.removeFromCommunity);

  const [community, setCommunity] = useState(null);
  const [loadingComm, setLoadingComm] = useState(false);
  const [communityRemoved, setCommunityRemoved] = useState(false);

  useEffect(() => {
    if (!meal) return;
    if (!meal.shareId) { setCommunity(null); return; }
    setLoadingComm(true);
    setCommunityRemoved(false);
    fetchCommunityMealByShareId(meal.shareId).then((r) => {
      setCommunity(r);
      setLoadingComm(false);
    });
  }, [meal?.shareId]);

  // Distribución de macros en % del total de gramos (P+C+F)
  const distribution = useMemo(() => {
    if (!meal) return null;
    const p = meal.totals.protein || 0;
    const c = meal.totals.carbs || 0;
    const f = meal.totals.fat || 0;
    const sum = p + c + f;
    if (sum === 0) return { p: 0, c: 0, f: 0 };
    return {
      p: Math.round((p / sum) * 100),
      c: Math.round((c / sum) * 100),
      f: Math.round((f / sum) * 100)
    };
  }, [meal]);

  if (!meal) {
    return (
      <div>
        <Header title="Comida" back />
        <div className="px-5 text-center py-10 text-white/40">
          Esta comida ya no existe.
        </div>
      </div>
    );
  }

  const isCreator = community && user && community.created_by === user.id;
  const inCommunity = !!community && !communityRemoved;

  function handleDeletePersonal() {
    if (!confirm(`¿Eliminar "${meal.name}" de tus comidas? Esta acción no se puede deshacer.`)) return;
    removeMeal(meal.id);
    nav('/meals');
  }

  function handleDeleteCommunity() {
    if (!meal.shareId) return;
    if (!confirm(`¿Quitar "${meal.name}" de la base comunitaria? Tu copia personal se mantiene.`)) return;
    removeFromCommunity('meal', meal.shareId);
    setCommunityRemoved(true);
  }

  // Por 100g (solo si hay yield)
  const per100g = meal.yieldGrams > 0 ? {
    kcal:    Math.round(meal.totals.kcal    * 100 / meal.yieldGrams),
    protein: Math.round(meal.totals.protein * 100 / meal.yieldGrams * 10) / 10,
    carbs:   Math.round(meal.totals.carbs   * 100 / meal.yieldGrams * 10) / 10,
    fat:     Math.round(meal.totals.fat     * 100 / meal.yieldGrams * 10) / 10
  } : null;

  return (
    <div>
      <Header title="Comida" back />

      {/* Hero foto */}
      <div className="relative -mt-3">
        <div className="aspect-[16/9] overflow-hidden">
          {meal.photo ? (
            <img src={meal.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500/30 via-brand-700/20 to-lime/20 flex items-center justify-center">
              <UtensilsCrossed size={80} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-3 max-w-md mx-auto">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {meal.yieldGrams > 0 && (
                <span className="chip !text-[10px] !bg-lime/15 !border-lime/30 !text-lime">
                  <Scale size={11} /> Receta · rinde {meal.yieldGrams}g
                </span>
              )}
              {inCommunity && (
                <span className="chip !text-[10px] !bg-brand-500/20 !border-brand-500/40 !text-brand-200">
                  <Globe size={11} /> En CalCal
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white capitalize text-balance">
              {meal.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-4">
        {/* Total kcal hero */}
        <Card className="p-5">
          <p className="label mb-1">Total de la receta</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
              {fmtNum(meal.totals.kcal)}
            </p>
            <p className="text-sm text-white/40">kcal</p>
          </div>

          {/* Distribución de macros — barra horizontal segmentada */}
          {distribution && (distribution.p + distribution.c + distribution.f > 0) && (
            <div className="mt-4 space-y-2">
              <p className="label text-[10px]">Distribución de macros</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                <div style={{ width: `${distribution.p}%` }} className="bg-macro-protein" />
                <div style={{ width: `${distribution.c}%` }} className="bg-macro-carbs" />
                <div style={{ width: `${distribution.f}%` }} className="bg-macro-fat" />
              </div>
              <div className="grid grid-cols-3 text-[10px]">
                <span className="text-macro-protein">● Proteína {distribution.p}%</span>
                <span className="text-macro-carbs text-center">● Carbos {distribution.c}%</span>
                <span className="text-macro-fat text-right">● Grasas {distribution.f}%</span>
              </div>
            </div>
          )}

          {/* Macros grid */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <MacroChip label="Proteína" value={meal.totals.protein} color="text-macro-protein" bg="bg-macro-protein/10" border="border-macro-protein/30" />
            <MacroChip label="Carbos"   value={meal.totals.carbs}   color="text-macro-carbs"   bg="bg-macro-carbs/10"   border="border-macro-carbs/30" />
            <MacroChip label="Grasas"   value={meal.totals.fat}     color="text-macro-fat"     bg="bg-macro-fat/10"     border="border-macro-fat/30" />
          </div>
        </Card>

        {/* Por 100g si es receta */}
        {per100g && (
          <Card className="p-4">
            <p className="label mb-2">Por 100 g</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-2xl font-bold tabular-nums">{fmtNum(per100g.kcal)}</p>
              <p className="text-xs text-white/40">kcal</p>
              <p className="text-xs text-white/55 ml-2">
                P {fmtNum(per100g.protein, 1)} · C {fmtNum(per100g.carbs, 1)} · G {fmtNum(per100g.fat, 1)}
              </p>
            </div>
          </Card>
        )}

        {/* Ingredientes con su kcal individual */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="label">Ingredientes ({meal.items.length})</p>
            {meal.yieldGrams > 0 && <p className="text-[10px] text-white/40">{meal.yieldGrams}g total</p>}
          </div>
          <Card className="overflow-hidden">
            {meal.items.map((it, i) => {
              const pct = meal.totals.kcal > 0 ? Math.round((it.kcal / meal.totals.kcal) * 100) : 0;
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                  {it.photo ? (
                    <img src={it.photo} alt="" className="w-10 h-10 rounded-xl object-cover flex-none" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-300 flex items-center justify-center flex-none">
                      <Carrot size={16} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{it.name}</p>
                    <p className="text-[11px] text-white/45 truncate">
                      {it.qty} {it.unit} · P {fmtNum(it.protein, 0)} · C {fmtNum(it.carbs, 0)} · G {fmtNum(it.fat, 0)}
                    </p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-sm font-bold tabular-nums">{fmtNum(it.kcal)}</p>
                    <p className="text-[10px] text-white/35">kcal · {pct}%</p>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Comunidad */}
        <Card soft className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center flex-none">
              <Globe size={16} />
            </div>
            <div className="flex-1 min-w-0 text-sm">
              {loadingComm ? (
                <p className="text-white/40 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Comprobando comunidad…</p>
              ) : !meal.shareId ? (
                <p className="text-white/55">Esta comida no se ha publicado en CalCal todavía.</p>
              ) : !inCommunity ? (
                <p className="text-white/55">No está publicada en la base comunitaria.</p>
              ) : isCreator ? (
                <p className="text-white/80">La publicaste tú en CalCal. Tus ediciones se sincronizan automáticamente.</p>
              ) : (
                <p className="text-white/70">Publicado por <span className="text-brand-300 font-semibold">{community.created_by_name}</span>. Tus ediciones solo afectan tu copia personal.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="space-y-2">
          <button onClick={() => nav(`/meals/edit/${meal.id}`)} className="btn-primary w-full">
            <Pencil size={16} /> Editar comida
          </button>
          <button onClick={handleDeletePersonal} className="btn-danger w-full">
            <Trash2 size={16} /> Borrar de mis comidas
          </button>
          {isCreator && inCommunity && (
            <button onClick={handleDeleteCommunity} className="btn-ghost w-full !text-rose-300 !border-rose-500/30">
              <Globe size={16} /> Borrar de la comunidad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MacroChip({ label, value, color, bg, border }) {
  return (
    <div className={`rounded-2xl py-2.5 px-2 border ${bg} ${border} text-center`}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className={`text-base font-extrabold tabular-nums ${color}`}>{fmtNum(value, 1)}g</p>
    </div>
  );
}
