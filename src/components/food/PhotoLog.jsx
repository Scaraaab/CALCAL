import { useRef, useState } from 'react';
import { Camera, Sparkles, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { compressImage } from '../../lib/image';
import { analyzeFood, hasGeminiKey } from '../../lib/gemini';

export default function PhotoLog({ onParsed }) {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [confidence, setConfidence] = useState('');
  const fileRef = useRef(null);
  const camRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const { dataUrl } = await compressImage(file, { maxSize: 800, quality: 0.78 });
      setPhoto(dataUrl);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }

  async function analyze() {
    if (!photo) return;
    setError('');
    setLoading(true);
    try {
      const { title: t, items, confidence: c } = await analyzeFood(photo);
      setTitle(t);
      setConfidence(c);
      if (items?.length) {
        // Marca cada item con la foto y el título para que MealList los muestre asociados
        const withPhoto = items.map((it, idx) => ({
          ...it,
          photo: idx === 0 ? photo : undefined, // foto solo en el primer item para no inflar storage
          source: 'photo'
        }));
        onParsed?.(withPhoto);
        setPhoto(null);
      } else {
        setError('No se detectaron alimentos en la foto.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function saveAsReference() {
    if (!photo) return;
    onParsed?.([{
      name: title.trim() || 'Comida (foto)',
      qty: 1,
      unit: 'porción',
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      photo,
      source: 'photo-ref'
    }]);
    setPhoto(null);
    setTitle('');
  }

  const ai = hasGeminiKey();

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-300">
          <Camera size={16} />
        </div>
        <p className="text-sm font-semibold">Registrar con foto</p>
        {ai && <span className="chip !text-[10px]"><Sparkles size={11} /> IA visión</span>}
      </div>

      {!photo && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => camRef.current?.click()} className="btn-primary">
            <Camera size={18} /> Cámara
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <ImageIcon size={18} /> Galería
          </button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
      )}

      {photo && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-ink-700/40">
            <img src={photo} alt="" className="w-full aspect-[16/10] object-cover" />
            <button onClick={() => { setPhoto(null); setTitle(''); setConfidence(''); }} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center" aria-label="Quitar">
              <X size={16} />
            </button>
            {confidence && (
              <div className="absolute bottom-2 left-2 chip !bg-black/60 !backdrop-blur">
                Confianza: {confidence}
              </div>
            )}
          </div>

          {!ai && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la comida (opcional)"
              className="input"
            />
          )}

          {error && <p className="text-xs text-rose-300">{error}</p>}

          {ai ? (
            <button onClick={analyze} disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Analizando con IA…</> : <><Sparkles size={18} /> Analizar con IA</>}
            </button>
          ) : (
            <>
              <p className="text-[11px] text-white/40 px-1">
                Sin IA Vision: la foto se guarda como referencia visual. Configura Gemini en Ajustes para análisis automático.
              </p>
              <button onClick={saveAsReference} className="btn-lime w-full">
                Guardar como referencia
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
