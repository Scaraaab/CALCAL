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
  success: 'bg-emerald-600 border-emerald-400 text-white',
  error:   'bg-rose-600 border-rose-400 text-white',
  warn:    'bg-amber-500 border-amber-300 text-ink-950',
  info:    'bg-brand-600 border-brand-400 text-white'
};

/**
 * Capa de notificaciones global. Aparece ARRIBA de la BottomNav (z-[100] —
 * por encima de todo). Posicionada justo encima del FAB para máxima visibilidad
 * sin tapar el contenido.
 */
export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="fixed inset-x-0 z-[100] px-3 pointer-events-none"
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-md mx-auto space-y-2 flex flex-col-reverse">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                initial={{ y: 60, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`pointer-events-auto rounded-2xl px-4 py-3.5 shadow-card border-2 flex items-start gap-3 ${STYLES[t.type] || STYLES.info}`}
              >
                <Icon size={20} className="flex-none mt-0.5" strokeWidth={2.5} />
                <p className="flex-1 text-sm font-medium leading-snug whitespace-pre-line">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="opacity-70 hover:opacity-100 flex-none touch-manipulation -mr-1"
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
