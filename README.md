# CalCal · Smart Macro Coach

PWA premium en React para contar calorías y macros, con coach nutricional IA (Gemini) y sincronización en la nube (Supabase + Google OAuth). Inspirada en MacroFactor, Fitia y Apple Fitness, con UX hiper-rápida para el uso diario.

## ✨ Funciones

- **Login con Google** vía Supabase Auth. Sesión persistente, multidispositivo.
- **Sync automático en la nube**: cada entrada, peso, ingrediente y comida se guarda al instante en Supabase. Cache local Zustand para offline + arranque instantáneo.
- **Onboarding inteligente**: si entras por primera vez con tu Gmail, te llevamos por las 8 preguntas. Si ya tienes cuenta, directo al dashboard con tus datos.
- **Registro ultra-rápido**: texto natural, foto con IA Vision, búsqueda, favoritos, frecuentes, voz, copiar día completo.
- **Mis ingredientes**: base de datos personal (por 100g / por porción / por unidad).
- **Mis comidas compuestas**: combina ingredientes en una comida con foto. Tap para añadir al día.
- **Lenguaje natural**: "2 huevos con avena y leche" → entradas con macros estimados (parser local + Gemini de fallback).
- **Foto IA**: subes una foto y Gemini identifica ingredientes + estima macros automáticamente.
- **Coach IA** (Gemini 1.5 Flash) personalizado con tu contexto: peso, objetivo, consumo de hoy, racha.
- **Auto-ajuste de calorías** estilo MacroFactor: compara tu progreso real vs. esperado cada 7-14 días.
- **Gráficas** de peso, calorías y heatmap de adherencia.
- **Meal planner** semanal con generación IA + lista de compras automática.
- **Recetas** personalizadas optimizadas para tus macros.
- **PWA completa**: instalable, manifest, service worker, funciona offline.

## 🧱 Stack

| Capa | Herramienta |
|---|---|
| UI | React 18 + Tailwind CSS 3 + Framer Motion |
| Estado | Zustand 4.4 (con persistencia en localStorage para cache offline) |
| Auth + DB | Supabase (Google OAuth, Postgres con RLS) |
| Routing | React Router v6 |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Build | Vite 5 |
| PWA | vite-plugin-pwa + Workbox |
| IA | Google Gemini 1.5 Flash (texto + visión) |

## 🚀 Setup local

```bash
npm install
cp .env.example .env.local
# rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (y opcionalmente VITE_GEMINI_API_KEY)
npm run dev          # http://localhost:5173
```

Build:

```bash
npm run build
npm run preview      # sirve dist/ con headers correctos
```

## ☁️ Configurar Supabase paso a paso

### 1. Crear proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. **New Project** → elige nombre, contraseña de DB (guárdala) y región (cerca de tus usuarios).
3. Espera ~2 min a que provisione.

### 2. Crear las tablas y políticas RLS

1. Abre **SQL Editor** en el sidebar izquierdo.
2. **New query** → pega TODO el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. Crea 6 tablas (`profiles`, `food_entries`, `weights`, `water_logs`, `custom_ingredients`, `custom_meals`) y las policies de Row Level Security para que cada usuario solo vea sus datos.

### 3. Activar Google OAuth

#### 3a. En Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto nuevo (o reutiliza uno existente).
3. **APIs & Services → OAuth consent screen** → tipo **External** → rellena nombre de app, email de soporte, dominio. Guarda.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://TU-APP.vercel.app` (tu URL de producción)
   - Authorized redirect URIs:
     - `https://TU-PROJ.supabase.co/auth/v1/callback` (lo encuentras en Supabase → Auth → Providers → Google → "Callback URL (for OAuth)")
5. **Create**. Guarda el **Client ID** y el **Client Secret**.

#### 3b. En Supabase

1. **Authentication → Providers → Google** → toggle ON.
2. Pega el **Client ID** y **Client Secret** de Google.
3. **Save**.

#### 3c. Site URL y redirects en Supabase

1. **Authentication → URL Configuration**.
2. **Site URL**: `https://TU-APP.vercel.app` (la URL principal).
3. **Redirect URLs** (uno por línea):
   - `http://localhost:5173/**`
   - `https://TU-APP.vercel.app/**`

### 4. Copiar las credenciales

1. **Project Settings → API**.
2. Copia la **Project URL** → va en `VITE_SUPABASE_URL`.
3. Copia la **anon public** key → va en `VITE_SUPABASE_ANON_KEY`.

### 5. (Opcional) Gemini para IA

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**.
2. La key (`AIza…`) la pegas dentro de la app: **Profile → Ajustes → Coach IA → Guardar**, o como variable de entorno `VITE_GEMINI_API_KEY`.

## ☁️ Deploy a Vercel

### Opción 1: GitHub (recomendado)

