// Utilidades de fecha
export function todayISO() {
  const d = new Date();
  return toISODate(d);
}

/**
 * Valida un string ISO 'YYYY-MM-DD'. Devuelve false para cualquier cosa que no
 * sea ese formato o que represente una fecha imposible (ej. 2026-13-45).
 */
export function isValidISO(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && toISODate(d) === s;
}

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toISODate(date);
}

export function daysBetween(a, b) {
  const A = new Date(a), B = new Date(b);
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

const WEEK = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const WEEK_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function formatHuman(iso) {
  const today = todayISO();
  const yesterday = addDays(today, -1);
  if (iso === today) return 'Hoy';
  if (iso === yesterday) return 'Ayer';
  const d = new Date(iso);
  return `${WEEK[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export function formatShort(iso) {
  const d = new Date(iso);
  return `${WEEK_SHORT[d.getDay()]} ${d.getDate()}`;
}

export function lastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(todayISO(), -i));
  return out;
}

export function weekDates() {
  // Lunes a domingo
  const today = new Date();
  const day = today.getDay(); // 0=Domingo
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}
