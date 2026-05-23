import { Heart, Trash2, Utensils, Coffee, Soup, Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFoodStore } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

const MEAL_ICONS = {
  Desayuno: Coffee,
  Almuerzo: Utensils,
  Merienda: Cookie,
  Cena: Soup
};

export default function MealList({ entries = [], date, readOnly = false }) {
  const removeEntry = useFoodStore((s) => s.removeEntry);
  const toggleFavorite = useFoodStore((s) => s.toggleFavorite);
  const isFavorite = useFoodStore((s) => s.isFavorite);

  if (!entries.length) return null;

  // Agrupa por meal
  const groups = entries.reduce((acc, e) => {
    const key = e.meal || 'Otros';
    acc[key] = acc[key] || [];
    acc[key].push(e);
    return acc;
  }, {});
  const order = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Otros'];

  return (
    <div className="space-y-4">
      {order.filter((k) => groups[k]?.length).map((meal) => {
        const Icon = MEAL_ICONS[meal] || Utensils;
        const items = groups[meal];
        const total = items.reduce((s, x) => s + (x.kcal || 0), 0);
        return (
          <div key={meal}>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-white/40" />
                <p className="text-xs uppercase tracking-wider font-semibold text-white/50">{meal}</p>
              </div>
              <p className="text-xs text-white/40 tabular-nums">{fmtNum(total)} kcal</p>
            </div>
            <div className="card divide-y divide-white/5 overflow-hidden">
              <AnimatePresence initial={false}>
                {items.map((e) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate capitalize">{e.name}</p>
                      <p className="text-xs text-white/45 truncate">
                        {e.qty ? `${e.qty} ${e.unit || ''} · ` : ''}
                        {fmtNum(e.kcal)} kcal · P {fmtNum(e.protein, 0)}g · C {fmtNum(e.carbs, 0)}g · G {fmtNum(e.fat, 0)}g
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(e)}
                          className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center"
                          aria-label="Favorito"
                        >
                          <Heart size={16} className={isFavorite(e.name) ? 'fill-rose-400 text-rose-400' : 'text-white/40'} />
                        </button>
                        <button
                          onClick={() => removeEntry(e.id, date)}
                          className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={16} className="text-white/40" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
