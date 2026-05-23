// Helpers de imágenes: compresión y conversión a base64 para localStorage.
// localStorage tiene ~5MB por origen, así que comprimimos agresivamente.

const DEFAULT_MAX = 720;
const DEFAULT_QUALITY = 0.72;

/**
 * Carga un File como Image() para poder dibujarlo en canvas.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Comprime y convierte a base64 JPEG.
 * @param {File} file
 * @param {{maxSize?:number, quality?:number}} opts
 * @returns {Promise<{dataUrl:string, width:number, height:number, bytes:number}>}
 */
export async function compressImage(file, opts = {}) {
  const { maxSize = DEFAULT_MAX, quality = DEFAULT_QUALITY } = opts;
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('No es una imagen válida');
  }
  const img = await loadImage(file);
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Bytes aproximados a partir del base64 (sin el prefix)
  const base64Body = dataUrl.split(',')[1] || '';
  const bytes = Math.round(base64Body.length * 0.75);
  return { dataUrl, width: w, height: h, bytes };
}

/**
 * Convierte un dataUrl (base64) en su parte base64 cruda (sin prefix).
 * Útil para pasarla a APIs como Gemini Vision.
 */
export function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return '';
  const idx = dataUrl.indexOf(',');
  return idx === -1 ? dataUrl : dataUrl.slice(idx + 1);
}

export function mimeFromDataUrl(dataUrl) {
  if (!dataUrl) return 'image/jpeg';
  const m = dataUrl.match(/^data:([^;]+);/);
  return m ? m[1] : 'image/jpeg';
}
