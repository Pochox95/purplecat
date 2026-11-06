'use client'

import React, { useState, useMemo } from 'react'
import { Producto, Sale, supabase } from '@/lib/supabase'

interface CommerceProps {
  productos: Producto[]
  sales: Sale[]
  tasaBCV: number
  tasaParalelo: number
  onRefreshData: () => void
}

interface ItemCarrito {
  producto: Producto
  cantidad: number
  precioAplicadoUSD: number
}

interface PagoDesglosado {
  id: string
  metodo: string
  montoUSD: number
  montoBs: number
  referencia?: string
}

const METODOS_PAGO = [
  { id: 'Efectivo $', nombre: 'Efectivo ($ USD)', moneda: 'USD' },
  { id: 'Pago Móvil (Bs)', nombre: 'Pago Móvil (Bs)', moneda: 'BS' },
  { id: 'Efectivo (Bs)', nombre: 'Efectivo (Bs)', moneda: 'BS' },
  { id: 'USDT (Binance)', nombre: 'USDT (Binance)', moneda: 'USD' },
  { id: 'Zinli', nombre: 'Zinli ($ USD)', moneda: 'USD' },
  { id: 'PayPal', nombre: 'PayPal ($ USD)', moneda: 'USD' },
  { id: 'Zelle', nombre: 'Zelle ($ USD)', moneda: 'USD' },
]

const AGENCIAS_ENVIO = [
  { id: 'Retiro Personal', nombre: 'Retiro Personal / Entrega Local', requiereDatos: false },
  { id: 'MRW', nombre: 'Envío Nacional — MRW', requiereDatos: true },
  { id: 'Zoom', nombre: 'Envío Nacional — ZOOM', requiereDatos: true },
  { id: 'Tealca', nombre: 'Envío Nacional — TEALCA', requiereDatos: true },
]

