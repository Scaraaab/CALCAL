# CalCal · Smart Macro Coach

PWA premium en React para contar calorías y macros, con coach nutricional IA (Claude). Inspirada en MacroFactor, Fitia y Apple Fitness, con UX hiper-rápida para el uso diario.

![calcal](public/icons/icon.svg)

## ✨ Funciones

- **Registro ultra-rápido** de comidas (texto natural, búsqueda, favoritos, frecuentes, voz, copiar día).
- **Dashboard diario** con calorías restantes, macros (proteína / carbos / grasas), agua, peso y racha.
- **Lenguaje natural**: "2 huevos con avena y leche" → entradas con macros estimados (parser local + Claude opcional).
- **Coach IA** (Claude) personalizado con tu contexto: peso, objetivo, consumo de hoy, racha.
- **Auto-ajuste de calorías** estilo MacroFactor: compara tu progreso real vs. esperado cada 7-14 días.
- **Gráficas** de peso, calorías y heatmap de adherencia.
- **Meal planner** semanal con generación IA + lista de compras automática.
- **Recetas** personalizadas optimizadas para tus macros.
- **Objetivos**: perder grasa / mantener / ganar músculo, con ajuste de velocidad.
- **Onboarding** de 8 pasos que calcula tu plan automáticamente.
- **Modo oscuro premium**, animaciones suaves, skeleton loaders, empty states.
- **PWA completa**: manifest, service worker, instalable, funciona offline.

## 🧱 Stack

| Capa | Herramienta |
|---|---|
| UI | React 18 + Tailwind CSS 3 + Framer Motion |
| Estado | Zustand (con persistencia en localStorage) |
| Routing | React Router v6 |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Build | Vite 5 |
| PWA | vite-plugin-pwa + Workbox |
| IA | Claude API (Anthropic) – modelo `claude-sonnet-4-5` |

## 📂 Estructura

```
calcal/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── icons/ (icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png)
├── scripts/gen-icons.mjs        # regenera PNGs desde el SVG
├── src/
│   ├── main.jsx                  # entry + registro SW
│   ├── App.jsx                   # rutas + guards (auth / onboarding)
│   ├── index.css                 # Tailwind + utilidades premium
│   ├── components/
│   │   ├── layout/ (Layout, Header, BottomNav)
│   │   ├── ui/     (Card, Button, Input, Progress, Sheet, Skeleton, EmptyState, Segmented)
│   │   ├── dashboard/ (CalorieRing, MacroBars, WaterTracker, WeightCard, StreakCard)
│   │   ├── food/      (NaturalInput, FoodSearch, QuickFoods, MealList)
│   │   └── charts/    (WeightChart, CaloriesChart, AdherenceChart)
│   ├── pages/      (Login, Register, Onboarding, Dashboard, LogFood, History,
│   │                Progress, MealPlanner, Recipes, Coach, Profile, Settings)
│   ├── store/      (useAuthStore, useUserStore, useFoodStore)
│   ├── lib/        (nutrition, parseFood, foodDB, claude, storage)
│   └── utils/      (date, format)
├── index.html
├── vite.config.js     # PWA + chunking + Workbox
├── tailwind.config.js # paleta dark premium + macros
├── vercel.json        # SPA rewrites + headers SW/manifest
└── .env.example
```

## 🚀 Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173
```

Build:

```bash
npm run build
npm run preview      # sirve dist/ con headers correctos
```

Regenerar iconos (solo si cambias `public/icons/icon.svg`):

```bash
npm i -D sharp
node scripts/gen-icons.mjs
```

## 🔑 Conectar Claude (Coach IA)

Tienes 2 formas:

**A) Desde la app** *(rápido para probar)*
1. Inicia sesión y entra a **Ajustes → Coach IA**.
2. Pega tu key (`sk-ant-…`) de [console.anthropic.com](https://console.anthropic.com/).
3. Listo: chat, parsing IA, planes y recetas activos.

> Esta opción usa `anthropic-dangerous-direct-browser-access` y expone la key en el cliente. Útil para uso personal, **no recomendado para producción multiusuario**.

**B) Variable de entorno** *(producción)*
- Añade `VITE_ANTHROPIC_API_KEY` en Vercel (o `.env.local` en dev).
- Para producción real, mueve la llamada a `/api/claude` (serverless function) usando la key como **secret**.

## ☁️ Subir la app a Vercel — paso a paso

### Opción 1: Desde GitHub (recomendado)

1. **Crea un repo nuevo en GitHub** (privado o público).
2. En tu terminal, dentro de la carpeta `CALCAL`:
   ```bash
   git init
   git add .
   git commit -m "feat: CalCal v1"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/calcal.git
   git push -u origin main
   ```
3. Entra a **[vercel.com](https://vercel.com)** y haz login (con GitHub).
4. Pulsa **"Add New… → Project"** y selecciona el repo `calcal`.
5. Vercel detectará Vite automáticamente. Confirma los valores:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. *(Opcional)* Despliega **Environment Variables**:
   - `VITE_ANTHROPIC_API_KEY` = tu key de Claude
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` si conectas Supabase
7. Pulsa **"Deploy"**. En ~30s tendrás una URL `https://calcal-xxxx.vercel.app`.
8. *(Opcional)* En **Settings → Domains** añade tu dominio (`calcal.tudominio.com`). Vercel emite SSL automático.

A partir de aquí, **cada push a `main` redeploya** automáticamente.

### Opción 2: Vercel CLI (sin GitHub)

```bash
npm i -g vercel
vercel login
cd CALCAL
vercel        # primer deploy (preview)
vercel --prod # promueve a producción
```

Vercel hará las preguntas necesarias y subirá la app directamente.

### Verifica que la PWA quedó bien

Después del deploy, abre tu URL en Chrome móvil:
1. Menú → **"Instalar app"** debe aparecer.
2. En DevTools → **Application → Manifest** debes ver:
   - `name: CalCal · Smart Macro Coach`
   - `theme_color: #0a0a0f`
   - Iconos 192/512 + SVG cargando OK.
3. **Application → Service Workers** debe mostrar uno activo (Workbox).
4. **Lighthouse → PWA** debe dar verde en todos los puntos críticos.

## 🔌 Próximos enchufes (placeholders ya preparados)

- **Supabase / Firebase**: el store está aislado en `useFoodStore`. Sustituye el middleware `persist` por hooks de DB.
- **Backend para Claude**: crea `api/coach.js` en Vercel y mueve la llamada en `src/lib/claude.js`.
- **Códigos de barras**: integra `@zxing/library` en `LogFood.jsx` (botón en la pestaña Buscar).
- **Sync salud (Apple Health / Health Connect)**: requiere wrapping nativo (Capacitor).

## 🧪 Trucos para probar rápido

- Email/contraseña en `/login`: cualquier cosa funciona (modo demo local).
- Acelera el onboarding pulsando "Continuar" — los valores por defecto ya tienen sentido.
- Prueba el parser sin IA: escribe `2 huevos con avena y un vaso de leche`.
- En **Ajustes → Datos**, exporta JSON para hacer backup; **Borrar todo** te devuelve a estado limpio.

## 📄 Licencia

MIT — úsalo, modifícalo, monétizalo. Da crédito si quieres ❤️.
