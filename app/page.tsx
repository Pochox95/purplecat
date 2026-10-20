'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  talla: string;
  color: string;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  descripcion: string;
  image_url: string;
}

export default function InventarioPurpleCat() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [tallaFiltro, setTallaFiltro] = useState('Todas');
  
  // Modal State
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Partial<Producto> | null>(null);

  useEffect(() => {
    fetchProductos();
  }, []);

  async function fetchProductos() {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setProductos(data || []);
    } catch (err: any) {
      console.error("Error al cargar productos:", err.message);
    } finally {
      setCargando(false);
    }
  }

  async function ajustarStock(id: number, delta: number) {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;

    const nuevoStock = Math.max(0, prod.stock + delta);
    
    // Optimistic UI update
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));

    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) {
      console.error("Error al actualizar stock:", error.message);
      fetchProductos(); // Revert back on error
    }
  }

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!productoEditando) return;

    if (productoEditando.id) {
      // Editar existente
      const { error } = await supabase
        .from('productos')
        .update(productoEditando)
        .eq('id', productoEditando.id);
      
      if (!error) {
        setModalAbierto(false);
        fetchProductos();
      }
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('productos')
        .insert([productoEditando]);

      if (!error) {
        setModalAbierto(false);
        fetchProductos();
      }
    }
  }

  async function eliminarProducto(id: number) {
    if (!confirm("¿Seguro que deseas eliminar este producto gótico?")) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) fetchProductos();
  }

  // Filtrado
  const categoriasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))];
  const tallasUnicas = ['Todas', ...Array.from(new Set(productos.map(p => p.talla)))];

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                              p.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
    const coincideTalla = tallaFiltro === 'Todas' || p.talla === tallaFiltro;
    return coincideBusqueda && coincideCategoria && coincideTalla;
  });

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 p-4 md:p-8 font-sans selection:bg-violet-900 selection:text-white">
      {/* Header Gótico con Logo Central */}
      <header className="flex flex-col items-center mb-10 border-b border-violet-950/60 pb-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-purple-900 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <img 
            src="https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg" 
            alt="Purple Cat Logo" 
            className="relative w-36 h-36 object-contain rounded-full border-2 border-violet-600/50 shadow-[0_0_25px_rgba(139,92,246,0.3)] bg-black"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-violet-400 tracking-widest uppercase mt-4 text-center drop-shadow-[0_2px_10px_rgba(139,92,246,0.5)]">
          Purple Cat
        </h1>
        <p className="text-xs text-violet-300/60 mt-1 uppercase tracking-widest font-mono">
          Gestión de Inventario Gótico
        </p>
      </header>

      {/* Barra de Herramientas: Búsqueda, Filtros y Nuevo Producto */}
      <div className="max-w-7xl mx-auto mb-8 bg-[#161625]/80 border border-violet-900/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Buscador */}
        <div className="w-full md:w-1/3">
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0a0a12] border border-violet-900/40 rounded-lg px-4 py-2 text-violet-200 placeholder-violet-500/50 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Filtros */}
        <div className="flex w-full md:w-auto gap-3">
          <select 
            value={categoriaFiltro} 
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="bg-[#0a0a12] border border-violet-900/40 rounded-lg px-3 py-2 text-violet-300 focus:outline-none focus:border-violet-500 text-sm"
          >
            {categoriasUnicas.map(cat => (
              <option key={cat} value={cat}>Cat: {cat}</option>
            ))}
          </select>

          <select 
            value={tallaFiltro} 
            onChange={(e) => setTallaFiltro(e.target.value)}
            className="bg-[#0a0a12] border border-violet-900/40 rounded-lg px-3 py-2 text-violet-300 focus:outline-none focus:border-violet-500 text-sm"
          >
            {tallasUnicas.map(talla => (
              <option key={talla} value={talla}>Talla: {talla}</option>
            ))}
          </select>

          {/* Botón Añadir */}
          <button 
            onClick={() => {
              setProductoEditando({
                sku: `PUR-${String(productos.length + 1).padStart(2, '0')}`,
                nombre: '',
                categoria: 'Corsets',
                talla: 'M',
                color: 'Negro',
                precio_costo: 0,
                precio_venta: 0,
                stock: 0,
                stock_minimo: 3,
                descripcion: '',
                image_url: 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg'
              });
              setModalAbierto(true);
            }}
            className="bg-violet-900/50 hover:bg-violet-700 text-violet-200 border border-violet-500/40 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_0_10px_rgba(139,92,246,0.2)]"
          >
            ➕ Nuevo
          </button>
        </div>
      </div>

      {/* Indicador de Carga */}
      {cargando ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-violet-400 font-serif tracking-widest animate-pulse">Invocando inventario...</p>
        </div>
      ) : (
        /* Grid de Productos */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {productosFiltrados.map((prod) => {
            const stockBajo = prod.stock <= prod.stock_minimo && prod.stock > 0;
            const agotado = prod.stock === 0;

            return (
              <div 
                key={prod.id} 
                className={`bg-[#161625] border rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xl relative group ${
                  agotado 
                    ? 'border-red-900/40 opacity-75' 
                    : stockBajo 
                    ? 'border-amber-600/50 shadow-[0_0_15px_rgba(217,119,6,0.15)]' 
                    : 'border-violet-900/20 hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                }`}
              >
                {/* Status Badges */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  {agotado && (
                    <span className="bg-red-950/90 text-red-400 border border-red-600/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                      Agotado
                    </span>
                  )}
                  {stockBajo && (
                    <span className="bg-amber-950/90 text-amber-400 border border-amber-600/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md animate-pulse">
                      Stock Bajo
                    </span>
                  )}
                </div>

                {/* Imagen del Producto */}
                <div className="h-52 overflow-hidden bg-black/60 relative flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <img 
                    src={prod.image_url || 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg'} 
                    alt={prod.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/80 text-violet-300 text-[10px] px-2 py-0.5 rounded border border-violet-900/40 font-mono">
                    {prod.sku}
                  </span>
                </div>

                {/* Detalles del Producto */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-lg font-serif text-violet-300 font-semibold leading-snug line-clamp-1">
                        {prod.nombre}
                      </h2>
                      <button 
                        onClick={() => {
                          setProductoEditando(prod);
                          setModalAbierto(true);
                        }}
                        className="text-gray-500 hover:text-violet-400 p-1 text-sm transition-colors"
                        title="Editar Producto"
                      >
                        ✏️
                      </button>
                    </div>

                    <div className="flex gap-2 text-[11px] text-gray-400 mb-3">
                      <span className="bg-violet-950/40 px-2 py-0.5 rounded border border-violet-900/30">{prod.categoria}</span>
                      <span className="bg-violet-950/40 px-2 py-0.5 rounded border border-violet-900/30">Talla: {prod.talla}</span>
                      <span className="bg-violet-950/40 px-2 py-0.5 rounded border border-violet-900/30">{prod.color}</span>
                    </div>

                    {prod.descripcion && (
                      <p className="text-xs text-gray-400/80 mb-3 line-clamp-2 italic font-light">
                        "{prod.descripcion}"
                      </p>
                    )}
                  </div>

                  {/* Precios y Stock Controles */}
                  <div>
                    <div className="flex justify-between items-baseline mb-3 pt-2 border-t border-violet-900/20">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Costo / Venta</span>
                        <span className="text-xs text-gray-400 font-mono">${prod.precio_costo} / </span>
                        <span className="text-lg font-bold text-emerald-400 font-mono">${prod.precio_venta}</span>
                      </div>
                    </div>

                    {/* Quick Stock Bar */}
                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-violet-900/30">
                      <span className="text-xs text-violet-300/70 font-mono uppercase pl-1">Stock</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => ajustarStock(prod.id, -1)}
                          className="w-7 h-7 rounded bg-violet-950 hover:bg-violet-800 text-violet-200 border border-violet-800/50 flex items-center justify-center font-bold text-sm transition-colors active:scale-95"
                        >
                          -
                        </button>
                        <span className={`w-8 text-center font-mono font-bold text-lg ${
                          agotado ? 'text-red-500' : stockBajo ? 'text-amber-400' : 'text-white'
                        }`}>
                          {prod.stock}
                        </span>
                        <button 
                          onClick={() => ajustarStock(prod.id, 1)}
                          className="w-7 h-7 rounded bg-violet-950 hover:bg-violet-800 text-violet-200 border border-violet-800/50 flex items-center justify-center font-bold text-sm transition-colors active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA AÑADIR / EDITAR */}
      {modalAbierto && productoEditando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161625] border border-violet-700/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(139,92,246,0.3)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-violet-900/40 pb-3">
              <h3 className="text-2xl font-serif text-violet-400">
                {productoEditando.id ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
              </h3>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarProducto} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">SKU</label>
                  <input 
                    type="text" 
                    value={productoEditando.sku || ''} 
                    onChange={e => setProductoEditando({...productoEditando, sku: e.target.value})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Categoría</label>
                  <input 
                    type="text" 
                    value={productoEditando.categoria || ''} 
                    onChange={e => setProductoEditando({...productoEditando, categoria: e.target.value})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-violet-300 block mb-1">Nombre del Producto</label>
                <input 
                  type="text" 
                  value={productoEditando.nombre || ''} 
                  onChange={e => setProductoEditando({...productoEditando, nombre: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Talla</label>
                  <input 
                    type="text" 
                    value={productoEditando.talla || ''} 
                    onChange={e => setProductoEditando({...productoEditando, talla: e.target.value})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Color</label>
                  <input 
                    type="text" 
                    value={productoEditando.color || ''} 
                    onChange={e => setProductoEditando({...productoEditando, color: e.target.value})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Precio Costo ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={productoEditando.precio_costo ?? 0} 
                    onChange={e => setProductoEditando({...productoEditando, precio_costo: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Precio Venta ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={productoEditando.precio_venta ?? 0} 
                    onChange={e => setProductoEditando({...productoEditando, precio_venta: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Stock Actual</label>
                  <input 
                    type="number" 
                    value={productoEditando.stock ?? 0} 
                    onChange={e => setProductoEditando({...productoEditando, stock: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Stock Mínimo Alerta</label>
                  <input 
                    type="number" 
                    value={productoEditando.stock_minimo ?? 3} 
                    onChange={e => setProductoEditando({...productoEditando, stock_minimo: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-violet-300 block mb-1">URL Imagen Supabase</label>
                <input 
                  type="text" 
                  value={productoEditando.image_url || ''} 
                  onChange={e => setProductoEditando({...productoEditando, image_url: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-violet-300 block mb-1">Descripción</label>
                <textarea 
                  rows={2}
                  value={productoEditando.descripcion || ''} 
                  onChange={e => setProductoEditando({...productoEditando, descripcion: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-violet-900/40">
                <button 
                  type="submit" 
                  className="flex-1 bg-violet-800 hover:bg-violet-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  Guardar
                </button>
                {productoEditando.id && (
                  <button 
                    type="button" 
                    onClick={() => {
                      eliminarProducto(productoEditando.id!);
                      setModalAbierto(false);
                    }}
                    className="bg-red-950 hover:bg-red-800 text-red-300 px-4 py-2 rounded-lg transition-colors border border-red-800/40"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
