import { useEffect, useState } from 'react';
import { Sparkles, Trash2, Download, ShoppingCart, Target, Droplet, Save, Eye, EyeOff, Activity, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { useUserStore } from '../store/useUserStore';
import { useFoodStore } from '../store/useFoodStore';
import { useAuthStore } from '../store/useAuthStore';
import { getApiKey, setApiKey, hasApiKey } from '../lib/claude';
import { storage } from '../lib/storage';
import { GOALS, ACTIVITY } from '../lib/nutrition';
import { supabaseConfig } from '../lib/supabase';
import { runDiagnostic } from '../lib/db';
import { toast } from '../store/useToastStore';

export default function Settings() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const targets = useUserStore((s) => s.computed);
  const recomputeTargets = useUserStore((s) => s.recomputeTargets);
  const shopping = useFoodStore((s) => s.shoppingList);
  const toggleShopping = useFoodStore((s) => s.toggleShoppingItem);
  const addShopping = useFoodStore((s) => s.addShoppingItem);
  const clearShopping = useFoodStore((s) => s.clearShopping);

  const [apiKey, setKey] = useState(getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (saved) { const t = setTimeout(() => setSaved(false), 1500); return () => clearTimeout(t); } }, [saved]);

  function saveKey() {
    setApiKey(apiKey.trim());
    setSaved(true);
  }

  // Diagnóstico de Supabase
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  async function checkConnection() {
    setDiagLoading(true);
    setDiag(null);
    try {
      const r = await runDiagnostic();
      setDiag(r);
      if (r.writeOk) toast.success('Conexión OK — escritura verificada en Supabase.');
      else if (!r.configured) toast.error('Supabase no está configurado (env vars).');
      else if (!r.authOk) toast.error('Sin sesión válida. Cierra sesión y vuelve a entrar.');
      else if (r.writeError) toast.error(`Escritura falló: ${r.writeError.slice(0, 80)}`, 9000);
    } catch (e) {
      toast.error('Error ejecutando diagnóstico: ' + e.message);
    } finally {
      setDiagLoading(false);
    }
  }

  function reset() {
    if (!confirm('¿Borrar TODOS los datos locales? Esto cierra sesión y elimina tu historial.')) return;
    storage.clear();
    location.reload();
  }

  function exportData() {
    const data = {
      profile: useUserStore.getState().profile,
      food: useFoodStore.getState(),
      auth: useAuthStore.getState()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calcal-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Header title="Ajustes" back />

      <div className="px-5 space-y-4">
        {/* Diagnóstico de conexión a Supabase */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-brand-300" />
            <h2 className="font-bold">Diagnóstico</h2>
          </div>
          <p className="text-sm text-white/60 mb-3">
            Verifica si la app puede leer y escribir en Supabase. Si algo no se guarda, empieza por aquí.
          </p>

          {/* Quick status — env vars */}
          <div className="space-y-1.5 text-xs mb-3">
            <DiagRow ok={supabaseConfig.hasUrl} label="VITE_SUPABASE_URL" detail={supabaseConfig.projectRef || 'no detectada'} />
            <DiagRow ok={supabaseConfig.hasKey} label="VITE_SUPABASE_ANON_KEY" detail={supabaseConfig.hasKey ? 'configurada' : 'no detectada'} />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button onClick={checkConnection} disabled={diagLoading} fullWidth>
              {diagLoading
                ? <><Loader2 size={16} className="animate-spin" /> Comprobando…</>
                : <><Activity size={16} /> Probar conexión y escritura</>}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                if (!confirm('Esto borra el cache local (fotos, ajustes Gemini, racha…). Tus datos en Supabase se conservan y se descargarán al recargar. ¿Continuar?')) return;
                // Borra solo keys de la app, no toca la sesión Supabase
                Object.keys(localStorage).forEach((k) => {
                  if (k.startsWith('calcal:')) localStorage.removeItem(k);
                });
                toast.success('Cache liberado. Recargando…');
                setTimeout(() => location.reload(), 800);
              }}
            >
              <Trash2 size={16} /> Liberar espacio (cache local)
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={async () => {
                if (!confirm('Reinicia el Service Worker. Útil si los guardados fallan con "no-response" o errores de SW. Tus datos no se tocan.')) return;
                try {
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                  }
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                  toast.success('Service Worker reiniciado. Recargando…');
                  setTimeout(() => location.reload(), 800);
                } catch (e) {
                  toast.error('No se pudo reiniciar: ' + e.message);
                }
              }}
            >
              <RefreshCw size={16} /> Reiniciar Service Worker
            </Button>
          </div>

          {diag && (
            <div className="mt-3 space-y-1.5 text-xs">
              <DiagRow ok={diag.authOk} label="Sesión autenticada" detail={diag.userEmail || diag.authError || ''} />
              {Object.keys(diag.tablesOk).filter((k) => !k.endsWith('_error')).map((t) => (
                <DiagRow
                  key={t}
                  ok={diag.tablesOk[t]}
                  label={t}
                  detail={diag.tablesOk[t] ? 'accesible' : (diag.tablesOk[t + '_error'] || 'error')}
                />
              ))}
              <DiagRow
                ok={diag.writeOk}
                label="Escritura water_logs"
                detail={diag.writeOk ? 'OK' : (diag.writeError || 'no probada')}
              />
              <DiagRow
                ok={diag.foodEntriesWriteOk}
                label="Escritura food_entries"
                detail={diag.foodEntriesWriteOk ? 'OK' : (diag.foodEntriesWriteError || 'no probada')}
              />
              {diag.localStorageMB != null && (
                <>
                  <DiagRow
                    ok={!diag.localStorageNearLimit}
                    label="localStorage real"
                    detail={`${diag.localStorageMB}MB de ~5MB (cache caches calcal:food: ${diag.foodCacheMB}MB)`}
                  />
                  {diag.bucketUsedMB != null && (
                    <DiagRow
                      ok={true}
                      label="Bucket total (informativo)"
                      detail={`${diag.bucketUsedMB}MB de ${diag.bucketQuotaMB}MB — incluye IndexedDB, Cache API, etc.`}
                    />
                  )}
                </>
              )}
              {!supabaseConfig.hasUrl && (
                <p className="text-amber-300 text-[11px] mt-2">
                  ⚠ Falta env var en Vercel. Settings → Environment Variables → añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY y redeploy.
                </p>
              )}
              {diag.configured && !diag.authOk && (
                <p className="text-amber-300 text-[11px] mt-2">
                  ⚠ Sin sesión. Cierra sesión (Profile → Cerrar sesión) y vuelve a entrar con Google.
                </p>
              )}
              {diag.authOk && diag.writeOk && !diag.foodEntriesWriteOk && (
                <p className="text-rose-300 text-[11px] mt-2 font-semibold">
                  ⚠ water_logs funciona pero food_entries NO. La RLS de food_entries está rota.
                  Re-ejecuta el bloque RLS de schema.sql (drop policy if exists + create policy).
                </p>
              )}
              {diag.authOk && !diag.writeOk && diag.writeError && (
                <p className="text-rose-300 text-[11px] mt-2">
                  ⚠ Auth OK pero la escritura falla. Probable: RLS rota o schema incompleto. Re-ejecuta supabase/schema.sql.
                </p>
              )}
              {diag.localStorageNearLimit && (
                <p className="text-amber-300 text-[11px] mt-2">
                  ⚠ localStorage al {Math.round(100 * diag.localStorageMB / 5)}% de su cap (~5MB). Cuando se llene, los writes pueden fallar con "quota exceeded".
                  Pulsa "Liberar espacio" abajo o el botón se purgará automáticamente la próxima vez que falle.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Coach IA (Gemini) */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-brand-300" />
            <h2 className="font-bold">Coach IA</h2>
          </div>
          <p className="text-sm text-white/60 mb-3">
            Conecta Google Gemini para activar el chat del coach, el parser de texto natural,
            la generación de planes y recetas, y el análisis de fotos (IA Vision).
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-brand-300 ml-1 underline">
              Obtener API key gratis
            </a>
          </p>
          <Input
            label="API Key de Gemini"
            type={showKey ? 'text' : 'password'}
            placeholder="AIza…"
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            rightAction={
              <button type="button" onClick={() => setShowKey((v) => !v)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            hint="Plan gratuito de Google AI Studio. Modelo: gemini-2.0-flash. Una sola key cubre chat y visión."
          />
          <div className="flex items-center gap-2 mt-3">
            <Button onClick={saveKey} disabled={apiKey === getApiKey()}>
              <Save size={16} /> {saved ? 'Guardada' : 'Guardar'}
            </Button>
            <span className={`text-xs ${hasApiKey() ? 'text-emerald-400' : 'text-white/40'}`}>
              {hasApiKey() ? 'Coach + Vision activos' : 'No conectado'}
            </span>
          </div>
        </Card>

        {/* Objetivos */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-lime" />
            <h2 className="font-bold">Objetivos y plan</h2>
          </div>

          <div>
            <p className="label mb-2">Objetivo</p>
            <Segmented
              value={profile.goal}
              onChange={(v) => { setProfile({ goal: v, calorieDelta: null }); }}
              options={Object.entries(GOALS).map(([k, v]) => ({ value: k, label: v.label }))}
              className="w-full"
            />
          </div>

          <div>
            <p className="label mb-2">Actividad</p>
            <Segmented
              value={profile.activity}
              onChange={(v) => setProfile({ activity: v })}
              options={Object.entries(ACTIVITY).map(([k, v]) => ({ value: k, label: v.label }))}
              className="w-full overflow-x-auto"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Peso (kg)" type="number" step="0.1" inputMode="decimal" value={profile.weightKg} onChange={(e) => setProfile({ weightKg: parseFloat(e.target.value || '0') })} />
            <Input label="Altura (cm)" type="number" inputMode="numeric" value={profile.heightCm} onChange={(e) => setProfile({ heightCm: parseInt(e.target.value || '0') })} />
          </div>

          <div className="bg-ink-700/50 rounded-2xl p-3">
            <p className="text-xs text-white/40">Plan calculado</p>
            <p className="text-2xl font-bold">{targets.calories} kcal</p>
            <p className="text-xs text-white/60">P {targets.protein}g · C {targets.carbs}g · G {targets.fat}g</p>
          </div>

          <Button variant="ghost" onClick={recomputeTargets}>Recalcular</Button>
        </Card>

        {/* Agua */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Droplet size={18} className="text-macro-water" />
            <h2 className="font-bold">Hidratación</h2>
          </div>
          <Input
            label="Objetivo diario (ml)"
            type="number"
            inputMode="numeric"
            value={profile.waterDailyGoalMl}
            onChange={(e) => setProfile({ waterDailyGoalMl: parseInt(e.target.value || '0') })}
            hint="Recomendado: 30-35 ml por kg de peso corporal."
          />
        </Card>

        {/* Lista de compras */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-lime" />
              <h2 className="font-bold">Lista de compras</h2>
            </div>
            {shopping.length > 0 && (
              <button onClick={clearShopping} className="text-xs text-white/40 hover:text-rose-300">Vaciar</button>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addShopping(newItem.trim()); setNewItem(''); } }}
              placeholder="Añadir ítem"
              className="input"
            />
          </div>
          {shopping.length === 0 ? (
            <p className="text-xs text-white/40">Genera un plan semanal y la lista aparecerá aquí automáticamente.</p>
          ) : (
            <ul className="space-y-1.5">
              {shopping.map((it) => (
                <li key={it.id}>
                  <label className="flex items-center gap-3 cursor-pointer bg-white/3 rounded-xl px-3 py-2">
                    <input type="checkbox" checked={it.done} onChange={() => toggleShopping(it.id)} className="w-4 h-4 accent-lime" />
                    <span className={`flex-1 text-sm ${it.done ? 'line-through text-white/40' : ''}`}>{it.name}</span>
                    {it.qty > 1 && <span className="text-xs text-white/40">×{it.qty}</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Datos */}
        <Card className="p-5 space-y-2">
          <h2 className="font-bold mb-2">Datos</h2>
          <Button variant="ghost" fullWidth onClick={exportData}><Download size={16} /> Exportar datos (JSON)</Button>
          <Button variant="danger" fullWidth onClick={reset}><Trash2 size={16} /> Borrar todo</Button>
        </Card>

        <p className="text-center text-[11px] text-white/30 pt-1">
          Tus datos se guardan localmente. Para sincronizar entre dispositivos conecta Supabase o Firebase.
        </p>
      </div>
    </div>
  );
}

function DiagRow({ ok, label, detail }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3">
      {ok
        ? <CheckCircle2 size={14} className="text-emerald-400 flex-none" />
        : <XCircle size={14} className="text-rose-400 flex-none" />}
      <span className="font-mono text-white/80 flex-none">{label}</span>
      <span className="text-white/45 truncate">{detail}</span>
    </div>
  );
}
