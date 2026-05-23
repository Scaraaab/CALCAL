-- ============================================================
--  CalCal — Schema completo + RLS policies
--  Ejecutar de una vez en el SQL Editor de Supabase.
--  Idempotente: puedes correrlo varias veces sin romper nada.
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id              uuid primary key references auth.users on delete cascade,
  name                 text,
  age                  int,
  sex                  text,
  height_cm            int,
  weight_kg            numeric,
  start_weight_kg      numeric,
  activity             text,
  goal                 text,
  experience           text,
  meals_per_day        int,
  restrictions         text[] default '{}',
  calorie_delta        numeric,
  water_daily_goal_ml  int default 2500,
  onboarded            boolean not null default false,
  updated_at           timestamptz not null default now()
);

-- ---------- food_entries ----------
create table if not exists public.food_entries (
  id              uuid primary key,
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  meal            text,
  name            text,
  qty             numeric default 0,
  unit            text,
  kcal            numeric default 0,
  protein         numeric default 0,
  carbs           numeric default 0,
  fat             numeric default 0,
  fiber           numeric default 0,
  photo           text,
  source          text,
  meal_id         uuid,
  ingredient_id   uuid,
  created_at      timestamptz not null default now()
);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, date);

-- ---------- weights ----------
create table if not exists public.weights (
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  kg       numeric not null,
  primary key (user_id, date)
);

-- ---------- water_logs ----------
create table if not exists public.water_logs (
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  ml       int not null default 0,
  primary key (user_id, date)
);

-- ---------- custom_ingredients ----------
create table if not exists public.custom_ingredients (
  id             uuid primary key,
  user_id        uuid not null references auth.users on delete cascade,
  name           text not null,
  measure_type   text not null check (measure_type in ('per100g','serving','unit')),
  base_qty       numeric,
  serving_label  text,
  kcal           numeric default 0,
  protein        numeric default 0,
  carbs          numeric default 0,
  fat            numeric default 0,
  fiber          numeric default 0,
  created_at     timestamptz not null default now()
);
create index if not exists custom_ingredients_user_idx on public.custom_ingredients (user_id);

-- ---------- custom_meals ----------
create table if not exists public.custom_meals (
  id          uuid primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  photo       text,
  items       jsonb not null default '[]'::jsonb,
  totals      jsonb not null default '{}'::jsonb,
  use_count   int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists custom_meals_user_idx on public.custom_meals (user_id);

-- ============================================================
--  Row Level Security
--  Cada usuario solo ve y modifica sus propias filas.
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.food_entries        enable row level security;
alter table public.weights             enable row level security;
alter table public.water_logs          enable row level security;
alter table public.custom_ingredients  enable row level security;
alter table public.custom_meals        enable row level security;

-- Helper: macro para crear las 4 policies de una tabla (select/insert/update/delete) de tirón.
-- Postgres no tiene macros, así que las repetimos.

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- food_entries
drop policy if exists "fe_select_own" on public.food_entries;
drop policy if exists "fe_insert_own" on public.food_entries;
drop policy if exists "fe_update_own" on public.food_entries;
drop policy if exists "fe_delete_own" on public.food_entries;
create policy "fe_select_own" on public.food_entries for select using (auth.uid() = user_id);
create policy "fe_insert_own" on public.food_entries for insert with check (auth.uid() = user_id);
create policy "fe_update_own" on public.food_entries for update using (auth.uid() = user_id);
create policy "fe_delete_own" on public.food_entries for delete using (auth.uid() = user_id);

-- weights
drop policy if exists "w_select_own" on public.weights;
drop policy if exists "w_insert_own" on public.weights;
drop policy if exists "w_update_own" on public.weights;
drop policy if exists "w_delete_own" on public.weights;
create policy "w_select_own" on public.weights for select using (auth.uid() = user_id);
create policy "w_insert_own" on public.weights for insert with check (auth.uid() = user_id);
create policy "w_update_own" on public.weights for update using (auth.uid() = user_id);
create policy "w_delete_own" on public.weights for delete using (auth.uid() = user_id);

-- water_logs
drop policy if exists "wl_select_own" on public.water_logs;
drop policy if exists "wl_insert_own" on public.water_logs;
drop policy if exists "wl_update_own" on public.water_logs;
drop policy if exists "wl_delete_own" on public.water_logs;
create policy "wl_select_own" on public.water_logs for select using (auth.uid() = user_id);
create policy "wl_insert_own" on public.water_logs for insert with check (auth.uid() = user_id);
create policy "wl_update_own" on public.water_logs for update using (auth.uid() = user_id);
create policy "wl_delete_own" on public.water_logs for delete using (auth.uid() = user_id);

-- custom_ingredients
drop policy if exists "ci_select_own" on public.custom_ingredients;
drop policy if exists "ci_insert_own" on public.custom_ingredients;
drop policy if exists "ci_update_own" on public.custom_ingredients;
drop policy if exists "ci_delete_own" on public.custom_ingredients;
create policy "ci_select_own" on public.custom_ingredients for select using (auth.uid() = user_id);
create policy "ci_insert_own" on public.custom_ingredients for insert with check (auth.uid() = user_id);
create policy "ci_update_own" on public.custom_ingredients for update using (auth.uid() = user_id);
create policy "ci_delete_own" on public.custom_ingredients for delete using (auth.uid() = user_id);

-- custom_meals
drop policy if exists "cm_select_own" on public.custom_meals;
drop policy if exists "cm_insert_own" on public.custom_meals;
drop policy if exists "cm_update_own" on public.custom_meals;
drop policy if exists "cm_delete_own" on public.custom_meals;
create policy "cm_select_own" on public.custom_meals for select using (auth.uid() = user_id);
create policy "cm_insert_own" on public.custom_meals for insert with check (auth.uid() = user_id);
create policy "cm_update_own" on public.custom_meals for update using (auth.uid() = user_id);
create policy "cm_delete_own" on public.custom_meals for delete using (auth.uid() = user_id);
