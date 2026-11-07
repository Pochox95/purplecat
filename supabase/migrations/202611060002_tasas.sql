-- Tasas de cambio compartidas (BCV / paralelo) para todo el equipo.
-- Ejecutar una vez desde el SQL Editor. El dueño escribe; cualquier miembro del equipo autenticado lee.
-- Requiere 202610210001_commerce.sql aplicada (usa la función app_role()).
begin;

create table public.pc_tasas (
  id integer primary key check (id = 1),
  bcv numeric(16,4) not null default 36.5 check (bcv > 0),
  paralelo numeric(16,4) not null default 40.0 check (paralelo > 0),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id)
);

insert into public.pc_tasas (id) values (1);

alter table public.pc_tasas enable row level security;
create policy pc_tasas_read on public.pc_tasas for select to authenticated using (app_role() is not null);
create policy pc_tasas_owner on public.pc_tasas for update to authenticated using (app_role() = 'dueno' and id = 1) with check (app_role() = 'dueno' and id = 1);
create trigger pc_tasas_log after update on public.pc_tasas for each row execute function pc_auditar();
create function public.pc_tasas_touch() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end $$;
create trigger pc_tasas_touch before update on public.pc_tasas for each row execute function pc_tasas_touch();

revoke all on public.pc_tasas from public, anon;
grant select, update on public.pc_tasas to authenticated;

commit;
