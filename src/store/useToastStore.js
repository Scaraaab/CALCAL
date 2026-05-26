import { create } from 'zustand';

let nextId = 0;

/**
 * Toast queue muy simple. Dedup automático: si llega el mismo mensaje en los
 * últimos 3s, lo ignora (evita spam cuando hay muchos errores en cascada).
 */
export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (type, message, ttl = 5000) => {
    const now = Date.now();
    const recent = get().toasts.find((t) => t.message === message && now - t.createdAt < 3000);
    if (recent) return recent.id;

    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, createdAt: now }] }));
    if (ttl > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ttl);
    }
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] })
}));

/** Helpers cómodos importables desde cualquier parte. */
export const toast = {
  success: (msg)         => useToastStore.getState().push('success', msg, 3000),
  info:    (msg)         => useToastStore.getState().push('info', msg, 3500),
  warn:    (msg, ttl)    => useToastStore.getState().push('warn', msg, ttl ?? 5000),
  error:   (msg, ttl)    => useToastStore.getState().push('error', msg, ttl ?? 7000)
};
