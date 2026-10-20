'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function InventarioPurpleCat() {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductos();
  }, []);

  async function fetchProductos() {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('productos') // Aseguramos que el nombre es en español
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductos(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error cargando productos:", err);
    } finally {
      setCargando(false);
    }
  }

  async function ajustarStock(id: number, nuevoStock: number) {
    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);
    
    if (!error) fetchProductos();
  }

  if (cargando) return (
    <div className="min-h-screen bg-[#0a0a12] text-violet-400 flex items-center justify-center font-serif">
      <div className="text-2xl animate-pulse text-center">
        <p>Cargando Inventario...</p>
        <p className="text-sm mt-2 text-gray-500">Purple Cat 🐾</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 p-4 font-sans">
      {/* Header con Logo */}
      <header className="flex flex-col items-center mb-8 border-b border-violet-900/30 pb-6">
        <img 
          src="https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg" 
          alt="Purple Cat Logo" 
          className="w-32 h-32 object-contain mb-4 rounded-full border-2 border-violet-700 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
        />
        <h1 className="text-4xl font-serif text-violet-500 tracking-widest uppercase">Purple Cat</h1>
        <p className="text-xs text-violet-300/50 mt-1 italic">Gothic Style Inventory</p>
      </header>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded mb-6 text-center">
          Error de conexión: {error}
        </div>
      )}

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {productos.map((prod) => (
          <div key={prod.id} className="bg-[#161625] border border-violet-900/20 rounded-lg overflow-hidden hover:border-violet-500/50 transition-all shadow-xl">
            <div className="h-48 overflow-hidden bg-black flex items-center justify-center">
              <img 
                src={prod.image_url || 'https://via.placeholder.com/300?text=Sin+Imagen'} 
                alt={prod.nombre}
                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-xl font-serif text-violet-400 leading-tight">{prod.nombre}</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-tighter">{prod.sku} | {prod.categoria}</p>
                </div>
                <span className="text-xl font-bold text-green-400">${prod.precio_venta}</span>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-3 rounded-md mt-4 border border-violet-900/10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => ajustarStock(prod.id, prod.stock - 1)}
                    className="w-8 h-8 rounded bg-violet-900/30 hover:bg-violet-800 text-violet-200 flex items-center justify-center"
                  >-</button>
                  <span className={`text-xl font-mono ${prod.stock <= prod.stock_minimo ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
                    {prod.stock}
                  </span>
                  <button 
                    onClick={() => ajustarStock(prod.id, prod.stock + 1)}
                    className="w-8 h-8 rounded bg-violet-900/30 hover:bg-violet-800 text-violet-200 flex items-center justify-center"
                  >+</button>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Talla / Color</p>
                  <p className="text-xs font-semibold">{prod.talla} / {prod.color}</p>
                </div>
              </div>

              {prod.stock <= 0 && (
                <p className="text-center text-red-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Agotado</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {productos.length === 0 && !cargando && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-xl italic">El inventario está vacío en la nube.</p>
        </div>
      )}
    </div>
  );
}
