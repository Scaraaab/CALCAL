-- ============================================================
--  MIGRACIÓN ADMIN — Pobla las tablas community_* con TODOS los
--  custom_ingredients y custom_meals de TODOS los usuarios.
--
--  Cómo usar:
--    1. Asegúrate de que schema.sql ya está aplicado (tablas community_*
--       creadas, columna share_id en custom_*).
--    2. Pega TODO este archivo en Supabase → SQL Editor → Run.
--
--  Es IDEMPOTENTE: puedes ejecutarlo varias veces sin duplicar nada.
--  No se ve afectado por RLS porque corre con privilegios admin del SQL editor.
--
--  Resultado: cada custom_* del sistema tiene su copia en community_*,
--  emparejada por share_id. El created_by apunta al user_id original. El
--  created_by_name se rellena con profile.name (o 'Anónimo' si no hay).
-- ============================================================

begin;

-- Paso 1: asegurar que TODOS los custom_ingredients tienen share_id.
-- (Los nuevos creados después de añadir community ya vienen con shareId,
--  pero los antiguos no — esto los completa.)
update public.custom_ingredients
   set share_id = gen_random_uuid()
 where share_id is null;

update public.custom_meals
   set share_id = gen_random_uuid()
 where share_id is null;

-- Paso 2: insertar TODOS los custom_ingredients en community_ingredients.
-- ON CONFLICT (share_id) DO NOTHING → no toca filas ya existentes.
insert into public.community_ingredients (
  share_id, created_by, created_by_name,
  name, measure_type, base_qty, serving_label,
  kcal, protein, carbs, fat, fiber,
  photo, created_at
)
select
  ci.share_id,
  ci.user_id,
  coalesce(p.name, 'Anónimo'),
  ci.name,
  ci.measure_type,
  ci.base_qty,
  ci.serving_label,
  ci.kcal, ci.protein, ci.carbs, ci.fat, ci.fiber,
  ci.photo,
  ci.created_at
from public.custom_ingredients ci
left join public.profiles p on p.user_id = ci.user_id
where ci.share_id is not null
on conflict (share_id) do nothing;

-- Paso 3: insertar TODOS los custom_meals en community_meals.
insert into public.community_meals (
  share_id, created_by, created_by_name,
  name, photo, items, totals, yield_grams,
  created_at
)
select
  cm.share_id,
  cm.user_id,
  coalesce(p.name, 'Anónimo'),
  cm.name,
  cm.photo,
  cm.items,
  cm.totals,
  cm.yield_grams,
  cm.created_at
from public.custom_meals cm
left join public.profiles p on p.user_id = cm.user_id
where cm.share_id is not null
on conflict (share_id) do nothing;

commit;

-- ============================================================
--  Auditoría: ver el resultado
-- ============================================================
do $$
declare
  ci_total int; ci_community int;
  cm_total int; cm_community int;
begin
  select count(*) into ci_total       from public.custom_ingredients where share_id is not null;
  select count(*) into ci_community   from public.community_ingredients;
  select count(*) into cm_total       from public.custom_meals where share_id is not null;
  select count(*) into cm_community   from public.community_meals;
  raise notice '────────────────────────────────────────';
  raise notice '  RESUMEN MIGRACIÓN A COMMUNITY';
  raise notice '────────────────────────────────────────';
  raise notice '  Ingredients personales con share_id: %', ci_total;
  raise notice '  Ingredients en community:           %', ci_community;
  raise notice '  Meals personales con share_id:      %', cm_total;
  raise notice '  Meals en community:                 %', cm_community;
  raise notice '────────────────────────────────────────';
  if ci_community < ci_total then
    raise notice '  ⚠ Faltan % ingredientes en community', ci_total - ci_community;
  end if;
  if cm_community < cm_total then
    raise notice '  ⚠ Faltan % comidas en community', cm_total - cm_community;
  end if;
end$$;
