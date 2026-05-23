import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';

export default function Header({ title, subtitle, back, action, right }) {
  const nav = useNavigate();
  return (
    <header className="safe-top px-5 pt-4 pb-3 flex items-center gap-3">
      {back && (
        <button
          onClick={() => nav(-1)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {subtitle && <p className="text-xs uppercase tracking-wider text-white/40">{subtitle}</p>}
        <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
      </div>
      {right}
      {action === 'settings' && (
        <button
          onClick={() => nav('/settings')}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          aria-label="Ajustes"
        >
          <Settings size={18} />
        </button>
      )}
    </header>
  );
}