1. `git init && git add . && git commit -m "feat: CalCal v1" && git branch -M main`
2. Crea repo en GitHub → `git remote add origin <url> && git push -u origin main`
3. En [vercel.com](https://vercel.com): **Add New → Project** → selecciona el repo.
4. Vercel detecta Vite. Confirma:
   - Framework: **Vite**
   - Build: `npm run build`
   - Output: `dist`
5. **Environment Variables**: pega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_GEMINI_API_KEY`.
6. **Deploy** → URL lista en ~30s.
7. Vuelve a Google Cloud Console y añade la URL real a "Authorized JavaScript origins" y a "Authorized redirect URIs" si no la tenías exacta.
8. Vuelve a Supabase **URL Configuration** y añade la URL a Site URL + Redirect URLs.

### Opción 2: CLI

```bash
npm i -g vercel
vercel login
vercel              # preview deploy
vercel --prod       # producción
```

## 📦 Modelo de datos en Supabase

| Tabla | Contenido | PK |
|---|---|---|
| `profiles` | Perfil + objetivos del usuario | `user_id` |
| `food_entries` | Cada comida registrada (1 fila = 1 alimento) | `id` (uuid generado en cliente) |
| `weights` | Pesajes diarios | `(user_id, date)` |
| `water_logs` | Agua consumida por día | `(user_id, date)` |
| `custom_ingredients` | Ingredientes personalizados del usuario | `id` |
| `custom_meals` | Comidas compuestas (con items JSONB y totals) | `id` |

Todas las tablas tienen **RLS habilitado** con policies `auth.uid() = user_id`. Imposible que un usuario vea o modifique datos de otro.

**Datos locales (no sincronizados)**: favoritos, racha, planner, recetas, lista de compras. Se quedan en localStorage. Si quieres sincronizarlos, añade tablas equivalentes y mapeos en `src/lib/db.js`.

## 📂 Estructura

```
calcal/
├── supabase/schema.sql          # SQL para crear todas las tablas + RLS
├── public/                      # iconos, favicon, robots
├── scripts/gen-icons.mjs        # regenera PNGs desde el SVG
├── src/
│   ├── main.jsx                 # entry + SW
│   ├── App.jsx                  # rutas + listener Supabase + hydrate
│   ├── components/
│   │   ├── layout/ (Layout, Header, BottomNav)
│   │   ├── ui/     (Card, Button, Input, Progress, Sheet, Skeleton, EmptyState, Segmented)
│   │   ├── dashboard/ (CalorieRing, MacroBars, WaterTracker, WeightCard, StreakCard)
│   │   ├── food/      (NaturalInput, PhotoLog, FoodSearch, QuickFoods, MealList, SavedMealsRow)
│   │   └── charts/    (WeightChart, CaloriesChart, AdherenceChart)
│   ├── pages/   (Login, Onboarding, Dashboard, LogFood, History,
│   │             Progress, MealPlanner, Recipes, Coach, Profile, Settings,
│   │             Ingredients, Meals, MealBuilder)
│   ├── store/   (useAuthStore, useUserStore, useFoodStore)
│   ├── lib/     (supabase, db, claude (Gemini), gemini (shim), nutrition,
│   │             parseFood, foodDB, image, storage)
│   └── utils/   (date, format)
├── index.html
├── vite.config.js        # PWA + chunking + Workbox
├── tailwind.config.js
├── vercel.json           # SPA rewrites + headers SW
└── .env.example
```

## 🔁 Sync: cómo funciona

Patrón **write-through con cache local**:

1. **Login con Google** → Supabase devuelve sesión y user → `App.jsx` ejecuta `hydrateAll()` que trae todas las tablas y reemplaza los stores Zustand.
2. **Cualquier mutación** (registrar comida, cambiar peso, crear ingrediente…) actualiza local y, en paralelo, hace `upsert` o `delete` contra Supabase. Es fire-and-forget: si la red falla, lo verás en consola pero la app sigue.
3. **Logout** → limpia stores locales + cierra sesión en Supabase.
4. **Recarga** → Supabase cliente restaura la sesión desde su propio storage. App ejecuta el listener `INITIAL_SESSION` → hydrate → render.

**Sin Realtime**: si abres en dos dispositivos a la vez, refresca para ver los últimos cambios del otro. Habilitar Realtime subscriptions sería un cambio de ~40 líneas en `App.jsx` (no implementado).

## 🛠️ Próximos enchufes

- **Realtime sync** entre dispositivos: subscribirse a cambios de `food_entries`, `weights`, etc. con `supabase.channel(...)`.
- **Almacenar fotos en Supabase Storage** en vez de base64 en localStorage (deja de pesar contra la cuota de 5 MB).
- **Backend serverless para Gemini**: mover la llamada a `/api/coach.js` en Vercel para no exponer la key en el cliente.
- **Códigos de barras**: integrar `@zxing/library` en `LogFood.jsx`.

## 📄 Licencia

MIT — úsalo, modifícalo, monétizalo.