export default function Commerce({
  productos,
  sales,
  tasaBCV,
  tasaParalelo,
  onRefreshData,
}: CommerceProps) {
  // Carrito de facturación
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Datos del Cliente y Envío
  const [metodoEntrega, setMetodoEntrega] = useState<string>('Retiro Personal')
  const [nombreCliente, setNombreCliente] = useState('')
  const [cedulaCliente, setCedulaCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [direccionEnvio, setDireccionEnvio] = useState('')

  // Pagos mixtos desglosados
  const [pagos, setPagos] = useState<PagoDesglosado[]>([])
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('Pago Móvil (Bs)')
  const [montoPagoInput, setMontoPagoInput] = useState<string>('')
  const [referenciaInput, setReferenciaInput] = useState<string>('')

  // Estado de procesamiento
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Agencia seleccionada actualmente
  const agenciaActual = useMemo(() => {
    return AGENCIAS_ENVIO.find(a => a.id === metodoEntrega) || AGENCIAS_ENVIO[0]
  }, [metodoEntrega])

  // Cálculo total del carrito en USD
  const totalCarritoUSD = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.precioAplicadoUSD * item.cantidad, 0)
  }, [carrito])

  // Total pagado acumulado en USD
  const totalPagadoUSD = useMemo(() => {
    return pagos.reduce((sum, p) => sum + p.montoUSD, 0)
  }, [pagos])

  // Saldo restante por cobrar en USD
  const saldoRestanteUSD = useMemo(() => {
    const diff = totalCarritoUSD - totalPagadoUSD
    return diff > 0.001 ? diff : 0
  }, [totalCarritoUSD, totalPagadoUSD])

  // Equivalente total del pedido a Tasa BCV (para factura oficial)
  const totalCarritoBsBCV = useMemo(() => {
    return totalCarritoUSD * (tasaBCV || 1)
  }, [totalCarritoUSD, tasaBCV])

  // Agregar producto al carrito
  const agregarAlCarrito = (prod: Producto) => {
    if (prod.stock <= 0) return
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === prod.id)
      if (existe) {
        if (existe.cantidad >= prod.stock) return prev
        return prev.map(i =>
          i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { producto: prod, cantidad: 1, precioAplicadoUSD: prod.precio_venta }]
    })
  }

  // Quitar del carrito
  const quitarDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(i => i.producto.id !== id))
  }

  // Cambiar cantidad
  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev =>
      prev
        .map(i => {
          if (i.producto.id === id) {
            const nuevaCant = i.cantidad + delta
            if (nuevaCant <= 0) return null
            if (nuevaCant > i.producto.stock) return i
            return { ...i, cantidad: nuevaCant }
          }
          return i
        })
        .filter(Boolean) as ItemCarrito[]
    )
  }

  // Añadir un pago a la lista mixta
  const agregarPago = () => {
    const val = parseFloat(montoPagoInput)
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.')
      return
    }

    const metodoObj = METODOS_PAGO.find(m => m.id === metodoSeleccionado)
    const esMonedaBs = metodoObj?.moneda === 'BS'

    let montoUSD = 0
    let montoBs = 0

    if (esMonedaBs) {
      montoBs = val
      // Conversión preserving margin: si se cobra en Bs, el valor en USD relativo al BCV
      montoUSD = val / (tasaBCV || 1)
    } else {
      montoUSD = val
      montoBs = val * (tasaBCV || 1)
    }

    if (montoUSD > saldoRestanteUSD + 0.05) {
      setErrorMsg(`El monto ingresado ($${montoUSD.toFixed(2)}) supera el saldo restante ($${saldoRestanteUSD.toFixed(2)}).`)
      return
    }

    const nuevoPago: PagoDesglosado = {
      id: Math.random().toString(36).substring(2, 9),
      metodo: metodoSeleccionado,
      montoUSD,
      montoBs,
      referencia: referenciaInput.trim() || undefined,
    }

    setPagos(prev => [...prev, nuevoPago])
    setMontoPagoInput('')
    setReferenciaInput('')
    setErrorMsg('')
  }

  // Eliminar un pago ingresado
  const eliminarPago = (id: string) => {
    setPagos(prev => prev.filter(p => p.id !== id))
  }

  // Validación previa antes de facturar
  const esFormularioValido = useMemo(() => {
    if (carrito.length === 0) return false
    if (!nombreCliente.trim()) return false
    if (saldoRestanteUSD > 0.01) return false
    if (agenciaActual.requiereDatos) {
      if (!cedulaCliente.trim() || !telefonoCliente.trim() || !direccionEnvio.trim()) {
        return false
      }
    }
    return true
  }, [carrito, nombreCliente, saldoRestanteUSD, agenciaActual, cedulaCliente, telefonoCliente, direccionEnvio])

  // Generador e Impresor de Factura / PDF de Cliente (Opción A)
  const generarPDFCliente = (saleData: any) => {
    const fecha = new Date().toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const itemsHTML = carrito
      .map(
        i => `
        <tr style="border-bottom: 1px solid #2a2a3d;">
          <td style="padding: 10px; font-weight: 500;">${i.producto.nombre} <br><span style="font-size:11px; color:#888;">SKU: ${i.producto.sku}</span></td>
          <td style="padding: 10px; text-align: center;">${i.cantidad}</td>
          <td style="padding: 10px; text-align: right;">$${i.precioAplicadoUSD.toFixed(2)}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">$${(i.precioAplicadoUSD * i.cantidad).toFixed(2)}</td>
        </tr>
      `
      )
      .join('')

    const pagosHTML = pagos
      .map(
        p => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #d1d5db;">
          <span>• ${p.metodo} ${p.referencia ? `(Ref: ${p.referencia})` : ''}</span>
          <span><strong>$${p.montoUSD.toFixed(2)} USD</strong> ${p.montoBs > 0 ? `(${p.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs)` : ''}</span>
        </div>
      `
      )
      .join('')

    const ventanaImp = window.open('', '_blank')
    if (!ventanaImp) return

    ventanaImp.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Compra — PURPLE CAT</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a12; color: #f3f4f6; padding: 40px; margin: 0; }
          .ticket-card { max-width: 650px; margin: 0 auto; background: #161625; border: 1px solid #4c1d95; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { text-align: center; border-bottom: 1px solid #374151; padding-bottom: 20px; margin-bottom: 24px; }
          .title { font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #c084fc; margin: 0; }
          .sub { font-size: 12px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; tracking: 1px; }
          .info-grid { display: grid; grid-template-cols: 1dfr 1fr; gap: 16px; font-size: 13px; margin-bottom: 24px; background: #0d0d16; padding: 16px; border-radius: 10px; border: 1px solid #2e1065; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { text-align: left; padding: 10px; background: #2e1065; color: #e9d5ff; font-weight: 600; }
          .totals { background: #0d0d16; padding: 20px; border-radius: 12px; border: 1px solid #374151; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="ticket-card">
          <div class="header">
            <h1 class="title">PURPLE CAT</h1>
            <p class="sub">Moda Alternativa & Accesorios Góticos</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">Fecha: ${fecha} | Nota N°: #${saleData.id.slice(0, 8)}</p>
          </div>

          <div class="info-grid">
            <div>
              <strong style="color: #c084fc;">Cliente:</strong> ${nombreCliente}<br>
              ${cedulaCliente ? `<strong style="color: #c084fc;">Cédula/RIF:</strong> ${cedulaCliente}<br>` : ''}
              ${telefonoCliente ? `<strong style="color: #c084fc;">Teléfono:</strong> ${telefonoCliente}<br>` : ''}
            </div>
            <div>
              <strong style="color: #c084fc;">Método de Entrega:</strong> ${agenciaActual.nombre}<br>
              ${direccionEnvio ? `<strong style="color: #c084fc;">Dirección de Envío:</strong> ${direccionEnvio}` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">Precio ($)</th>
                <th style="text-align: right;">Subtotal ($)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="totals">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #ffffff; border-bottom: 1px solid #374151; padding-bottom: 10px; margin-bottom: 12px;">
              <span>TOTAL COMPRA:</span>
              <span>$${totalCarritoUSD.toFixed(2)} USD</span>
            </div>
            
            <div style="margin-top: 8px;">
              <strong style="font-size: 12px; text-transform: uppercase; color: #a855f7; display: block; margin-bottom: 6px;">Desglose de Pagos Recibidos:</strong>
              ${pagosHTML}
            </div>

            <div style="margin-top: 14px; pt: 10px; border-top: 1px stroke #374151; font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between;">
              <span>Monto de Referencia en Bolívares (Tasa BCV ${tasaBCV.toFixed(2)} Bs/$):</span>
              <strong style="color: #e9d5ff;">${totalCarritoBsBCV.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</strong>
            </div>
          </div>

          <div class="footer">
            <p>¡Gracias por tu compra en PURPLE CAT! 🖤</p>
            <p>Instagram: @purplekat26 | Contacto: +58 412-9000623</p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `)
    ventanaImp.document.close()
  }

  // Procesar venta final y descontar inventario
  const procesarVenta = async () => {
    if (!esFormularioValido) return
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // 1. Crear registro de venta en Supabase
      const { data: ventaCreada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([
          {
            cliente_nombre: nombreCliente,
            cliente_cedula: cedulaCliente || null,
            cliente_telefono: telefonoCliente || null,
            direccion_envio: direccionEnvio || null,
            metodo_entrega: metodoEntrega,
            total_usd: totalCarritoUSD,
            total_bs_bcv: totalCarritoBsBCV,
            tasa_bcv_momento: tasaBCV,
            pagos_json: pagos,
            items_json: carrito.map(i => ({
              producto_id: i.producto.id,
              nombre: i.producto.nombre,
              sku: i.producto.sku,
              cantidad: i.cantidad,
              precio_usd: i.precioAplicadoUSD,
            })),
          },
        ])
        .select()
        .single()

      if (errorVenta) throw errorVenta

      // 2. Descontar Stock de Productos en Supabase
      for (const item of carrito) {
        const nuevoStock = item.producto.stock - item.cantidad
        await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto.id)
      }

      // 3. Generar Factura Impresa PDF para el cliente
      generarPDFCliente(ventaCreada || { id: 'N/A' })

      setSuccessMsg('¡Venta registrada y comprobante generado con éxito!')
      
      // Limpieza de campos
      setCarrito([])
      setPagos([])
      setNombreCliente('')
      setCedulaCliente('')
      setTelefonoCliente('')
      setDireccionEnvio('')
      
      onRefreshData()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error al procesar la venta.')
    } finally {
      setLoading(false)
    }
  }

  // Productos filtrados para añadir al carrito
  const productosFiltrados = useMemo(() => {
    return productos.filter(
      p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [productos, searchTerm])

  return (
    <div className="space-y-8 font-sans text-zinc-100">
      
      {/* HEADER MÓDULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161625] border border-purple-900/30 p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-2xl font-serif tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-zinc-100">
            Facturación & Caja Chica
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de pedidos, entregas nacionales y cobros mixtos.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#0a0a12] px-4 py-2 rounded-xl border border-purple-900/40 text-xs font-mono">
          <span className="text-zinc-400">Tasa BCV Oficial:</span>
          <span className="text-purple-300 font-bold">{tasaBCV.toFixed(2)} Bs/$</span>
        </div>
      </div>

      {/* MENSAJES ESTADO */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 text-sm">
          ✅ {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR DE PRODUCTOS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#161625] border border-purple-900/30 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300">
               Catálogo de Inventario
            </h3>

            <input
              type="text"
              placeholder="Buscar producto por SKU o nombre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />

            <div className="max-h-[450px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {productosFiltrados.map(p => {
                const enStock = p.stock > 0
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      enStock
                        ? 'bg-[#0d0d16] border-purple-900/20 hover:border-purple-600/40 cursor-pointer'
                        : 'bg-[#0a0a12]/50 border-zinc-800 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => enStock && agregarAlCarrito(p)}
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{p.nombre}</div>
                      <div className="text-xs text-zinc-500 font-mono">#{p.sku} · Stock: {p.stock}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-300">${p.precio_venta.toFixed(2)}</div>
                      <button
                        disabled={!enStock}
                        className="text-[11px] font-semibold text-purple-400 hover:text-purple-200 mt-0.5"
                      >
                        {enStock ? '+ Añadir' : 'Agotado'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FACTURACIÓN Y PAGO (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TABLA DEL CARRITO */}
          <div className="bg-[#161625] border border-purple-900/30 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300 flex justify-between items-center">
              <span>🛒 Resumen de Orden</span>
              <span className="text-xs font-mono text-zinc-400">{carrito.length} ítems</span>
            </h3>

            {carrito.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm border border-dashed border-purple-900/30 rounded-xl">
                El carrito de facturación está vacío. Haz clic en los productos para agregarlos.
              </div>
            ) : (
              <div className="space-y-3">
                {carrito.map(item => (
                  <div
                    key={item.producto.id}
                    className="flex items-center justify-between p-3 bg-[#0a0a12] border border-purple-900/30 rounded-xl text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zinc-200">{item.producto.nombre}</div>
                      <div className="text-xs text-purple-400">${item.precioAplicadoUSD.toFixed(2)} USD c/u</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, -1)}
                        className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800 text-purple-200 font-bold hover:bg-purple-900"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-zinc-100">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, 1)}
                        className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800 text-purple-200 font-bold hover:bg-purple-900"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-24 text-right font-bold text-zinc-100">
                      ${(item.precioAplicadoUSD * item.cantidad).toFixed(2)}
                    </div>

                    <button
                      onClick={() => quitarDelCarrito(item.producto.id)}
                      className="ml-3 text-xs text-rose-400 hover:text-rose-200"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="pt-3 border-t border-purple-900/30 flex justify-between items-center font-serif text-lg font-bold text-purple-200">
                  <span>TOTAL GENERAL:</span>
                  <span>${totalCarritoUSD.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </div>

          {/* DATOS DE ENVÍO / ENTREGA */}
          <div className="bg-[#161625] border border-purple-900/30 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300">
              🚚 Método de Entrega & Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Agencia / Modalidad *</label>
                <select
                  value={metodoEntrega}
                  onChange={e => setMetodoEntrega(e.target.value)}
                  className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                >
                  {AGENCIAS_ENVIO.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nombre Completo Cliente *</label>
                <input
                  type="text"
                  placeholder="Ej: María Pérez"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {agenciaActual.requiereDatos && (
              <div className="pt-2 border-t border-purple-900/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-rose-300 mb-1">Cédula / RIF (Obligatorio Envío) *</label>
                  <input
                    type="text"
                    placeholder="V-12345678"
                    value={cedulaCliente}
                    onChange={e => setCedulaCliente(e.target.value)}
                    className="w-full bg-[#0a0a12] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-rose-300 mb-1">Teléfono Contacto *</label>
                  <input
                    type="text"
                    placeholder="0412-1234567"
                    value={telefonoCliente}
                    onChange={e => setTelefonoCliente(e.target.value)}
                    className="w-full bg-[#0a0a12] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-rose-300 mb-1">Dirección Exacta de Agencia / Destino *</label>
                  <input
                    type="text"
                    placeholder="Agencia MRW Altamira, Caracas / Estado..."
                    value={direccionEnvio}
                    onChange={e => setDireccionEnvio(e.target.value)}
                    className="w-full bg-[#0a0a12] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* COBRO DE PAGOS MIXTOS */}
          <div className="bg-[#161625] border border-purple-900/30 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300">
                💳 Pasarela de Pagos Mixtos
              </h3>
              <div className="text-xs font-mono">
                <span className="text-zinc-400">Restante: </span>
                <span className={saldoRestanteUSD > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  ${saldoRestanteUSD.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* FORMULARIO PARA AÑADIR PAGO */}
            {saldoRestanteUSD > 0.001 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#0a0a12] border border-purple-900/30 rounded-xl">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Método</label>
                  <select
                    value={metodoSeleccionado}
                    onChange={e => setMetodoSeleccionado(e.target.value)}
                    className="w-full bg-[#161625] border border-purple-900/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    {METODOS_PAGO.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Monto Pagado</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={METODOS_PAGO.find(m => m.id === metodoSeleccionado)?.moneda === 'BS' ? 'Monto en Bs' : 'Monto en USD'}
                    value={montoPagoInput}
                    onChange={e => setMontoPagoInput(e.target.value)}
                    className="w-full bg-[#161625] border border-purple-900/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] text-zinc-400 mb-1">Referencia (Opcional)</label>
                    <input
                      type="text"
                      placeholder="#Ref"
                      value={referenciaInput}
                      onChange={e => setReferenciaInput(e.target.value)}
                      className="w-full bg-[#161625] border border-purple-900/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={agregarPago}
                    className="py-1.5 px-3 rounded-lg bg-purple-900 hover:bg-purple-700 border border-purple-500/50 text-purple-100 text-xs font-semibold transition"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE PAGOS AGREGADOS */}
            {pagos.length > 0 && (
              <div className="space-y-2 pt-2">
                {pagos.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-[#0a0a12] border border-purple-900/20 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-purple-300">• {p.metodo}</span>
                      {p.referencia && <span className="text-zinc-500 ml-2">(Ref: {p.referencia})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-200">
                        ${p.montoUSD.toFixed(2)} USD
                        {p.montoBs > 0 && <span className="text-zinc-500 text-[11px]"> ({p.montoBs.toFixed(2)} Bs)</span>}
                      </span>
                      <button
                        onClick={() => eliminarPago(p.id)}
                        className="text-rose-400 hover:text-rose-200 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN FINAL DE PROCESAR Y GENERAR FACTURA */}
          <button
            disabled={!esFormularioValido || loading}
            onClick={procesarVenta}
            className={`w-full py-4 px-6 rounded-2xl font-serif text-base tracking-wider transition-all duration-300 shadow-xl ${
              esFormularioValido && !loading
                ? 'bg-gradient-to-r from-purple-900 via-purple-800 to-purple-950 border border-purple-500 text-white hover:brightness-115 cursor-pointer'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {loading ? 'Procesando Venta...' : '📄 PROCESAR VENTA Y IMPRIMIR FACTURA'}
          </button>
        </div>
      </div>
    </div>
  )
}
