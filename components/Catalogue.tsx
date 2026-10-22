'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'

export interface Producto {
  id: string
  sku: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  precio_costo?: number
  precio_venta: number
  stock: number
  tallas?: string[] | null
  colores?: string[] | null
  imagen_url?: string | null
  imagenes?: string[] | null
  created_at?: string
}

interface CatalogueProps {
  productos?: Producto[]
  tasaBCV?: number
  tasaParalelo?: number
}

const WS_PHONE = '584129000623'
const IG_URL = 'https://www.instagram.com/purplekat26'

export default function Catalogue({ productos = [], tasaBCV = 0, tasaParalelo = 0 }: CatalogueProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [selectedSize, setSelectedSize] = useState<string>('todas')
  const [selectedColor, setSelectedColor] = useState<string>('todos')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    productos.forEach((p) => { if (p.categoria) cats.add(p.categoria) })
    return Array.from(cats).sort()
  }, [productos])

  const sizes = useMemo(() => {
    const szs = new Set<string>()
    productos.forEach((p) => {
      if (p.tallas && Array.isArray(p.tallas)) {
        p.tallas.forEach((t) => szs.add(t))
      }
    })
    return Array.from(szs).sort()
  }, [productos])

  const colors = useMemo(() => {
    const cls = new Set<string>()
    productos.forEach((p) => {
      if (p.colores && Array.isArray(p.colores)) {
        p.colores.forEach((c) => cls.add(c))
      }
    })
    return Array.from(cls).sort()
  }, [productos])

  const filteredProducts = useMemo(() => {
    return productos.filter((product) => {
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
    const msg = `¡Hola! Me interesa obtener información del producto: *${productName}* (SKU: ${sku}).`
    return `https://wa.me/${WS_PHONE}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-zinc-100 font-sans antialiased selection:bg-purple-900 selection:text-white pb-20">
      
      {/* HEADER */}
      <header className="relative border-b border-purple-900/40 bg-gradient-to-b from-[#120a1c] via-[#0d0914] to-[#0a0a12] pt-12 pb-16 px-4 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/50 text-purple-300 text-xs tracking-widest uppercase">
            Catálogo Gothic Collection
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-zinc-100 to-purple-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.3)]">
            PURPLE CAT
          </h1>
          
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed">
            Moda alternativa & accesorios oscuros.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href={`https://wa.me/${WS_PHONE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60 transition text-sm font-medium"
            >
              WhatsApp Directo
            </a>
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-950/60 border border-pink-700/50 text-pink-300 hover:bg-pink-900/60 transition text-sm font-medium"
            >
              @purplekat26
            </a>
          </div>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <div className="bg-[#161625] border border-purple-900/30 rounded-2xl p-5 mb-10 shadow-xl space-y-4">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-[#0a0a12] border border-purple-900/40 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="todas">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">Talla</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="todas">Todas las tallas</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">Color</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full bg-[#0a0a12] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="todos">Todos los colores</option>
                {colors.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const mainImg = p.imagen_url || (p.imagenes && p.imagenes[0]) || '/placeholder.png'
            const inStock = p.stock > 0

            return (
              <div key={p.id} className="bg-[#161625] border border-purple-900/30 rounded-2xl overflow-hidden flex flex-col justify-between p-4">
                <div>
                  <div className="relative aspect-square bg-[#0d0d16] rounded-xl overflow-hidden mb-3">
                    <Image src={mainImg} alt={p.nombre} fill className="object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-purple-400">{p.categoria || 'Accesorios'}</span>
                  <h3 className="text-base font-semibold text-zinc-100">{p.nombre}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{p.descripcion}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-purple-900/20">
                  <a
                    href={formatWSMessage(p.nombre, p.sku)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center py-2 px-4 rounded-xl bg-purple-900/40 border border-purple-500/50 text-purple-200 text-sm font-medium hover:bg-purple-600 transition"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
