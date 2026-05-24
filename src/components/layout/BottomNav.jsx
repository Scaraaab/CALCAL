import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, BookOpen, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { isValidISO, todayISO } from '../../utils/date';

const items = [
  { to: '/',         icon: Home,       label: 'Hoy' },
  { to: '/history',  icon: BookOpen,   label: 'Historial' },
  { to: '/progress', icon: TrendingUp, label: 'Progreso' },
  { to: '/coach',    icon: Sparkles,   label: 'Coach' }
];

export default function BottomNav() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Si el usuario está viendo un día pasado en /history, propagamos esa fecha al
  // botón + para que la nueva comida se registre en ese día (no en "hoy").
  function fabTarget() {
    if (location.pathname === '/history') {
      const d = searchParams.get('date');
      if (isValidISO(d) && d !== todayISO()) return `/log?date=${d}`;
    }
    return '/log';
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <div className="relative max-w-md mx-auto">
        {/* Wrapper de posicionamiento (Tailwind) — el motion va dentro para no chocar con transforms */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => nav(fabTarget())}
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
          <div className="relative inline-flex">
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            {/* Punto estático bajo el ícono activo. Sin framer-motion: el layoutId
                hacía que su transform compitiera con el -translate-x-1/2 y quedaba
                descolocado al cambiar de pestaña. */}
            <span
              aria-hidden="true"
              className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
