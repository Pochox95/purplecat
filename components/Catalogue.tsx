'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search, ShoppingBag, Eye, X, MessageCircle, Instagram, Sparkles, Filter, CheckCircle2, XCircle } from 'lucide-react'
import { Producto } from '@/lib/supabase'

interface CatalogueProps {
  productos: Producto[]
  tasaBCV: number
  tasaParalelo: number
}

const WS_PHONE = '584129000623'
const IG_URL = 'https://www.instagram.com/purplekat26'

export default function Catalogue({ productos }: CatalogueProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [selectedSize, setSelectedSize] = useState<string>('todas')
  const [selectedColor, setSelectedColor] = useState<string>('todos')
  const [inStockOnly, setInStockOnly] = useState(false)
  
  // Modal de imagen a pantalla completa
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null)

  // Extraer categorías, tallas y colores únicos de la base de datos
  const categories = useMemo(() => {
    const cats = new Set<string>()
    productos.forEach(p => { if (p.categoria) cats.add(p.categoria) })
    return Array.from(cats).sort()
  }, [productos])

  const sizes = useMemo(() => {
    const szs = new Set<string>()
    productos.forEach(p => {
      if (p.tallas && Array.isArray(p.tallas)) {
        p.tallas.forEach(t => szs.add(t))
      }
    })
    return Array.from(szs).sort()
  }, [productos])

  const colors = useMemo(() => {
    const cls = new Set<string>()
    productos.forEach(p => {
      if (p.colores && Array.isArray(p.colores)) {
        p.colores.forEach(c => cls.add(c))
      }
    })
    return Array.from(cls).sort()
  }, [productos])

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return productos.filter(product => {
      const matchSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchCategory = selectedCategory === 'todas' || product.categoria === selectedCategory
      const matchSize = selectedSize === 'todas' || (product.tallas && product.tallas.includes(selectedSize))
      const matchColor = selectedColor === 'todos' || (product.colores && product.colores.includes(selectedColor))
      const matchStock = !inStockOnly || product.stock > 0

      return matchSearch && matchCategory && matchSize && matchColor && matchStock
    })
  }, [productos, searchTerm, selectedCategory, selectedSize, selectedColor, inStockOnly])

  const formatWSMessage = (productName: string, sku: string) => {
    const msg = `¡Hola! Me interesa obtener información y precio del producto: *${productName}* (SKU: ${sku}).`
    return `https://wa.me/${WS_PHONE}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-zinc-100 font-sans antialiased selection:bg-purple-900 selection:text-white pb-20">
      
      {/* BANNER / HEADER GÓTICO */}
      <header className="relative border-b border-purple-900/40 bg-gradient-to-b from-[#120a1c] via-[#0d0914] to-[#0a0a12] pt-12 pb-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/50 text-purple-300 text-xs tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Catalog Gothic Collection
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-zinc-100 to-purple-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.3)]">
            PURPLE CAT
          </h1>
          
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed">
            Moda alternativa & accesorios oscuros. Explora nuestro catálogo exclusivo y solicita tu pedido por WhatsApp.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href={`https://wa.me/${WS_PHONE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60 transition text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp Directo
            </a>
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-950/60 border border-pink-700/50 text-pink-300 hover:bg-pink-900/60 transition text-sm font-medium"
            >
              <Instagram className="w-4 h-4 text-pink-400" /> @purplekat26
            </a>
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="bg-[#161625] border border-purple-900/30 rounded-2xl p-5 mb-10 shadow-xl space-y-4">
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0a0a12] border border-purple-900/40 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Categorías */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                <option value="todas">Todas las categorías</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Talla */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                Talla
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                <option value="todas">Todas las tallas</option>
                {sizes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                Color
              </label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                <option value="todos">Todos los colores</option>
                {colors.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Toggle Solo Disponible */}
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-white transition">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
                Solo productos en stock
              </label>
            </div>
          </div>
        </div>

        {/* GRILLA DE PRODUCTOS */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#161625]/50 rounded-2xl border border-purple-900/20">
            <ShoppingBag className="w-12 h-12 mx-auto text-purple-500/40 mb-3" />
            <h3 className="text-xl font-medium text-zinc-300">No se encontraron productos</h3>
            <p className="text-zinc-500 text-sm mt-1">Prueba ajustando los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const inStock = p.stock > 0
              const mainImg = p.imagen_url || (p.imagenes && p.imagenes[0]) || '/placeholder.png'

              return (
                <div
                  key={p.id}
                  className="group bg-[#161625] border border-purple-900/30 rounded-2xl overflow-hidden shadow-lg hover:border-purple-600/50 hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* IMAGEN DEL PRODUCTO */}
                    <div className="relative aspect-square bg-[#0d0d16] overflow-hidden group">
                      <Image
                        src={mainImg}
                        alt={p.nombre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      
                      {/* BOTÓN PARA AMPLIAR IMAGEN */}
                      <button
                        onClick={() => setSelectedImage({ url: mainImg, title: p.nombre })}
                        className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-purple-900/80 border border-purple-500/40 rounded-full text-zinc-200 transition opacity-0 group-hover:opacity-100"
                        title="Ver imagen completa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* BADGE DE STOCK */}
                      <div className="absolute top-3 left-3">
                        {inStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                            <CheckCircle2 className="w-3 h-3" /> Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold backdrop-blur-md">
                            <XCircle className="w-3 h-3" /> Agotado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DETALLES DEL PRODUCTO */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400">
                            {p.categoria || 'Accesorios'}
                          </span>
                          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-purple-300 transition line-clamp-1">
                            {p.nombre}
                          </h3>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">#{p.sku}</span>
                      </div>

                      {p.descripcion && (
                        <p className="text-xs text-zinc-400 line-clamp-2 font-light leading-relaxed">
                          {p.descripcion}
                        </p>
                      )}

                      {/* TALLAS Y COLORES */}
                      <div className="pt-1 space-y-2 text-xs">
                        {p.tallas && p.tallas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-zinc-500 font-medium">Tallas:</span>
                            {p.tallas.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-200 font-mono text-[11px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {p.colores && p.colores.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-zinc-500 font-medium">Colores:</span>
                            {p.colores.map(c => (
                              <span key={c} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/50 text-zinc-300 text-[11px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN WHATSAPP CONSULTAR PRECIO */}
                  <div className="p-5 pt-0">
                    <a
                      href={formatWSMessage(p.nombre, p.sku)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-900/40 border border-purple-500/50 hover:bg-purple-600 hover:border-purple-500 text-purple-200 hover:text-white font-medium text-sm transition-all duration-200 group-hover:shadow-lg group-hover:shadow-purple-900/30"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:text-white" />
                      Consultar precio
                    </a>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL PANTALLA COMPLETA DE IMAGEN */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white bg-zinc-900/80 rounded-full border border-zinc-700"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-[75vh]">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
              />
            </div>
            <p className="mt-4 text-zinc-200 font-serif text-lg tracking-wide text-center">
              {selectedImage.title}
            </p>
          </div>
        </div>
      )}

      {/* FOOTER GÓTICO */}
      <footer className="mt-20 border-t border-purple-900/30 py-8 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} PURPLE CAT — Moda Alternativa & Gótica.</p>
      </footer>
    </div>
  )
}
