'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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

const CATEGORIAS = [
  'Corsets',
  'Vestidos',
  'Remeras/Tops',
  'Pantalones/Faldas',
  'Abrigos/Capas',
  'Accesorios/Gargantillas',
  'Calzado',
]
const TALLAS = ['XS', 'S', 'M', 'L', 'XL']
const STOCK_BAJO = 3
const CLAVE_STORAGE = 'purple-cat-inventario-v1'
const CLAVE_LOGO = 'purple-cat-logo-v1'

const EJEMPLOS: Prenda[] = [
  { id: '1', nombre: 'Corset victoriano de encaje', sku: 'COR-001', categoria: 'Corsets', talla: 'S', color: 'Negro', costo: 18000, venta: 39900, stock: 7 },
  { id: '2', nombre: 'Vestido terciopelo largo', sku: 'VES-013', categoria: 'Vestidos', talla: 'M', color: 'Bordó', costo: 22000, venta: 48500, stock: 2 },
  { id: '3', nombre: 'Top de malla con mangas', sku: 'TOP-021', categoria: 'Remeras/Tops', talla: 'M', color: 'Negro', costo: 6500, venta: 14900, stock: 11 },
  { id: '4', nombre: 'Falda plisada con hebillas', sku: 'FAL-008', categoria: 'Pantalones/Faldas', talla: 'L', color: 'Violeta', costo: 9800, venta: 21900, stock: 0 },
  { id: '5', nombre: 'Capa con capucha', sku: 'CAP-003', categoria: 'Abrigos/Capas', talla: 'XL', color: 'Negro', costo: 26000, venta: 57000, stock: 4 },
  { id: '6', nombre: 'Gargantilla de terciopelo', sku: 'ACC-045', categoria: 'Accesorios/Gargantillas', talla: 'S', color: 'Púrpura', costo: 1800, venta: 5500, stock: 1 },
]

const FORM_VACIO: Formulario = {
  nombre: '', sku: '', categoria: CATEGORIAS[0], talla: 'M', color: '', costo: '', venta: '', stock: '0',
}

const dinero = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const campo =
  'w-full rounded-lg border border-violet-500/25 bg-[#0d0716] px-3 py-2.5 text-sm text-violet-50 placeholder:text-violet-300/40 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/25 [color-scheme:dark]'
