import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { listGeminiModels } from './lib/claude';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Debug: lista los modelos disponibles con la API key actual.
// Si no hay key, no hace nada. La salida queda en consola y en window.__geminiModels.
// Se ejecuta después del primer paint para no bloquear el render inicial.
if (typeof window !== 'undefined') {
  window.requestIdleCallback?.(() => listGeminiModels()) ?? setTimeout(() => listGeminiModels(), 1500);
}
