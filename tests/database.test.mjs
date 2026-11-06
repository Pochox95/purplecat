import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
const owner = "00000000-0000-4000-8000-000000000001",
  employee = "00000000-0000-4000-8000-000000000002",
  outsider = "00000000-0000-4000-8000-000000000003";
test("commerce migration, transactional sales, returns, roles and audit", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
 create table public.productos(id bigint primary key, nombre text not null, precio_venta numeric(14,2) not null, stock integer not null, stock_minimo integer default 3);
 create table storage.objects(id bigint primary key,bucket_id text);
 alter table storage.objects enable row level security;
 create policy legacy_images on storage.objects for all to public using(true) with check(true);
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy legacy_inventory on productos for all to public using(true) with check(true);
 insert into auth.users values('${owner}'),('${employee}'),('${outsider}');
 insert into productos values(1,'Corset',20,5,2),(2,'Falda',30,2,1);`);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610210001_commerce.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202611060001_entrega_pagos.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `insert into perfiles values('${owner}','Dueño','dueno'),('${employee}','Vendedora','empleado');`,
    );
    const login = async (id, role = "authenticated") =>
      db.exec(
        `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    const price = { 1: 20, 2: 30 };
    const sale = async (request, items, discount = 0, opts = {}) => {
      // Los pagos deben cuadrar con el total (la migración 202611060001 lo exige)
      const subtotal = (items ?? []).reduce(
        (sum, it) => sum + price[it.producto_id] * it.cantidad - it.descuento,
        0,
      );
      const total = Math.max(0, subtotal - discount);
      const pagos = opts.pagos ??
        (items
          ? [
              {
                metodo: "Zelle",
                moneda: "USD",
                monto: total,
                monto_usd: total,
                referencia: null,
              },
            ]
          : []);
      return (
        await db.query(
          `select pc_crear_venta($1::jsonb,$2::jsonb,$3::numeric,40,45,$4::uuid,$5::text,$6::jsonb) id`,
          [
            JSON.stringify({
              nombre: "Ana",
              cedula: "123",
              telefono: "555",
              direccion: "Caracas",
              ...(opts.cliente ?? {}),
            }),
            JSON.stringify(items),
            discount,
            request,
            opts.entrega ?? "Retiro en tienda",
            JSON.stringify(pagos),
          ],
        )
      ).rows[0].id;
    };
    await login(employee);
    assert.equal(
      (await db.query("select app_role() rol")).rows[0].rol,
      "empleado",
    );
    assert.equal((await db.query("select * from productos")).rows.length, 2);
    assert.equal(
      (await db.query("update productos set stock=999 where id=1 returning id"))
        .rows.length,
      0,
    );
    await assert.rejects(
      db.exec("insert into productos values(3,'X',10,1,0)"),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        "insert into pc_gastos(concepto,categoria,monto) values('X','Otros',2)",
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec("insert into storage.objects values(1,'product-images')"),
      /row-level security/,
    );
    assert.equal((await db.query("select * from pc_auditoria")).rows.length, 0);
    const id = await sale(
      "10000000-0000-4000-8000-000000000001",
      [{ producto_id: 1, cantidad: 2, descuento: 5 }],
      3,
    );
    assert.equal(
      Number(
        (await db.query("select total from pc_ventas where id=$1", [id]))
          .rows[0].total,
      ),
      32,
    );
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      3,
    );
    assert.equal(
      await sale(
        "10000000-0000-4000-8000-000000000001",
        [{ producto_id: 1, cantidad: 2, descuento: 5 }],
        3,
      ),
      id,
    );
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      3,
      "retry must not deduct twice",
    );
    await assert.rejects(
      db.query("select pc_devolver_venta($1,$2)", [id, "Cancelada"]),
      /Solo el dueño/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000002", [
        { producto_id: 1, cantidad: 1, descuento: 0 },
        { producto_id: 2, cantidad: 3, descuento: 0 },
      ]),
      /Stock/,
    );
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      3,
      "failed second line rolls back first",
    );
    assert.equal((await db.query("select * from pc_ventas")).rows.length, 1);
    await assert.rejects(
      sale(
        "10000000-0000-4000-8000-000000000003",
        [{ producto_id: 1, cantidad: 1, descuento: 0 }],
        21,
      ),
      /Descuento/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000004", [
        { producto_id: 1, cantidad: 1, descuento: 21 },
      ]),
      /descuento/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000005", [
        { producto_id: 1, cantidad: 1.2, descuento: 0 },
      ]),
      /Cantidad/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000006", [
        { producto_id: 1, cantidad: 1, descuento: 0 },
        { producto_id: 1, cantidad: 1, descuento: 0 },
      ]),
      /duplicados/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000008", null),
      /Carrito/,
    );
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000001", [
        { producto_id: 1, cantidad: 1, descuento: 0 },
      ]),
      /otros datos/,
    );
    await assert.rejects(
      db.query("select pc_ajustar_stock(1,1)"),
      /Solo el dueño/,
    );
    await login(owner);
    await db.query("select pc_devolver_venta($1,$2)", [id, "Talla incorrecta"]);
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      5,
    );
    await assert.rejects(
      db.query("select pc_devolver_venta($1,$2)", [id, "Otra vez"]),
      /ya devuelta/,
    );
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      5,
    );
    await db.exec(
      "insert into pc_gastos(concepto,categoria,monto) values('Empaque','Empaque',2.50)",
    );
    await db.exec("insert into storage.objects values(1,'product-images')");
    assert.ok(
      (await db.query("select * from pc_auditoria")).rows.some(
        (a) => a.tabla === "productos" && a.usuario === employee,
      ),
    );
    assert.equal(
      (
        await db.query(
          "update perfiles set rol='empleado' where id=$1 returning id",
          [owner],
        )
      ).rows.length,
      0,
      "owner cannot demote self",
    );
    await db.query("select pc_ajustar_stock(1,-1)");
    assert.equal(
      (await db.query("select stock from productos where id=1")).rows[0].stock,
      4,
    );
    await assert.rejects(
      db.query("select pc_ajustar_stock(1,99)"),
      /Ajuste inválido/,
    );
    await login(outsider);
    assert.equal((await db.query("select * from productos")).rows.length, 0);
    await assert.rejects(
      sale("10000000-0000-4000-8000-000000000007", [
        { producto_id: 1, cantidad: 1, descuento: 0 },
      ]),
      /Acceso denegado/,
    );
    await login("", "anon");
    await assert.rejects(
      db.exec("insert into storage.objects values(2,'product-images')"),
      /row-level security/,
    );
    await db.exec("insert into storage.objects values(3,'other-bucket')");
  } finally {
    await db.close();
  }
});

