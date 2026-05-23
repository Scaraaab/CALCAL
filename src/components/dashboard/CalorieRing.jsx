import { ProgressRing } from '../ui/Progress';
import { fmtNum } from '../../utils/format';

export default function CalorieRing({ consumed = 0, target = 2000 }) {
  const remaining = Math.max(0, target - consumed);
  const over = consumed > target;
  return (
    <ProgressRing value={consumed} max={target} size={220} stroke={18}>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-white/50">Restantes</p>
        <p className="text-4xl font-extrabold tracking-tight">
          {over ? `+${fmtNum(consumed - target)}` : fmtNum(remaining)}
        </p>
        <p className="text-xs text-white/40 mt-1">
          {fmtNum(consumed)} / {fmtNum(target)} kcal
        </p>
      </div>
    </ProgressRing>
  );
}
