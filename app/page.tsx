'use client'

import { useEffect, useMemo, useState } from 'react'

type Prenda = {
  id: string
  nombre: string
  sku: string
  categoria: string
  talla: string
  color: string
  costo: number
  venta: number
  stock: number
}

type Formulario = Omit<Prenda, 'id' | 'costo' | 'venta' | 'stock'> & {
  costo: string
  venta: string
  stock: string
}

const CATEGORIAS = ['Remeras', 'Pantalones', 'Vestidos', 'Camisas', 'Buzos', 'Camperas', 'Faldas', 'Accesorios']
const TALLAS = ['XS', 'S', 'M', 'L', 'XL']
const STOCK_BAJO = 3
const CLAVE_STORAGE = 'inventario-ropa-v1'

const EJEMPLOS: Prenda[] = [
  { id: '1', nombre: 'Remera básica algodón', sku: 'REM-001', categoria: 'Remeras', talla: 'M', color: 'Blanco', costo: 4500, venta: 9900, stock: 12 },
  { id: '2', nombre: 'Jean recto clásico', sku: 'PAN-014', categoria: 'Pantalones', talla: 'L', color: 'Azul', costo: 12000, venta: 24900, stock: 2 },
  { id: '3', nombre: 'Vestido floral midi', sku: 'VES-007', categoria: 'Vestidos', talla: 'S', color: 'Rosa', costo: 15000, venta: 32000, stock: 0 },
  { id: '4', nombre: 'Buzo oversize', sku: 'BUZ-021', categoria: 'Buzos', talla: 'XL', color: 'Negro', costo: 11000, venta: 21500, stock: 6 },
]

const FORM_VACIO: Formulario = {
  nombre: '', sku: '', categoria: CATEGORIAS[0], talla: 'M', color: '', costo: '', venta: '', stock: '0',
}

