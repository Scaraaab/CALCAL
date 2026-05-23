import { Heart, Repeat2 } from 'lucide-react';
import { useFoodStore } from '../../store/useFoodStore';
import { fmtNum } from '../../utils/format';

export default function QuickFoods({ onPick }) {
  const favorites = useFoodStore((s) => s.favorites);
  const frequent = useFoodStore((s) => s.frequentFoods());

  if (!favorites.length && !frequent.length) return null;

  return (
    <div className="space-y-4">
      {favorites.length > 0 && (
        <Section title="Favoritos" icon={Heart} iconColor="text-rose-400">
          <Row items={favorites} onPick={onPick} />
        </Section>
      )}
      {frequent.length > 0 && (
        <Section title="Frecuentes" icon={Repeat2} iconColor="text-brand-300">
          <Row items={frequent} onPick={onPick} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <Icon size={14} className={iconColor} />
        <p className="text-xs uppercase tracking-wider font-semibold text-white/50">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ items, onPick }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-snap-x -mx-5 px-5 pb-1">
      {items.slice(0, 10).map((it, i) => (
        <button
          key={it.id || i}
          onClick={() => onPick(it)}
          className="snap-start flex-none w-44 card-soft p-3 text-left hover:border-white/15 transition"
        >
          <p className="font-medium text-sm truncate capitalize">{it.name}</p>
          <p className="text-xs text-white/45 truncate mt-0.5">{it.serving || ''}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums">{fmtNum(it.kcal)}</span>
            <span className="text-[10px] text-white/40">kcal</span>
          </div>
        </button>
      ))}
    </div>
  );
}
