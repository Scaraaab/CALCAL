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

        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // SPA fallback: cualquier navegación (incluidas las que tienen query string
        // tipo /history?date=2026-05-23) recibe index.html del precache. React
        // Router toma el control desde ahí.
        //
        // CRÍTICO: NO hay regla catch-all NetworkFirst para same-origin. Esa regla
        // intentaba cachear cada URL con su query string, fallaba al buscar
        // "/history?date=..." en cache, y devolvía no-response. Sin esa regla,
        // las navegaciones caen al navigateFallback (que sí encuentra index.html
        // en el precache) y los assets estáticos (hashed) los sirve el precache
        // directamente.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /\.[^/]+$/  // paths con extensión: /assets/x.js, /sw.js, etc. — esos van a red/precache directamente
        ],

        runtimeCaching: [
          // Supabase: jamás cachear (auth + datos en vivo + RLS).
          // Métodos explícitos porque por defecto Workbox solo gestiona GET.
          { urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i, handler: 'NetworkOnly', method: 'GET' },
          { urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i, handler: 'NetworkOnly', method: 'POST' },
          { urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i, handler: 'NetworkOnly', method: 'PATCH' },
          { urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/.*/i, handler: 'NetworkOnly', method: 'DELETE' },

          // Gemini: jamás cachear.
          { urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i, handler: 'NetworkOnly' }

          // No hay regla genérica para same-origin a propósito:
          //  - Los assets estáticos (JS/CSS con hash) están en el precache.
          //  - Las navegaciones (URLs sin extensión, p.ej. /history?date=...) van
          //    al navigateFallback → sirve index.html → React Router enruta.
          //  - sw.js y manifest.webmanifest tienen sus propias headers en vercel.json.
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
