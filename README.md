# Purple Cat

Inventario y gestión de ventas en Next.js y Supabase.

## Catálogo público y panel privado

- `/`: catálogo público de solo lectura, búsqueda, categorías, tallas, disponibilidad y galería. Usa las fotos existentes de `image_url` / `imagenes`; si la principal falla intenta la siguiente foto. No hay productos ni ilustraciones de prueba cargados por la aplicación.
- `/login`: acceso del equipo con correo y contraseña; `admin` funciona como alias de `admin@purplecat.test` si creaste esa cuenta de prueba. La contraseña nunca está incluida ni precargada en el código.
- `/admin`: panel con barra lateral, inventario, nueva venta, historial de ventas y las secciones exclusivas del dueño. Al salir vuelve al catálogo. La entrada sin sesión lleva al login.

**Para habilitar el catálogo con datos reales, ejecutá `supabase/migrations/202610210002_public_catalog.sql` en SQL Editor después de la migración de comercio.** Si la primera migración ya está aplicada, ejecutá únicamente la nueva. La vista `catalogo_productos` expone campos comerciales y disponibilidad, pero omite costos y stock exacto. Una política restrictiva bloquea el acceso anónimo a la tabla original incluso si quedó una política pública antigua. No modifica ni copia las fotos: conserva las URLs existentes.

Los precios públicos se muestran en USD efectivo. Las tasas del panel siguen siendo locales al navegador; no se publica una conversión a bolívares usando una tasa que el administrador no haya compartido con el visitante.

## Ejecutar localmente

Requiere Node.js 22.18+ (las pruebas usan TypeScript nativo; se validó con Node 24).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Completá `.env.local` con la URL y la clave pública/anon de Supabase. Nunca pongas una clave `service_role` en el navegador.

## Activar las funciones nuevas

1. Hacé un respaldo de Supabase y probá primero en un proyecto de pruebas con la tabla `public.productos` existente. La migración espera IDs numéricos, campos `nombre`, `precio_venta`, `stock` y `stock_minimo`, y el bucket `product-images` que utiliza el inventario.
2. Ejecutá **una vez** `supabase/migrations/202610210001_commerce.sql` desde SQL Editor. La transacción crea tablas nuevas con prefijo `pc_`; no transforma tablas de ventas de otra versión ni importa sus datos. Se eliminan las políticas anteriores de `productos` para reemplazarlas con acceso autenticado por rol. Las políticas restrictivas del bucket impiden escrituras públicas y conservan las políticas de otros buckets.
3. En Authentication → Users creá las cuentas del dueño y de cada empleado, con correo confirmado y contraseña. Desactivá el registro público si no lo necesitás.
4. Agregá sus UUID reales a `perfiles` desde SQL Editor:

```sql
insert into public.perfiles(id,nombre,rol) values
 ('UUID-DEL-DUENO', 'Dueño', 'dueno'),
 ('UUID-DEL-EMPLEADO', 'Empleado', 'empleado');
```

5. Configurá las mismas variables de `.env.example` en Vercel y reconstruí el despliegue. El login queda bloqueado hasta tener un perfil válido. El dueño puede cambiar roles de otras cuentas desde Usuarios; no puede quitarse su propio rol.
6. Opcionalmente habilitá `productos` en la publicación `supabase_realtime`. Las alertas en la aplicación usan Realtime y, como respaldo, consultan cada minuto. No son notificaciones push ni funcionan con la aplicación cerrada.

**Las migraciones se entregan en GitHub. Su aplicación al Supabase real y el estado del despliegue en Vercel deben verificarse por separado.**

## Funciones

- Facturar: cliente con nombre, teléfono, cédula/RIF y dirección; descuentos en dólares por línea y adicional por factura. El servidor toma los precios del inventario, valida stock y registra la venta completa en una transacción. Un identificador de solicitud evita duplicar la venta al reintentar la misma petición.
- Ventas: historial, comprobante imprimible y «Guardar como PDF» mediante el diálogo de impresión del navegador. Se conservan las tasas BCV y paralelo usadas en cada venta. El equivalente en bolívares usa el paralelo, igual que la copia de precios del inventario; el precio en dólares es el efectivo. Es un comprobante comercial; no integra un proveedor fiscal.
- Devolución/anulación: solo dueño, venta **completa**, motivo obligatorio, restaura todo el stock una sola vez. Conserva la venta y la auditoría; el reembolso del dinero se realiza fuera de la aplicación. No hay devoluciones parciales.
- Gastos: envíos, empaque, comisiones y otros, importes en USD y fecha de operación. Disponibles solo al dueño.
- Exportar: CSV UTF-8 de inventario, ventas y gastos compatible con Excel. Ventas exporta una fila por factura, incluidos cliente, descuentos, tasa y estado. Se neutralizan fórmulas en los campos de texto. Exportaciones paginadas sin el límite inicial de 1000 registros de Supabase.
- Historial: últimos 100 cambios con UUID/nombre del actor y valores anteriores/nuevos en productos, ventas, líneas, gastos y perfiles. Cambios desde SQL Editor quedan como SQL/sistema si no hay sesión de usuario.
- Dueño: CRUD de inventario, imágenes, ventas, devoluciones, gastos, historial y roles. Empleado: consulta inventario, exporta inventario/ventas y factura. Los permisos se comprueban con RLS y funciones de PostgreSQL, además de la interfaz.
- Alertas: productos agotados o por debajo del mínimo, con opción de marcarlas como vistas durante la sesión.

El inventario conserva su CRUD, galería y calculadora dentro del nuevo panel. Las tasas siguen siendo locales al navegador. No se agregó un módulo de cierre de caja: no estaba en el código de esta versión y no forma parte de los puntos 3 y 4.

## Validar

```sh
npm test
npm run typecheck
npm run build
```

Las pruebas del catálogo verifican filtros, campos públicos, bloqueo de escrituras anónimas y protección frente a políticas públicas antiguas. Las pruebas de base de datos ejecutan la migración real en PostgreSQL embebido (PGlite), con esquemas simulados `auth`/`storage`. Cubren cálculos, CSV, stock, rollback, reintentos, devolución doble, permisos de empleado, acceso anónimo, auditoría y preservación de otros buckets. No sustituyen la prueba de integración en tu Supabase y Storage reales.

El desarrollo y la compilación usan Webpack explícitamente, porque Turbopack no pudo iniciar su proceso de CSS en este entorno. Se actualizó Next de 14.2.5 a 16.4.2 para corregir las vulnerabilidades de ejecución detectadas. `npm audit --omit=dev` terminó con 0 vulnerabilidades. La auditoría completa aún informa 7 avisos en dependencias de desarrollo de Tailwind 3; React 18 sigue siendo compatible con Next 16, aunque su soporte está deprecado. No se debe interpretar la incorporación de roles como una auditoría integral de seguridad.
