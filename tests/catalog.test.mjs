import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { filterCatalog } from "../lib/catalog.ts";
const products = [
  {
    id: 1,
    nombre: "Corset Luna",
    sku: "P-01",
    categoria: "Corsets",
    talla: "M",
    descripcion: "Satén negro",
    disponible: true,
  },
  {
    id: 2,
    nombre: "Falda Eclipse",
    sku: "P-02",
    categoria: "Faldas",
    talla: "S",
    descripcion: null,
    disponible: false,
  },
];
test("catalog filters combine search, category, size and availability", () => {
  assert.deepEqual(
    filterCatalog(products, " LUNA ", "Todas", "Todas", false).map((p) => p.id),
    [1],
  );
  assert.deepEqual(
    filterCatalog(products, "p-02", "Faldas", "S", false).map((p) => p.id),
    [2],
  );
  assert.deepEqual(
    filterCatalog(products, "", "Todas", "Todas", true).map((p) => p.id),
    [1],
  );
  assert.equal(filterCatalog(products, "", "Corsets", "S", false).length, 0);
  assert.equal(
    filterCatalog(products, "satén", "Todas", "Todas", false).length,
    1,
  );
});
test("anonymous catalog access exposes only public fields and cannot edit products", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
   create table productos(id bigint primary key,sku text,nombre text,categoria text,talla text,color text,precio_venta numeric,precio_costo numeric,descripcion text,image_url text,imagenes text[],stock integer,stock_minimo integer);
   insert into productos values(1,'P-01','Corset','Corsets','M','Negro',20,10,'Satén','/image.jpg',array['/image.jpg'],7,3),(2,'P-02','Falda','Faldas','S','Negro',30,15,'','/image2.jpg',array[]::text[],0,2);
   alter table productos enable row level security;
   create policy legacy_public_access on productos for all to anon using(true) with check(true);
   grant select,update on productos to anon,authenticated;`);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610210002_public_catalog.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role anon");
    const { rows } = await db.query(
      "select * from catalogo_productos order by id",
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].disponible, true);
    assert.equal(rows[1].disponible, false);
    for (const privateField of ["precio_costo", "stock", "stock_minimo"])
      assert.equal(privateField in rows[0], false);
    assert.equal(
      (await db.query("select * from productos")).rows.length,
      0,
      "underlying table remains private",
    );
    await assert.rejects(
      db.exec("update catalogo_productos set precio_venta=0 where id=1"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("delete from catalogo_productos where id=1"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("select precio_costo from catalogo_productos"),
      /does not exist/,
    );
    await db.exec("reset role; set role authenticated");
    assert.equal(
      (await db.query("select * from catalogo_productos")).rows.length,
      2,
    );
    await assert.rejects(
      db.exec("update catalogo_productos set nombre='alterado' where id=1"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
