import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { useUserStore } from '../store/useUserStore';
import { ACTIVITY, GOALS, EXPERIENCE, targetMacros, recommendedPace } from '../lib/nutrition';
import { fmtKg } from '../utils/format';

const RESTRICTIONS = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Keto', 'Pescetariano'];

export default function Onboarding() {
  const nav = useNavigate();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '', sex: 'male', age: 28, heightCm: 175, weightKg: 75,
    activity: 'moderate', goal: 'maintain', experience: 'intermediate',
    mealsPerDay: 4, restrictions: []
  });

  const steps = [
    { title: '¿Cómo te llamamos?', render: <StepName data={data} setData={setData} /> },
    { title: 'Sobre ti',            render: <StepBasics data={data} setData={setData} /> },
    { title: 'Tu cuerpo',           render: <StepBody data={data} setData={setData} /> },
    { title: '¿Qué tan activo eres?', render: <StepActivity data={data} setData={setData} /> },
    { title: 'Tu objetivo',         render: <StepGoal data={data} setData={setData} /> },
    { title: 'Experiencia en gym',  render: <StepExp data={data} setData={setData} /> },
    { title: 'Restricciones',       render: <StepRestrictions data={data} setData={setData} /> },
    { title: 'Tu plan personalizado', render: <StepSummary data={data} /> }
  ];

  const total = steps.length;
  const isLast = step === total - 1;
  const canNext = validate(step, data);

  function finish() {
    completeOnboarding(data);
    nav('/');
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 pb-10 flex flex-col pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-white/8'}`} />
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Paso {step + 1} de {total}</p>
      <h2 className="text-3xl font-extrabold tracking-tight mb-6">{steps[step].title}</h2>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {steps[step].render}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 pt-6">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={18} />
          </Button>
        )}
        {isLast ? (
          <Button variant="lime" fullWidth onClick={finish}>
            <Sparkles size={18} /> Empezar
          </Button>
        ) : (
          <Button fullWidth disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continuar <ChevronRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}

function validate(step, d) {
  if (step === 0) return d.name.trim().length > 0;
  if (step === 1) return d.age > 10 && d.age < 100;
  if (step === 2) return d.weightKg > 30 && d.heightCm > 100;
  return true;
}

function StepName({ data, setData }) {
  return (
    <Input
      label="Nombre"
      placeholder="Tu nombre"
      value={data.name}
      onChange={(e) => setData({ ...data, name: e.target.value })}
      autoFocus
    />
  );
}

function StepBasics({ data, setData }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="label mb-2">Sexo biológico</p>
        <Segmented
          value={data.sex}
          onChange={(v) => setData({ ...data, sex: v })}
          options={[{ value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }]}
          className="w-full"
        />
      </div>
      <Input
        label="Edad"
        type="number"
        inputMode="numeric"
        value={data.age}
        onChange={(e) => setData({ ...data, age: parseInt(e.target.value || '0') })}
      />
    </div>
  );
}

function StepBody({ data, setData }) {
  return (
    <div className="space-y-4">
      <Input label="Altura (cm)" type="number" inputMode="numeric" value={data.heightCm} onChange={(e) => setData({ ...data, heightCm: parseInt(e.target.value || '0') })} />
      <Input label="Peso actual (kg)" type="number" inputMode="decimal" step="0.1" value={data.weightKg} onChange={(e) => setData({ ...data, weightKg: parseFloat(e.target.value || '0') })} />
    </div>
  );
}

function StepActivity({ data, setData }) {
  return (
    <div className="space-y-2">
      {Object.entries(ACTIVITY).map(([key, opt]) => (
        <button
          key={key}
          type="button"
          onClick={() => setData({ ...data, activity: key })}
          className={`w-full text-left card p-4 transition border ${
            data.activity === key ? 'border-brand-500/60 ring-1 ring-brand-500/40' : 'border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{opt.label}</p>
              <p className="text-xs text-white/50">{opt.desc}</p>
            </div>
            {data.activity === key && <Check size={18} className="text-brand-400" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function StepGoal({ data, setData }) {
  return (
    <div className="space-y-2">
      {Object.entries(GOALS).map(([key, opt]) => (
        <button
          key={key}
          type="button"
          onClick={() => setData({ ...data, goal: key })}
          className={`w-full text-left card p-4 transition border ${
            data.goal === key ? 'border-brand-500/60 ring-1 ring-brand-500/40' : 'border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{opt.label}</p>
              <p className="text-xs text-white/50">{opt.paceLabel}</p>
            </div>
            {data.goal === key && <Check size={18} className="text-brand-400" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function StepExp({ data, setData }) {
  return (
    <div className="space-y-3">
      <Segmented
        value={data.experience}
        onChange={(v) => setData({ ...data, experience: v })}
        options={Object.entries(EXPERIENCE).map(([k, v]) => ({ value: k, label: v.label }))}
        className="w-full"
      />
      <div>
        <p className="label mb-2">Comidas por día</p>
        <Segmented
          value={String(data.mealsPerDay)}
          onChange={(v) => setData({ ...data, mealsPerDay: parseInt(v) })}
          options={[3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}` }))}
          className="w-full"
        />
      </div>
    </div>
  );
}

function StepRestrictions({ data, setData }) {
  function toggle(r) {
    const has = data.restrictions.includes(r);
    setData({ ...data, restrictions: has ? data.restrictions.filter((x) => x !== r) : [...data.restrictions, r] });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {RESTRICTIONS.map((r) => {
        const active = data.restrictions.includes(r);
        return (
          <button
            key={r}
            type="button"
            onClick={() => toggle(r)}
            className={`chip ${active ? '!bg-brand-500/20 !border-brand-500/40 !text-white' : ''}`}
          >
            {active && <Check size={14} />} {r}
          </button>
        );
      })}
      <p className="text-xs text-white/40 pt-3 w-full">Puedes cambiarlas luego en Ajustes.</p>
    </div>
  );
}

function StepSummary({ data }) {
  const targets = targetMacros(data);
  const pace = recommendedPace(data);
  return (
    <div className="space-y-4">
      <p className="text-white/70">Esto es lo que recomendamos para ti, <span className="text-white font-semibold">{data.name}</span>:</p>
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider text-white/40">Calorías diarias</p>
        <p className="text-5xl font-extrabold tracking-tight my-1 bg-gradient-to-r from-brand-300 to-lime bg-clip-text text-transparent">
          {targets.calories}
        </p>
        <p className="text-xs text-white/50">{pace.label}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Proteína" value={`${targets.protein}g`} color="text-macro-protein" />
        <Stat label="Carbos"   value={`${targets.carbs}g`}   color="text-macro-carbs"   />
        <Stat label="Grasas"   value={`${targets.fat}g`}     color="text-macro-fat"     />
      </div>
      <p className="text-xs text-white/40 px-1">Velocidad recomendada: <span className="text-white/70">{pace.kgPerWeek > 0 ? '+' : ''}{pace.kgPerWeek.toFixed(2)} kg/semana</span></p>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
