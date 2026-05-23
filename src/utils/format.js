export function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: decimals });
}

export function fmtKcal(n) {
  return `${fmtNum(n)} kcal`;
}

export function fmtG(n) {
  return `${fmtNum(n, 1)} g`;
}

export function fmtKg(n) {
  return `${fmtNum(n, 1)} kg`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
