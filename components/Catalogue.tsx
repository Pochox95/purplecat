"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { configured, supabase } from "../lib/supabase";
import { CatalogProduct, filterCatalog } from "../lib/catalog";
import { money } from "../lib/commerce";
import Brand from "./Brand";
import ProductImage from "./ProductImage";
import Icon from "./Icon";
export default function Catalogue() {
  const [products, setProducts] = useState<CatalogProduct[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todas"),
    [size, setSize] = useState("Todas"),
    [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<CatalogProduct | null>(null),
    [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!configured) {
      setError("El catálogo estará disponible pronto.");
      setLoading(false);
      return;
    }
    try {
      const rows: CatalogProduct[] = [];
      let last = 0;
      while (true) {
        const { data, error } = await supabase
          .from("catalogo_productos")
          .select(
            "id,sku,nombre,categoria,talla,color,precio_venta,descripcion,image_url,imagenes,disponible",
          )
          .gt("id", last)
          .order("id")
          .limit(500);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) break;
        last = data[data.length - 1].id;
      }
      setProducts(rows);
    } catch {
      setError("No pudimos cargar las piezas. Intentá de nuevo en un momento.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected) dialog.current?.close();
  }, [selected]);
  const categories = [
    "Todas",
    ...Array.from(new Set(products.map((p) => p.categoria).filter(Boolean))),
  ];
  const sizes = [
    "Todas",
    ...Array.from(new Set(products.map((p) => p.talla).filter(Boolean))),
  ];
  const filtered = filterCatalog(
    products,
    search,
    category,
    size,
    availableOnly,
  );
  const photos = selected
    ? Array.from(
        new Set(
          [selected.image_url, ...(selected.imagenes || [])].filter(Boolean),
        ),
      )
    : [];
  function reset() {
    setSearch("");
    setCategory("Todas");
    setSize("Todas");
    setAvailableOnly(false);
  }
  return (
    <div className="storefront">
      <a className="skip-link" href="#coleccion">
        Ir al catálogo
      </a>
      <header className="store-header">
        <div className="store-container store-nav">
          <Brand />
          <nav aria-label="Navegación principal">
            <a className="catalog-nav-link" href="#coleccion">
              La colección
            </a>
            <Link href="/login" className="pc-button pc-button-quiet">
              <Icon name="lock" size={16} />
              <span>Iniciar sesión</span>
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <section
          className="store-container catalog-hero"
          aria-labelledby="hero-heading"
        >
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-star">✦</span> PARA QUIENES VISTEN DIFERENTE
            </p>
            <h1 id="hero-heading">
              Tu estilo.
              <br />
              Tu propia <em>magia.</em>
            </h1>
            <p className="hero-description">
              Piezas alternativas con carácter. Encontrá eso que va con vos y
              hacelo parte de tu mundo.
            </p>
            <a
              className="pc-button pc-button-primary hero-cta"
              href="#coleccion"
            >
              Explorar la colección <Icon name="arrow" size={18} />
            </a>
            <div className="hero-caption">
              <span className="mini-line" /> Oscuro, único y muy tuyo.
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-star star-one">✧</span>
            <span className="art-star star-two">✦</span>
            <div className="hero-logo-wrap">
              <img
                className="hero-logo"
                src="/logo-purple-cat.png"
                alt=""
                width="360"
                height="360"
              />
            </div>
            <div className="art-label">
              <span /> THE PURPLE CAT UNIVERSE
            </div>
          </div>
        </section>
        <section
          className="collection-section"
          id="coleccion"
          aria-labelledby="collection-heading"
        >
          <div className="store-container">
            <div className="collection-title">
              <div>
                <p className="eyebrow">ENCONTRÁ TU PRÓXIMA FAVORITA</p>
                <h2 id="collection-heading">
                  La colección<span className="heading-star">✦</span>
                </h2>
              </div>
              <span className="collection-count">
                {loading
                  ? "Cargando colección…"
                  : `${products.length} piezas con personalidad`}
              </span>
            </div>
            <div className="catalog-toolbar">
              <div
                className="category-tabs"
                role="group"
                aria-label="Categorías"
              >
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    className={
                      category === c ? "category-tab is-active" : "category-tab"
                    }
                    onClick={() => setCategory(c)}
                  >
                    {c === "Todas" ? "Ver todo" : c}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Icon name="search" size={18} />
                <span className="sr-only">Buscar piezas</span>
                <input
                  placeholder="Buscá tu próxima pieza…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="catalog-subfilters">
              <div className="inline-filters">
                <Icon name="filter" size={16} />
                <label>
                  Talla
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    aria-label="Filtrar por talla"
                  >
                    {sizes.map((s) => (
                      <option key={s} value={s}>
                        {s === "Todas" ? "Todas las tallas" : s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="availability-toggle">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  <span>Solo disponibles</span>
                </label>
              </div>
              <span aria-live="polite">
                {!loading &&
                  `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
              </span>
            </div>
            {error ? (
              <div className="pc-empty" role="status">
                <Icon name="sparkle" size={34} />
                <h3>Un momento de pausa</h3>
                <p>{error}</p>
                {configured && (
                  <button
                    className="pc-button pc-button-quiet"
                    onClick={() => void load()}
                  >
                    Volver a intentar <Icon name="refresh" size={16} />
                  </button>
                )}
              </div>
            ) : loading ? (
              <div
                className="catalog-grid"
                aria-label="Cargando catálogo"
                aria-busy="true"
              >
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-card">
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : filtered.length ? (
              <div className="catalog-grid">
                {filtered.map((p) => (
                  <article
                    className={`catalog-card ${!p.disponible ? "catalog-card-unavailable" : ""}`}
                    key={p.id}
                  >
                    <button
                      className="catalog-photo"
                      onClick={() => {
                        setSelected(p);
                        setPhoto(0);
                      }}
                      aria-label={`Ver detalles de ${p.nombre}`}
                    >
                      <ProductImage
                        sources={[p.image_url, ...(p.imagenes || [])]}
                        alt={p.nombre}
                        loading="lazy"
                      />
                      <span
                        className={`stock-pill ${p.disponible ? "" : "stock-pill-muted"}`}
                      >
                        <span />
                        {p.disponible ? "Disponible" : "Agotado"}
                      </span>
                      <span className="photo-open">
                        <Icon name="plus" size={19} />
                      </span>
                    </button>
                    <div className="catalog-card-content">
                      <p className="product-category">
                        {p.categoria || "Colección Purple Cat"}
                      </p>
                      <h3>
                        <button
                          onClick={() => {
                            setSelected(p);
                            setPhoto(0);
                          }}
                        >
                          {p.nombre}
                        </button>
                      </h3>
                      <div className="product-meta">
                        {[p.talla && `Talla ${p.talla}`, p.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="product-price-row">
                        <span className="product-price">
                          ${money(p.precio_venta)}
                        </span>
                        <small>USD · efectivo</small>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="pc-empty">
                <Icon name="search" size={34} />
                <h3>
                  {products.length
                    ? "Esa pieza todavía no apareció"
                    : "La colección está en camino"}
                </h3>
                <p>
                  {products.length
                    ? "Probá otra búsqueda o elegí una categoría diferente."
                    : "Volvé pronto para descubrir las piezas disponibles."}
                </p>
                {products.length > 0 && (
                  <button className="pc-button pc-button-quiet" onClick={reset}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="store-container store-footer">
        <Brand />
        <p>
          Un poco de oscuridad.
          <br />
          <span>Mucha personalidad.</span>
        </p>
        <Link href="/login">
          Acceso al equipo <Icon name="arrow" size={15} />
        </Link>
      </footer>
      <dialog
        className="product-dialog"
        ref={dialog}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && photos.length)
            setPhoto((i) => (i + 1) % photos.length);
          if (e.key === "ArrowLeft" && photos.length)
            setPhoto((i) => (i + photos.length - 1) % photos.length);
        }}
      >
        {selected && (
          <>
            <button
              className="dialog-close pc-icon-button"
              aria-label="Cerrar detalles"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="x" />
            </button>
            <div className="product-detail-layout">
              <div className="product-detail-visual">
                <ProductImage
                  className="detail-main-photo"
                  sources={[photos[photo]]}
                  alt={`${selected.nombre}, foto ${photo + 1}`}
                />
                {photos.length > 1 && (
                  <div
                    className="detail-thumbnails"
                    aria-label="Fotos del producto"
                  >
                    {photos.map((src, i) => (
                      <button
                        key={src}
                        aria-label={`Ver foto ${i + 1}`}
                        aria-pressed={photo === i}
                        onClick={() => setPhoto(i)}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="product-detail-copy">
                <p className="eyebrow">{selected.categoria || "PURPLE CAT"}</p>
                <h2>{selected.nombre}</h2>
                <div
                  className={`stock-pill detail-stock ${selected.disponible ? "" : "stock-pill-muted"}`}
                >
                  <span />
                  {selected.disponible ? "Disponible" : "Agotado"}
                </div>
                <p className="detail-price">
                  ${money(selected.precio_venta)} <small>USD · efectivo</small>
                </p>
                <p className="detail-description">
                  {selected.descripcion ||
                    "Una pieza con toda la personalidad de Purple Cat."}
                </p>
                <dl className="detail-facts">
                  {[
                    ["Talla", selected.talla],
                    ["Color", selected.color],
                    ["Referencia", selected.sku],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
                <p className="detail-note">
                  <Icon name="sparkle" size={17} /> Hacé espacio para algo
                  diferente.
                </p>
              </div>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
