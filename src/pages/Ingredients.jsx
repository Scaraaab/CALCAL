import { useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Carrot, Camera, Sparkles, Loader2, ImageIcon, ScanLine, X, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import Segmented from '../components/ui/Segmented';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { compressImage } from '../lib/image';
import { analyzeNutritionLabel, hasApiKey } from '../lib/claude';
import { fmtNum, sanitizeDecimal, parseDecimal } from '../utils/format';
import IngredientDetail from '../components/food/IngredientDetail';

const MEASURE_OPTIONS = [
  { value: 'per100g', label: 'Por 100 g' },
  { value: 'serving', label: 'Por porción' },
  { value: 'unit',    label: 'Por unidad' }
];

const EMPTY_FORM = {
  name: '', measureType: 'per100g', servingLabel: '', photo: null,
  kcal: '', protein: '', carbs: '', fat: '', fiber: ''
};

export default function Ingredients() {
  const ingredients = useFoodStore((s) => s.customIngredients);
  const addIngredient = useFoodStore((s) => s.addIngredient);
  const updateIngredient = useFoodStore((s) => s.updateIngredient);
  const removeIngredient = useFoodStore((s) => s.removeIngredient);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailId, setDetailId] = useState(null);
  const detailIng = useMemo(
    () => detailId ? ingredients.find((i) => i.id === detailId) : null,
    [detailId, ingredients]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(query));
  }, [ingredients, q]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(ing) {
    // Convertimos a string para edición. Los ceros se muestran vacíos para que el
    // usuario pueda empezar a escribir directamente sin tener que borrar el '0'.
    const toStr = (n) => (n && n !== 0) ? String(n) : '';
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      measureType: ing.measureType,
      servingLabel: ing.servingLabel || '',
      photo: ing.photo || null,
      kcal:    toStr(ing.kcal),
      protein: toStr(ing.protein),
      carbs:   toStr(ing.carbs),
      fat:     toStr(ing.fat),
      fiber:   toStr(ing.fiber)
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      measureType: form.measureType,
      servingLabel: form.servingLabel.trim(),
      photo: form.photo,
      // parseDecimal acepta '12.5', '12,5' o '' (→ 0). Solo aquí cruzamos string → number.
      kcal:    parseDecimal(form.kcal),
      protein: parseDecimal(form.protein),
      carbs:   parseDecimal(form.carbs),
      fat:     parseDecimal(form.fat),
      fiber:   parseDecimal(form.fiber)
    };
    if (editingId) updateIngredient(editingId, payload);
    else addIngredient(payload);
    setOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function destroy(id, name) {
    if (!confirm(`¿Eliminar "${name}"? Se quitará también de las comidas que lo usen.`)) return;
    removeIngredient(id);
  }

  return (
    <div>
      <Header
        title="Mis ingredientes"
        subtitle="Base de datos personal"
        back
        right={
          <button onClick={openNew} className="w-10 h-10 rounded-full bg-lime text-ink-950 shadow-limeGlow flex items-center justify-center" aria-label="Añadir">
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-5 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ingrediente" className="input pl-11" />
        </div>

        {ingredients.length === 0 ? (
          <EmptyState
            icon={Carrot}
            title="Sin ingredientes propios"
            description="Añade alimentos que comes a menudo para registrarlos al instante."
            action={<button onClick={openNew} className="btn-lime"><Plus size={16} /> Añadir el primero</button>}
          />
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-8">Sin coincidencias.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((ing) => (
              <Card key={ing.id} className="p-3 flex items-center gap-3 cursor-pointer hover:border-white/15 transition active:scale-[0.99]" as="div" onClick={() => setDetailId(ing.id)}>
                <IngredientThumb ing={ing} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate capitalize">{ing.name}</p>
                  <p className="text-xs text-white/45 truncate">
                    {ing.servingLabel} · {fmtNum(ing.kcal)} kcal · P {fmtNum(ing.protein, 1)}g · C {fmtNum(ing.carbs, 1)}g · G {fmtNum(ing.fat, 1)}g
                  </p>
                </div>
                <ChevronRight size={16} className="text-white/30 flex-none" />
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar ingrediente' : 'Nuevo ingrediente'}
        footer={
          <div className="flex gap-2">
            {editingId && (
              <button
                onClick={() => { destroy(editingId, form.name); setOpen(false); }}
                className="btn-danger flex-none"
              >
                <Trash2 size={16} />
              </button>
            )}
            <Button onClick={save} fullWidth disabled={!form.name.trim()}>Guardar</Button>
          </div>
        }
      >
        <IngredientForm form={form} setForm={setForm} />
      </Sheet>

      <IngredientDetail
        ing={detailIng}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          if (detailIng) {
            openEdit(detailIng);
            setDetailId(null);
          }
        }}
        onDelete={() => {
          if (detailIng) {
            destroy(detailIng.id, detailIng.name);
            setDetailId(null);
          }
        }}
      />
    </div>
  );
}

