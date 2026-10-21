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
  imagenes?: string[];
}

export default function InventarioPurpleCat() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [tallaFiltro, setTallaFiltro] = useState('Todas');
  
  // Tasas de cambio Venezuela (Guardadas en el navegador)
  const [tasaBCV, setTasaBCV] = useState<number>(36.50);
  const [tasaParalelo, setTasaParalelo] = useState<number>(40.00);

  // Modal Edit State
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Partial<Producto> & { imagenesTexto?: string } | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Visor / Galería de fotos State
  const [visorImagenes, setVisorImagenes] = useState<{ abierto: boolean; lista: string[]; indice: number; titulo: string }>({
    abierto: false,
    lista: [],
    indice: 0,
    titulo: ''
  });

  // Modal Calculadora de Precios State
  const [modalCalcAbierto, setModalCalcAbierto] = useState(false);
  const [calcCosto, setCalcCosto] = useState<number>(10.00);
  const [calcFlete, setCalcFlete] = useState<number>(1.50);
  const [calcMargen, setCalcMargen] = useState<number>(50);

  // Feedback Copiado
  const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

  useEffect(() => {
    fetchProductos();
    const bcvGuardada = localStorage.getItem('purplecat_bcv');
    const paraleloGuardada = localStorage.getItem('purplecat_paralelo');
    if (bcvGuardada) setTasaBCV(parseFloat(bcvGuardada));
    if (paraleloGuardada) setTasaParalelo(parseFloat(paraleloGuardada));
  }, []);

  const actualizarTasaBCV = (val: number) => {
    setTasaBCV(val);
    localStorage.setItem('purplecat_bcv', val.toString());
  };

  const actualizarTasaParalelo = (val: number) => {
    setTasaParalelo(val);
    localStorage.setItem('purplecat_paralelo', val.toString());
  };

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
    
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));

    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) {
      console.error("Error al actualizar stock:", error.message);
      fetchProductos();
    }
  }

  // Función para Subir Fotos Directamente a Supabase Storage
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoFoto(true);
    const nuevasUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Error al subir imagen:', error);
        alert(`Error al subir ${file.name}: ${error.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        nuevasUrls.push(urlData.publicUrl);
      }
    }

    if (nuevasUrls.length > 0) {
      const textoActual = productoEditando?.imagenesTexto || '';
      const nuevoTexto = textoActual 
        ? `${textoActual}\n${nuevasUrls.join('\n')}` 
        : nuevasUrls.join('\n');

      setProductoEditando(prev => prev ? {
        ...prev,
        image_url: prev.image_url || nuevasUrls[0],
        imagenesTexto: nuevoTexto
      } : null);
    }

    setSubiendoFoto(false);
    e.target.value = '';
  }

  function eliminarImagenTexto(indexAEliminar: number) {
    if (!productoEditando?.imagenesTexto) return;
    const lineas = productoEditando.imagenesTexto.split('\n').filter(Boolean);
    const filtradas = lineas.filter((_, idx) => idx !== indexAEliminar);
    const nuevoTexto = filtradas.join('\n');
    
    setProductoEditando({
      ...productoEditando,
      image_url: filtradas[0] || 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg',
      imagenesTexto: nuevoTexto
    });
  }

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!productoEditando) return;

    const listaImagenes = productoEditando.imagenesTexto
      ? productoEditando.imagenesTexto.split('\n').map(u => u.trim()).filter(u => u.length > 0)
      : (productoEditando.imagenes || []);

    const mainImage = listaImagenes[0] || productoEditando.image_url || 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg';

    const payload = {
      sku: productoEditando.sku,
      nombre: productoEditando.nombre,
      categoria: productoEditando.categoria,
      talla: productoEditando.talla,
      color: productoEditando.color,
      precio_costo: parseFloat(Number(productoEditando.precio_costo || 0).toFixed(2)),
      precio_venta: parseFloat(Number(productoEditando.precio_venta || 0).toFixed(2)),
      stock: parseInt(String(productoEditando.stock || 0)),
      stock_minimo: parseInt(String(productoEditando.stock_minimo || 3)),
      descripcion: productoEditando.descripcion,
      image_url: mainImage,
      imagenes: listaImagenes
    };

    if (productoEditando.id) {
      const { error } = await supabase.from('productos').update(payload).eq('id', productoEditando.id);
      if (!error) {
        setModalAbierto(false);
        fetchProductos();
      }
    } else {
      const { error } = await supabase.from('productos').insert([payload]);
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

  function abrirVisor(prod: Producto) {
    let todas = [prod.image_url];
    if (prod.imagenes && Array.isArray(prod.imagenes)) {
      prod.imagenes.forEach(img => {
        if (img && !todas.includes(img)) todas.push(img);
      });
    }
    todas = todas.filter(Boolean);

    setVisorImagenes({
      abierto: true,
      lista: todas,
      indice: 0,
      titulo: prod.nombre
    });
  }

  function copiarPrecioCliente(nombre: string, usdEfectivo: number) {
    const totalBs = usdEfectivo * tasaParalelo;
    const usdBcv = tasaBCV > 0 ? totalBs / tasaBCV : usdEfectivo;
    
    const texto = `Purple Cat 🐾 - ${nombre}:\n• $${usdEfectivo.toFixed(2)} en Efectivo\n• $${usdBcv.toFixed(2)} en Bs a Tasa BCV (${totalBs.toFixed(2)} Bs)`;
    
    navigator.clipboard.writeText(texto);
    setMensajeCopiado(`¡Copiado precio de ${nombre}!`);
    setTimeout(() => setMensajeCopiado(null), 3000);
  }

  // Cálculos para la Calculadora de Precios
  const costoTotalBase = (Number(calcCosto) || 0) + (Number(calcFlete) || 0);
  const precioEfectivoUSD = costoTotalBase * (1 + (Number(calcMargen) || 0) / 100);
  const totalBsRequeridos = precioEfectivoUSD * tasaParalelo;
  const precioBCVUSD = tasaBCV > 0 ? totalBsRequeridos / tasaBCV : precioEfectivoUSD;
  const gananciaNetaUSD = precioEfectivoUSD - costoTotalBase;

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

  const fotosEnModal = productoEditando?.imagenesTexto 
    ? productoEditando.imagenesTexto.split('\n').filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 p-4 md:p-8 font-sans selection:bg-violet-900 selection:text-white">
      {/* Feedback Copiado */}
      {mensajeCopiado && (
        <div className="fixed top-4 right-4 z-50 bg-violet-900 text-white px-4 py-2 rounded-lg border border-violet-500 shadow-2xl animate-bounce text-xs font-mono font-bold">
          {mensajeCopiado}
        </div>
      )}

      {/* Header Gótico con Logo Central */}
      <header className="flex flex-col items-center mb-6 border-b border-violet-950/60 pb-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-purple-900 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <img 
            src="https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg" 
            alt="Purple Cat Logo" 
            className="relative w-32 h-32 object-contain rounded-full border-2 border-violet-600/50 shadow-[0_0_25px_rgba(139,92,246,0.3)] bg-black"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-violet-400 tracking-widest uppercase mt-3 text-center drop-shadow-[0_2px_10px_rgba(139,92,246,0.5)]">
          Purple Cat
        </h1>
        <p className="text-xs text-violet-300/60 mt-1 uppercase tracking-widest font-mono">
          Gestión de Inventario Gótico
        </p>
      </header>

      {/* BARRA DE TASAS DE CAMBIO (VENEZUELA) */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-[#161625] via-[#1c1b33] to-[#161625] border border-violet-800/40 p-3.5 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🇻🇪</span>
          <span className="text-xs font-bold text-violet-300 uppercase tracking-wider font-mono">Tasas de Cambio:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#0a0a12] px-3 py-1.5 rounded-lg border border-violet-900/50">
            <label className="text-xs text-blue-400 font-semibold font-mono">BCV (Bs):</label>
            <input 
              type="number" 
              step="0.01"
              value={tasaBCV}
              onChange={(e) => actualizarTasaBCV(parseFloat(e.target.value) || 0)}
              className="w-20 bg-transparent text-white font-mono font-bold text-sm focus:outline-none text-right"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#0a0a12] px-3 py-1.5 rounded-lg border border-violet-900/50">
            <label className="text-xs text-purple-400 font-semibold font-mono">Paralelo (Bs):</label>
            <input 
              type="number" 
              step="0.01"
              value={tasaParalelo}
              onChange={(e) => actualizarTasaParalelo(parseFloat(e.target.value) || 0)}
              className="w-20 bg-transparent text-white font-mono font-bold text-sm focus:outline-none text-right"
            />
          </div>

          <button
            onClick={() => setModalCalcAbierto(true)}
            className="bg-violet-900/60 hover:bg-violet-700 text-violet-200 border border-violet-500/50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
          >
            🧮 Calculadora de Precios
          </button>
        </div>
      </div>

      {/* Barra de Herramientas: Búsqueda y Filtros */}
      <div className="max-w-7xl mx-auto mb-8 bg-[#161625]/80 border border-violet-900/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-1/3">
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0a0a12] border border-violet-900/40 rounded-lg px-4 py-2 text-violet-200 placeholder-violet-500/50 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

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

          <button 
            onClick={() => {
              setProductoEditando({
                sku: `PUR-${String(productos.length + 1).padStart(2, '0')}`,
                nombre: '',
                categoria: 'Corsets',
                talla: 'M',
                color: 'Negro',
                precio_costo: 0.00,
                precio_venta: 0.00,
                stock: 0,
                stock_minimo: 3,
                descripcion: '',
                image_url: 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg',
                imagenesTexto: ''
              });
              setModalAbierto(true);
            }}
            className="bg-violet-900/50 hover:bg-violet-700 text-violet-200 border border-violet-500/40 font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_0_10px_rgba(139,92,246,0.2)]"
          >
            ➕ Nuevo
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-violet-400 font-serif tracking-widest animate-pulse">Invocando inventario...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {productosFiltrados.map((prod) => {
            const stockBajo = prod.stock <= prod.stock_minimo && prod.stock > 0;
            const agotado = prod.stock === 0;
            const totalFotos = (prod.imagenes?.length && prod.imagenes.length > 0) 
              ? prod.imagenes.length 
              : 1;

            const usdEfectivo = Number(prod.precio_venta || 0);
            const costoUSD = Number(prod.precio_costo || 0);
            const totalBsRequeridos = usdEfectivo * tasaParalelo;
            const usdBcvEquivalente = tasaBCV > 0 ? totalBsRequeridos / tasaBCV : usdEfectivo;

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
                {/* Badges de Stock */}
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
                <div 
                  onClick={() => abrirVisor(prod)}
                  className="h-52 overflow-hidden bg-black/60 relative cursor-pointer group/img"
                  title="Haz clic para abrir la galería de fotos"
                >
                  <img 
                    src={prod.image_url || 'https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg'} 
                    alt={prod.nombre}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 opacity-90 group-hover/img:opacity-100"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/80 text-violet-300 text-[10px] px-2 py-0.5 rounded border border-violet-900/40 font-mono">
                    {prod.sku}
                  </span>

                  <span className="absolute bottom-2 right-2 bg-violet-950/90 text-violet-200 text-[10px] px-2 py-0.5 rounded border border-violet-700/50 flex items-center gap-1 backdrop-blur-sm group-hover/img:bg-violet-800 transition-colors">
                    🖼️ {totalFotos} {totalFotos === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>

                {/* Info del Producto */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-lg font-serif text-violet-300 font-semibold leading-snug line-clamp-1">
                        {prod.nombre}
                      </h2>
                      <button 
                        onClick={() => {
                          const imgsTexto = (prod.imagenes && prod.imagenes.length > 0)
                            ? prod.imagenes.join('\n')
                            : prod.image_url;
                          setProductoEditando({ ...prod, imagenesTexto: imgsTexto });
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

                  <div>
                    {/* Precios Doble */}
                    <div className="bg-black/40 p-2.5 rounded-lg border border-violet-900/20 mb-3 space-y-2">
                      <div className="flex justify-between items-baseline text-[10px] text-gray-500">
                        <span>Costo Invertido:</span>
                        <span className="font-mono text-gray-400">${costoUSD.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-violet-900/30">
                        <span className="text-xs font-bold text-emerald-400">💵 En Efectivo:</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">${usdEfectivo.toFixed(2)}</span>
                      </div>

                      <div className="bg-violet-950/30 p-1.5 rounded border border-violet-800/30 space-y-0.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-blue-300 font-semibold">💳 En Bs a BCV:</span>
                          <span className="font-mono font-bold text-violet-200">${usdBcvEquivalente.toFixed(2)}</span>
                        </div>
                        <div className="text-right text-[10px] text-gray-400 font-mono">
                          = Bs {totalBsRequeridos.toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => copiarPrecioCliente(prod.nombre, usdEfectivo)}
                        className="w-full text-center text-[10px] bg-violet-900/30 hover:bg-violet-800/60 text-violet-300 py-1 rounded border border-violet-700/40 transition-colors font-mono"
                      >
                        📋 Copiar Precio para Cliente
                      </button>
                    </div>

                    {/* Stock */}
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

      {/* --- MODAL CALCULADORA --- */}
      {modalCalcAbierto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161625] border border-violet-600/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            <div className="flex justify-between items-center mb-5 border-b border-violet-900/40 pb-3">
              <h3 className="text-xl font-serif text-violet-400 flex items-center gap-2">
                🧮 Calculadora de Precios Efectivo vs BCV
              </h3>
              <button 
                onClick={() => setModalCalcAbierto(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-violet-300 block mb-1">Costo Base ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={calcCosto}
                    onChange={(e) => setCalcCosto(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300 block mb-1">Flete/Envío ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={calcFlete}
                    onChange={(e) => setCalcFlete(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300 block mb-1">% Ganancia</label>
                  <input 
                    type="number" 
                    step="1"
                    value={calcMargen}
                    onChange={(e) => setCalcMargen(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="bg-[#0a0a12] p-4 rounded-xl border border-violet-800/40 space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs text-gray-400 border-b border-violet-900/30 pb-2">
                  <span>Costo Total Invertido:</span>
                  <span className="font-mono text-white font-bold">${costoTotalBase.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-emerald-950/20 p-2 rounded border border-emerald-800/30">
                  <span className="font-bold text-emerald-400">💵 Precio en Efectivo ($):</span>
                  <span className="font-mono text-xl font-bold text-emerald-400">${precioEfectivoUSD.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-violet-950/30 p-2 rounded border border-violet-800/40">
                  <div>
                    <span className="font-bold text-violet-300 block">💳 Precio en Bs a BCV:</span>
                    <span className="text-[10px] text-gray-400 font-mono">(= Bs {totalBsRequeridos.toFixed(2)})</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-violet-200">${precioBCVUSD.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-emerald-300/80 pt-1">
                  <span>Ganancia Neta ($):</span>
                  <span className="font-mono font-semibold">+${gananciaNetaUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL VISOR DE FOTOS --- */}
      {visorImagenes.abierto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-4 md:p-8 animate-fadeIn">
          <div className="w-full max-w-4xl flex justify-between items-center text-violet-300 border-b border-violet-900/40 pb-4">
            <div>
              <h3 className="text-xl font-serif text-violet-400">{visorImagenes.titulo}</h3>
              <p className="text-xs text-gray-400">
                Imagen {visorImagenes.indice + 1} de {visorImagenes.lista.length}
              </p>
            </div>
            <button 
              onClick={() => setVisorImagenes({ ...visorImagenes, abierto: false })}
              className="text-2xl text-gray-400 hover:text-violet-400 transition-colors p-2"
            >
              ✕
            </button>
          </div>

          <div className="relative w-full max-w-4xl flex-grow flex items-center justify-center my-4 overflow-hidden">
            {visorImagenes.lista.length > 1 && (
              <button 
                onClick={() => setVisorImagenes(prev => ({
                  ...prev,
                  indice: (prev.indice - 1 + prev.lista.length) % prev.lista.length
                }))}
                className="absolute left-2 z-10 bg-black/70 hover:bg-violet-900/80 text-white p-3 rounded-full border border-violet-700/50 transition-colors"
              >
                ◀
              </button>
            )}

            <img 
              src={visorImagenes.lista[visorImagenes.indice]} 
              alt="Vista ampliada"
              className="max-h-[70vh] max-w-full object-contain rounded-lg border border-violet-900/40 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
            />

            {visorImagenes.lista.length > 1 && (
              <button 
                onClick={() => setVisorImagenes(prev => ({
                  ...prev,
                  indice: (prev.indice + 1) % prev.lista.length
                }))}
                className="absolute right-2 z-10 bg-black/70 hover:bg-violet-900/80 text-white p-3 rounded-full border border-violet-700/50 transition-colors"
              >
                ▶
              </button>
            )}
          </div>

          {visorImagenes.lista.length > 1 && (
            <div className="flex gap-2 overflow-x-auto max-w-4xl p-2 border-t border-violet-900/30 w-full justify-center">
              {visorImagenes.lista.map((url, i) => (
                <img 
                  key={i}
                  src={url}
                  alt={`Thumb ${i}`}
                  onClick={() => setVisorImagenes(prev => ({ ...prev, indice: i }))}
                  className={`w-14 h-14 object-cover rounded cursor-pointer border-2 transition-all ${
                    i === visorImagenes.indice ? 'border-violet-500 scale-105 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL EDITAR / AGREGAR PRODUCTO CON SUBIDA DE ARCHIVOS --- */}
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
                    value={productoEditando.precio_costo ?? ''} 
                    onChange={e => setProductoEditando({...productoEditando, precio_costo: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Precio Venta Efectivo ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={productoEditando.precio_venta ?? ''} 
                    onChange={e => setProductoEditando({...productoEditando, precio_venta: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                    placeholder="0.00"
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

              {/* SECCIÓN DE SUBIDA DIRECTA DE FOTOS */}
              <div className="bg-[#0a0a12] p-3 rounded-lg border border-violet-900/40 space-y-2">
                <label className="text-xs text-violet-300 font-semibold block">
                  📸 Fotos del Producto (Galeria o Cámara):
                </label>
                
                <label className="flex items-center justify-center gap-2 bg-violet-950 hover:bg-violet-800 text-violet-200 border border-violet-700/60 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold">
                  <span>{subiendoFoto ? '⏳ Subiendo foto(s)...' : '📁 Seleccionar Imagen(es)'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    disabled={subiendoFoto}
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </label>

                {/* Vistas Previas de las Fotos Adjuntas */}
                {fotosEnModal.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {fotosEnModal.map((url, index) => (
                      <div key={index} className="relative group/thumb rounded overflow-hidden h-16 bg-black border border-violet-800/40">
                        <img src={url} alt={`Foto ${index}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => eliminarImagenTexto(index)}
                          className="absolute top-0.5 right-0.5 bg-red-950/90 text-red-300 text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-red-600/50"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-violet-300 block mb-1">Descripción del Producto</label>
                <textarea 
                  rows={2}
                  value={productoEditando.descripcion || ''} 
                  onChange={e => setProductoEditando({...productoEditando, descripcion: e.target.value})}
                  className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  placeholder="Ej: Corset de satén negro con ballenas de acero..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-violet-900/40">
                <button 
                  type="submit" 
                  disabled={subiendoFoto}
                  className="flex-1 bg-violet-800 hover:bg-violet-700 text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {subiendoFoto ? 'Cargando Fotos...' : 'Guardar Producto'}
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
