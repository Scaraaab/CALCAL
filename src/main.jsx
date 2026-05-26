import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

registerSW({ immediate: true });

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
