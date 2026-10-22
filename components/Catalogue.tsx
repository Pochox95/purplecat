"use client";

import { useMemo, useState } from "react";
import ProductImage from "./ProductImage";

interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  talla: string;
  color: string;
  stock: number;
  descripcion: string;
  image_url: string;
  imagenes?: string[];
}

export default function Catalogue({ productos }: { productos: Producto[] }) {
  const [tallaFiltro, setTallaFiltro] = useState("Todas");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);

  const tallasUnicas = useMemo(() => {
    return ["Todas", ...Array.from(new Set(productos.map((p) => p.talla).filter(Boolean)))];
  }, [productos]);

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const matchTalla = tallaFiltro === "Todas" || p.talla === tallaFiltro;
      const matchStock = soloDisponibles ? p.stock > 0 : true;
      const matchSearch =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase());
      return matchTalla && matchStock && matchSearch;
    });
  }, [productos, tallaFiltro, soloDisponibles, busqueda]);

  const abrirWhatsApp = (p: Producto) => {
    const mensaje = encodeURIComponent(
      `¡Hola Purple Cat! 🖤 Me interesa esta prenda:\n\n📌 *${p.nombre}*\n🏷️ Referencia: ${p.sku}\n📐 Talla: ${p.talla}\n🎨 Color: ${p.color}\n\n¿Me podrías indicar el precio y disponibilidad?`
    );
    window.open(`https://wa.me/584129000623?text=${mensaje}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-slate-100 font-sans p-4 md:p-8">
      {/* HEADER DE LA TIENDA PÚBLICA */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-b border-purple-900/40 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <img
            src="https://vwwmjlsqtdtzzozyjgxd.supabase.co/storage/v1/object/public/product-images/Purplecat%20logo.jpg"
            alt="Purple Cat Logo"
            className="h-14 w-16 rounded-full border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] object-cover"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-purple-400 font-serif">PURPLE CAT</h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase">Goth & Alternative Clothing</p>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="https://www.instagram.com/purplekat26?exln=MW4waGthcTJoOXpsOA=="
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            📸 Instagram
          </a>
          <a
            href="https://wa.me/584129000623"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            📱 WhatsApp
          </a>
        </div>
      </header>

      {/* BARRA DE FILTROS */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#161625] p-4 rounded-2xl border border-purple-900/40">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar prenda..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-[#0a0a12] border border-purple-900/60 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Talla:</span>
            <select
              value={tallaFiltro}
              onChange={(e) => setTallaFiltro(e.target.value)}
              className="bg-[#0a0a12] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              {tallasUnicas.map((t) => (
                <option key={t} value={t}>
                  {t === "Todas" ? "Todas las tallas" : t}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            Solo disponibles
          </label>
        </div>

        <span className="text-xs text-slate-400 font-mono self-end md:self-auto">
          {filtrados.length} resultado(s)
        </span>
      </div>

      {/* TARJETAS DE PRODUCTOS (0 PRECIOS) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtrados.map((p) => {
          const agotado = p.stock === 0;
          const fotos = p.imagenes && p.imagenes.length > 0 ? p.imagenes : [p.image_url];

          return (
            <article
              key={p.id}
              className="bg-[#161625] border border-purple-900/40 rounded-2xl overflow-hidden hover:border-purple-500/60 transition duration-300 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div
                  className="relative aspect-square overflow-hidden bg-black/40 cursor-pointer"
                  onClick={() => setModalProducto(p)}
                >
                  <ProductImage sources={fotos} alt={p.nombre} loading="lazy" />
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shadow ${
                      agotado
                        ? "bg-slate-900/90 text-slate-400 border-slate-700"
                        : "bg-emerald-950/90 text-emerald-400 border-emerald-700"
                    }`}
                  >
                    • {agotado ? "Agotado" : "Disponible"}
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
                    {p.categoria}
                  </p>
                  <h3 className="font-semibold text-slate-100 text-sm mt-1 mb-1">{p.nombre}</h3>
                  <p className="text-xs text-slate-400">
                    {[p.talla && `Talla ${p.talla}`, p.color].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {/* BOTÓN WHATSAPP (SIN PRECIOS) */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => abrirWhatsApp(p)}
                  className="w-full bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/60 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow"
                >
                  💬 Consultar precio
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* MODAL DETALLE DE PRODUCTO */}
      {modalProducto && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setModalProducto(null)}
        >
          <div
            className="bg-[#161625] border border-purple-600/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-purple-400 uppercase font-mono">{modalProducto.categoria}</p>
                <h3 className="text-lg font-bold text-white">{modalProducto.nombre}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Talla: {modalProducto.talla} | Color: {modalProducto.color}
                </p>
              </div>
              <button
                onClick={() => setModalProducto(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="aspect-square bg-black rounded-xl overflow-hidden border border-purple-900/40">
              <img
                src={modalProducto.image_url}
                alt={modalProducto.nombre}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {modalProducto.descripcion || "Sin descripción disponible."}
            </p>

            <button
              onClick={() => {
                abrirWhatsApp(modalProducto);
                setModalProducto(null);
              }}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
            >
              💬 Pedir por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
