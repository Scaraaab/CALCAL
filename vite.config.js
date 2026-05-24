import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Marcador de versión inyectado en build time. Útil para saber al instante
// qué deployment está corriendo en cada URL — F12 → Console → __calcalBuild
const BUILD_INFO = JSON.stringify({
  date: new Date().toISOString(),
  // Vercel inyecta estas env vars en cada build
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  branch: process.env.VERCEL_GIT_COMMIT_REF || 'dev'
});

export default defineConfig({
  define: {
    __CALCAL_BUILD__: BUILD_INFO
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'CalCal · Smart Macro Coach',
        short_name: 'CalCal',
        description: 'Contador inteligente de calorías y macros con coach IA',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],

        // Limpia cachés de versiones previas del SW al activar uno nuevo.
        cleanupOutdatedCaches: true,

        // Activa el SW nuevo inmediatamente sin esperar al cierre de pestañas.
        // Esto + registerType:'autoUpdate' garantiza que los users reciben los
        // cambios al recargar.
        skipWaiting: true,
        clientsClaim: true,

        // SPA fallback: cualquier navegación que no resuelva la red recibe
        // index.html del precache. Sin esto, rutas como /ingredients dan
        // "no-response" cuando Vercel está lento o el browser está offline.
        navigateFallback: '/index.html',
        // Pero NO aplica el fallback a llamadas API ni a recursos con extensión.
        navigateFallbackDenylist: [
          /^\/api\//,
          /\.[^/]+$/  // cualquier path con extensión: /assets/x.js, /sw.js, etc.
        ],

        runtimeCaching: [
          // ─── 1. Supabase: NUNCA cachear ni interceptar ───
          // Auth tokens, datos en vivo, RLS — todo tiene que ir directo a red.
          // El SW se queda al margen completamente.
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i,
            handler: 'NetworkOnly',
            method: 'GET'
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i,
            handler: 'NetworkOnly',
            method: 'POST'
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i,
            handler: 'NetworkOnly',
            method: 'PATCH'
          },
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i,
            handler: 'NetworkOnly',
            method: 'DELETE'
          },

          // ─── 2. Gemini: NUNCA cachear ───
          // Respuestas no determinísticas + key sensible en la URL.
          {
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly'
          },

          // ─── 3. Resto del propio origen: NetworkFirst con cache offline ───
          // App shell, JS/CSS dinámicos, etc. La regla más laxa al final.
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:    ['react', 'react-dom', 'react-router-dom'],
          charts:    ['recharts'],
          animation: ['framer-motion'],
          icons:     ['lucide-react'],
          supabase:  ['@supabase/supabase-js']
        }
      }
    }
  }
});
