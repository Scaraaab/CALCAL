import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';

export default function Register() {
  const nav = useNavigate();
  const register = useAuthStore((s) => s.register);
  const setProfile = useUserStore((s) => s.setProfile);
  const [form, setForm] = useState({ name: '', email: '', pwd: '' });

  function submit(e) {
    e.preventDefault();
    if (!form.email) return;
    register(form.email);
    setProfile({ name: form.name });
    nav('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10 max-w-md mx-auto safe-top">
      <h1 className="text-3xl font-bold mb-2">Crea tu cuenta</h1>
      <p className="text-white/60 mb-8">En 2 minutos tendrás tu plan personalizado.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nombre" placeholder="¿Cómo te llamamos?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} leftIcon={<User size={18} />} />
        <Input label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} leftIcon={<Mail size={18} />} required />
        <Input label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={form.pwd} onChange={(e) => setForm({ ...form, pwd: e.target.value })} leftIcon={<Lock size={18} />} />
        <Button fullWidth type="submit">Crear cuenta</Button>
      </form>
      <p className="text-center text-sm text-white/50 mt-6">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand-300 font-medium">Entra</Link>
      </p>
    </div>
  );
}