const btnPrimario =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-2px_rgba(168,85,247,0.7)] transition hover:bg-violet-500 hover:shadow-[0_0_26px_0_rgba(192,132,252,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300'
const btnSecundario =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:border-fuchsia-400 hover:bg-violet-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300'

function redimensionarImagen(archivo: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'))
    lector.onload = () => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no disponible'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}

export default function InventarioPage() {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [cargado, setCargado] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [errorLogo, setErrorLogo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTalla, setFiltroTalla] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<Formulario>(FORM_VACIO)
  const [error, setError] = useState('')
  const [aEliminar, setAEliminar] = useState<Prenda | null>(null)
  const inputLogo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE)
      setPrendas(guardado ? JSON.parse(guardado) : EJEMPLOS)
      setLogo(localStorage.getItem(CLAVE_LOGO))
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

  async function cambiarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) return setErrorLogo('El archivo debe ser una imagen.')
    try {
      const dataUrl = await redimensionarImagen(archivo)
      localStorage.setItem(CLAVE_LOGO, dataUrl)
      setLogo(dataUrl)
      setErrorLogo('')
    } catch {
      setErrorLogo('No se pudo cargar el logo. Probá con otra imagen.')
    }
  }

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

  const categoriasForm = CATEGORIAS.includes(form.categoria) ? CATEGORIAS : [form.categoria, ...CATEGORIAS]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08040d] text-violet-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.28),transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
        <header className="flex flex-col gap-5 border-b border-violet-500/20 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => inputLogo.current?.click()}
              aria-label="Cambiar logo de Purple cat"
              className="group relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-fuchsia-500/60 bg-[#140b20] shadow-[0_0_24px_-4px_rgba(192,38,211,0.8)] transition hover:border-fuchsia-300 md:size-20"
            >
              <img src={logo ?? '/logo-purple-cat.png'} alt="Logo de Purple cat" className="size-full object-cover" />
            </button>
            <div className="min-w-0">
              <h1 className="font-gothic text-balance text-4xl leading-none text-violet-50 drop-shadow-[0_0_12px_rgba(192,132,252,0.55)] md:text-5xl">
                Purple cat
              </h1>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80 md:text-sm">
                Control de Inventario - Ropa Gótica
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => inputLogo.current?.click()} className={btnSecundario}>
                <IconoImagen />
                Cambiar Logo
              </button>
              <button type="button" onClick={abrirNueva} className={btnPrimario}>
                <span aria-hidden="true" className="text-lg leading-none">+</span>
                Agregar prenda
              </button>
            </div>
            {errorLogo && <p role="alert" className="text-xs text-rose-400">{errorLogo}</p>}
            <input ref={inputLogo} type="file" accept="image/*" onChange={cambiarLogo} className="sr-only" tabIndex={-1} aria-hidden="true" />
          </div>
        </header>

        <section aria-label="Resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <Tarjeta titulo="Prendas en stock" valor={resumen.unidades.toLocaleString('es-AR')} detalle={`${prendas.length} artículos distintos`} />
          <Tarjeta titulo="Valor del inventario" valor={dinero.format(resumen.valor)} detalle={`Costo: ${dinero.format(resumen.costo)}`} />
          <Tarjeta titulo="Prendas agotadas" valor={String(resumen.agotadas)} detalle={`${resumen.bajas} con stock bajo`} alerta={resumen.agotadas > 0} />
        </section>

        <section aria-label="Filtros" className="flex flex-col gap-3 rounded-xl border border-violet-500/20 bg-[#140d1f]/80 p-3 backdrop-blur md:flex-row">
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
          <p className="mb-3 text-sm text-violet-300/70" aria-live="polite">
            {cargado ? `Mostrando ${filtradas.length} de ${prendas.length} prendas` : 'Cargando...'}
          </p>

          {cargado && filtradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-500/30 bg-[#140d1f] p-10 text-center text-sm text-violet-300/70">
              No se encontraron prendas.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {filtradas.map((p) => {
                const bajo = p.stock < STOCK_BAJO
                return (
                  <li
                    key={p.id}
                    className={`flex flex-col gap-4 rounded-xl border bg-gradient-to-b from-[#1a1128] to-[#120b1c] p-4 transition ${
                      bajo
                        ? 'border-red-500/70 shadow-[0_0_20px_-6px_rgba(239,68,68,0.7)]'
                        : 'border-violet-500/25 hover:border-violet-400/60 hover:shadow-[0_0_22px_-8px_rgba(168,85,247,0.8)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-violet-50">{p.nombre}</h2>
                        <p className="font-mono text-xs text-violet-300/60">{p.sku}</p>
                      </div>
                      {bajo && (
                        <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
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
                        <dt className="text-xs text-violet-300/60">Costo</dt>
                        <dd className="text-violet-200">{dinero.format(p.costo)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-violet-300/60">Venta</dt>
                        <dd className="font-semibold text-fuchsia-200">{dinero.format(p.venta)}</dd>
                      </div>
                    </dl>

                    <div className="flex items-center justify-between gap-3 border-t border-violet-500/15 pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ajustarStock(p.id, -1)}
                          disabled={p.stock === 0}
                          aria-label={`Restar una unidad de ${p.nombre} (venta)`}
                          className="size-10 rounded-lg bg-rose-900 text-sm font-bold text-rose-50 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          -1
                        </button>
                        <span
                          className={`min-w-12 text-center text-2xl font-bold tabular-nums ${bajo ? 'text-red-500' : 'text-violet-50'}`}
                          aria-label={`Stock actual: ${p.stock}`}
                        >
                          {p.stock}
                        </span>
                        <button
                          onClick={() => ajustarStock(p.id, 1)}
                          aria-label={`Sumar una unidad de ${p.nombre} (compra)`}
                          className="size-10 rounded-lg bg-violet-600 text-sm font-bold text-white shadow-[0_0_14px_-2px_rgba(168,85,247,0.8)] transition hover:bg-violet-500"
                        >
                          +1
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicion(p)} className="rounded-lg px-3 py-2 text-sm text-violet-200 transition hover:bg-violet-500/15">
                          Editar
                        </button>
                        <button onClick={() => setAEliminar(p)} className="rounded-lg px-3 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10">
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

        <footer className="pt-2 text-center text-xs text-violet-300/40">
          Los datos se guardan automáticamente en este dispositivo.
        </footer>
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
                  {categoriasForm.map((c) => <option key={c}>{c}</option>)}
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
            {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setModalAbierto(false)} className={btnSecundario}>
                Cancelar
              </button>
              <button type="submit" className={btnPrimario}>
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {aEliminar && (
        <Modal titulo="Eliminar prenda" onCerrar={() => setAEliminar(null)}>
          <p className="text-sm text-violet-200/80">
            {'¿Seguro que querés eliminar '}<strong className="text-violet-50">{aEliminar.nombre}</strong>{` (${aEliminar.sku})? Esta acción no se puede deshacer.`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAEliminar(null)} className={btnSecundario}>Cancelar</button>
            <button onClick={confirmarEliminar} className="rounded-lg bg-rose-900 px-4 py-2.5 text-sm font-semibold text-rose-50 transition hover:bg-rose-800">
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
    <div
      className={`rounded-xl border p-4 md:p-5 ${
        alerta ? 'border-red-500/50 bg-gradient-to-b from-red-950/60 to-[#140d1f]' : 'border-violet-500/25 bg-gradient-to-b from-[#1c1230] to-[#120b1c]'
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-widest ${alerta ? 'text-red-300' : 'text-violet-300/70'}`}>{titulo}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums md:text-3xl ${alerta ? 'text-red-400' : 'text-violet-50'}`}>{valor}</p>
      <p className="mt-1 text-xs text-violet-300/60">{detalle}</p>
    </div>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-violet-200">{children}</span>
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-violet-300/80">{etiqueta}</span>
      {children}
    </label>
  )
}

function IconoImagen() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-violet-500/40 bg-[#140d1f] p-5 text-violet-50 shadow-[0_0_40px_-10px_rgba(168,85,247,0.8)] sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-gothic text-2xl text-violet-50">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg px-2 py-1 text-violet-300 hover:bg-violet-500/15">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
