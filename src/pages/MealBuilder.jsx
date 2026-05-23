import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Plus, Search, Trash2, ImageIcon, Loader2, Check, Carrot } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import { useFoodStore, ingredientToFood, computeMealTotals } from '../store/useFoodStore';
import { searchFoods } from '../lib/foodDB';
import { compressImage } from '../lib/image';
import { fmtNum } from '../utils/format';
import { uuid } from '../utils/format';

export default function MealBuilder() {
  const nav = useNavigate();
  const { id } = useParams();
  const meals = useFoodStore((s) => s.customMeals);
  const addMeal = useFoodStore((s) => s.addMeal);
  const updateMeal = useFoodStore((s) => s.updateMeal);

  const existing = id ? meals.find((m) => m.id === id) : null;
  const [name, setName] = useState(existing?.name || '');
  const [photo, setPhoto] = useState(existing?.photo || null);
  const [items, setItems] = useState(existing?.items || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => computeMealTotals(items), [items]);

  useEffect(() => {
    // Si el id no corresponde a ninguna comida existente, redirige
    if (id && !existing) nav('/meals', { replace: true });
  }, [id, existing, nav]);

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl } = await compressImage(file, { maxSize: 720, quality: 0.7 });
      setPhoto(dataUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function addPickedItem(item) {
    setItems((arr) => [...arr, { ...item, _lid: uuid() }]);
  }

  function updateItem(lid, patch) {
    setItems((arr) => arr.map((it) => it._lid === lid ? { ...it, ...patch } : it));
  }

  function removeItem(lid) {
    setItems((arr) => arr.filter((it) => it._lid !== lid));
  }

  function save() {
    if (!name.trim() || items.length === 0) return;
    const payload = {
      name: name.trim(),
      photo,
      items: items.map(({ _lid, ...rest }) => rest)
    };
    if (existing) updateMeal(existing.id, payload);
    else addMeal(payload);
    nav('/meals');
  }

  return (
    <div>
      <Header title={existing ? 'Editar comida' : 'Nueva comida'} back />

      <div className="px-5 space-y-4">
        {/* Foto + nombre */}
        <Card className="overflow-hidden">
          <label className="relative block aspect-[16/10] cursor-pointer bg-gradient-to-br from-brand-500/15 to-lime/15">
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                {busy ? <Loader2 size={28} className="animate-spin" /> : <Camera size={28} />}
                <p className="mt-2 text-sm">Toca para añadir foto</p>
              </div>
            )}
            {photo && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex justify-end">
                <span className="chip"><ImageIcon size={12} /> Cambiar</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
          <div className="p-4">
            <Input
              placeholder="Nombre de la comida (ej: Bowl de pollo)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </Card>

        {/* Totales */}
        <Card className="p-4">
          <p className="label mb-2">Totales</p>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl font-extrabold tabular-nums bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
              {fmtNum(totals.kcal)}
            </p>
            <p className="text-sm text-white/40">kcal</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Macro label="P" value={totals.protein} color="text-macro-protein" />
            <Macro label="C" value={totals.carbs}   color="text-macro-carbs" />
            <Macro label="G" value={totals.fat}     color="text-macro-fat" />
          </div>
        </Card>

        {/* Ingredientes */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="label">Ingredientes ({items.length})</p>
            <button onClick={() => setPickerOpen(true)} className="text-xs text-brand-300 font-medium flex items-center gap-1">
              <Plus size={14} /> Añadir
            </button>
          </div>
          {items.length === 0 ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full border-2 border-dashed border-white/10 rounded-3xl p-6 text-center text-sm text-white/50 hover:border-white/20 hover:text-white/70"
            >
              <Plus size={20} className="mx-auto mb-1" />
              Toca para añadir ingredientes
            </button>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <Card key={it._lid} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate capitalize">{it.name}</p>
                    <p className="text-[11px] text-white/45 truncate">
                      {it.qty} {it.unit} · {fmtNum(it.kcal)} kcal · P {fmtNum(it.protein, 0)} C {fmtNum(it.carbs, 0)} G {fmtNum(it.fat, 0)}
                    </p>
                  </div>
                  <button onClick={() => removeItem(it._lid)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-300">
                    <Trash2 size={15} />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button fullWidth variant="lime" onClick={save} disabled={!name.trim() || items.length === 0}>
          <Check size={18} /> {existing ? 'Guardar cambios' : 'Crear comida'}
        </Button>
        <div className="h-4" />
      </div>

      <IngredientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(item) => { addPickedItem(item); setPickerOpen(false); }}
      />
    </div>
  );
}

function Macro({ label, value, color }) {
  return (
    <div className="bg-white/5 rounded-xl py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`font-bold tabular-nums ${color}`}>{fmtNum(value, 0)}g</p>
    </div>
  );
}

// ----- IngredientPicker: añade ingredientes desde DB, custom o manual -----
function IngredientPicker({ open, onClose, onPick }) {
  const custom = useFoodStore((s) => s.customIngredients);
  const [tab, setTab] = useState('busqueda'); // busqueda | mios | manual
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null);
  const [qty, setQty] = useState(1);

  // Manual mode form
  const [manual, setManual] = useState({ name: '', qty: 1, unit: 'porción', kcal: '', protein: '', carbs: '', fat: '' });

  function resetAll() {
    setActive(null);
    setQty(1);
    setQ('');
    setManual({ name: '', qty: 1, unit: 'porción', kcal: '', protein: '', carbs: '', fat: '' });
  }

  function pickFromFood(food, quantity) {
    const scale = food.unit === 'unidad' || food.unit === 'rebanada' || food.unit === 'porcion'
      ? quantity
      : (quantity * (food.unit === 'g' || food.unit === 'ml' ? 1 : 1)) / food.baseQty * (food.unit === 'g' ? quantity : 1);
    // Cálculo limpio: si la unidad base es g/ml, qty es en gramos/ml. Si es unidad, qty multiplica.
    let realScale;
    if (food.unit === 'g' || food.unit === 'ml') {
      realScale = quantity / food.baseQty;
    } else {
      realScale = quantity;
    }
    onPick({
      name: food.names?.[0] || food.name,
      qty: quantity,
      unit: food.unit === 'porcion' ? 'porción' : food.unit,
      kcal:    Math.round(food.kcal    * realScale),
      protein: Math.round(food.protein * realScale * 10) / 10,
      carbs:   Math.round(food.carbs   * realScale * 10) / 10,
      fat:     Math.round(food.fat     * realScale * 10) / 10,
      fiber:   Math.round((food.fiber || 0) * realScale * 10) / 10,
      ingredientId: food.isCustom ? food.id : undefined
    });
    resetAll();
  }

  const dbResults = useMemo(() => searchFoods(q, 10), [q]);

  return (
    <Sheet open={open} onClose={() => { resetAll(); onClose(); }} title="Añadir ingrediente">
      <div className="space-y-3 pb-4">
        <div className="flex p-1 rounded-2xl bg-ink-700/60 border border-white/5">
          {[
            { v: 'busqueda', l: 'Buscar' },
            { v: 'mios',     l: 'Míos' },
            { v: 'manual',   l: 'Manual' }
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => { setTab(t.v); setActive(null); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                tab === t.v ? 'bg-white text-ink-950' : 'text-white/60'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {!active && tab === 'busqueda' && (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (pollo, avena…)" className="input pl-11" autoFocus />
            </div>
            <ResultsList items={dbResults} onPick={(f) => { setActive(f); setQty(f.unit === 'g' || f.unit === 'ml' ? f.baseQty : 1); }} />
          </>
        )}

        {!active && tab === 'mios' && (
          custom.length === 0 ? (
            <p className="text-center text-sm text-white/40 py-8">No tienes ingredientes propios todavía.</p>
          ) : (
            <ResultsList
              items={custom.map(ingredientToFood)}
              onPick={(f) => { setActive(f); setQty(f.unit === 'g' || f.unit === 'ml' ? f.baseQty : 1); }}
            />
          )
        )}

        {!active && tab === 'manual' && (
          <div className="space-y-3">
            <Input placeholder="Nombre" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" inputMode="decimal" step="0.1" placeholder="Cantidad" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} />
              <Input placeholder="Unidad (g, ml, porción)" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" inputMode="decimal" placeholder="kcal" value={manual.kcal} onChange={(e) => setManual({ ...manual, kcal: e.target.value })} />
              <Input type="number" inputMode="decimal" step="0.1" placeholder="Proteína (g)" value={manual.protein} onChange={(e) => setManual({ ...manual, protein: e.target.value })} />
              <Input type="number" inputMode="decimal" step="0.1" placeholder="Carbos (g)" value={manual.carbs} onChange={(e) => setManual({ ...manual, carbs: e.target.value })} />
              <Input type="number" inputMode="decimal" step="0.1" placeholder="Grasas (g)" value={manual.fat} onChange={(e) => setManual({ ...manual, fat: e.target.value })} />
            </div>
            <Button
              fullWidth
              disabled={!manual.name.trim()}
              onClick={() => {
                onPick({
                  name: manual.name.trim(),
                  qty: parseFloat(manual.qty) || 1,
                  unit: manual.unit || 'porción',
                  kcal: parseFloat(manual.kcal) || 0,
                  protein: parseFloat(manual.protein) || 0,
                  carbs: parseFloat(manual.carbs) || 0,
                  fat: parseFloat(manual.fat) || 0,
                  fiber: 0
                });
                resetAll();
              }}
            >
              <Plus size={16} /> Añadir
            </Button>
          </div>
        )}

        {active && (
          <QtyEditor
            food={active}
            qty={qty}
            setQty={setQty}
            onCancel={() => setActive(null)}
            onConfirm={() => pickFromFood(active, qty)}
          />
        )}
      </div>
    </Sheet>
  );
}

function ResultsList({ items, onPick }) {
  if (!items?.length) return <p className="text-center text-sm text-white/40 py-6">Sin resultados.</p>;
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {items.map((f) => (
        <button
          key={f.id}
          onClick={() => onPick(f)}
          className="w-full px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 text-left flex items-center justify-between"
        >
          <div className="min-w-0 flex items-center gap-2">
            {f.isCustom && <span className="chip !py-0.5 !px-2 !text-[9px]">Mío</span>}
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize truncate">{f.names?.[0] || f.name}</p>
              <p className="text-[11px] text-white/40 truncate">{f.serving}</p>
            </div>
          </div>
          <p className="text-sm font-semibold tabular-nums whitespace-nowrap pl-3">{fmtNum(f.kcal)} kcal</p>
        </button>
      ))}
    </div>
  );
}

function QtyEditor({ food, qty, setQty, onCancel, onConfirm }) {
  const isWeight = food.unit === 'g' || food.unit === 'ml';
  const step = isWeight ? 10 : 0.5;
  const realScale = isWeight ? (qty / food.baseQty) : qty;
  const preview = {
    kcal:    Math.round(food.kcal    * realScale),
    protein: Math.round(food.protein * realScale * 10) / 10,
    carbs:   Math.round(food.carbs   * realScale * 10) / 10,
    fat:     Math.round(food.fat     * realScale * 10) / 10
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {food.isCustom && <span className="chip !text-[10px]"><Carrot size={11} /> Mío</span>}
        <p className="font-semibold capitalize">{food.names?.[0] || food.name}</p>
      </div>
      <p className="text-xs text-white/45">{food.serving}</p>
      <div className="flex items-center justify-between bg-ink-700/60 rounded-2xl p-2">
        <button onClick={() => setQty((q) => Math.max(step, +(q - step).toFixed(2)))} className="w-10 h-10 rounded-xl bg-white/5">−</button>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={qty}
          onChange={(e) => setQty(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
          className="bg-transparent text-center font-bold text-xl w-24 outline-none"
        />
        <span className="text-xs text-white/40 px-2">{food.unit}</span>
        <button onClick={() => setQty((q) => +(q + step).toFixed(2))} className="w-10 h-10 rounded-xl bg-white/5">+</button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Mini label="kcal" v={preview.kcal} />
        <Mini label="P" v={preview.protein} suf="g" />
        <Mini label="C" v={preview.carbs} suf="g" />
        <Mini label="G" v={preview.fat} suf="g" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1">Atrás</button>
        <button onClick={onConfirm} className="btn-lime flex-1">Añadir</button>
      </div>
    </div>
  );
}

function Mini({ label, v, suf = '' }) {
  return (
    <div className="bg-white/5 rounded-xl py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="font-bold tabular-nums">{fmtNum(v)}{suf}</p>
    </div>
  );
}
