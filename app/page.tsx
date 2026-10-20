'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// EL LINK OFICIAL DE TU LOGO EN SUPABASE
const LOGO_OFICIAL = "https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg"

interface Producto {
  id: number; sku: string; nombre: string; categoria: string; talla: string; color: string;
  precio_costo: number; precio_venta: number; stock: number; stock_minimo: number;
  descripcion: string; image_url: string; created_at: string;
}

const CATEGORIAS = ['Todas', 'Corsets', 'Vestidos', 'Remeras/Tops', 'Pantalones/Faldas', 'Abrigos/Capas', 'Accesorios', 'Calzado']
const TALLAS = ['Todas', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única']

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroTalla, setFiltroTalla] = useState('Todas')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)

  const [form, setForm] = useState({
    sku: '', nombre: '', categoria: 'Corsets', talla: 'M', color: 'Negro',
    precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 3,
    descripcion: '', image_url: ''
  })

  const cargarProductos = async () => {
    try {
      const { data } = await supabase.from('productos').select('*').order('created_at', { ascending: false })
      if (data) setProductos(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { cargarProductos() }, [])

  const subirImagen = async (file: File) => {
    setSubiendoImagen(true)
    try {
      const ext = file.name.split('.').pop()
      const nombre = `${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('product-images').upload(nombre, file)
      if (data) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(nombre)
        setForm(prev => ({ ...prev, image_url: urlData.publicUrl }))
      }
    } catch (e) { alert('Error subiendo imagen') }
    setSubiendoImagen(false)
  }

  const guardar = async () => {
    if (!form.nombre) return alert('Escribe el nombre de la prenda')
    if (editando) { await supabase.from('productos').update(form).eq('id', editando.id) }
    else { await supabase.from('productos').insert([form]) }
    cerrarModal(); cargarProductos()
  }

  const cambiarStock = async (id: number, cambio: number) => {
    const prod = productos.find(p => p.id === id)
    if (!prod) return
    const nuevo = prod.stock + cambio
    if (nuevo < 0) return
    await supabase.from('productos').update({ stock: nuevo }).eq('id', id)
    cargarProductos()
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta prenda?')) return
    await supabase.from('productos').delete().eq('id', id)
    cargarProductos()
  }

  const abrirModal = (prod?: Producto) => {
    if (prod) {
      setEditando(prod)
      setForm({
        sku: prod.sku || '', nombre: prod.nombre || '', categoria: prod.categoria || 'Corsets',
        talla: prod.talla || 'M', color: prod.color || 'Negro', precio_costo: prod.precio_costo || 0,
        precio_venta: prod.precio_venta || 0, stock: prod.stock || 0,
        stock_minimo: prod.stock_minimo || 3, descripcion: prod.descripcion || '',
        image_url: prod.image_url || ''
      })
    } else {
      setEditando(null)
      setForm({
        sku: '', nombre: '', categoria: 'Corsets', talla: 'M', color: 'Negro',
        precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 3, descripcion: '', image_url: ''
      })
    }
    setMostrarModal(true)
  }

  const cerrarModal = () => { setMostrarModal(false); setEditando(null) }

  const filtrados = productos.filter(p => {
    const matchB = (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.color || '').toLowerCase().includes(busqueda.toLowerCase())
    const matchC = filtroCategoria === 'Todas' || p.categoria === filtroCategoria
    const matchT = filtroTalla === 'Todas' || p.talla === filtroTalla
    return matchB && matchC && matchT
  })

  const totalStock = productos.reduce((s, p) => s + (p.stock || 0), 0)
  const valorTotal = productos.reduce((s, p) => s + ((p.stock || 0) * (p.precio_venta || 0)), 0)
  const agotados = productos.filter(p => p.stock === 0).length
  const stockBajo = productos.filter(p => p.stock > 0 && p.stock < (p.stock_minimo || 3)).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a12]">
      <div className="text-purple-400 text-xl animate-pulse font-serif uppercase tracking-widest">Cargando Purple Cat...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 md:p-8 text-[#e2d9f3]">
      <header className="flex flex-col items-center justify-center mb-10">
        <div className="relative p-1 bg-gradient-to-b from-purple-600 to-transparent rounded-2xl mb-4 shadow-[0_0_30px_rgba(124,58,237,0.4)]">
           <img 
            src={LOGO_OFICIAL} 
            alt="Logo" 
            className="h-32 md:h-48 w-auto object-contain rounded-xl bg-[#0a0a12]"
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-purple-400 tracking-[0.2em] uppercase font-serif">Purple Cat</h1>
          <div className="h-1 w-32 bg-purple-600 mx-auto mt-3 rounded-full opacity-50 shadow-[0_0_10px_rgba(124,58,237,0.8)]"></div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        <div className="bg-[#161625] border border-purple-900/40 rounded-2xl p-4 text-center shadow-lg">
          <div className="text-2xl md:text-3xl font-bold text-purple-400">{totalStock}</div>
          <div className="text-[10px] text-purple-300/40 mt-1 uppercase tracking-widest">Stock Total</div>
        </div>
        <div className="bg-[#161625] border border-purple-900/40 rounded-2xl p-4 text-center shadow-lg">
          <div className="text-2xl md:text-3xl font-bold text-green-400">${valorTotal.toLocaleString()}</div>
          <div className="text-[10px] text-purple-300/40 mt-1 uppercase tracking-widest">Valor Venta</div>
        </div>
        <div className="bg-[#161625] border border-red-900/30 rounded-2xl p-4 text-center shadow-lg">
          <div className="text-2xl md:text-3xl font-bold text-red-500">{agotados}</div>
          <div className="text-[10px] text-purple-300/40 mt-1 uppercase tracking-widest">Agotados</div>
        </div>
        <div className="bg-[#161625] border border-yellow-900/30 rounded-2xl p-4 text-center shadow-lg">
          <div className="text-2xl md:text-3xl font-bold text-yellow-500">{stockBajo}</div>
          <div className="text-[10px] text-purple-300/40 mt-1 uppercase tracking-widest">Stock Bajo</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-10">
        <input type="text" placeholder="🔍 BUSCAR PRENDA..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-[#12121f] border border-purple-900/30 rounded-xl px-4 py-4 text-white placeholder-purple-300/20 focus:border-purple-500 focus:outline-none transition-all" />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#12121f] border border-purple-900/30 rounded-xl px-4 py-4 text-purple-200 focus:outline-none cursor-pointer">
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => abrirModal()} className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-xl shadow-purple-900/20 uppercase tracking-widest text-sm">
          + NUEVA PRENDA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtrados.map(p => (
          <div key={p.id} className={`bg-[#161625] border rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl ${p.stock === 0 ? 'border-red-900/40 opacity-70' : p.stock < (p.stock_minimo || 3) ? 'border-yellow-700/40' : 'border-purple-900/20'}`}>
            <div className="h-60 bg-black flex items-center justify-center overflow-hidden border-b border-purple-900/10">
              {p.image_url ? (
                <img src={p.image_url} alt={p.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center opacity-10">
                   <span className="text-7xl">🐈‍⬛</span>
                   <span className="text-[10px] uppercase tracking-widest mt-2">Purple Cat</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl text-white mb-1 truncate font-serif uppercase tracking-tight">{p.nombre}</h3>
              <p className="text-purple-500 text-[10px] tracking-[0.2em] mb-4 font-bold">{p.sku || 'S/N SKU'}</p>
              
              <div className="flex gap-2 mb-6">
                <span className="bg-purple-950/40 text-purple-300 text-[9px] uppercase px-3 py-1 rounded-md border border-purple-800/20 font-bold tracking-tighter">TALLA {p.talla}</span>
                <span className="bg-purple-950/40 text-purple-300 text-[9px] uppercase px-3 py-1 rounded-md border border-purple-800/20 font-bold tracking-tighter">{p.color}</span>
              </div>

              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-green-400 font-bold text-2xl tracking-tighter">${(p.precio_venta || 0).toLocaleString()}</p>
                  <p className="text-purple-300/20 text-[9px] uppercase tracking-[0.2em] font-bold">Venta Público</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-300/40 font-medium text-sm">${(p.precio_costo || 0).toLocaleString()}</p>
                  <p className="text-purple-300/20 text-[9px] uppercase tracking-[0.2em] font-bold">Costo Neto</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-purple-900/10">
                <div className="flex items-center gap-4">
                  <button onClick={() => cambiarStock(p.id, -1)} className="bg-red-950/30 hover:bg-red-900/50 text-red-500 w-9 h-9 rounded-xl font-bold transition-all border border-red-900/20 text-xl">-</button>
                  <span className={`text-2xl font-bold w-10 text-center ${p.stock === 0 ? 'text-red-500' : p.stock < (p.stock_minimo || 3) ? 'text-yellow-500' : 'text-white'}`}>{p.stock}</span>
                  <button onClick={() => cambiarStock(p.id, 1)} className="bg-purple-900/30 hover:bg-purple-700/50 text-purple-400 w-9 h-9 rounded-xl font-bold transition-all border border-purple-800/20 text-xl">+</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => abrirModal(p)} className="text-purple-400/50 hover:text-white transition-colors text-xl">✏️</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-900/40 hover:text-red-500 transition-colors text-xl">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={cerrarModal}>
          <div className="bg-[#161625] border border-purple-800/50 rounded-3xl w-full max-w-lg my-auto p-8 shadow-[0_0_50px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-purple-400 mb-8 uppercase tracking-[0.3em] text-center font-serif">{editando ? 'Editar Prenda' : 'Nueva Prenda'}</h2>
            
            <div className="space-y-5">
              <div className="group">
                <label className="text-purple-300/40 text-[9px] uppercase mb-2 block tracking-widest font-bold">Imagen de la prenda</label>
                <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-purple-900/30 group-hover:border-purple-500/50 transition-all">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Preview" className="w-full h-44 object-cover" />
                  ) : (
                    <div className="h-44 flex items-center justify-center text-purple-900/30 text-4xl">📸</div>
                  )}
                  <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) subirImagen(e.target.files[0]) }}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                {subiendoImagen && <p className="text-purple-500 text-[9px] mt-2 animate-pulse font-bold uppercase tracking-widest text-center">Subiendo a la nube gótica...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white focus:border-purple-500 focus:outline-none transition-all" placeholder="NOMBRE DEL PRODUCTO" />
                </div>
                <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}
                  className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white focus:border-purple-500 focus:outline-none" placeholder="SKU" />
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white">
                  {CATEGORIAS.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={form.talla} onChange={e => setForm({...form, talla: e.target.value})}
                  className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white">
                  {TALLAS.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white focus:border-purple-500 focus:outline-none" placeholder="COLOR" />
                
                <div>
                  <label className="text-purple-300/30 text-[8px] uppercase ml-2 tracking-widest font-bold">Costo Neto</label>
                  <input type="number" value={form.precio_costo} onChange={e => setForm({...form, precio_costo: Number(e.target.value)})}
                    className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white" />
                </div>
                <div>
                  <label className="text-purple-300/30 text-[8px] uppercase ml-2 tracking-widest font-bold">Precio Venta</label>
                  <input type="number" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})}
                    className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white font-bold text-green-400" />
                </div>
                <div>
                  <label className="text-purple-300/30 text-[8px] uppercase ml-2 tracking-widest font-bold">Stock Actual</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})}
                    className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white" />
                </div>
                <div>
                  <label className="text-purple-300/30 text-[8px] uppercase ml-2 tracking-widest font-bold">Aviso Mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: Number(e.target.value)})}
                    className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={guardar} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-5 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs shadow-lg shadow-purple-900/30">
                GUARDAR CAMBIOS
              </button>
              <button onClick={cerrarModal} className="px-8 bg-transparent border border-purple-900/40 text-purple-400 py-5 rounded-2xl hover:bg-purple-900/10 transition-all uppercase tracking-[0.2em] text-xs">
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
