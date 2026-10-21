-- Run after backing up the database. Requires the existing public.productos table.
begin;
create table public.perfiles (id uuid primary key references auth.users(id) on delete cascade, nombre text not null, rol text not null check (rol in ('dueno','empleado')));
create function public.app_role() returns text language sql stable security definer set search_path=public as $$ select rol from perfiles where id=auth.uid() $$;
create table public.pc_ventas (
 id bigint generated always as identity primary key, solicitud uuid not null unique, solicitud_datos jsonb not null, created_at timestamptz not null default now(), usuario uuid not null default auth.uid() references auth.users(id),
 cliente_nombre text not null, cliente_telefono text not null default '', cliente_cedula text not null default '', cliente_direccion text not null default '',
 tasa_bcv numeric(16,4) not null check(tasa_bcv>0), tasa_paralelo numeric(16,4) not null check(tasa_paralelo>0), descuento numeric(14,2) not null check(descuento>=0), total numeric(14,2) not null check(total>=0),
 estado text not null default 'completa' check(estado in ('completa','devuelta')), motivo_devolucion text, devuelta_at timestamptz);
create table public.pc_venta_items (
 id bigint generated always as identity primary key, venta_id bigint not null references pc_ventas(id), producto_id bigint not null,
 nombre text not null, cantidad integer not null check(cantidad>0), precio numeric(14,2) not null check(precio>=0), descuento numeric(14,2) not null check(descuento>=0 and descuento<=precio*cantidad));
create table public.pc_gastos (id bigint generated always as identity primary key, created_at timestamptz not null default now(), fecha date not null default current_date, concepto text not null check(length(trim(concepto))>0), categoria text not null, monto numeric(14,2) not null check(monto>0), usuario uuid not null default auth.uid() references auth.users(id));
create table public.pc_auditoria (id bigint generated always as identity primary key, created_at timestamptz not null default now(), usuario uuid, tabla text not null, accion text not null, registro_id text, antes jsonb, despues jsonb);
create function public.pc_auditar() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into pc_auditoria(usuario,tabla,accion,registro_id,antes,despues) values(auth.uid(),tg_table_name,tg_op,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old);
end $$;
create trigger pc_productos_log after insert or update or delete on productos for each row execute function pc_auditar();
create trigger pc_ventas_log after insert or update or delete on pc_ventas for each row execute function pc_auditar();
create trigger pc_items_log after insert or update or delete on pc_venta_items for each row execute function pc_auditar();
create trigger pc_gastos_log after insert or update or delete on pc_gastos for each row execute function pc_auditar();
create trigger pc_perfiles_log after insert or update or delete on perfiles for each row execute function pc_auditar();
create function public.pc_crear_venta(cliente jsonb, items jsonb, descuento_factura numeric, bcv numeric, paralelo numeric, solicitud uuid) returns bigint language plpgsql security definer set search_path=public as $$
declare v_id bigint; it jsonb; p record; qty integer; disc numeric; subtotal numeric:=0; previo jsonb; payload jsonb;
begin
 if app_role() is null then raise exception 'Acceso denegado'; end if;
 if solicitud is null then raise exception 'Solicitud inválida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(solicitud::text,0));
 payload:=jsonb_build_object('cliente',cliente,'items',items,'descuento',descuento_factura,'bcv',bcv,'paralelo',paralelo);
 select id,solicitud_datos into v_id,previo from pc_ventas where pc_ventas.solicitud=pc_crear_venta.solicitud and usuario=auth.uid();
 if found then
  if previo is distinct from payload then raise exception 'Esta solicitud ya fue registrada con otros datos. Revisá Ventas y recargá la página antes de una nueva venta'; end if;
  return v_id;
 end if;
 if items is null or jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)=0 or jsonb_array_length(items)>200 then raise exception 'Carrito inválido'; end if;
 if nullif(trim(cliente->>'nombre'),'') is null or bcv is null or bcv<=0 or bcv>1000000 or paralelo is null or paralelo<=0 or paralelo>1000000 or descuento_factura is null or descuento_factura<0 then raise exception 'Datos inválidos'; end if;
 if (select count(*)<>count(distinct value->>'producto_id') from jsonb_array_elements(items)) then raise exception 'Productos duplicados'; end if;
 -- Consistent locking order prevents concurrent overselling and deadlocks.
 perform id from productos where id in (select (value->>'producto_id')::bigint from jsonb_array_elements(items)) order by id for update;
 insert into pc_ventas(solicitud,solicitud_datos,cliente_nombre,cliente_telefono,cliente_cedula,cliente_direccion,tasa_bcv,tasa_paralelo,descuento,total) values(solicitud,payload,trim(cliente->>'nombre'),coalesce(cliente->>'telefono',''),coalesce(cliente->>'cedula',''),coalesce(cliente->>'direccion',''),bcv,paralelo,descuento_factura,0) returning id into v_id;
 for it in select value from jsonb_array_elements(items) loop
  select * into p from productos where id=(it->>'producto_id')::bigint;
  if not found then raise exception 'Producto inexistente'; end if;
  if (it->>'cantidad')::numeric <> trunc((it->>'cantidad')::numeric) then raise exception 'Cantidad inválida'; end if;
  qty:=(it->>'cantidad')::integer; disc:=(it->>'descuento')::numeric;
  if qty is null or qty<=0 or p.stock is null or p.precio_venta is null or p.precio_venta<0 or p.stock<qty or disc is null or disc<0 or disc>p.precio_venta*qty then raise exception 'Stock, cantidad o descuento inválido para %',p.nombre; end if;
  insert into pc_venta_items(venta_id,producto_id,nombre,cantidad,precio,descuento) values(v_id,p.id,p.nombre,qty,p.precio_venta,round(disc,2));
  subtotal:=subtotal+round(p.precio_venta*qty-round(disc,2),2);
  update productos set stock=stock-qty where id=p.id;
 end loop;
 if descuento_factura>subtotal then raise exception 'Descuento mayor al subtotal'; end if;
 update pc_ventas set total=subtotal-round(descuento_factura,2) where id=v_id;
 return v_id;
