import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const configured = useAuthStore((s) => s.configured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ya logueado → al dashboard (la app decide si va a onboarding según el profile)
  if (user) return <Navigate to="/" replace />;

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth redirect: el navegador se va a Google y vuelve. No hay nada que hacer aquí.
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10 max-w-md mx-auto safe-top">
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 mb-6 rounded-3xl bg-gradient-to-br from-brand-500 to-lime flex items-center justify-center shadow-glow">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">CalCal</h1>
        <p className="text-white/60 mt-2 mb-10">Tu coach nutricional inteligente, en el bolsillo.</p>

        {!configured && !isSupabaseConfigured && (
          <div className="card p-4 mb-4 flex gap-3 items-start text-sm">
            <AlertCircle size={18} className="text-amber-400 flex-none mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Supabase no configurado</p>
              <p className="text-white/60 text-xs">
                Añade <code className="text-amber-300">VITE_SUPABASE_URL</code> y{' '}
                <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> a las variables
                de entorno y vuelve a desplegar.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="card p-3 mb-4 text-sm text-rose-300 flex items-start gap-2">
            <AlertCircle size={16} className="flex-none mt-0.5" /> {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading || !configured}
          className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white text-ink-950 font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-card"
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Redirigiendo…</>
          ) : (
            <>
              <GoogleIcon /> Entrar con Google
            </>
          )}
        </button>

        <p className="text-center text-xs text-white/40 mt-10">
          Al continuar, aceptas almacenar tu progreso de fitness en tu cuenta. Tus datos viven en tu Supabase, no en ningún tercero.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
