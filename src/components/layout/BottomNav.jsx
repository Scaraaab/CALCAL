import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  { to: '/',         icon: Home,       label: 'Hoy' },
  { to: '/history',  icon: BookOpen,   label: 'Historial' },
  { to: '/progress', icon: TrendingUp, label: 'Progreso' },
  { to: '/coach',    icon: Sparkles,   label: 'Coach' }
];

export default function BottomNav() {
  const nav = useNavigate();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.5rem,var(--safe-bottom))] pt-1">
      <div className="relative max-w-md mx-auto">
        {/* Wrapper de posicionamiento (Tailwind) — el motion va dentro para no chocar con transforms */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => nav('/log')}
            className="w-14 h-14 rounded-full bg-lime text-ink-950 shadow-limeGlow flex items-center justify-center"
            aria-label="Registrar comida"
          >
            <Plus size={26} strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="grid grid-cols-5 items-center gap-1 glass rounded-3xl px-2 py-2">
          {items.slice(0, 2).map((it) => <Item key={it.to} {...it} />)}
          <div aria-hidden="true" />
          {items.slice(2).map((it) => <Item key={it.to} {...it} />)}
        </div>
      </div>
    </nav>
  );
}

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `tap-highlight flex flex-col items-center gap-0.5 py-2 rounded-xl transition ${
          isActive ? 'text-white' : 'text-white/45 hover:text-white/80'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            {isActive && (
              <motion.span
                layoutId="navdot"
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-400"
              />
            )}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
