"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useAdmin } from "./AccessGate";
import Brand from "./Brand";
import Icon, { IconName } from "./Icon";
export type Section =
  "Inventario" | "Facturar" | "Ventas" | "Gastos" | "Historial" | "Usuarios";
const sections: { name: Section; icon: IconName; owner?: boolean }[] = [
  { name: "Inventario", icon: "box" },
  { name: "Facturar", icon: "receipt" },
  { name: "Ventas", icon: "grid" },
  { name: "Gastos", icon: "wallet", owner: true },
  { name: "Historial", icon: "history", owner: true },
  { name: "Usuarios", icon: "users", owner: true },
];
const descriptions: Record<Section, string> = {
  Inventario: "Cada pieza, en su lugar.",
  Facturar: "Una nueva venta, sin complicaciones.",
  Ventas: "Todo lo que salió de la tienda.",
  Gastos: "Los detalles que mantienen todo en marcha.",
  Historial: "Una mirada a los cambios de tu equipo.",
  Usuarios: "Las personas detrás de Purple Cat.",
};
export default function AdminShell({
  section,
  onNavigate,
  children,
}: {
  section: Section;
  onNavigate: (s: Section) => void;
  children: React.ReactNode;
}) {
  const profile = useAdmin(),
    router = useRouter(),
    menu = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false),
    [error, setError] = useState("");
  function navigate(s: Section) {
    onNavigate(s);
    menu.current?.close();
  }
  async function signOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError("No pudimos cerrar la sesión. Intentá de nuevo.");
      setSigningOut(false);
    } else router.replace("/");
  }
  function sidebar(mobile = false) {
    return (
      <>
        <div className="sidebar-brand">
          <Brand subtitle="ESPACIO DEL EQUIPO" />
          {mobile && (
            <button
              className="pc-icon-button"
              aria-label="Cerrar menú"
              onClick={() => menu.current?.close()}
            >
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="sidebar-store">
          <span className="store-status-dot" />
          <span>
            Tu espacio de trabajo<small>Hecho para tu equipo</small>
          </span>
          <Icon name="sparkle" size={17} />
        </div>
        <p className="sidebar-label">TU ESPACIO</p>
        <nav
          className="sidebar-nav"
          aria-label={
            mobile ? "Menú de administración móvil" : "Menú de administración"
          }
        >
          {sections
            .filter((s) => !s.owner || profile.rol === "dueno")
            .map((s) => (
              <button
                key={s.name}
                onClick={() => navigate(s.name)}
                aria-current={section === s.name ? "page" : undefined}
                className={
                  section === s.name ? "sidebar-link is-active" : "sidebar-link"
                }
              >
                <Icon name={s.icon} size={19} />
                <span>
                  {s.name === "Facturar"
                    ? "Nueva venta"
                    : s.name === "Historial"
                      ? "Historial de cambios"
                      : s.name}
                </span>
                {section === s.name && <span className="nav-active-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="sidebar-catalog">
            <Icon name="eye" size={18} />
            <span>Ver catálogo público</span>
            <Icon name="arrow" size={16} />
          </Link>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {profile.nombre.trim().slice(0, 1).toUpperCase() || "P"}
            </span>
            <div>
              <strong>{profile.nombre}</strong>
              <small>
                {profile.rol === "dueno" ? "Administrador" : "Equipo de ventas"}
              </small>
            </div>
            <button
              className="pc-icon-button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-content">
        Ir al contenido
      </a>
      <aside className="desktop-sidebar">{sidebar()}</aside>
      <dialog
        className="mobile-sidebar"
        ref={menu}
        onClick={(e) => {
          if (e.target === e.currentTarget) menu.current?.close();
        }}
      >
        {sidebar(true)}
      </dialog>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <button
              className="pc-icon-button mobile-menu-button"
              onClick={() => menu.current?.showModal()}
              aria-label="Abrir menú de administración"
            >
              <Icon name="menu" />
            </button>
            <span>Mi tienda</span>
            <Icon name="chevron" size={13} />
            <strong>{section === "Facturar" ? "Nueva venta" : section}</strong>
          </div>
          <Link className="topbar-catalog" href="/">
            Vista del catálogo
            <Icon name="arrow" size={15} />
          </Link>
        </header>
        <main id="admin-content" className="admin-content">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">PURPLE CAT · ADMINISTRACIÓN</p>
              <h1>
                {section === "Facturar"
                  ? "Nueva venta"
                  : section === "Historial"
                    ? "Historial de cambios"
                    : section}
              </h1>
              <p>{descriptions[section]}</p>
            </div>
            <span className="team-badge">
              <span />
              {profile.rol === "dueno" ? "Administrador" : "Equipo"}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
        <footer className="admin-footer">
          Purple Cat <span>✦</span> Un lugar para cada detalle.
        </footer>
      </div>
    </div>
  );
}
