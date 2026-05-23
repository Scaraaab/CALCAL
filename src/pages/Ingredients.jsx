import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Pencil, Carrot } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import Segmented from '../components/ui/Segmented';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { fmtNum } from '../utils/format';

const MEASURE_OPTIONS = [
  { value: 'per100g', label: 'Por 100 g' },
  { value: 'serving', label: 'Por porción' },
  { value: 'unit',    label: 'Por unidad' }
];

const EMPTY_FORM = {
  name: '', measureType: 'per100g', servingLabel: '',
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
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      measureType: ing.measureType,
      servingLabel: ing.servingLabel || '',
      kcal: String(ing.kcal),
      protein: String(ing.protein),
      carbs: String(ing.carbs),
      fat: String(ing.fat),
      fiber: String(ing.fiber || 0)
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      measureType: form.measureType,
      servingLabel: form.servingLabel.trim(),
      kcal: parseFloat(form.kcal) || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
      fiber: parseFloat(form.fiber) || 0
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
              <Card key={ing.id} className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center flex-none">
                  <Carrot size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate capitalize">{ing.name}</p>
                  <p className="text-xs text-white/45 truncate">
                    {ing.servingLabel} · {fmtNum(ing.kcal)} kcal · P {fmtNum(ing.protein, 1)}g · C {fmtNum(ing.carbs, 1)}g · G {fmtNum(ing.fat, 1)}g
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(ing)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-white/50" aria-label="Editar">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => destroy(ing.id, ing.name)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-300" aria-label="Eliminar">
                    <Trash2 size={15} />
                  </button>
                </div>
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
        <div className="space-y-4 pt-2 pb-4">
          <Input label="Nombre" placeholder="Ej: Pan integral" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />

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

          <div className="grid grid-cols-2 gap-3">
            <Input label="Calorías (kcal)" type="number" inputMode="decimal" step="1" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} />
            <Input label="Proteína (g)" type="number" inputMode="decimal" step="0.1" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
            <Input label="Carbos (g)" type="number" inputMode="decimal" step="0.1" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
            <Input label="Grasas (g)" type="number" inputMode="decimal" step="0.1" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
          </div>
          <Input label="Fibra (g) — opcional" type="number" inputMode="decimal" step="0.1" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} />
        </div>
      </Sheet>
    </div>
  );
}