test("mixed payments and national delivery are validated and persisted", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-4000-8000-000000000011";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
 create table public.productos(id bigint primary key, nombre text not null, precio_venta numeric(14,2) not null, stock integer not null, stock_minimo integer default 3);
 create table storage.objects(id bigint primary key,bucket_id text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy legacy_inventory on productos for all to public using(true) with check(true);
 insert into auth.users values('${owner}');
 insert into productos values(1,'Corset',20,5,2);`);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610210001_commerce.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202611060001_entrega_pagos.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`insert into perfiles values('${owner}','Dueño','dueno');`);
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`,
    );
    const pagar = [
      { metodo: "Zelle", moneda: "USD", monto: 10, monto_usd: 10 },
      { metodo: "Pago Móvil", moneda: "BS", monto: 450, monto_usd: 10 },
    ];
    // Envío nacional sin cédula/teléfono/dirección debe fallar
    await assert.rejects(
      db.query(
        `select pc_crear_venta($1::jsonb,$2::jsonb,0,40,45,$3::uuid,$4::text,$5::jsonb)`,
        [
          JSON.stringify({ nombre: "Ana", direccion: "Caracas" }),
          JSON.stringify([{ producto_id: 1, cantidad: 1, descuento: 0 }]),
          "20000000-0000-4000-8000-000000000001",
          "Envío nacional",
          JSON.stringify([{ metodo: "Zelle", monto_usd: 20 }]),
        ],
      ),
      /envío nacional/,
    );
    // Pagos que no cuadran con el total deben fallar
    await assert.rejects(
      db.query(
        `select pc_crear_venta($1::jsonb,$2::jsonb,0,40,45,$3::uuid,$4::text,$5::jsonb)`,
        [
          JSON.stringify({
            nombre: "Ana",
            cedula: "123",
            telefono: "555",
            direccion: "Caracas",
          }),
          JSON.stringify([{ producto_id: 1, cantidad: 1, descuento: 0 }]),
          "20000000-0000-4000-8000-000000000002",
          "Envío nacional",
          JSON.stringify([{ metodo: "Zelle", monto_usd: 15 }]),
        ],
      ),
      /no coincide/,
    );
    // Pago mixto válido (50/50) con envío nacional se registra y persiste
    const id = (
      await db.query(
        `select pc_crear_venta($1::jsonb,$2::jsonb,0,40,45,$3::uuid,$4::text,$5::jsonb) id`,
        [
          JSON.stringify({
            nombre: "Ana",
            cedula: "123",
            telefono: "555",
            direccion: "Caracas",
          }),
          JSON.stringify([{ producto_id: 1, cantidad: 1, descuento: 0 }]),
          "20000000-0000-4000-8000-000000000003",
          "Envío nacional",
          JSON.stringify(pagar),
        ],
      )
    ).rows[0].id;
    const venta = (
      await db.query(
        "select metodo_entrega, metodos_pago from pc_ventas where id=$1",
        [id],
      )
    ).rows[0];
    assert.equal(venta.metodo_entrega, "Envío nacional");
    assert.equal(venta.metodos_pago.length, 2);
    assert.equal(venta.metodos_pago[0].metodo, "Zelle");
  } finally {
    await db.close();
  }
});
