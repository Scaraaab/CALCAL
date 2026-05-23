import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { coachChat, hasApiKey } from '../lib/claude';
import { totalsFromEntries } from '../lib/nutrition';
import { todayISO } from '../utils/date';
import { Link } from 'react-router-dom';

const SUGGESTIONS = [
  '¿Cómo voy hoy con mis macros?',
  '¿Qué cenar para llegar a mi proteína?',
  'Dame 3 snacks ~150 kcal con proteína',
  '¿Debo bajar calorías esta semana?'
];

export default function Coach() {
  const profile = useUserStore((s) => s.profile);
  const targets = useUserStore((s) => s.computed);
  const todayEntries = useFoodStore((s) => s.entries[todayISO()] || []);
  const weights = useFoodStore((s) => s.weights);
  const latestWeight = weights.length ? [...weights].sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
  const streak = useFoodStore((s) => s.streakData);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hola${profile.name ? ` ${profile.name.split(' ')[0]}` : ''} 👋\nSoy tu coach CalCal. Puedo ayudarte con tu plan, ajustes de calorías, recetas o resolver dudas. ¿Por dónde empezamos?` }
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function buildContext() {
    const totals = totalsFromEntries(todayEntries);
    return [
      `Nombre: ${profile.name || '-'}`,
      `Edad: ${profile.age} · Sexo: ${profile.sex}`,
      `Peso: ${latestWeight?.kg ?? profile.weightKg} kg · Altura: ${profile.heightCm} cm`,
      `Objetivo: ${profile.goal}`,
      `Calorías objetivo: ${targets.calories} kcal/día`,
      `Proteína: ${targets.protein}g · Carbos: ${targets.carbs}g · Grasas: ${targets.fat}g`,
      `Hoy consumido: ${Math.round(totals.calories)} kcal (P ${Math.round(totals.protein)} · C ${Math.round(totals.carbs)} · G ${Math.round(totals.fat)})`,
      `Restricciones: ${profile.restrictions?.join(', ') || 'ninguna'}`,
      `Racha actual: ${streak.current} días (mejor ${streak.best})`
    ].join('\n');
  }

  async function send(content) {
    const userText = (content ?? text).trim();
    if (!userText) return;
    if (!hasApiKey()) {
      setMessages((m) => [...m, { role: 'user', content: userText }, { role: 'assistant', content: 'Para chatear con el coach necesitas configurar tu API key de Claude en Ajustes → Coach IA.' }]);
      setText('');
      return;
    }
    const next = [...messages, { role: 'user', content: userText }];
    setMessages(next);
    setText('');
    setLoading(true);
    try {
      const reply = await coachChat(next.map((m) => ({ role: m.role, content: m.content })), buildContext());
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Ups, no pude responder: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Coach IA" subtitle="Tu nutricionista en el bolsillo" />

      {!hasApiKey() && (
        <div className="px-5">
          <Card className="p-4 mb-3">
            <p className="text-sm">Para activar el Coach IA, añade tu API key de Claude en <Link to="/settings" className="text-brand-300 font-medium">Ajustes</Link>.</p>
          </Card>
        </div>
      )}

      <div ref={scrollRef} className="px-5 pb-32 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-3xl text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand-500 text-white rounded-br-md'
                  : 'bg-ink-700/70 border border-white/5 text-white/90 rounded-bl-md'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-ink-700/70 border border-white/5 px-4 py-3 rounded-3xl rounded-bl-md inline-flex items-center gap-2 text-sm text-white/60">
              <Loader2 size={14} className="animate-spin" /> Pensando…
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="card-soft p-3 text-left text-sm hover:border-white/15">
                <Sparkles size={14} className="inline mr-2 text-brand-300" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 px-3 pb-[max(0.5rem,var(--safe-bottom))] pt-2 bg-gradient-to-t from-ink-950 via-ink-950 to-transparent">
        <div className="max-w-md mx-auto flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Pregúntale a tu coach…"
            className="input flex-1"
          />
          <button onClick={() => send()} disabled={loading || !text.trim()} className="btn-primary px-4">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
