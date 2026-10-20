'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// CAMBIA ESTO: Pega aquí entre las comillas el link que copiaste de Supabase
const LOGO_OFICIAL = "TU_LINK_AQUI"

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
      <div className="text-purple-400 text-xl animate-pulse">🐱 Cargando Purple Cat...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 md:p-8 text-[#e2d9f3]">
      <header className="flex flex-col items-center justify-center mb-10">
        <img 
          src={LOGO_OFICIAL} 
          alt="Purple Cat Logo" 
          className="h-32 md:h-40 object-contain drop-shadow-[0_0_15px_rgba(124,58,237,0.5)] mb-4"
          onError={(e) => { e.currentTarget.style.display = 'none' }} 
        />
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-purple-400 tracking-[0.2em] uppercase">Purple Cat</h1>
          <div className="h-1 w-24 bg-purple-600 mx-auto mt-2 rounded-full opacity-50"></div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-purple-400">{totalStock}</div>
          <div className="text-xs text-purple-300/50 mt-1 uppercase tracking-widest">Stock Total</div>
        </div>
        <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-green-400">${valorTotal.toLocaleString()}</div>
          <div className="text-xs text-purple-300/50 mt-1 uppercase tracking-widest">Valor</div>
        </div>
        <div className="bg-[#1a1a2e] border border-red-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-red-400">{agotados}</div>
          <div className="text-xs text-purple-300/50 mt-1 uppercase tracking-widest">Agotados</div>
        </div>
        <div className="bg-[#1a1a2e] border border-yellow-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-yellow-400">{stockBajo}</div>
          <div className="text-xs text-purple-300/50 mt-1 uppercase tracking-widest">Bajo</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input type="text" placeholder="🔍 Buscar prenda..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-[#161625] border border-purple-900/40 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-all" />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#161625] border border-purple-900/40 rounded-lg px-4 py-3 text-purple-200 focus:outline-none cursor-pointer">
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => abrirModal()} className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-purple-900/20">
          + Nueva Prenda
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtrados.map(p => (
          <div key={p.id} className={`bg-[#161625] border rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] ${p.stock === 0 ? 'border-red-900/50 opacity-70' : p.stock < (p.stock_minimo || 3) ? 'border-yellow-700/50' : 'border-purple-900/30'}`}>
            <div className="h-56 bg-black flex items-center justify-center overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt={p.nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl opacity-10">🐈‍⬛</span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-white mb-1 truncate">{p.nombre}</h3>
              <p className="text-purple-500 text-xs tracking-widest mb-3">{p.sku || 'SIN SKU'}</p>
              
              <div className="flex gap-2 mb-4">
                <span className="bg-purple-950/50 text-purple-300 text-[10px] uppercase px-2 py-1 rounded border border-purple-800/30">{p.talla}</span>
                <span className="bg-purple-950/50 text-purple-300 text-[10px] uppercase px-2 py-1 rounded border border-purple-800/30">{p.color}</span>
              </div>

              <div className="flex justify-between items-end mb-5">
                <div>
                  <p className="text-green-400 font-bold text-xl">${(p.precio_venta || 0).toLocaleString()}</p>
                  <p className="text-purple-300/30 text-[10px] uppercase">Venta</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-300/50 font-medium">${(p.precio_costo || 0).toLocaleString()}</p>
                  <p className="text-purple-300/30 text-[10px] uppercase">Costo</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-purple-900/20">
                <div className="flex items-center gap-3">
                  <button onClick={() => cambiarStock(p.id, -1)} className="bg-red-950/40 hover:bg-red-900 text-red-400 w-8 h-8 rounded-lg font-bold transition-colors">-</button>
                  <span className={`text-xl font-bold w-8 text-center ${p.stock === 0 ? 'text-red-500' : p.stock < (p.stock_minimo || 3) ? 'text-yellow-500' : 'text-white'}`}>{p.stock}</span>
                  <button onClick={() => cambiarStock(p.id, 1)} className="bg-purple-900/40 hover:bg-purple-800 text-purple-400 w-8 h-8 rounded-lg font-bold transition-colors">+</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirModal(p)} className="text-purple-400 hover:text-white transition-colors">✏️</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-900 hover:text-red-500 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div className="bg-[#1a1a2e] border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-purple-400 mb-6 uppercase tracking-widest">{editando ? 'Editar Prenda' : 'Nueva Prenda'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-purple-300/60 text-[10px] uppercase mb-1 block tracking-widest">Foto de la prenda</label>
                {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-xl mb-3 border border-purple-900/50" />}
                <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) subirImagen(e.target.files[0]) }}
                  className="w-full text-xs text-purple-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-900 file:text-white file:cursor-pointer" />
                {subiendoImagen && <p className="text-purple-500 text-[10px] mt-2 animate-pulse">Subiendo a la nube...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" placeholder="Nombre de la prenda" />
                </div>
                <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}
                  className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" placeholder="SKU" />
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white">
                  {CATEGORIAS.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={form.talla} onChange={e => setForm({...form, talla: e.target.value})}
                  className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white">
                  {TALLAS.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" placeholder="Color" />
                <div>
                  <label className="text-purple-300/40 text-[10px] uppercase ml-1">Costo</label>
                  <input type="number" value={form.precio_costo} onChange={e => setForm({...form, precio_costo: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-purple-300/40 text-[10px] uppercase ml-1">Venta</label>
                  <input type="number" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-purple-300/40 text-[10px] uppercase ml-1">Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-purple-300/40 text-[10px] uppercase ml-1">Mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-purple-900/40 rounded-lg px-4 py-3 text-white" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={guardar} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-4 rounded-xl transition-all uppercase tracking-widest text-sm">
                Guardar
              </button>
              <button onClick={cerrarModal} className="px-8 bg-transparent border border-purple-900/50 text-purple-400 py-4 rounded-xl hover:bg-purple-900/20 transition-all uppercase tracking-widest text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