const dinero = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export default function InventarioPage() {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [cargado, setCargado] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTalla, setFiltroTalla] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<Formulario>(FORM_VACIO)
  const [error, setError] = useState('')
  const [aEliminar, setAEliminar] = useState<Prenda | null>(null)

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE)
      setPrendas(guardado ? JSON.parse(guardado) : EJEMPLOS)
    } catch {
      setPrendas(EJEMPLOS)
    }
    setCargado(true)
  }, [])

  useEffect(() => {
    if (cargado) localStorage.setItem(CLAVE_STORAGE, JSON.stringify(prendas))
  }, [prendas, cargado])

  const resumen = useMemo(() => ({
    unidades: prendas.reduce((t, p) => t + p.stock, 0),
    valor: prendas.reduce((t, p) => t + p.stock * p.venta, 0),
    costo: prendas.reduce((t, p) => t + p.stock * p.costo, 0),
    agotadas: prendas.filter((p) => p.stock === 0).length,
    bajas: prendas.filter((p) => p.stock > 0 && p.stock < STOCK_BAJO).length,
  }), [prendas])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return prendas.filter((p) => {
      const coincide = !q || [p.nombre, p.color, p.sku].some((v) => v.toLowerCase().includes(q))
      return coincide && (!filtroTalla || p.talla === filtroTalla) && (!filtroCategoria || p.categoria === filtroCategoria)
    })
  }, [prendas, busqueda, filtroTalla, filtroCategoria])

  function ajustarStock(id: string, delta: number) {
    setPrendas((prev) => prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)))
  }

  function abrirNueva() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setError('')
    setModalAbierto(true)
  }

  function abrirEdicion(p: Prenda) {
    setEditandoId(p.id)
    setForm({ ...p, costo: String(p.costo), venta: String(p.venta), stock: String(p.stock) })
    setError('')
    setModalAbierto(true)
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    const costo = Number(form.costo)
    const venta = Number(form.venta)
    const stock = Number(form.stock)
    const sku = form.sku.trim().toUpperCase()

    if (!form.nombre.trim() || !sku || !form.color.trim()) return setError('Completá nombre, SKU y color.')
    if ([costo, venta].some((n) => !Number.isFinite(n) || n < 0)) return setError('Los precios deben ser números positivos.')
    if (!Number.isInteger(stock) || stock < 0) return setError('El stock debe ser un número entero mayor o igual a 0.')
    if (prendas.some((p) => p.sku === sku && p.id !== editandoId)) return setError('Ya existe una prenda con ese SKU.')

    const datos = { nombre: form.nombre.trim(), sku, categoria: form.categoria, talla: form.talla, color: form.color.trim(), costo, venta, stock }
    setPrendas((prev) =>
      editandoId ? prev.map((p) => (p.id === editandoId ? { ...p, ...datos } : p)) : [{ id: crypto.randomUUID(), ...datos }, ...prev],
    )
    setModalAbierto(false)
  }

  function confirmarEliminar() {
    if (aEliminar) setPrendas((prev) => prev.filter((p) => p.id !== aEliminar.id))
    setAEliminar(null)
  }

  const campo = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10'

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Tienda de ropa</p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Gestión de inventario</h1>
          </div>
          <button
            onClick={abrirNueva}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Agregar prenda
          </button>
        </header>

        <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tarjeta titulo="Prendas en stock" valor={resumen.unidades.toLocaleString('es-AR')} detalle={`${prendas.length} artículos distintos`} />
          <Tarjeta titulo="Valor del inventario" valor={dinero.format(resumen.valor)} detalle={`Costo: ${dinero.format(resumen.costo)}`} />
          <Tarjeta
            titulo="Prendas agotadas"
            valor={String(resumen.agotadas)}
            detalle={`${resumen.bajas} con stock bajo`}
            alerta={resumen.agotadas > 0}
          />
        </section>

        <section aria-label="Filtros" className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 md:flex-row">
          <label className="flex-1">
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, color o SKU..."
              className={campo}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <label>
              <span className="sr-only">Filtrar por categoría</span>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={campo}>
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por talla</span>
              <select value={filtroTalla} onChange={(e) => setFiltroTalla(e.target.value)} className={campo}>
                <option value="">Todas las tallas</option>
                {TALLAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section aria-label="Catálogo de prendas">
          <p className="mb-3 text-sm text-stone-500" aria-live="polite">
            {cargado ? `Mostrando ${filtradas.length} de ${prendas.length} prendas` : 'Cargando...'}
          </p>

          {cargado && filtradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
              No se encontraron prendas.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtradas.map((p) => {
                const bajo = p.stock < STOCK_BAJO
                return (
                  <li
                    key={p.id}
                    className={`flex flex-col gap-4 rounded-xl border bg-white p-4 transition ${bajo ? 'border-red-300 ring-1 ring-red-200' : 'border-stone-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-medium">{p.nombre}</h2>
                        <p className="font-mono text-xs text-stone-500">{p.sku}</p>
                      </div>
                      {bajo && (
                        <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {p.stock === 0 ? 'Agotado' : 'Stock bajo'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Etiqueta>{p.categoria}</Etiqueta>
                      <Etiqueta>Talla {p.talla}</Etiqueta>
                      <Etiqueta>{p.color}</Etiqueta>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-stone-500">Costo</dt>
                        <dd>{dinero.format(p.costo)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-stone-500">Venta</dt>
                        <dd className="font-medium">{dinero.format(p.venta)}</dd>
                      </div>
                    </dl>

                    <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ajustarStock(p.id, -1)}
                          disabled={p.stock === 0}
                          aria-label={`Restar una unidad de ${p.nombre} (venta)`}
                          className="size-9 rounded-lg border border-stone-300 text-sm font-semibold transition hover:bg-stone-100 disabled:opacity-40"
                        >
                          -1
                        </button>
                        <span
                          className={`min-w-12 text-center text-xl font-semibold tabular-nums ${bajo ? 'text-red-600' : ''}`}
                          aria-label={`Stock actual: ${p.stock}`}
                        >
                          {p.stock}
                        </span>
                        <button
                          onClick={() => ajustarStock(p.id, 1)}
                          aria-label={`Sumar una unidad de ${p.nombre} (compra)`}
                          className="size-9 rounded-lg bg-stone-900 text-sm font-semibold text-white transition hover:bg-stone-700"
                        >
                          +1
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicion(p)} className="rounded-lg px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100">
                          Editar
                        </button>
                        <button onClick={() => setAEliminar(p)} className="rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {modalAbierto && (
        <Modal titulo={editandoId ? 'Editar prenda' : 'Nueva prenda'} onCerrar={() => setModalAbierto(false)}>
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <Campo etiqueta="Nombre">
              <input className={campo} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="SKU">
                <input className={`${campo} font-mono uppercase`} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Campo>
              <Campo etiqueta="Color">
                <input className={campo} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </Campo>
              <Campo etiqueta="Categoría">
                <select className={campo} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Talla">
                <select className={campo} value={form.talla} onChange={(e) => setForm({ ...form, talla: e.target.value })}>
                  {TALLAS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Precio costo">
                <input className={campo} type="number" min="0" step="any" inputMode="decimal" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Precio venta">
                <input className={campo} type="number" min="0" step="any" inputMode="decimal" value={form.venta} onChange={(e) => setForm({ ...form, venta: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Stock actual">
              <input className={campo} type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </Campo>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-stone-100">
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {aEliminar && (
        <Modal titulo="Eliminar prenda" onCerrar={() => setAEliminar(null)}>
          <p className="text-sm text-stone-600">
            {'¿Seguro que querés eliminar '}<strong className="text-stone-900">{aEliminar.nombre}</strong>{` (${aEliminar.sku})? Esta acción no se puede deshacer.`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAEliminar(null)} className="rounded-lg px-4 py-2 text-sm hover:bg-stone-100">Cancelar</button>
            <button onClick={confirmarEliminar} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}

function Tarjeta({ titulo, valor, detalle, alerta }: { titulo: string; valor: string; detalle: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alerta ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}>
      <p className={`text-sm ${alerta ? 'text-red-700' : 'text-stone-500'}`}>{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${alerta ? 'text-red-600' : ''}`}>{valor}</p>
      <p className="mt-1 text-xs text-stone-500">{detalle}</p>
    </div>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-stone-100 px-2 py-1 text-stone-700">{children}</span>
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-600">{etiqueta}</span>
      {children}
    </label>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-stone-900 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
