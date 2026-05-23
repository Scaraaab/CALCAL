import { Flame } from 'lucide-react';
import { useFoodStore } from '../../store/useFoodStore';

export default function StreakCard() {
  const streak = useFoodStore((s) => s.streakData);
  return (
    <div className="card p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white">
          <Flame size={22} />
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Racha actual</p>
          <p className="text-xl font-bold">
            {streak.current} {streak.current === 1 ? 'día' : 'días'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-white/40 uppercase tracking-wider">Mejor</p>
        <p className="text-base font-semibold text-white/80">{streak.best || 0} días</p>
      </div>
    </div>
  );
}
