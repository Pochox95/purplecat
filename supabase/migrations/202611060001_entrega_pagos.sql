-- Método de entrega y pagos mixtos (Binance USDT, Pago Móvil, Zelle, PayPal) en las ventas.
-- Ejecutar una vez desde el SQL Editor. Requiere 202610210001_commerce.sql aplicada.
-- La función pc_crear_venta anterior (6 argumentos) se reemplaza por la versión de 8;
-- los dos nuevos tienen valor por defecto, así que los llamados de 6 argumentos siguen funcionando,
-- pero ahora los pagos cuadren con el total (tolerancia 1 centavo).
begin;

alter table public.pc_ventas
  add column if not exists metodo_entrega text not null default 'Retiro en tienda',
  add column if not exists metodos_pago jsonb not null default '[]'::jsonb;

drop function public.pc_crear_venta(jsonb, jsonb, numeric, numeric, numeric, uuid);

create function public.pc_crear_venta(
  cliente jsonb,
  items jsonb,
  descuento_factura numeric,
  bcv numeric,
  paralelo numeric,
  solicitud uuid,
  entrega text default 'Retiro en tienda',
  pagos jsonb default '[]'::jsonb
) returns bigint language plpgsql security definer set search_path=public as $$
declare
  v_id bigint; it jsonb; p record; qty integer; disc numeric; subtotal numeric:=0; previo jsonb; payload jsonb;
  pago jsonb; pagos_total numeric:=0; total_calc numeric;
begin
  if app_role() is null then raise exception 'Acceso denegado'; end if;
  if solicitud is null then raise exception 'Solicitud inválida'; end if;
  if entrega is null or nullif(trim(entrega), '') is null then entrega := 'Retiro en tienda'; end if;
  entrega := trim(entrega);
  if entrega not in ('Retiro en tienda', 'Envío nacional') then raise exception 'Método de entrega inválido'; end if;
  if pagos is null or jsonb_typeof(pagos) is distinct from 'array' then raise exception 'Pagos inválidos'; end if;
  -- Envío nacional exige datos completos del cliente
  if entrega = 'Envío nacional' and (
    nullif(trim(cliente->>'nombre'), '') is null
    or nullif(trim(cliente->>'cedula'), '') is null
    or nullif(trim(cliente->>'telefono'), '') is null
    or nullif(trim(cliente->>'direccion'), '') is null
  ) then
    raise exception 'Para envío nacional se requieren nombre, cédula, teléfono y dirección';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(solicitud::text, 0));
  payload := jsonb_build_object(
    'cliente', cliente, 'items', items, 'descuento', descuento_factura,
    'bcv', bcv, 'paralelo', paralelo, 'entrega', entrega, 'pagos', pagos
  );
  select id, solicitud_datos into v_id, previo
    from pc_ventas
   where pc_ventas.solicitud = pc_crear_venta.solicitud and usuario = auth.uid();
  if found then
    if previo is distinct from payload then
      raise exception 'Esta solicitud ya fue registrada con otros datos. Revisá Ventas y recargá la página antes de una nueva venta';
    end if;
    return v_id;
  end if;
  if items is null or jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 200 then
    raise exception 'Carrito inválido';
  end if;
  if nullif(trim(cliente->>'nombre'), '') is null or bcv is null or bcv <= 0 or bcv > 1000000 or paralelo is null or paralelo <= 0 or paralelo > 1000000 or descuento_factura is null or descuento_factura < 0 then
    raise exception 'Datos inválidos';
  end if;
  if (select count(*) <> count(distinct value->>'producto_id') from jsonb_array_elements(items)) then
    raise exception 'Productos duplicados';
  end if;
  -- Consistent locking order prevents concurrent overselling and deadlocks.
  perform id from productos where id in (select (value->>'producto_id')::bigint from jsonb_array_elements(items)) order by id for update;
  insert into pc_ventas(
    solicitud, solicitud_datos, cliente_nombre, cliente_telefono, cliente_cedula, cliente_direccion,
    tasa_bcv, tasa_paralelo, descuento, total, metodo_entrega, metodos_pago
  ) values (
    solicitud, payload, trim(cliente->>'nombre'), coalesce(cliente->>'telefono', ''), coalesce(cliente->>'cedula', ''), coalesce(cliente->>'direccion', ''),
    bcv, paralelo, descuento_factura, 0, entrega, pagos
  ) returning id into v_id;
  for it in select value from jsonb_array_elements(items) loop
    select * into p from productos where id = (it->>'producto_id')::bigint;
    if not found then raise exception 'Producto inexistente'; end if;
    if (it->>'cantidad')::numeric <> trunc((it->>'cantidad')::numeric) then raise exception 'Cantidad inválida'; end if;
    qty := (it->>'cantidad')::integer; disc := (it->>'descuento')::numeric;
    if qty is null or qty <= 0 or p.stock is null or p.precio_venta is null or p.precio_venta < 0 or p.stock < qty or disc is null or disc < 0 or disc > p.precio_venta * qty then
      raise exception 'Stock, cantidad o descuento inválido para %', p.nombre;
    end if;
    insert into pc_venta_items(venta_id, producto_id, nombre, cantidad, precio, descuento) values (v_id, p.id, p.nombre, qty, p.precio_venta, round(disc, 2));
    subtotal := subtotal + round(p.precio_venta * qty - round(disc, 2), 2);
    update productos set stock = stock - qty where id = p.id;
  end loop;
  if descuento_factura > subtotal then raise exception 'Descuento mayor al subtotal'; end if;
  total_calc := subtotal - round(descuento_factura, 2);
  -- Los pagos (en USD) deben cuadrar con el total de la factura
  if jsonb_array_length(pagos) = 0 then raise exception 'Registrá al menos un método de pago'; end if;
  for pago in select value from jsonb_array_elements(pagos) loop
    if nullif(trim(pago->>'metodo'), '') is null then raise exception 'Método de pago inválido'; end if;
    if (pago->>'monto_usd')::numeric is null or (pago->>'monto_usd')::numeric < 0 then raise exception 'Monto de pago inválido'; end if;
    pagos_total := pagos_total + (pago->>'monto_usd')::numeric;
  end loop;
  if abs(pagos_total - total_calc) > 0.01 then
    raise exception 'La suma de los pagos ($%) no coincide con el total de la factura ($%)', round(pagos_total, 2), round(total_calc, 2);
  end if;
  update pc_ventas set total = total_calc where id = v_id;
  return v_id;
end $$;

revoke all on function public.pc_crear_venta(jsonb, jsonb, numeric, numeric, numeric, uuid, text, jsonb) from public, anon;
grant execute on function public.pc_crear_venta(jsonb, jsonb, numeric, numeric, numeric, uuid, text, jsonb) to authenticated;

commit;
