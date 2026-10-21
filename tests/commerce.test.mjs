import assert from "node:assert/strict";
import { test } from "node:test";
import { lineTotal, totalWithDiscount, csvText } from "../lib/commerce.ts";
test("discounts use line amounts followed by invoice amount with cents", () => {
  assert.equal(totalWithDiscount(lineTotal(19.99, 3, 5), 2), 52.97);
  assert.equal(totalWithDiscount(lineTotal(0.1, 3, 0), 0.1), 0.2);
  assert.equal(totalWithDiscount(10, 10), 0);
  for (const args of [
    [10, 0, 0],
    [10, 1.2, 0],
    [10, 1, 11],
    [10, 1, -1],
    [NaN, 1, 0],
  ])
    assert.throws(() => lineTotal(...args));
  for (const discount of [-1, 11, NaN, Infinity])
    assert.throws(() => totalWithDiscount(10, discount));
});
test("CSV escapes commas, quotes and newlines and neutralizes spreadsheet formulas", () => {
  const csv = csvText([
    { nombre: 'Corset, "Negro"\nM', nota: '=HYPERLINK("x")', stock: 0 },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Corset, ""Negro""\nM"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.endsWith('"0"'));
});
