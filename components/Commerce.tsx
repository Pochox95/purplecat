"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import {
  downloadCSV,
  lineTotal,
  money,
  totalWithDiscount,
} from "../lib/commerce";
type Product = {
  id: number;
  nombre: string;
  sku: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
};
type Item = {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  descuento: number;
};
type Sale = MetodosVenta & {
  id: number;
  created_at: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_cedula: string;
  cliente_direccion: string;
  total: number;
  descuento: number;
  tasa_bcv: number;
  tasa_paralelo: number;
  estado: string;
  motivo_devolucion: string | null;
  pc_venta_items: Item[];
};
type Expense = {
  id: number;
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
};
type Audit = {
  id: number;
  created_at: string;
  usuario: string;
  tabla: string;
  accion: string;
  registro_id: string;
  antes: unknown;
  despues: unknown;
};
type Profile = { id: string; nombre: string; rol: string };
type PagoMixto = {
  metodo: string;
  moneda: "USD" | "BS";
  monto: number;
  monto_usd: number;
  referencia: string | null;
};
const METODOS_PAGO: { id: string; moneda: "USD" | "BS" }[] = [
  { id: "Binance USDT", moneda: "USD" },
  { id: "Pago Móvil", moneda: "BS" },
  { id: "Zelle", moneda: "USD" },
  { id: "PayPal", moneda: "USD" },
];
const ENTREGA_RETIRO = "Retiro en tienda";
const ENTREGA_NACIONAL = "Envío nacional";
type MetodosVenta = {
  metodo_entrega?: string;
  metodos_pago?: PagoMixto[] | null;
};
const field = "pc-field";
const button = "pc-button pc-button-quiet";
async function allRows(table: string, columns = "*") {
  const rows: any[] = [];
  let lastId: number | null = null;
  while (true) {
    let query = supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: false })
      .limit(500);
    if (lastId !== null) query = query.lt("id", lastId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
    lastId = (data[data.length - 1] as any).id;
  }
}
export default function Commerce({
  productos,
  tasaBCV,
  tasaParalelo,
  refresh,
  tab,
  onNavigate: setTab,
}: {
  productos: Product[];
  tasaBCV: number;
  tasaParalelo: number;
  refresh: () => Promise<void>;
  tab: import("./AdminShell").Section;
  onNavigate: (section: import("./AdminShell").Section) => void;
}) {
  const [role, setRole] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [cart, setCart] = useState<Item[]>([]),
    [discount, setDiscount] = useState(0),
    [customer, setCustomer] = useState({
      nombre: "",
      telefono: "",
      cedula: "",
      direccion: "",
    });
  const [sales, setSales] = useState<Sale[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [audit, setAudit] = useState<Audit[]>([]),
    [profiles, setProfiles] = useState<Profile[]>([]);
  const [expense, setExpense] = useState({
    fecha: new Date().toLocaleDateString("en-CA"),
    concepto: "",
    categoria: "Envíos",
    monto: "",
  });
  const [receipt, setReceipt] = useState<Sale | null>(null),
    [returnSale, setReturnSale] = useState<Sale | null>(null),
    [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [seen, setSeen] = useState<string[]>([]);
  const [metodoEntrega, setMetodoEntrega] = useState(ENTREGA_RETIRO),
    [pagos, setPagos] = useState<PagoMixto[]>([]),
    [metodoSeleccionado, setMetodoSeleccionado] =
      useState<string>("Binance USDT"),
    [montoPagoInput, setMontoPagoInput] = useState(""),
    [referenciaInput, setReferenciaInput] = useState("");
  const envioNacional = metodoEntrega === ENTREGA_NACIONAL;
  const metodoInfo =
    METODOS_PAGO.find((m) => m.id === metodoSeleccionado) ?? METODOS_PAGO[0];
  const envioValido =
    !envioNacional ||
    Boolean(
      customer.nombre.trim() &&
        customer.cedula.trim() &&
        customer.telefono.trim() &&
        customer.direccion.trim(),
    );
  const agregarPago = () => {
    const monto = Number(montoPagoInput);
    if (!Number.isFinite(monto) || monto <= 0) {
      setMessage("Ingresá un monto de pago válido (mayor a cero).");
      return;
    }
    const montoUsd =
      metodoInfo.moneda === "BS"
        ? tasaParalelo > 0
          ? monto / tasaParalelo
          : monto
        : monto;
    setPagos([
      ...pagos,
      {
        metodo: metodoInfo.id,
        moneda: metodoInfo.moneda,
        monto: Math.round(monto * 100) / 100,
        monto_usd: Math.round(montoUsd * 100) / 100,
        referencia: referenciaInput.trim() ? referenciaInput.trim() : null,
      },
    ]);
    setMontoPagoInput("");
    setReferenciaInput("");
    setMessage("");
  };
  const alerts = productos.filter(
    (p) => p.stock <= p.stock_minimo && !seen.includes(`${p.id}:${p.stock}`),
  );
  let subtotal = 0,
    total = 0,
    invalid = "";
  try {
    subtotal = cart.reduce(
      (sum, it) => sum + lineTotal(it.precio, it.cantidad, it.descuento),
      0,
    );
    total = totalWithDiscount(subtotal, discount);
  } catch (e) {
    invalid = (e as Error).message;
  }
  const pagosTotal =
    Math.round(pagos.reduce((s, p) => s + p.monto_usd, 0) * 100) / 100;
  const saldoPago = Math.round((total - pagosTotal) * 100) / 100;
  const pagoCuadra = Math.abs(saldoPago) <= 0.01;
  async function load() {
    const { data, error } = await supabase.rpc("app_role");
    if (error) throw error;
    setRole(data || "");
    const fetchedSales = await allRows("pc_ventas", "*,pc_venta_items(*)");
    setSales(fetchedSales as Sale[]);
    if (data === "dueno") {
      setExpenses((await allRows("pc_gastos")) as Expense[]);
      const { data: logs, error: logError } = await supabase
        .from("pc_auditoria")
        .select("*")
        .order("id", { ascending: false })
        .limit(100);
      if (logError) throw logError;
      setAudit(logs || []);
      const { data: people, error: profileError } = await supabase
        .from("perfiles")
        .select("*")
        .order("nombre");
      if (profileError) throw profileError;
      setProfiles(people || []);
    }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage((e as Error).message || "No se pudo completar la operación");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void run(load);
  }, []);
  useEffect(() => {
    const channel = supabase
      .channel("pc-stock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        () => {
          void refresh();
        },
      )
      .subscribe();
    const timer = setInterval(() => {
      void refresh();
    }, 60000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <section className="commerce-panel">
      <div className="commerce-actions">
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            void run(async () => {
              downloadCSV("inventario-purplecat", await allRows("productos"));
            })
          }
        >
          Exportar inventario CSV
        </button>
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            void run(async () => {
              await load();
              await refresh();
            })
          }
        >
          Actualizar
        </button>
      </div>
      {message && (
        <p role="status" className="p-3 border border-violet-400 mb-4">
          {message}
        </p>
      )}
      {alerts.length > 0 && (
        <aside className="border border-amber-700 p-3 mb-4" role="status">
          <strong>Alertas de stock</strong>
          <ul>
            {alerts.map((p) => (
              <li key={p.id}>
                {p.nombre}:{" "}
                {p.stock === 0 ? "Agotado" : `Stock bajo (${p.stock})`}{" "}
                <button
                  className="underline ml-3"
                  onClick={() =>
                    setSeen((prev) => [...prev, `${p.id}:${p.stock}`])
                  }
                >
                  Marcar como vista
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
      {tab === "Facturar" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { data, error } = await supabase.rpc("pc_crear_venta", {
                cliente: customer,
                items: cart.map(({ producto_id, cantidad, descuento }) => ({
                  producto_id,
                  cantidad,
                  descuento,
                })),
                descuento_factura: discount,
                bcv: tasaBCV,
                paralelo: tasaParalelo,
                solicitud: requestId,
                entrega: metodoEntrega,
                pagos: pagos.map((p) => ({
                  metodo: p.metodo,
                  moneda: p.moneda,
                  monto: p.monto,
                  monto_usd: p.monto_usd,
                  referencia: p.referencia,
                })),
              });
              if (error) throw error;
              setRequestId(crypto.randomUUID());
              setCart([]);
              setDiscount(0);
              setCustomer({
                nombre: "",
                telefono: "",
                cedula: "",
                direccion: "",
              });
              setPagos([]);
              setMetodoEntrega(ENTREGA_RETIRO);
              setMessage(`Venta #${data} registrada`);
              await refresh();
              await load();
              setTab("Ventas");
            });
          }}
          className="grid gap-4"
        >
          <h2 className="text-xl">Nueva venta</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {(["nombre", "telefono", "cedula", "direccion"] as const).map(
              (key) => (
                <label key={key}>
                  {
                    {
                      nombre: "Nombre del cliente",
                      telefono: "Teléfono",
                      cedula: "Cédula / RIF",
                      direccion: "Dirección",
                    }[key]
                  }
                  {envioNacional && <em className="text-amber-400"> *</em>}
                  <input
                    className={field}
                    required={key === "nombre" || envioNacional}
                    maxLength={250}
                    value={customer[key]}
                    onChange={(e) =>
                      setCustomer({ ...customer, [key]: e.target.value })
                    }
                    aria-invalid={
                      envioNacional && !customer[key].trim() ? true : undefined
                    }
                  />
                </label>
              ),
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3 items-end">
            <label>
              Tipo de entrega
              <select
                className={field}
                value={metodoEntrega}
                onChange={(e) => setMetodoEntrega(e.target.value)}
                aria-label="Tipo de entrega"
              >
                <option value={ENTREGA_RETIRO}>Retiro en tienda</option>
                <option value={ENTREGA_NACIONAL}>Envío nacional</option>
              </select>
            </label>
            {envioNacional && (
              <p className="text-xs text-amber-300 border border-amber-800 rounded-lg p-2">
                Envío nacional: nombre, cédula/RIF, teléfono y dirección son
                obligatorios para emitir la factura.
              </p>
            )}
          </div>
          <label>
            Agregar producto
            <select
              className={field}
              value=""
              onChange={(e) => {
                const p = productos.find(
                  (p) => p.id === Number(e.target.value),
                );
                if (p)
                  setCart([
                    ...cart,
                    {
                      producto_id: p.id,
                      nombre: p.nombre,
                      precio: Number(p.precio_venta),
                      cantidad: 1,
                      descuento: 0,
                    },
                  ]);
              }}
            >
              <option value="">Seleccionar…</option>
              {productos
                .filter(
                  (p) =>
                    p.stock > 0 && !cart.some((it) => it.producto_id === p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · ${money(p.precio_venta)} · {p.stock}{" "}
                    disponibles
                  </option>
                ))}
            </select>
          </label>
          {cart.map((it, index) => (
            <div
              key={it.producto_id}
              className="grid md:grid-cols-5 gap-3 border-b border-violet-900 pb-3"
            >
              <span>
                {it.nombre}
                <br />${money(it.precio)} c/u
              </span>
              <label>
                Cantidad
                <input
                  className={field}
                  type="number"
                  min="1"
                  step="1"
                  required
                  max={productos.find((p) => p.id === it.producto_id)?.stock}
                  value={it.cantidad}
                  onChange={(e) =>
                    setCart(
                      cart.map((v, i) =>
                        i === index
                          ? { ...v, cantidad: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Descuento de línea ($)
                <input
                  className={field}
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  max={it.precio * it.cantidad}
                  value={it.descuento}
                  onChange={(e) =>
                    setCart(
                      cart.map((v, i) =>
                        i === index
                          ? { ...v, descuento: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <span>${money(it.precio * it.cantidad - it.descuento)}</span>
              <button
                type="button"
                className={button}
                onClick={() => setCart(cart.filter((_, i) => i !== index))}
              >
                Quitar
              </button>
            </div>
          ))}
          <label>
            Descuento adicional de factura ($)
            <input
              className={field}
              required
              type="number"
              min="0"
              step="0.01"
              max={subtotal}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </label>
          <fieldset className="grid gap-3 border border-violet-900/60 rounded-lg p-3">
            <legend className="px-1 font-semibold text-violet-200">
              💳 Métodos de pago (mixto)
            </legend>
            <div className="grid md:grid-cols-4 gap-3 items-end">
              <label>
                Método
                <select
                  className={field}
                  value={metodoSeleccionado}
                  onChange={(e) => setMetodoSeleccionado(e.target.value)}
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Monto{" "}
                {metodoInfo.moneda === "BS"
                  ? `(Bs · 1 $ = ${tasaParalelo} Bs)`
                  : "($)"}
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPagoInput}
                  onChange={(e) => setMontoPagoInput(e.target.value)}
                  placeholder={
                    metodoInfo.moneda === "BS" ? "Bs 0.00" : "$0.00"
                  }
                  aria-label="Monto del pago"
                />
              </label>
              <label>
                Referencia (opcional)
                <input
                  className={field}
                  maxLength={120}
                  value={referenciaInput}
                  onChange={(e) => setReferenciaInput(e.target.value)}
                  placeholder="N° de operación"
                />
              </label>
              <button
                type="button"
                className={button}
                onClick={agregarPago}
              >
                Agregar pago
              </button>
            </div>
            {pagos.length > 0 && (
              <ul className="grid gap-1 text-sm">
                {pagos.map((p, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-900/40 py-1"
                  >
                    <span>
                      {p.metodo}
                      {p.moneda === "BS" &&
                        ` · Bs ${money(p.monto)} (≈ $${money(p.monto_usd)})`}
                      {p.moneda === "USD" && ` · $${money(p.monto)}`}
                      {p.referencia && (
                        <small className="text-zinc-400"> · Ref: {p.referencia}</small>
                      )}
                    </span>
                    <button
                      type="button"
                      className="underline text-red-300"
                      onClick={() => setPagos(pagos.filter((_, j) => j !== i))}
                      aria-label={`Quitar pago ${p.metodo}`}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm">
              Total factura: <strong>${money(total)}</strong> · Pagado: $
              {money(pagosTotal)} ·{" "}
              {pagoCuadra ? (
                <span className="text-emerald-400">✓ Pagos cuadrados</span>
              ) : saldoPago > 0 ? (
                <span className="text-amber-300">
                  Pendiente: ${money(saldoPago)}
                </span>
              ) : (
                <span className="text-red-300">
                  Pagado de más: ${money(Math.abs(saldoPago))}
                </span>
              )}
            </p>
          </fieldset>
          <p>
            Subtotal: ${money(subtotal)} · Total:{" "}
            <strong>${money(total)}</strong> · Bs {money(total * tasaParalelo)}{" "}
            (paralelo {tasaParalelo}; BCV {tasaBCV})
          </p>
          {invalid && <p role="alert">{invalid}</p>}
          <button
            className={button}
            disabled={
              busy ||
              !cart.length ||
              Boolean(invalid) ||
              !role ||
              !pagoCuadra ||
              !envioValido
            }
          >
            {busy ? "Procesando…" : "Registrar venta"}
          </button>
          {(!pagoCuadra || !envioValido) && cart.length > 0 && (
            <p className="text-xs text-amber-300" role="status">
              {!pagoCuadra &&
                "Los pagos deben sumar exactamente el total de la factura. "}
              {!envioValido &&
                "Para envío nacional completá nombre, cédula/RIF, teléfono y dirección."}
            </p>
          )}
        </form>
      )}
      {tab === "Ventas" && (
        <div className="grid gap-3">
          <h2 className="text-xl">Ventas</h2>
          <p>
            Ventas vigentes: $
            {money(
              sales
                .filter((s) => s.estado === "completa")
                .reduce((sum, s) => sum + Number(s.total), 0),
            )}{" "}
            · Devueltas: {sales.filter((s) => s.estado === "devuelta").length}
          </p>
          <button
            className={button}
            onClick={() =>
              void run(async () => {
                downloadCSV(
                  "ventas-purplecat",
                  sales.map((sale) => ({
                    id: sale.id,
                    fecha: sale.created_at,
                    cliente: sale.cliente_nombre,
                    telefono: sale.cliente_telefono,
                    cedula: sale.cliente_cedula,
                    direccion: sale.cliente_direccion,
                    estado: sale.estado,
                    subtotal: sale.pc_venta_items.reduce(
                      (sum, it) => sum + Number(it.precio) * it.cantidad,
                      0,
                    ),
                    descuento_lineas: sale.pc_venta_items.reduce(
                      (sum, it) => sum + Number(it.descuento),
                      0,
                    ),
                    descuento_factura: sale.descuento,
                    total_usd: sale.total,
                    tasa_bcv: sale.tasa_bcv,
                    tasa_paralelo: sale.tasa_paralelo,
                    total_bs: Number(sale.total) * Number(sale.tasa_paralelo),
                    metodo_entrega: sale.metodo_entrega ?? "Retiro en tienda",
                    metodos_pago: (sale.metodos_pago ?? [])
                      .map(
                        (p) =>
                          `${p.metodo} $${money(p.monto_usd)}${p.referencia ? ` (ref ${p.referencia})` : ""}`,
                      )
                      .join(" | "),
                    motivo_devolucion: sale.motivo_devolucion,
                  })),
                );
              })
            }
          >
            Exportar ventas CSV
          </button>
          {sales.length === 0 && <p>No hay ventas registradas.</p>}
          {sales.map((s) => (
            <article
              key={s.id}
              className="flex flex-wrap justify-between gap-3 border-b border-violet-900 p-3"
            >
              <div>
                #{s.id} · {s.cliente_nombre} · ${money(s.total)} · {s.estado}
                <br />
                <small>
                  {new Date(s.created_at).toLocaleString("es-VE")}
                  {s.motivo_devolucion && ` · ${s.motivo_devolucion}`}
                </small>
                <br />
                <small>
                  🚚 {s.metodo_entrega ?? "Retiro en tienda"}
                  {s.metodos_pago && s.metodos_pago.length > 0
                    ? ` · 💳 ${s.metodos_pago
                        .map((p) => `${p.metodo} $${money(p.monto_usd)}`)
                        .join(" + ")}`
                    : ""}
                </small>
              </div>
              <div className="flex gap-2">
                <button className={button} onClick={() => setReceipt(s)}>
                  Factura / PDF
                </button>
                {role === "dueno" && s.estado === "completa" && (
                  <button
                    className={button}
                    onClick={() => {
                      setReturnSale(s);
                      setReason("");
                    }}
                  >
                    Devolver / anular
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "Gastos" && role === "dueno" && (
        <div className="grid gap-4">
          <h2 className="text-xl">Gastos operativos</h2>
          <form
            className="grid md:grid-cols-5 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const { error } = await supabase
                  .from("pc_gastos")
                  .insert({ ...expense, monto: Number(expense.monto) });
                if (error) throw error;
                setExpense({ ...expense, concepto: "", monto: "" });
                await load();
                setMessage("Gasto registrado");
              });
            }}
          >
            <label>
              Fecha
              <input
                className={field}
                type="date"
                required
                value={expense.fecha}
                onChange={(e) =>
                  setExpense({ ...expense, fecha: e.target.value })
                }
              />
            </label>
            <label>
              Concepto
              <input
                className={field}
                required
                maxLength={250}
                value={expense.concepto}
                onChange={(e) =>
                  setExpense({ ...expense, concepto: e.target.value })
                }
              />
            </label>
            <label>
              Categoría
              <select
                className={field}
                value={expense.categoria}
                onChange={(e) =>
                  setExpense({ ...expense, categoria: e.target.value })
                }
              >
                {["Envíos", "Empaque", "Comisiones", "Otros"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Monto ($)
              <input
                className={field}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={expense.monto}
                onChange={(e) =>
                  setExpense({ ...expense, monto: e.target.value })
                }
              />
            </label>
            <button disabled={busy} className={button}>
              Registrar gasto
            </button>
          </form>
          <p>
            Total gastos: $
            {money(expenses.reduce((sum, e) => sum + Number(e.monto), 0))}
          </p>
          <button
            className={button}
            onClick={() =>
              void run(async () => downloadCSV("gastos-purplecat", expenses))
            }
          >
            Exportar gastos CSV
          </button>
          {expenses.map((e) => (
            <p key={e.id}>
              {e.fecha} · {e.categoria} · {e.concepto} · ${money(e.monto)}
            </p>
          ))}
        </div>
      )}
      {tab === "Historial" && role === "dueno" && (
        <div>
          <h2 className="text-xl mb-3">Últimos 100 cambios</h2>
          {audit.map((a) => (
            <details key={a.id} className="border-b border-violet-900 py-2">
              <summary>
                {new Date(a.created_at).toLocaleString("es-VE")} · {a.tabla} #
                {a.registro_id} · {a.accion} ·{" "}
                {profiles.find((p) => p.id === a.usuario)?.nombre ||
                  a.usuario ||
                  "SQL / sistema"}
              </summary>
              <pre className="overflow-auto text-xs">
                {JSON.stringify(
                  { antes: a.antes, despues: a.despues },
                  null,
                  2,
                )}
              </pre>
            </details>
          ))}
        </div>
      )}
      {tab === "Usuarios" && role === "dueno" && (
        <div className="grid gap-3">
          <h2 className="text-xl">Roles de acceso</h2>
          <p>
            El dueño administra inventario, gastos, devoluciones y roles. El
            empleado consulta inventario y registra ventas. Las cuentas nuevas
            se crean desde Supabase Authentication y se agregan a perfiles.
          </p>
          {profiles.map((p) => (
            <label key={p.id} className="flex flex-wrap gap-3">
              {p.nombre}
              <select
                className={field + " max-w-xs"}
                value={p.rol}
                disabled={busy}
                onChange={(e) => {
                  const rol = e.target.value;
                  void run(async () => {
                    const { data, error } = await supabase
                      .from("perfiles")
                      .update({ rol })
                      .eq("id", p.id)
                      .select("id");
                    if (error) throw error;
                    if (!data?.length)
                      throw new Error("No podés cambiar tu propio rol");
                    await load();
                  });
                }}
              >
                <option value="dueno">Dueño</option>
                <option value="empleado">Empleado</option>
              </select>
            </label>
          ))}
        </div>
      )}
      {returnSale && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Devolver venta"
          className="fixed inset-0 z-50 bg-black/90 p-6 overflow-auto"
        >
          <form
            className="max-w-lg mx-auto grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const { error } = await supabase.rpc("pc_devolver_venta", {
                  venta: returnSale.id,
                  motivo: reason,
                });
                if (error) throw error;
                setReturnSale(null);
                await refresh();
                await load();
                setMessage("Venta devuelta; stock restaurado");
              });
            }}
          >
            <h2 className="text-xl">Devolver venta #{returnSale.id}</h2>
            <p>
              Se devolverá la venta completa por ${money(returnSale.total)} y se
              restaurarán todas sus unidades. Registrá el reembolso al cliente
              fuera de la aplicación.
            </p>
            <label>
              Motivo
              <textarea
                className={field}
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className={button} disabled={busy}>
              Confirmar devolución completa
            </button>
            <button
              type="button"
              className={button}
              onClick={() => setReturnSale(null)}
            >
              Cancelar
            </button>
            <p role="alert">{message}</p>
          </form>
        </div>
      )}
      {receipt &&
        createPortal(
          <div
            className="pc-receipt-overlay fixed inset-0 z-50 bg-black/90 overflow-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Factura"
          >
            <article className="pc-receipt max-w-3xl mx-auto bg-white text-black p-8">
              <h1 className="text-2xl">
                Purple Cat · Comprobante #{receipt.id}
              </h1>
              <p>
                {new Date(receipt.created_at).toLocaleString("es-VE")} ·{" "}
                {receipt.estado}
              </p>
              <p>
                {receipt.cliente_nombre} · {receipt.cliente_cedula}
                <br />
                {receipt.cliente_telefono}
                <br />
                {receipt.cliente_direccion}
              </p>
              <p>
                Tipo de entrega: {receipt.metodo_entrega ?? "Retiro en tienda"}
              </p>
              <table className="w-full my-6">
                <thead>
                  <tr>
                    {[
                      "Producto",
                      "Cant.",
                      "Precio $",
                      "Desc. $",
                      "Total $",
                    ].map((h) => (
                      <th key={h} className="text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receipt.pc_venta_items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.nombre}</td>
                      <td>{it.cantidad}</td>
                      <td>{money(it.precio)}</td>
                      <td>{money(it.descuento)}</td>
                      <td>
                        {money(
                          Number(it.precio) * it.cantidad -
                            Number(it.descuento),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Descuento adicional: ${money(receipt.descuento)}</p>
              {receipt.metodos_pago && receipt.metodos_pago.length > 0 && (
                <div>
                  <p className="font-bold">Desglose de pagos:</p>
                  <ul>
                    {receipt.metodos_pago.map((p, i) => (
                      <li key={i}>
                        • {p.metodo}
                        {p.moneda === "BS"
                          ? ` · Bs ${money(p.monto)}`
                          : ` · $${money(p.monto_usd)}`}
                        {p.referencia && ` · Ref: ${p.referencia}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xl">Total: ${money(receipt.total)}</p>
              {receipt.motivo_devolucion && (
                <p>Devolución: {receipt.motivo_devolucion}</p>
              )}
              <div className="pc-no-print flex gap-3 mt-6">
                <button
                  className={button + " text-white"}
                  onClick={() => window.print()}
                >
                  Imprimir / Guardar como PDF
                </button>
                <button
                  className={button + " text-white"}
                  onClick={() => setReceipt(null)}
                >
                  Cerrar
                </button>
              </div>
            </article>
          </div>,
          document.body,
        )}
      <style>{`@media print { body > *:not(.pc-receipt-overlay) { display: none!important; } body { background: white!important; } .pc-receipt-overlay { position: absolute!important; inset: 0!important; padding: 0!important; background: white!important; overflow: visible!important; } .pc-receipt { max-width: none!important; color: black!important; } .pc-no-print, .pc-no-print * { display: none!important; } @page { margin: 15mm; } }`}</style>
    </section>
  );
}
