-- Public catalogue: expose only commercial fields, never costs or precise stock.
-- Run once, after backing up the database. The original productos RLS stays unchanged.
begin;
alter table public.productos enable row level security;
-- Also constrain any old permissive policy left over from the original public inventory.
create policy pc_block_anonymous_inventory on public.productos
as restrictive for all to anon using (false) with check (false);
create or replace view public.catalogo_productos
with (security_barrier = true, security_invoker = false)
as select
  id, sku, nombre, categoria, talla, color, precio_venta,
  descripcion, image_url, imagenes,
  coalesce(stock > 0, false) as disponible
from public.productos;
revoke all on public.catalogo_productos from public, anon, authenticated;
grant select on public.catalogo_productos to anon, authenticated;
comment on view public.catalogo_productos is 'Public read-only product projection. Omits cost, stock count, stock threshold and private sales/customer data. View owner must be a trusted database role with access to productos.';
commit;
