"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Commerce from "./Commerce";
import { useAdmin } from "./AccessGate";
import AdminShell, { Section } from "./AdminShell";
import Icon from "./Icon";
import ProductImage from "./ProductImage";

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

export default function Inventory() {
  const profile = useAdmin();
  const owner = profile.rol === "dueno";
  const [section, setSection] = useState<Section>("Inventario");
  const [loadError, setLoadError] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [tallaFiltro, setTallaFiltro] = useState("Todas");

  const [tasaBCV, setTasaBCV] = useState<number>(36.5);
  const [tasaParalelo, setTasaParalelo] = useState<number>(40.0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<
    (Partial<Producto> & { imagenesTexto?: string }) | null
  >(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [visorImagenes, setVisorImagenes] = useState<{
    abierto: boolean;
    lista: string[];
    indice: number;
    titulo: string;
  }>({
    abierto: false,
    lista: [],
    indice: 0,
    titulo: "",
  });

  const [modalCalcAbierto, setModalCalcAbierto] = useState(false);
  const [calcCosto, setCalcCosto] = useState<number>(10.0);
  const [calcFlete, setCalcFlete] = useState<number>(1.5);
  const [calcMargen, setCalcMargen] = useState<number>(50);

  const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

  useEffect(() => {
    fetchProductos();
    const bcvGuardada = localStorage.getItem("purplecat_bcv");
    const paraleloGuardada = localStorage.getItem("purplecat_paralelo");
    if (bcvGuardada) setTasaBCV(parseFloat(bcvGuardada));
    if (paraleloGuardada) setTasaParalelo(parseFloat(paraleloGuardada));
  }, []);

  const actualizarTasaBCV = (val: number) => {
    setTasaBCV(val);
    localStorage.setItem("purplecat_bcv", val.toString());
  };

  const actualizarTasaParalelo = (val: number) => {
    setTasaParalelo(val);
    localStorage.setItem("purplecat_paralelo", val.toString());
  };

  const fetchProductos = useCallback(async () => {
    try {
      setCargando(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setProductos(data || []);
    } catch (err: any) {
      setLoadError("No pudimos actualizar el inventario. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  async function ajustarStock(id: number, delta: number) {
    const prod = productos.find((p) => p.id === id);
    if (!prod) return;

    const { error } = await supabase.rpc("pc_ajustar_stock", {
      producto: id,
      delta,
    });
    if (error) alert(error.message);
    await fetchProductos();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoFoto(true);
    const nuevasUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Error al subir imagen:", error);
        alert(`Error al subir ${file.name}: ${error.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        nuevasUrls.push(urlData.publicUrl);
      }
    }

    if (nuevasUrls.length > 0) {
      const textoActual = productoEditando?.imagenesTexto || "";
      const nuevoTexto = textoActual
        ? `${textoActual}\n${nuevasUrls.join("\n")}`
        : nuevasUrls.join("\n");

      setProductoEditando((prev) =>
        prev
          ? {
              ...prev,
              image_url: prev.image_url || nuevasUrls[0],
              imagenesTexto: nuevoTexto,
            }
          : null,
      );
    }

    setSubiendoFoto(false);
    e.target.value = "";
  }

  function eliminarImagenTexto(indexAEliminar: number) {
    if (!productoEditando?.imagenesTexto) return;
    const lineas = productoEditando.imagenesTexto.split("\n").filter(Boolean);
    const filtradas = lineas.filter((_, idx) => idx !== indexAEliminar);
    const nuevoTexto = filtradas.join("\n");

    setProductoEditando({
      ...productoEditando,
      image_url: filtradas[0] || "/logo-purple-cat.png",
      imagenesTexto: nuevoTexto,
    });
  }

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!productoEditando) return;

    const listaImagenes = productoEditando.imagenesTexto
      ? productoEditando.imagenesTexto
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
      : productoEditando.imagenes || [];

    const mainImage =
      listaImagenes[0] || productoEditando.image_url || "/logo-purple-cat.png";

    const payload = {
      sku: productoEditando.sku,
      nombre: productoEditando.nombre,
      categoria: productoEditando.categoria,
      talla: productoEditando.talla,
      color: productoEditando.color,
      precio_costo: parseFloat(
        Number(productoEditando.precio_costo || 0).toFixed(2),
      ),
      precio_venta: parseFloat(
        Number(productoEditando.precio_venta || 0).toFixed(2),
      ),
      stock: parseInt(String(productoEditando.stock || 0)),
      stock_minimo: parseInt(String(productoEditando.stock_minimo || 3)),
      descripcion: productoEditando.descripcion,
      image_url: mainImage,
      imagenes: listaImagenes,
    };

    if (productoEditando.id) {
      const { error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", productoEditando.id);
      if (error) alert(error.message);
      if (!error) {
        setModalAbierto(false);
        fetchProductos();
      }
    } else {
      const { error } = await supabase.from("productos").insert([payload]);
      if (error) alert(error.message);
      if (!error) {
        setModalAbierto(false);
        fetchProductos();
      }
    }
  }

  async function eliminarProducto(id: number) {
    if (!confirm("¿Seguro que deseas eliminar este producto gótico?")) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (!error) fetchProductos();
  }

  function abrirVisor(prod: Producto) {
    let todas = [prod.image_url];
    if (prod.imagenes && Array.isArray(prod.imagenes)) {
      prod.imagenes.forEach((img) => {
        if (img && !todas.includes(img)) todas.push(img);
      });
    }
    todas = todas.filter(Boolean);

    setVisorImagenes({
      abierto: true,
      lista: todas,
      indice: 0,
      titulo: prod.nombre,
    });
  }

  function copiarPrecioCliente(prod: Producto) {
    const usdEfectivo = Number(prod.precio_venta || 0);
    const totalBs = usdEfectivo * tasaParalelo;
    const usdBcv = tasaBCV > 0 ? totalBs / tasaBCV : usdEfectivo;

    const texto = `✨ *${prod.nombre}* ✨\n\n💵 Precio Efectivo / USDT: *$${usdEfectivo.toFixed(2)}*\n💳 Pago Móvil (Tasa BCV): *Bs. ${totalBs.toFixed(2)}* (Ref. $${usdBcv.toFixed(2)} BCV)\n\n📌 Talla: ${prod.talla} | Color: ${prod.color}`;

    navigator.clipboard.writeText(texto);
    setMensajeCopiado(`¡Copiado precio de ${prod.nombre}!`);
    setTimeout(() => setMensajeCopiado(null), 3000);
  }

  const costoTotalBase = (Number(calcCosto) || 0) + (Number(calcFlete) || 0);
  const precioEfectivoUSD =
    costoTotalBase * (1 + (Number(calcMargen) || 0) / 100);
  const totalBsRequeridos = precioEfectivoUSD * tasaParalelo;
  const precioBCVUSD =
    tasaBCV > 0 ? totalBsRequeridos / tasaBCV : precioEfectivoUSD;
  const gananciaNetaUSD = precioEfectivoUSD - costoTotalBase;

  const categoriasUnicas = [
    "Todas",
    ...Array.from(new Set(productos.map((p) => p.categoria))),
  ];
  const tallasUnicas = [
    "Todas",
    ...Array.from(new Set(productos.map((p) => p.talla))),
  ];

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria =
      categoriaFiltro === "Todas" || p.categoria === categoriaFiltro;
    const coincideTalla = tallaFiltro === "Todas" || p.talla === tallaFiltro;
    return coincideBusqueda && coincideCategoria && coincideTalla;
  });

  const fotosEnModal = productoEditando?.imagenesTexto
    ? productoEditando.imagenesTexto.split("\n").filter(Boolean)
    : [];

  function abrirNuevo() {
    setProductoEditando({
      sku: `PUR-${String(productos.length + 1).padStart(2, "0")}`,
      nombre: "",
      categoria: "Corsets",
      talla: "M",
      color: "Negro",
      precio_costo: 0,
      precio_venta: 0,
      stock: 0,
      stock_minimo: 3,
      descripcion: "",
      image_url: "/logo-purple-cat.png",
      imagenesTexto: "",
    });
    setModalAbierto(true);
  }

  return (
    <AdminShell section={section} onNavigate={setSection}>
      {mensajeCopiado && (
        <div className="pc-toast" role="status">
          <Icon name="check" size={18} />
          {mensajeCopiado}
        </div>
      )}

      <div hidden={section === "Inventario"}>
        <Commerce
          productos={productos}
          tasaBCV={tasaBCV}
          tasaParalelo={tasaParalelo}
          refresh={fetchProductos}
          tab={section}
          onNavigate={setSection}
        />
      </div>

      <div className="inventory-workspace" hidden={section !== "Inventario"}>
        <div className="inventory-stats">
          <article className="stat-card">
            <div>
              <p>Piezas en catálogo</p>
              <strong>{productos.length}</strong>
              <small>Un mundo por descubrir</small>
            </div>
            <span className="stat-icon">
              <Icon name="box" size={22} />
            </span>
          </article>
          <article className="stat-card">
            <div>
              <p>Unidades disponibles</p>
              <strong>
                {productos.reduce((sum, p) => sum + Number(p.stock), 0)}
              </strong>
              <small>Listas para encontrar su lugar</small>
            </div>
            <span className="stat-icon stat-icon-green">
              <Icon name="check" size={22} />
            </span>
          </article>
          <article className="stat-card">
            <div>
              <p>Para revisar</p>
              <strong>
                {productos.filter((p) => p.stock <= p.stock_minimo).length}
              </strong>
              <small>Con stock bajo o agotadas</small>
            </div>
            <span className="stat-icon stat-icon-amber">
              <Icon name="alert" size={22} />
            </span>
          </article>
        </div>

        <div className="rates-panel">
          <div className="rates-heading">
            <span className="rates-icon">Bs</span>
            <div>
              <strong>Tasas de cambio</strong>
              <small>Precios claros en cada moneda</small>
            </div>
          </div>
          <div className="rates-fields">
            <label htmlFor="rate-bcv">
              BCV
              <input
                id="rate-bcv"
                aria-label="Tasa BCV"
                type="number"
                min="0.01"
                step="0.01"
                value={tasaBCV}
                onChange={(e) => actualizarTasaBCV(Number(e.target.value))}
              />
              <span>Bs</span>
            </label>
            <label htmlFor="rate-parallel">
              Paralelo
              <input
                id="rate-parallel"
                aria-label="Tasa paralelo"
                type="number"
                min="0.01"
                step="0.01"
                value={tasaParalelo}
                onChange={(e) => actualizarTasaParalelo(Number(e.target.value))}
              />
              <span>Bs</span>
            </label>
            <button
              className="pc-button pc-button-quiet"
              onClick={() => setModalCalcAbierto(true)}
            >
              <Icon name="grid" size={17} />
              Calculadora
            </button>
          </div>
        </div>

        <div className="inventory-section-heading">
          <div>
            <h2>Tu inventario</h2>
            <p>Encontrá, organizá y cuidá cada pieza.</p>
          </div>
          {owner && (
            <button className="pc-button pc-button-primary" onClick={abrirNuevo}>
              <Icon name="plus" size={18} />
              Nuevo producto
            </button>
          )}
        </div>

        <div className="inventory-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar en inventario</span>
            <input
              placeholder="Buscar por nombre o referencia…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <div className="inventory-filters">
            <select
              aria-label="Categoría del inventario"
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
            >
              {categoriasUnicas.map((c) => (
                <option key={c} value={c}>
                  {c === "Todas" ? "Todas las categorías" : c}
                </option>
              ))}
            </select>
            <select
              aria-label="Talla del inventario"
              value={tallaFiltro}
              onChange={(e) => setTallaFiltro(e.target.value)}
            >
              {tallasUnicas.map((t) => (
                <option key={t} value={t}>
                  {t === "Todas" ? "Todas las tallas" : t}
                </option>
              ))}
            </select>
            <button
              className="pc-icon-button"
              aria-label="Actualizar inventario"
              onClick={() => void fetchProductos()}
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>

        {loadError && (
          <div className="form-error" role="alert">
            {loadError}
            <button className="subtle-link" onClick={() => void fetchProductos()}>
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="inventory-grid" aria-busy="true" aria-label="Cargando inventario">
            {[0, 1, 2].map((n) => (
              <div className="skeleton-card" key={n}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : productosFiltrados.length ? (
          <div className="inventory-grid">
            {productosFiltrados.map((prod) => {
              const agotado = prod.stock === 0;
              const bajo = prod.stock > 0 && prod.stock <= prod.stock_minimo;
              const usd = Number(prod.precio_venta || 0);
              const bsParalelo = usd * tasaParalelo;
              const refBcv = tasaBCV > 0 ? bsParalelo / tasaBCV : usd;

              return (
                <article key={prod.id} className="inventory-card">
                  <div className="inventory-photo">
                    <button
                      onClick={() => abrirVisor(prod)}
                      aria-label={`Ver fotos de ${prod.nombre}`}
                    >
                      <ProductImage
                        sources={[prod.image_url, ...(prod.imagenes || [])]}
                        alt={prod.nombre}
                        loading="lazy"
                      />
                    </button>
                    <span
                      className={`stock-pill ${agotado ? "stock-pill-muted" : bajo ? "stock-pill-warning" : ""}`}
                    >
                      <span />
                      {agotado ? "Agotado" : bajo ? "Stock bajo" : "Disponible"}
                    </span>
                    <span className="photo-count">
                      {prod.imagenes?.length || 1}{" "}
                      {(prod.imagenes?.length || 1) === 1 ? "foto" : "fotos"}
                    </span>
                  </div>

                  <div className="inventory-card-body">
                    <div className="inventory-card-title">
                      <div>
                        <p className="product-category">{prod.categoria}</p>
                        <h3>{prod.nombre}</h3>
                      </div>
                      {owner && (
                        <button
                          className="pc-icon-button edit-product"
                          title="Editar producto"
                          aria-label={`Editar ${prod.nombre}`}
                          onClick={() => {
                            setProductoEditando({
                              ...prod,
                              imagenesTexto: prod.imagenes?.length
                                ? prod.imagenes.join("\n")
                                : prod.image_url,
                            });
                            setModalAbierto(true);
                          }}
                        >
                          <Icon name="edit" size={18} />
                        </button>
                      )}
                    </div>

                    <p className="product-meta">
                      {[prod.talla && `Talla ${prod.talla}`, prod.color]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    {/* PRECIOS CON ESTÉTICA DE LA PÁGINA */}
                    <div className="inventory-price">
                      <div>
                        <small>💵 Efectivo / USDT</small>
                        <strong>${usd.toFixed(2)}</strong>
                      </div>
                      <div>
                        <small>📱 Pago Móvil</small>
                        <span>Bs {bsParalelo.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="inventory-cost" style={{ marginTop: "-4px" }}>
                      Ref BCV{" "}
                      <span>${refBcv.toFixed(2)}</span>
                      {" · "}
                      Paralelo {tasaParalelo} / BCV {tasaBCV}
                    </p>

                    {owner && (
                      <p className="inventory-cost">
                        Costo unitario{" "}
                        <span>${Number(prod.precio_costo || 0).toFixed(2)}</span>
                      </p>
                    )}

                    <div className="inventory-card-footer">
                      <div className="stock-stepper">
                        <span>Stock</span>
                        {owner && (
                          <button
                            aria-label={`Restar stock de ${prod.nombre}`}
                            disabled={prod.stock === 0}
                            onClick={() => void ajustarStock(prod.id, -1)}
                          >
                            −
                          </button>
                        )}
                        <strong>{prod.stock}</strong>
                        {owner && (
                          <button
                            aria-label={`Sumar stock de ${prod.nombre}`}
                            onClick={() => void ajustarStock(prod.id, 1)}
                          >
                            +
                          </button>
                        )}
                      </div>
                      <button
                        className="copy-price"
                        onClick={() => copiarPrecioCliente(prod)}
                        title="Copiar precio para cliente"
                      >
                        Copiar precio
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="pc-empty">
            <Icon name="box" size={32} />
            <h3>
              {productos.length
                ? "No encontramos esa pieza"
                : "Tu inventario empieza acá"}
            </h3>
            <p>
              {productos.length
                ? "Probá otra búsqueda o cambiá los filtros."
                : "Agregá tu primer producto para empezar a darle forma a tu colección."}
            </p>
            {owner && !productos.length && (
              <button className="pc-button pc-button-primary" onClick={abrirNuevo}>
                Agregar producto
                <Icon name="plus" size={17} />
              </button>
            )}
          </div>
        )}
      </div>

      {modalCalcAbierto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161625] border border-violet-600/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            <div className="flex justify-between items-center mb-5 border-b border-violet-900/40 pb-3">
              <h3 className="text-xl font-serif text-violet-400 flex items-center gap-2">
                Calculadora de precios
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
                  <label className="text-[11px] text-violet-300 block mb-1">
                    Costo Base ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcCosto}
                    onChange={(e) => setCalcCosto(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300 block mb-1">
                    Flete/Envío ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcFlete}
                    onChange={(e) => setCalcFlete(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300 block mb-1">
                    % Ganancia
                  </label>
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
                  <span className="font-mono text-white font-bold">
                    ${costoTotalBase.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-emerald-950/20 p-2 rounded border border-emerald-800/30">
                  <span className="font-bold text-emerald-400">
                    💵 Precio en Efectivo ($):
                  </span>
                  <span className="font-mono text-xl font-bold text-emerald-400">
                    ${precioEfectivoUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-violet-950/30 p-2 rounded border border-violet-800/40">
                  <div>
                    <span className="font-bold text-violet-300 block">
                      💳 Precio en Bs a BCV:
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      (= Bs {totalBsRequeridos.toFixed(2)})
                    </span>
                  </div>
                  <span className="font-mono text-xl font-bold text-violet-200">
                    ${precioBCVUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-emerald-300/80 pt-1">
                  <span>Ganancia Neta ($):</span>
                  <span className="font-mono font-semibold">
                    +${gananciaNetaUSD.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {visorImagenes.abierto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-4 md:p-8 animate-fadeIn">
          <div className="w-full max-w-4xl flex justify-between items-center text-violet-300 border-b border-violet-900/40 pb-4">
            <div>
              <h3 className="text-xl font-serif text-violet-400">
                {visorImagenes.titulo}
              </h3>
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
                onClick={() =>
                  setVisorImagenes((prev) => ({
                    ...prev,
                    indice: (prev.indice - 1 + prev.lista.length) % prev.lista.length,
                  }))
                }
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
                onClick={() =>
                  setVisorImagenes((prev) => ({
                    ...prev,
                    indice: (prev.indice + 1) % prev.lista.length,
                  }))
                }
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
                  onClick={() => setVisorImagenes((prev) => ({ ...prev, indice: i }))}
                  className={`w-14 h-14 object-cover rounded cursor-pointer border-2 transition-all ${
                    i === visorImagenes.indice
                      ? "border-violet-500 scale-105 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {modalAbierto && productoEditando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161625] border border-violet-700/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(139,92,246,0.3)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-violet-900/40 pb-3">
              <h3 className="text-2xl font-serif text-violet-400">
                {productoEditando.id ? "Editar producto" : "Nuevo producto"}
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
                    value={productoEditando.sku || ""}
                    onChange={(e) =>
                      setProductoEditando({ ...productoEditando, sku: e.target.value })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={productoEditando.categoria || ""}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        categoria: e.target.value,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-violet-300 block mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={productoEditando.nombre || ""}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Talla</label>
                  <input
                    type="text"
                    value={productoEditando.talla || ""}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        talla: e.target.value,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">Color</label>
                  <input
                    type="text"
                    value={productoEditando.color || ""}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        color: e.target.value,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-violet-300 block mb-1">
                    Precio Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productoEditando.precio_costo ?? ""}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        precio_costo: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">
                    Precio Venta Efectivo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productoEditando.precio_venta ?? ""}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        precio_venta: parseFloat(e.target.value) || 0,
                      })
                    }
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
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-violet-300 block mb-1">
                    Stock Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    value={productoEditando.stock_minimo ?? 3}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        stock_minimo: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#0a0a12] border border-violet-900/50 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#0a0a12] p-3 rounded-lg border border-violet-900/40 space-y-2">
                <label className="text-xs text-violet-300 font-semibold block">
                  📸 Fotos del Producto (Galeria o Cámara):
                </label>

                <label className="flex items-center justify-center gap-2 bg-violet-950 hover:bg-violet-800 text-violet-200 border border-violet-700/60 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold">
                  <span>
                    {subiendoFoto ? "⏳ Subiendo foto(s)..." : "📁 Seleccionar Imagen(es)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={subiendoFoto}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {fotosEnModal.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {fotosEnModal.map((url, index) => (
                      <div
                        key={index}
                        className="relative group/thumb rounded overflow-hidden h-16 bg-black border border-violet-800/40"
                      >
                        <img
                          src={url}
                          alt={`Foto ${index}`}
                          className="w-full h-full object-cover"
                        />
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
                <label className="text-xs text-violet-300 block mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={2}
                  value={productoEditando.descripcion || ""}
                  onChange={(e) =>
                    setProductoEditando({
                      ...productoEditando,
                      descripcion: e.target.value,
                    })
                  }
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
                  {subiendoFoto ? "Cargando Fotos..." : "Guardar Producto"}
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
    </AdminShell>
  );
}
