import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// ─────────────────────────────────────────────────────────────
//  SERVICE WORKER — REGISTRO + AUTO-UPDATE AGRESIVO
//
//  iOS PWAs standalone son notorias por NUNCA actualizar el SW por sí solas.
//  Hacemos varias cosas:
//
//  1. registerSW({ immediate: true }) — en cuanto hay un SW nuevo waiting,
//     llama skipWaiting automáticamente.
//
//  2. controllerchange listener — cuando el SW nuevo toma control de la
//     página, recargamos automáticamente para que use los assets nuevos.
//
//  3. Force-unregister legacy — si detectamos que el SW activo tiene
//     reglas viejas (las que rompían en iOS), forzamos unregister + reload.
//     Esto está marcado por una key en localStorage; se ejecuta UNA VEZ.
//
//  4. Update check al focus — cada vez que la pestaña vuelve a estar visible,
//     pedimos al browser que verifique si hay un SW nuevo. Workaround para
//     el bug de iOS donde el SW nunca se chequea solo.
// ─────────────────────────────────────────────────────────────
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // El nuevo SW está esperando. immediate:true ya llama skipWaiting,
    // pero por si acaso lo forzamos.
    updateSW(true);
  }
});

if ('serviceWorker' in navigator) {
  // Cuando el SW nuevo toma control, recarga para usar assets frescos.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    console.log('[CalCal:sw] controllerchange → reload');
    window.location.reload();
  });

  // Self-destruct del SW legacy con reglas para Supabase. Si esta versión
  // del bundle se ejecuta (commit 2a2ffe7+) y nunca hicimos la limpieza,
  // forzamos unregister para que el browser baje el SW limpio.
  const LEGACY_FLAG = 'calcal:sw_clean_v2';
  if (!localStorage.getItem(LEGACY_FLAG)) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length === 0) {
        localStorage.setItem(LEGACY_FLAG, '1');
        return;
      }
      // Detectamos si hay SW activo. Forzamos un update check.
      Promise.all(regs.map((r) => r.update())).then(() => {
        localStorage.setItem(LEGACY_FLAG, '1');
        console.log('[CalCal:sw] forced update check completed');
      }).catch(() => {});
    });
  }

  // Al volver a foreground (típico en PWA iOS), reverificar updates.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update().catch(() => {});
    });
  });
}

// Marca de versión visible en consola y en window. Para verificar qué deployment
// está corriendo en cada URL — útil cuando hay varias URLs de Vercel apuntando
// a commits distintos. Abre DevTools → Console y mira el primer log al cargar.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-undef
  const info = typeof __CALCAL_BUILD__ !== 'undefined' ? __CALCAL_BUILD__ : { date: 'unknown', commit: 'unknown', branch: 'unknown' };
  window.__calcalBuild = info;
  console.log(
    `%c CalCal %c build ${info.commit} %c ${info.branch} %c ${info.date}`,
    'background:#7c5cff;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:bold',
    'background:#c8ff3d;color:#0a0a13;padding:2px 6px;font-weight:bold',
    'background:#222234;color:#fff;padding:2px 6px',
    'color:#888;padding:2px 6px'
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
