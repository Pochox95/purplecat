"use client";
import { useEffect, useState } from "react";
import { configured, supabase } from "../lib/supabase";
export default function AccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false),
    [user, setUser] = useState(false),
    [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase.auth.getSession();
      const role = data.session ? await supabase.rpc("app_role") : null;
      if (active) {
        setUser(Boolean(data.session));
        setAllowed(Boolean(role?.data));
        setReady(true);
      }
    }
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void check(), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (!configured)
    return (
      <main className="p-8">
        Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en
        .env.local para conectar Purplecat.
      </main>
    );
  if (!ready) return <main className="p-8">Comprobando acceso…</main>;
  if (user && allowed)
    return (
      <>
        <div className="p-3 text-right">
          <button onClick={() => void supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
        {children}
      </>
    );
  if (user)
    return (
      <main className="p-8">
        Tu cuenta no tiene un rol asignado. Solicitá acceso al dueño.{" "}
        <button onClick={() => void supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </main>
    );
  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-3xl mb-6">Purple Cat · Acceso</h1>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) setError(error.message);
          setBusy(false);
        }}
      >
        <label>
          Email
          <input
            className="w-full bg-gray-900 p-3"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            className="w-full bg-gray-900 p-3"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
        <p role="alert">{error}</p>
      </form>
    </main>
  );
}
