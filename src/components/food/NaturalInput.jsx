import { useState } from 'react';
import { Sparkles, Mic, Loader2 } from 'lucide-react';
import { parseNaturalLanguage } from '../../lib/parseFood';
import { parseWithAI, hasApiKey } from '../../lib/claude';

export default function NaturalInput({ onParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleParse() {
    if (!text.trim()) return;
    setError('');
    // Primero parser local rápido
    const local = parseNaturalLanguage(text);
    const knownHits = local.filter((x) => x.matchedFood && x.kcal > 0);

    if (knownHits.length === local.length && knownHits.length > 0) {
      onParsed?.(knownHits);
      setText('');
      return;
    }

    // Si hay items sin match y hay API key, usa Claude
    if (hasApiKey()) {
      setLoading(true);
      try {
        const ai = await parseWithAI(text);
        if (ai.length) {
          onParsed?.(ai.map((it) => ({ ...it, kcal: it.kcal || 0, protein: it.protein || 0, carbs: it.carbs || 0, fat: it.fat || 0 })));
          setText('');
        } else if (local.length) {
          onParsed?.(local);
          setText('');
        } else {
          setError('No pude entender la comida. Sé más específico.');
        }
      } catch (e) {
        setError(e.message);
        if (local.length) onParsed?.(local);
      } finally {
        setLoading(false);
      }
    } else if (local.length) {
      onParsed?.(local);
      setText('');
    } else {
      setError('No reconocí los alimentos. Activa Coach IA en Ajustes para mejores resultados.');
    }
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Tu navegador no soporta dictado por voz.');
      return;
    }
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => setText((prev) => (prev ? prev + ' ' : '') + e.results[0][0].transcript);
    rec.onerror = (e) => setError('Error de micrófono: ' + e.error);
    rec.start();
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-300">
          <Sparkles size={16} />
        </div>
        <p className="text-sm font-semibold">Registrar con texto natural</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder='Ej: "2 huevos con avena y un vaso de leche"'
        className="input resize-none"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleParse();
        }}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={startVoice}
          className="btn-ghost flex-none"
          aria-label="Dictar"
          type="button"
        >
          <Mic size={18} />
        </button>
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="btn-primary flex-1"
          type="button"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Analizando…</> : <><Sparkles size={16} /> Analizar y registrar</>}
        </button>
      </div>
    </div>
  );
}
