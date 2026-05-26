import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  warn:    AlertTriangle,
  info:    Info
};

const STYLES = {
  success: 'bg-emerald-600/95 border-emerald-400/60 text-white',
  error:   'bg-rose-600/95 border-rose-400/60 text-white',
  warn:    'bg-amber-500/95 border-amber-300/60 text-ink-950',
  info:    'bg-brand-600/95 border-brand-400/60 text-white'
};

/**
 * Capa de notificaciones global. Se monta una sola vez en App.jsx.
 * z-[100] está por encima de cualquier otro elemento (BottomNav z-30,
 * Sheets z-50, pending bar z-40).
 */
export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="fixed inset-x-0 z-[100] px-3 pointer-events-none"
      style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="max-w-md mx-auto space-y-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-card backdrop-blur-xl border flex items-start gap-3 ${STYLES[t.type] || STYLES.info}`}
              >
                <Icon size={18} className="flex-none mt-0.5" />
                <p className="flex-1 text-sm leading-snug whitespace-pre-line">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="opacity-70 hover:opacity-100 flex-none touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
