export const money = (n: number) => Number(n).toFixed(2);
export function lineTotal(price: number, quantity: number, discount: number) {
  if (
    ![price, quantity, discount].every(Number.isFinite) ||
    price < 0 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    discount < 0 ||
    discount > price * quantity
  )
    throw new Error("Cantidad, precio o descuento inválido");
  return Math.round((price * quantity - discount) * 100) / 100;
}
export function totalWithDiscount(subtotal: number, discount: number) {
  if (
    !Number.isFinite(subtotal) ||
    subtotal < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > subtotal
  )
    throw new Error("El descuento de factura supera el subtotal");
  return Math.round((subtotal - discount) * 100) / 100;
}
export function csvText(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] || {});
  const cell = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^(?:[\t\r\n]|\s*[=+@-])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(","),
      ...rows.map((row) => keys.map((key) => cell(row[key])).join(",")),
    ].join("\r\n")
  );
}
export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) throw new Error("No hay datos para exportar");
  const url = URL.createObjectURL(
    new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
