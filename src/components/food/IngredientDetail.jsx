import { useEffect, useState } from 'react';
import { Pencil, Trash2, Carrot, Globe, Loader2 } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { fetchCommunityIngredientByShareId } from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import { useFoodStore } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

const MEASURE_LABELS = {
  per100g: 'Por 100 g',
  serving: 'Por porción',
  unit:    'Por unidad'
};

export default function IngredientDetail({ ing, onClose, onEdit, onDelete }) {
  const user = useAuthStore((s) => s.user);
  const removeFromCommunity = useFoodStore((s) => s.removeFromCommunity);
  const [community, setCommunity] = useState(null); // { share_id, created_by, created_by_name } | null
  const [loading, setLoading] = useState(false);
  const [communityRemoved, setCommunityRemoved] = useState(false);

  useEffect(() => {
    setCommunity(null);
    setCommunityRemoved(false);
    if (!ing?.shareId) return;
    setLoading(true);
    fetchCommunityIngredientByShareId(ing.shareId).then((r) => {
      setCommunity(r);
      setLoading(false);
    });
  }, [ing?.shareId]);

  if (!ing) return null;
  const isCreator = community && user && community.created_by === user.id;
  const inCommunity = !!community && !communityRemoved;

  function handleDeleteCommunity() {
    if (!ing.shareId) return;
    if (!confirm(`¿Quitar "${ing.name}" de la base comunitaria? Tu copia personal se mantiene.`)) return;
    removeFromCommunity('ingredient', ing.shareId);
    setCommunityRemoved(true);
  }

  return (
    <Sheet open={!!ing} onClose={onClose} title={null}>
      <div className="pb-2">
        {/* Hero — foto o gradiente */}
        <div className="relative -mx-5 -mt-2 mb-4 aspect-[16/9] overflow-hidden">
          {ing.photo ? (
            <img src={ing.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-500/30 via-brand-700/20 to-lime/20 flex items-center justify-center">
              <Carrot size={72} className="text-white/35" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900 via-ink-900/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="chip !text-[10px]">{MEASURE_LABELS[ing.measureType]}</span>
              {ing.servingLabel && ing.servingLabel !== MEASURE_LABELS[ing.measureType] && (
                <span className="chip !text-[10px]">{ing.servingLabel}</span>
              )}
              {inCommunity && (
                <span className="chip !text-[10px] !bg-brand-500/20 !border-brand-500/40 !text-brand-200">
                  <Globe size={11} /> En CalCal
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white capitalize text-balance">
              {ing.name}
            </h2>
          </div>
        </div>

        {/* Hero kcal */}
        <div className="card p-5 mb-3">
          <p className="label mb-1">Calorías</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
              {fmtNum(ing.kcal)}
            </p>
            <p className="text-sm text-white/40">kcal</p>
          </div>
        </div>

        {/* Macros grid 4 cols */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MacroCard label="Proteína" value={ing.protein} color="text-macro-protein" bg="bg-macro-protein/10" border="border-macro-protein/30" />
          <MacroCard label="Carbos"   value={ing.carbs}   color="text-macro-carbs"   bg="bg-macro-carbs/10"   border="border-macro-carbs/30" />
          <MacroCard label="Grasas"   value={ing.fat}     color="text-macro-fat"     bg="bg-macro-fat/10"     border="border-macro-fat/30" />
          <MacroCard label="Fibra"    value={ing.fiber || 0} color="text-white/80"   bg="bg-white/5"          border="border-white/10" />
        </div>

        {/* Info de community */}
        <div className="card-soft p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center flex-none">
              <Globe size={16} />
            </div>
            <div className="flex-1 min-w-0 text-sm">
              {loading ? (
                <p className="text-white/40 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Comprobando comunidad…</p>
              ) : !ing.shareId ? (
                <p className="text-white/55">Este ingrediente no se ha publicado en CalCal todavía.</p>
              ) : !inCommunity ? (
                <p className="text-white/55">No está publicado en la base comunitaria.</p>
              ) : isCreator ? (
                <p className="text-white/80">Lo publicaste tú en CalCal. Tus ediciones se sincronizan automáticamente.</p>
              ) : (
                <p className="text-white/70">Publicado por <span className="text-brand-300 font-semibold">{community.created_by_name}</span>. Tus ediciones solo afectan tu copia personal.</p>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-2 pb-2">
          <button onClick={() => { onEdit?.(); }} className="btn-primary w-full">
            <Pencil size={16} /> Editar
          </button>
          <button onClick={() => { onDelete?.(); }} className="btn-danger w-full">
            <Trash2 size={16} /> Borrar de mis ingredientes
          </button>
          {isCreator && inCommunity && (
            <button onClick={handleDeleteCommunity} className="btn-ghost w-full !text-rose-300 !border-rose-500/30">
              <Globe size={16} /> Borrar de la comunidad
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function MacroCard({ label, value, color, bg, border }) {
  return (
    <div className={`rounded-2xl p-2.5 border ${bg} ${border} text-center`}>
      <p className="text-[9px] uppercase tracking-wider text-white/45 truncate">{label}</p>
      <p className={`text-base font-extrabold tabular-nums ${color}`}>{fmtNum(value, 1)}</p>
      <p className="text-[9px] text-white/40">g</p>
    </div>
  );
}
