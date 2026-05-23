import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Sparkles } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';

export default function Login() {
  const nav = useNavigate();
  const login = useAuthStore((s) => s.login);
  const profile = useUserStore((s) => s.profile);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!email) return;
    login(email);
    nav(profile.onboarded ? '/' : '/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10 max-w-md mx-auto safe-top">
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 mb-6 rounded-3xl bg-gradient-to-br from-brand-500 to-lime flex items-center justify-center shadow-glow">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">CalCal</h1>
        <p className="text-white/60 mt-2 mb-10">Tu coach nutricional inteligente, en el bolsillo.</p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={18} />}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            leftIcon={<Lock size={18} />}
          />
          <Button fullWidth type="submit">Entrar</Button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          ¿Sin cuenta? <Link to="/register" className="text-brand-300 font-medium">Crea una</Link>
        </p>

        <p className="text-center text-xs text-white/30 mt-10">
          Modo demo: cualquier email funciona. Tus datos se guardan en el dispositivo.
        </p>
      </div>
    </div>
  );
}