/**
 * Avatar reutilizable del ingrediente: foto si la hay, fallback al icono de zanahoria.
 */
export function IngredientThumb({ ing, size = 44, className = '' }) {
  const px = `${size}px`;
  if (ing?.photo) {
    return (
      <img
        src={ing.photo}
        alt=""
        className={`rounded-2xl object-cover flex-none ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <div
      className={`rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center flex-none ${className}`}
      style={{ width: px, height: px }}
    >
      <Carrot size={Math.round(size * 0.45)} />
    </div>
  );
}

// ============================================================
//  Form interno con foto + escaneo de etiqueta + campos
// ============================================================
function IngredientForm({ form, setForm }) {
  const photoInputRef = useRef(null);
  const camInputRef = useRef(null);
  const labelInputRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanInfo, setScanInfo] = useState('');

  async function onPhotoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const { dataUrl } = await compressImage(file, { maxSize: 480, quality: 0.7 });
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch (err) {
      alert(err.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onLabelFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!hasApiKey()) {
      setScanError('Activa Coach IA (Gemini) en Ajustes para usar el escaneo.');
      return;
    }
    setScanError('');
    setScanInfo('');
    setScanBusy(true);
    try {
      // Para OCR queremos buena resolución (Gemini necesita leer el texto)
      const { dataUrl } = await compressImage(file, { maxSize: 1024, quality: 0.85 });
      const res = await analyzeNutritionLabel(dataUrl);
      const patch = {};
      if (res.kcal    != null) patch.kcal    = String(res.kcal);
      if (res.protein != null) patch.protein = String(res.protein);
      if (res.carbs   != null) patch.carbs   = String(res.carbs);
      if (res.fat     != null) patch.fat     = String(res.fat);
      if (res.fiber   != null) patch.fiber   = String(res.fiber);
      if (res.perWhat) patch.measureType = res.perWhat;
      if (res.servingSize && !form.servingLabel) patch.servingLabel = res.servingSize;
      if (Object.keys(patch).length === 0) {
        setScanError('No detecté ningún valor en la imagen.');
      } else {
        setForm((f) => ({ ...f, ...patch }));
        const found = Object.keys(patch).length;
        setScanInfo(`${found} campo${found === 1 ? '' : 's'} autorrellenado${found === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanBusy(false);
    }
  }

  return (
    <div className="space-y-4 pt-2 pb-4">
      {/* Foto del ingrediente */}
      <div className="flex gap-3 items-stretch">
        <label className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-500/15 to-lime/10 border border-white/5 flex items-center justify-center text-white/50 overflow-hidden flex-none cursor-pointer active:scale-[0.98] transition">
          {form.photo ? (
            <>
              <img src={form.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setForm((f) => ({ ...f, photo: null })); }}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                aria-label="Quitar foto"
              >
                <X size={14} />
              </button>
            </>
          ) : photoBusy ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <div className="flex flex-col items-center text-center px-2">
              <Camera size={22} />
              <span className="text-[10px] mt-1 leading-tight">Foto del<br/>ingrediente</span>
            </div>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />
        </label>

        <div className="flex-1 min-w-0 space-y-2">
          <Input label="Nombre" placeholder="Ej: Pan integral" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => camInputRef.current?.click()} className="btn-ghost !py-2 !text-xs !rounded-xl">
              <Camera size={13} /> Cámara
            </button>
            <button type="button" onClick={() => photoInputRef.current?.click()} className="btn-ghost !py-2 !text-xs !rounded-xl">
              <ImageIcon size={13} /> Galería
            </button>
          </div>
          <input ref={camInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoFile} className="hidden" />
        </div>
      </div>

      {/* Tipo de medida */}
      <div>
        <p className="label mb-2">Tipo de medida</p>
        <Segmented
          value={form.measureType}
          onChange={(v) => setForm({ ...form, measureType: v })}
          options={MEASURE_OPTIONS}
          className="w-full"
        />
        <p className="text-[11px] text-white/40 mt-2 px-1">
          {form.measureType === 'per100g' && 'Introduce los valores por cada 100 g.'}
          {form.measureType === 'serving' && 'Introduce los valores por porción completa.'}
          {form.measureType === 'unit'    && 'Introduce los valores por cada unidad/pieza.'}
        </p>
      </div>

      <Input
        label="Etiqueta de la porción (opcional)"
        placeholder={form.measureType === 'per100g' ? '100 g' : form.measureType === 'unit' ? '1 rebanada (28g)' : '1 plato (300g)'}
        value={form.servingLabel}
        onChange={(e) => setForm({ ...form, servingLabel: e.target.value })}
      />

      {/* Escaneo de etiqueta nutricional */}
      <div className="card-soft p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
            <ScanLine size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              Escanear tabla nutricional
              {hasApiKey() && <span className="chip !text-[9px] !py-0.5 !px-1.5"><Sparkles size={10} /> IA</span>}
            </p>
            <p className="text-[11px] text-white/45">Foto del envase → autorellena los macros</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => labelInputRef.current?.click()}
          disabled={scanBusy || !hasApiKey()}
          className="btn-primary w-full !py-2.5"
        >
          {scanBusy
            ? <><Loader2 size={16} className="animate-spin" /> Leyendo etiqueta…</>
            : <><Camera size={16} /> Escanear etiqueta</>}
        </button>
        <input ref={labelInputRef} type="file" accept="image/*" capture="environment" onChange={onLabelFile} className="hidden" />
        {scanError && <p className="text-[11px] text-rose-300">{scanError}</p>}
        {scanInfo && <p className="text-[11px] text-emerald-300">{scanInfo}</p>}
        {!hasApiKey() && (
          <p className="text-[11px] text-white/40">Necesitas configurar Gemini en Ajustes → Coach IA.</p>
        )}
      </div>

      {/* Campos numéricos. Usamos type="text" + inputMode="decimal":
          - El navegador no interfiere con el valor (no se atrapa en 0/0.1)
          - El móvil muestra teclado numérico con decimal
          - Se permite borrado total (string vacío) durante la edición
          - sanitizeDecimal filtra a dígitos + un único separador (. o ,)
          - parseDecimal convierte a número solo al guardar */}
      <div className="grid grid-cols-2 gap-3">
        <DecimalField label="Calorías (kcal)" value={form.kcal}    onChange={(v) => setForm((f) => ({ ...f, kcal: v }))}    placeholder="0" />
        <DecimalField label="Proteína (g)"    value={form.protein} onChange={(v) => setForm((f) => ({ ...f, protein: v }))} placeholder="0" />
        <DecimalField label="Carbos (g)"      value={form.carbs}   onChange={(v) => setForm((f) => ({ ...f, carbs: v }))}   placeholder="0" />
        <DecimalField label="Grasas (g)"      value={form.fat}     onChange={(v) => setForm((f) => ({ ...f, fat: v }))}     placeholder="0" />
      </div>
      <DecimalField label="Fibra (g) — opcional" value={form.fiber} onChange={(v) => setForm((f) => ({ ...f, fiber: v }))} placeholder="0" />
    </div>
  );
}

/**
 * Campo de input decimal. El valor SIEMPRE es string mientras se edita; el padre
 * decide cuándo llamar a parseDecimal() para obtener el número final.
 */
function DecimalField({ value, onChange, ...rest }) {
  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
    />
  );
}
