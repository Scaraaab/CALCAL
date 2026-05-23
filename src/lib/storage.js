// Helpers de localStorage seguros con prefix
const PREFIX = 'calcal:';

// Referencias estables para fallbacks en selectores Zustand (evita React #185)
export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* noop - cuota llena o modo privado */
    }
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
  clear() {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
  }
};
