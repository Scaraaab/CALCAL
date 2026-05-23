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

/**
 * Sanitiza un valor de input decimal mientras el usuario escribe.
 * Permite cadena vacía (importante: el usuario tiene que poder borrar todo),
 * dígitos y como mucho un separador decimal (. o ,).
 * NO convierte a número — sigue siendo string. La conversión ocurre al guardar.
 *
 *   sanitizeDecimal('12.5')   → '12.5'
 *   sanitizeDecimal('12,5')   → '12,5'   (se permite, se normaliza al parsear)
 *   sanitizeDecimal('')       → ''       (campo vacío permitido)
 *   sanitizeDecimal('1.2.3')  → '1.23'   (solo un separador)
 *   sanitizeDecimal('abc12')  → '12'     (no letras)
 */
export function sanitizeDecimal(value) {
  if (value == null) return '';
  let s = String(value).replace(/[^\d.,]/g, '');
  const firstSep = s.search(/[.,]/);
  if (firstSep !== -1) {
    s = s.slice(0, firstSep + 1) + s.slice(firstSep + 1).replace(/[.,]/g, '');
  }
  return s;
}

/**
 * Convierte un string sanitizado a número. Devuelve 0 si vacío o inválido.
 * Acepta tanto coma como punto como separador decimal.
 */
export function parseDecimal(value) {
  if (value === '' || value == null) return 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
