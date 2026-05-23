import { useState } from 'react';
import { ChefHat, Sparkles, Loader2, Trash2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { generateRecipe, hasApiKey } from '../lib/claude';

export default function Recipes() {
  const targets = useUserStore((s) => s.computed);
  const recipes = useFoodStore((s) => s.recipes);
  const addRecipe = useFoodStore((s) => s.addRecipe);
  const removeRecipe = useFoodStore((s) => s.removeRecipe);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function create() {
    if (!name.trim()) return;
    if (!hasApiKey()) {
      setErr('Activa el Coach IA en Ajustes para generar recetas.');
      return;
    }
    setErr('');
    setLoading(true);
    try {
      const body = await generateRecipe({ name, targets: { calories: Math.round(targets.calories / 4), protein: 35 } });
      addRecipe({ name, body });
      setName('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Recetas" subtitle="Personalizadas" back />

      <div className="px-5 space-y-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <ChefHat size={16} className="text-lime" /> Crear receta con IA
          </p>
          <Input
            placeholder="Ej: bowl de pollo y arroz con vegetales"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          {err && <p className="text-xs text-rose-300">{err}</p>}
          <Button fullWidth onClick={create} disabled={loading || !name.trim()}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creando…</> : <><Sparkles size={16} /> Generar receta</>}
          </Button>
        </Card>

        {recipes.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="Sin recetas aún"
            description="Pídele al Coach que diseñe una receta optimizada para tu objetivo."
          />
        ) : (
          <div className="space-y-3">
            {recipes.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold capitalize">{r.name}</h3>
                  <button onClick={() => removeRecipe(r.id)} className="text-white/40 hover:text-rose-300">
                    <Trash2 size={16} />
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-white/75 font-sans">{r.body}</pre>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