end $$;
create function public.pc_devolver_venta(venta bigint, motivo text) returns void language plpgsql security definer set search_path=public as $$
declare it record; sale record;
begin
 if app_role()<>'dueno' or app_role() is null then raise exception 'Solo el dueño puede devolver ventas'; end if;
 if nullif(trim(motivo),'') is null then raise exception 'Indicá un motivo'; end if;
 select * into sale from pc_ventas where id=venta for update;
 if not found or sale.estado<>'completa' then raise exception 'Venta inexistente o ya devuelta'; end if;
 for it in select * from pc_venta_items where venta_id=venta order by producto_id loop
  update productos set stock=stock+it.cantidad where id=it.producto_id;
  if not found then raise exception 'El producto % fue eliminado; recuperalo antes de devolver',it.nombre; end if;
 end loop;
 update pc_ventas set estado='devuelta',motivo_devolucion=trim(motivo),devuelta_at=now() where id=venta;
end $$;
create function public.pc_ajustar_stock(producto bigint, delta integer) returns void language plpgsql security definer set search_path=public as $$
begin
 if app_role() is distinct from 'dueno' then raise exception 'Solo el dueño puede ajustar stock'; end if;
 if delta is null or delta not in (-1,1) then raise exception 'Ajuste inválido'; end if;
 update productos set stock=stock+delta where id=producto and stock+delta>=0;
 if not found then raise exception 'Producto inexistente o stock insuficiente'; end if;
end $$;
revoke all on function pc_ajustar_stock(bigint,integer) from public,anon;
grant execute on function pc_ajustar_stock(bigint,integer) to authenticated;
-- RLS is enforced on all browser-accessible tables; remove prior permissive policies on inventory.
do $$ declare p record; begin for p in select policyname from pg_policies where schemaname='public' and tablename='productos' loop execute format('drop policy %I on public.productos',p.policyname); end loop; end $$;
alter table productos enable row level security;
create policy pc_productos_read on productos for select to authenticated using(app_role() is not null);
create policy pc_productos_owner on productos for all to authenticated using(app_role()='dueno') with check(app_role()='dueno');
alter table perfiles enable row level security;
create policy pc_perfiles_read on perfiles for select to authenticated using(id=auth.uid() or app_role()='dueno');
create policy pc_perfiles_owner on perfiles for update to authenticated using(app_role()='dueno' and id<>auth.uid()) with check(app_role()='dueno' and id<>auth.uid());
alter table pc_ventas enable row level security;
alter table pc_venta_items enable row level security;
alter table pc_gastos enable row level security;
alter table pc_auditoria enable row level security;
create policy pc_sales_read on pc_ventas for select to authenticated using(app_role() is not null);
create policy pc_items_read on pc_venta_items for select to authenticated using(app_role() is not null);
create policy pc_expenses_read on pc_gastos for select to authenticated using(app_role()='dueno');
create policy pc_expenses_create on pc_gastos for insert to authenticated with check(app_role()='dueno' and usuario=auth.uid());
create policy pc_audit_read on pc_auditoria for select to authenticated using(app_role()='dueno');
grant select,insert,update,delete on productos to authenticated;
grant select,update on perfiles to authenticated;
grant select on pc_ventas,pc_venta_items,pc_auditoria to authenticated;
grant select,insert on pc_gastos to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke all on function pc_crear_venta(jsonb,jsonb,numeric,numeric,numeric,uuid),pc_devolver_venta(bigint,text),app_role() from public,anon;
grant execute on function pc_crear_venta(jsonb,jsonb,numeric,numeric,numeric,uuid),pc_devolver_venta(bigint,text),app_role() to authenticated;
-- Preserve policies for other buckets; restrictive rules constrain any legacy public policy.
grant execute on function app_role() to anon;
create policy pc_images_guard_insert on storage.objects as restrictive for insert to public with check(bucket_id<>'product-images' or public.app_role()='dueno');
create policy pc_images_guard_update on storage.objects as restrictive for update to public using(bucket_id<>'product-images' or public.app_role()='dueno') with check(bucket_id<>'product-images' or public.app_role()='dueno');
create policy pc_images_guard_delete on storage.objects as restrictive for delete to public using(bucket_id<>'product-images' or public.app_role()='dueno');
create policy pc_images_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.app_role()='dueno');
create policy pc_images_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.app_role()='dueno') with check(bucket_id='product-images' and public.app_role()='dueno');
create policy pc_images_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.app_role()='dueno');
commit;
