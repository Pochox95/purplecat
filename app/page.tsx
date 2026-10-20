'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// TU LOGO OFICIAL
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

  const handleImportarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const filas = text.split('\n').slice(1) // Ignorar cabecera
      
      const nuevosProductos = filas.map(fila => {
        const c = fila.split(',')
        if (c.length < 2) return null
        return {
          nombre: c[0]?.trim(),
          sku: c[1]?.trim(),
          categoria: c[2]?.trim() || 'Remeras/Tops',
          talla: c[3]?.trim() || 'M',
          color: c[4]?.trim() || 'Negro',
          precio_costo: Number(c[5]) || 0,
          precio_venta: Number(c[6]) || 0,
          stock: Number(c[7]) || 0,
          descripcion: c[8]?.trim() || ''
        }
      }).filter(p => p !== null)

      const { error } = await supabase.from('productos').insert(nuevosProductos)
      if (error) alert("Error al importar: " + error.message)
      else { alert("¡Inventario cargado con éxito!"); cargarProductos() }
    }
    reader.readAsText(file)
  }

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
    const nuevo = (prod.stock || 0) + cambio
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

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 md:p-8 text-[#e2d9f3]">
      <header className="flex flex-col items-center justify-center mb-10 text-center">
        <img src={LOGO_OFICIAL} alt="Logo" className="h-32 md:h-48 object-contain mb-4 drop-shadow-[0_0_20px_rgba(124,58,237,0.5)]" />
        <h1 className="text-4xl md:text-6xl font-bold text-purple-400 tracking-[0.2em] uppercase font-serif">Purple Cat</h1>
        <div className="h-1 w-32 bg-purple-600 mx-auto mt-3 rounded-full opacity-50"></div>
      </header>

      {/* DASHBOARD RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#161625] border border-purple-900/30 p-4 rounded-2xl text-center">
          <p className="text-2xl font-bold text-purple-400">{productos.reduce((s, p) => s + (p.stock || 0), 0)}</p>
          <p className="text-[10px] uppercase text-purple-300/40 tracking-widest">Prendas Totales</p>
        </div>
        <div className="bg-[#161625] border border-purple-900/30 p-4 rounded-2xl text-center">
          <p className="text-2xl font-bold text-green-400">${productos.reduce((s, p) => s + ((p.stock || 0) * (p.precio_venta || 0)), 0).toLocaleString()}</p>
          <p className="text-[10px] uppercase text-purple-300/40 tracking-widest">Valor Venta</p>
        </div>
        <div className="bg-[#161625] border border-red-900/20 p-4 rounded-2xl text-center">
          <p className="text-2xl font-bold text-red-500">{productos.filter(p => p.stock === 0).length}</p>
          <p className="text-[10px] uppercase text-purple-300/40 tracking-widest">Agotados</p>
        </div>
        <div className="bg-[#161625] border border-yellow-900/20 p-4 rounded-2xl text-center">
          <p className="text-2xl font-bold text-yellow-500">{productos.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < (p.stock_minimo || 3)).length}</p>
          <p className="text-[10px] uppercase text-purple-300/40 tracking-widest">Stock Bajo</p>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <input type="text" placeholder="🔍 BUSCAR POR NOMBRE O SKU..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-[#12121f] border border-purple-900/30 rounded-xl px-4 py-4 text-white focus:border-purple-500 focus:outline-none transition-all" />
        
        <div className="flex gap-2">
          <button onClick={() => abrirModal()} className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all uppercase tracking-widest text-xs flex-1">
            + Nueva Prenda
          </button>
          
          <label className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all uppercase tracking-widest text-xs cursor-pointer flex items-center justify-center flex-1">
            📥 Importar Excel
            <input type="file" accept=".csv" onChange={handleImportarCSV} className="hidden" />
          </label>
        </div>
      </div>

      {/* GALERÍA DE PRENDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtrados.map(p => (
          <div key={p.id} className="bg-[#161625] border border-purple-900/20 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all group">
            <div className="h-64 bg-black relative flex items-center justify-center overflow-hidden border-b border-purple-900/10">
              {p.image_url ? (
                <img src={p.image_url} alt={p.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center opacity-10">
                  <span className="text-7xl">🐈‍⬛</span>
                </div>
              )}
              {/* Overlay de descripción al pasar el mouse */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-center text-center">
                <p className="text-xs text-purple-300 leading-relaxed italic">
                  {p.descripcion || "Sin descripción disponible."}
                </p>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="font-bold text-lg text-white mb-1 uppercase font-serif tracking-tight">{p.nombre}</h3>
              <p className="text-purple-500 text-[10px] font-bold tracking-widest mb-4">{p.sku || 'SIN SKU'}</p>
              
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-green-400 font-bold text-2xl">${(p.precio_venta || 0).toLocaleString()}</p>
                  <p className="text-[8px] uppercase text-purple-300/30 font-bold">P. Venta</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-purple-950/40 text-purple-300 text-[9px] px-2 py-1 rounded border border-purple-800/20">{p.talla}</span>
                  <span className="bg-purple-950/40 text-purple-300 text-[9px] px-2 py-1 rounded border border-purple-800/20">{p.color}</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-purple-900/10">
                <div className="flex items-center gap-3">
                  <button onClick={() => cambiarStock(p.id, -1)} className="bg-red-950/30 hover:bg-red-900/50 text-red-500 w-9 h-9 rounded-xl font-bold border border-red-900/20">-</button>
                  <span className={`text-xl font-bold w-10 text-center ${p.stock === 0 ? 'text-red-500' : 'text-white'}`}>{p.stock}</span>
                  <button onClick={() => cambiarStock(p.id, 1)} className="bg-purple-900/30 hover:bg-purple-700/50 text-purple-400 w-9 h-9 rounded-xl font-bold border border-purple-800/20">+</button>
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

      {/* MODAL DE EDICIÓN / NUEVA PRENDA */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={cerrarModal}>
          <div className="bg-[#161625] border border-purple-800/50 rounded-3xl w-full max-w-lg my-auto p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-purple-400 mb-8 uppercase tracking-[0.3em] text-center font-serif">{editando ? 'Editar Prenda' : 'Nueva Prenda'}</h2>
            
            <div className="space-y-4">
              <div className="group relative rounded-2xl overflow-hidden bg-black/50 border border-purple-900/30 h-44 flex items-center justify-center cursor-pointer">
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-purple-900/30 text-4xl">📸</span>
                )}
                <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) subirImagen(e.target.files[0]) }} className="absolute inset-0 opacity-0 cursor-pointer" />
                {subiendoImagen && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-purple-400 animate-pulse text-xs font-bold uppercase">Subiendo...</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="col-span-2 w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white placeholder-purple-300/20" placeholder="NOMBRE DE LA PRENDA" />
                <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white placeholder-purple-300/20" placeholder="SKU" />
                <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white placeholder-purple-300/20" placeholder="COLOR" />
                
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white">
                  {CATEGORIAS.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={form.talla} onChange={e => setForm({...form, talla: e.target.value})} className="bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white">
                  {TALLAS.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <div className="text-center">
                  <label className="text-[8px] text-purple-300/30 uppercase font-bold">Costo</label>
                  <input type="number" value={form.precio_costo} onChange={e => setForm({...form, precio_costo: Number(e.target.value)})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-3 text-white text-center" />
                </div>
                <div className="text-center">
                  <label className="text-[8px] text-purple-300/30 uppercase font-bold">Venta</label>
                  <input type="number" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-3 text-green-400 font-bold text-center" />
                </div>
                <div className="text-center">
                  <label className="text-[8px] text-purple-300/30 uppercase font-bold">Stock Actual</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-3 text-white text-center" />
                </div>
                <div className="text-center">
                  <label className="text-[8px] text-purple-300/30 uppercase font-bold">Aviso Mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: Number(e.target.value)})} className="w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-3 text-white text-center" />
                </div>

                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="col-span-2 w-full bg-black/30 border border-purple-900/20 rounded-xl px-4 py-4 text-white h-24 resize-none" placeholder="DESCRIPCIÓN GÓTICA DE LA PRENDA..." />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={guardar} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-5 rounded-2xl transition-all uppercase tracking-widest text-xs">GUARDAR</button>
              <button onClick={cerrarModal} className="px-8 bg-transparent border border-purple-900/40 text-purple-400 py-5 rounded-2xl hover:bg-purple-900/10 transition-all uppercase tracking-widest text-xs">CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
