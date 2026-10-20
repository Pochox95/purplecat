'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface Producto {
  id: number
  sku: string
  nombre: string
  categoria: string
  talla: string
  color: string
  precio_costo: number
  precio_venta: number
  stock: number
  stock_minimo: number
  descripcion: string
  image_url: string
  created_at: string
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
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  const [form, setForm] = useState({
    sku: '', nombre: '', categoria: 'Corsets', talla: 'M', color: 'Negro',
    precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 3,
    descripcion: '', image_url: ''
  })

  const cargarProductos = async () => {
    try {
      const { data } = await supabase.from('productos').select('*').order('created_at', { ascending: false })
      if (data) setProductos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarProductos()
    const savedLogo = localStorage.getItem('purplecat_logo')
    if (savedLogo) setLogoUrl(savedLogo)
  }, [])

  const subirLogo = async (file: File) => {
    setSubiendoLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const nombre = `logo-${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('product-images').upload(nombre, file)
      if (data) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(nombre)
        const newUrl = urlData.publicUrl
        setLogoUrl(newUrl)
        localStorage.setItem('purplecat_logo', newUrl)
      }
    } catch (e) {
      alert('Error subiendo el logo')
    }
    setSubiendoLogo(false)
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
    } catch (e) {
      alert('Error subiendo imagen')
    }
    setSubiendoImagen(false)
  }

  const guardar = async () => {
    if (!form.nombre) return alert('Escribe el nombre de la prenda')
    if (editando) {
      await supabase.from('productos').update(form).eq('id', editando.id)
    } else {
      await supabase.from('productos').insert([form])
    }
    cerrarModal()
    cargarProductos()
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
        precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 3,
        descripcion: '', image_url: ''
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
      <header className="flex flex-col items-center justify-center mb-8 gap-3">
        <div className="relative group">
          {logoUrl ? (
            <img src={logoUrl} alt="Purple Cat Logo" className="h-24 md:h-32 object-contain rounded-2xl border-2 border-purple-800 shadow-[0_0_20px_rgba(124,58,237,0.3)] mb-2" />
          ) : (
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-[#1a1a2e] border-2 border-dashed border-purple-700/50 flex flex-col items-center justify-center text-purple-400 mb-2">
              <span className="text-4xl">🐱</span>
              <span className="text-[10px] mt-1 text-purple-300/60">Sin Logo</span>
            </div>
          )}
          <label className="cursor-pointer bg-purple-900/80 hover:bg-purple-700 text-purple-200 text-xs px-3 py-1 rounded-full border border-purple-500/40 transition-all block text-center">
            {subiendoLogo ? 'Cargando...' : logoUrl ? '📷 Cambiar Logo' : '📷 Cargar Logo'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) subirLogo(e.target.files[0]) }} />
          </label>
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-purple-400 tracking-wider">Purple Cat</h1>
          <p className="text-purple-300/60 mt-1 text-sm md:text-base">Control de Inventario — Ropa Gótica</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-purple-400">{totalStock}</div>
          <div className="text-xs text-purple-300/50 mt-1">Prendas en Stock</div>
        </div>
        <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-green-400">${valorTotal.toLocaleString()}</div>
          <div className="text-xs text-purple-300/50 mt-1">Valor del Inventario</div>
        </div>
        <div className="bg-[#1a1a2e] border border-red-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-red-400">{agotados}</div>
          <div className="text-xs text-purple-300/50 mt-1">Agotados</div>
        </div>
        <div className="bg-[#1a1a2e] border border-yellow-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-yellow-400">{stockBajo}</div>
          <div className="text-xs text-purple-300/50 mt-1">Stock Bajo</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input type="text" placeholder="🔍 Buscar por nombre, SKU o color..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-[#1a1a2e] border border-purple-900/50 rounded-lg px-4 py-3 text-white placeholder-purple-300/30 focus:border-purple-500 focus:outline-none" />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#1a1a2e] border border-purple-900/50 rounded-lg px-4 py-3 text-purple-200 focus:border-purple-500 focus:outline-none">
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroTalla} onChange={e => setFiltroTalla(e.target.value)}
          className="bg-[#1a1a2e] border border-purple-900/50 rounded-lg px-4 py-3 text-purple-200 focus:border-purple-500 focus:outline-none">
          {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => abrirModal()} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          + Agregar Prenda
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.map(p => (
          <div key={p.id} className={`bg-[#1a1a2e] border rounded-xl overflow-hidden transition-all hover:scale-[1.02] ${p.stock === 0 ? 'border-red-800 opacity-60' : p.stock < (p.stock_minimo || 3) ? 'border-yellow-600' : 'border-purple-900/50'}`}>
            <div className="h-48 bg-[#12121f] flex items-center justify-center overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt={p.nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl opacity-20">👗</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-white text-sm leading-tight">{p.nombre}</h3>
                {p.stock === 0 && <span className="bg-red-600 text-xs px-2 py-0.5 rounded-full text-white ml-2 shrink-0">Agotado</span>}
                {p.stock > 0 && p.stock < (p.stock_minimo || 3) && <span className="bg-yellow-600 text-xs px-2 py-0.5 rounded-full text-white ml-2 shrink-0">Bajo</span>}
              </div>
              <p className="text-purple-400/60 text-xs mb-2">{p.sku}</p>
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className="bg-purple-900/40 text-purple-300 text-xs px-2 py-0.5 rounded">{p.categoria}</span>
                <span className="bg-purple-900/40 text-purple-300 text-xs px-2 py-0.5 rounded">T: {p.talla}</span>
                <span className="bg-purple-900/40 text-purple-300 text-xs px-2 py-0.5 rounded">{p.color}</span>
              </div>
              {p.descripcion && <p className="text-purple-300/40 text-xs mb-3 line-clamp-2">{p.descripcion}</p>}
              <div className="flex justify-between items-center mb-3">
                <span className="text-green-400 font-bold">${(p.precio_venta || 0).toLocaleString()}</span>
                <span className="text-purple-300/40 text-xs">Costo: ${(p.precio_costo || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarStock(p.id, -1)} className="bg-red-900/60 hover:bg-red-700 text-white w-9 h-9 rounded-lg font-bold text-lg transition-colors">−</button>
                  <span className={`text-xl font-bold w-10 text-center ${p.stock === 0 ? 'text-red-400' : p.stock < (p.stock_minimo || 3) ? 'text-yellow-400' : 'text-white'}`}>{p.stock}</span>
                  <button onClick={() => cambiarStock(p.id, 1)} className="bg-purple-700 hover:bg-purple-600 text-white w-9 h-9 rounded-lg font-bold text-lg transition-colors">+</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirModal(p)} className="text-purple-400 hover:text-purple-300 text-sm px-2 py-1">✏️</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-300 text-sm px-2 py-1">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-20 text-purple-400/40">
          <div className="text-5xl mb-4">🐱</div>
          <p>No se encontraron prendas</p>
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div className="bg-[#1a1a2e] border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-purple-400 mb-4">{editando ? '✏️ Editar Prenda' : '🐱 Nueva Prenda'}</h2>
            <div className="mb-4">
              <label className="text-purple-300/60 text-sm mb-1 block">Foto de la prenda</label>
              {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2 border border-purple-900" />}
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) subirImagen(e.target.files[0]) }}
                className="w-full text-sm text-purple-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-700 file:text-white file:cursor-pointer" />
              {subiendoImagen && <p className="text-purple-400 text-xs mt-1 animate-pulse">Subiendo imagen...</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-purple-300/60 text-sm">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" placeholder="Ej: Corset Victoriano" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">SKU</label>
                <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" placeholder="COR-VIC-NEG-M" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Categoría</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none">
                  {CATEGORIAS.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Talla</label>
                <select value={form.talla} onChange={e => setForm({...form, talla: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none">
                  {TALLAS.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Color</label>
                <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" placeholder="Negro" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Precio Costo</label>
                <input type="number" value={form.precio_costo} onChange={e => setForm({...form, precio_costo: Number(e.target.value)})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Precio Venta</label>
                <input type="number" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Stock Inicial</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-purple-300/60 text-sm">Stock Mínimo</label>
                <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: Number(e.target.value)})}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-purple-300/60 text-sm">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={3}
                  className="w-full bg-[#0a0a12] border border-purple-900/50 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none resize-none" placeholder="Ej: Corset de terciopelo..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors">
                {editando ? 'Guardar Cambios' : 'Agregar Prenda'}
              </button>
              <button onClick={cerrarModal} className="px-6 bg-[#0a0a12] border border-purple-900/50 text-purple-300 py-3 rounded-lg hover:border-purple-500 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
