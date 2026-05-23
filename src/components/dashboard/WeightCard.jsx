import { Scale, Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useState } from 'react';
import { useFoodStore } from '../../store/useFoodStore';
import { useUserStore } from '../../store/useUserStore';
import Sheet from '../ui/Sheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { fmtKg } from '../../utils/format';

export default function WeightCard() {
  const [open, setOpen] = useState(false);
  const latest = useFoodStore((s) => s.latestWeight());
  const startWeight = useUserStore((s) => s.profile.startWeightKg);
  const setProfile = useUserStore((s) => s.setProfile);
  const addWeight = useFoodStore((s) => s.addWeight);
  const [val, setVal] = useState(latest?.kg ?? '');

  const diff = latest && startWeight ? latest.kg - startWeight : 0;
  const Trend = diff < -0.05 ? TrendingDown : diff > 0.05 ? TrendingUp : Minus;
  const trendColor = diff < -0.05 ? 'text-emerald-400' : diff > 0.05 ? 'text-rose-400' : 'text-white/40';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="card p-5 w-full text-left active:scale-[0.99] transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-300">
              <Scale size={18} />
            </div>
            <div>
              <p className="font-semibold">Peso</p>
              <p className="text-xs text-white/40">
                {latest ? fmtKg(latest.kg) : 'Sin registros'}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
            <Trend size={16} />
            <span>{latest ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg` : '—'}</span>
          </div>
        </div>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar peso"
        footer={
          <Button
            fullWidth
            onClick={() => {
              const n = parseFloat(val);
              if (!isNaN(n) && n > 0) {
                addWeight(n);
                setProfile({ weightKg: n });
                setOpen(false);
              }
            }}
          >
            Guardar
          </Button>
        }
      >
        <div className="pt-2 space-y-3">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            label="Peso (kg)"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="74.3"
            autoFocus
          />
          <p className="text-xs text-white/40">
            Pesa por la mañana, después de ir al baño y antes de comer/beber. Más constancia = mejores ajustes.
          </p>
        </div>
      </Sheet>
    </>
  );
}
