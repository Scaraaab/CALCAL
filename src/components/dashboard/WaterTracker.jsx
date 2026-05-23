import { Droplet, Minus, Plus } from 'lucide-react';
import { useFoodStore } from '../../store/useFoodStore';
import { useUserStore } from '../../store/useUserStore';
import { todayISO } from '../../utils/date';
import { motion } from 'framer-motion';

export default function WaterTracker() {
  const today = todayISO();
  const water = useFoodStore((s) => s.water[today] || 0);
  const addWater = useFoodStore((s) => s.addWater);
  const setWater = useFoodStore((s) => s.setWater);
  const goal = useUserStore((s) => s.profile.waterDailyGoalMl || 2500);
  const pct = Math.min(100, Math.round((water / goal) * 100));
  const cups = Math.round(water / 250);
  const cupsGoal = Math.ceil(goal / 250);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-macro-water/15 flex items-center justify-center text-macro-water">
            <Droplet size={18} />
          </div>
          <div>
            <p className="font-semibold">Agua</p>
            <p className="text-xs text-white/40">{water} / {goal} ml · {pct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWater(Math.max(0, water - 250))}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
            aria-label="Quitar 250ml"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => addWater(250)}
            className="w-9 h-9 rounded-full bg-macro-water/15 hover:bg-macro-water/25 text-macro-water flex items-center justify-center"
            aria-label="Añadir 250ml"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: cupsGoal }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.4, scaleY: 0.8 }}
            animate={{ opacity: i < cups ? 1 : 0.25, scaleY: 1 }}
            transition={{ delay: i * 0.02 }}
            className={`flex-1 h-7 rounded-md ${i < cups ? 'bg-macro-water' : 'bg-white/5'}`}
          />
        ))}
      </div>
    </div>
  );
}
