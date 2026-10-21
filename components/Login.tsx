"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { configured, supabase } from "../lib/supabase";
import Brand from "./Brand";
import Icon from "./Icon";
export default function Login() {
  const router = useRouter();
  const [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (configured)
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session) router.replace("/admin");
        })
        .catch(() => {});
  }, [router]);
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <Brand />
        <div className="login-art">
          <div className="login-orbit" />
          <span className="login-art-star">✧</span>
          <img
            src="/logo-purple-cat.png"
            width="310"
            height="310"
            alt="Logo de Purple Cat"
          />
        </div>
        <div className="login-brand-copy">
          <p className="eyebrow">DETRÁS DE LA MAGIA</p>
          <h2>
            Un universo único.
            <br />
            <em>Tu manera de llevarlo.</em>
          </h2>
          <p>
            Todo lo que necesitás para cuidar cada pieza
            <br className="desktop-break" /> y hacer crecer Purple Cat.
          </p>
        </div>
        <small className="login-brand-footnote">
          PURPLE CAT · WEAR YOUR MAGIC
        </small>
      </section>
      <section className="login-form-panel">
        <Link href="/" className="back-link">
          <Icon name="arrow" size={17} /> Volver al catálogo
        </Link>
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <div className="login-icon">
            <Icon name="lock" size={23} />
          </div>
          <p className="eyebrow">ACCESO AL EQUIPO</p>
          <h1>
            Qué bueno verte
            <br />
            de nuevo<span className="accent-text">.</span>
          </h1>
          <p className="login-description">
            Entrá a tu espacio para gestionar Purple Cat.
          </p>
          <form
            className="login-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setError("");
              if (!configured) {
                setError(
                  "El acceso no está disponible en este momento. Intentá de nuevo más tarde.",
                );
                return;
              }
              const email =
                user.trim().toLowerCase() === "admin"
                  ? "admin@purplecat.test"
                  : user.trim();
              if (!email.includes("@")) {
                setError(
                  "Ingresá tu correo completo o el usuario admin de la cuenta de prueba.",
                );
                return;
              }
              setBusy(true);
              try {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) {
                  setError(
                    error.code === "invalid_credentials" ||
                      /invalid login/i.test(error.message)
                      ? "El correo o la contraseña no coinciden. Revisalos e intentá de nuevo."
                      : /email.*confirm/i.test(error.message)
                        ? "Tu correo todavía no está confirmado. Contactá al dueño para activar tu cuenta."
                        : /rate|too many/i.test(error.message)
                          ? "Hubo varios intentos. Esperá un momento antes de volver a entrar."
                          : "No pudimos iniciar sesión. Revisá tu conexión e intentá de nuevo.",
                  );
                } else {
                  router.replace("/admin");
                  router.refresh();
                }
              } catch {
                setError(
                  "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="login-user">Correo o usuario</label>
            <input
              id="login-user"
              name="username"
              autoComplete="username"
              placeholder="tu@correo.com"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-field">
              <input
                id="login-password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                type="button"
                className="pc-icon-button"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                <Icon name={show ? "eyeOff" : "eye"} size={19} />
              </button>
            </div>
            {error && (
              <p className="form-error" id="login-error" role="alert">
                <Icon name="alert" size={18} />
                {error}
              </p>
            )}
            <button
              className="pc-button pc-button-primary login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? "Entrando a tu espacio…" : "Iniciar sesión"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="login-security">
            <Icon name="lock" size={14} /> Un espacio privado para el equipo de
            Purple Cat.
          </div>
          <p className="login-help">
            ¿Necesitás acceso? Contactá al dueño de la tienda.
          </p>
        </div>
        <p className="login-page-footnote">
          Hecho para llevar tu magia un poco más lejos. <span>✦</span>
        </p>
      </section>
    </main>
  );
}
