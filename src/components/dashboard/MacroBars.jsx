import { ProgressBar } from '../ui/Progress';
import { fmtNum } from '../../utils/format';

const MACROS = [
  { key: 'protein', label: 'Proteína', color: 'bg-macro-protein', unit: 'g' },
  { key: 'carbs',   label: 'Carbos',   color: 'bg-macro-carbs',   unit: 'g' },
  { key: 'fat',     label: 'Grasas',   color: 'bg-macro-fat',     unit: 'g' }
];

export default function MacroBars({ totals, targets }) {
  return (
    <div className="space-y-3">
      {MACROS.map((m) => {
        const v = totals[m.key] || 0;
        const t = targets[m.key] || 1;
        const pct = Math.round((v / t) * 100);
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-medium text-white/80">{m.label}</span>
              <span className="text-xs text-white/50 tabular-nums">
                <span className="text-white font-semibold">{fmtNum(v, 0)}</span> / {fmtNum(t)} {m.unit}
                <span className="ml-1.5 text-white/35">({pct}%)</span>
              </span>
            </div>
            <ProgressBar value={v} max={t} color={m.color} />
          </div>
        );
      })}
    </div>
  );
}
