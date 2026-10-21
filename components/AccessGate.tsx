"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { configured, supabase } from "../lib/supabase";
import Brand from "./Brand";
import Icon from "./Icon";
export type AdminProfile = {
  id: string;
  nombre: string;
  rol: "dueno" | "empleado";
};
const AdminContext = createContext<AdminProfile | null>(null);
export function useAdmin() {
  const profile = useContext(AdminContext);
  if (!profile) throw new Error("Se requiere una sesión de equipo");
  return profile;
}
export default function AccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      request = 0;
    async function check() {
      const current = ++request;
      try {
        if (!configured) {
          if (active) {
            setError("El acceso del equipo todavía no está configurado.");
            setLoading(false);
          }
          return;
        }
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          if (active && current === request) {
            setProfile(null);
            router.replace("/login");
          }
          return;
        }
        const { data: person, error: roleError } = await supabase
          .from("perfiles")
          .select("id,nombre,rol")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (!active || current !== request) return;
        if (roleError) throw roleError;
        if (!person || !["dueno", "empleado"].includes(person.rol)) {
          setProfile(null);
          setError(
            "Tu cuenta todavía no tiene acceso al equipo. Pedile al dueño que te asigne un rol.",
          );
        } else {
          setError("");
          setProfile(person as AdminProfile);
        }
      } catch {
        if (active && current === request) {
          setProfile(null);
          setError("No pudimos verificar tu acceso. Volvé a iniciar sesión.");
        }
      } finally {
        if (active && current === request) setLoading(false);
      }
    }
    void check();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        request++;
        if (active) {
          setProfile(null);
          setLoading(false);
          router.replace("/");
        }
        return;
      }
      setTimeout(() => {
        if (active) void check();
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [router]);
  if (profile)
    return (
      <AdminContext.Provider value={profile}>{children}</AdminContext.Provider>
    );
  return (
    <main className="access-state">
      <Brand />
      <div className="access-state-card">
        <Icon name={error ? "lock" : "sparkle"} size={32} />
        <h1>{error ? "Un paso antes de entrar" : "Preparando tu espacio"}</h1>
        <p role="status">
          {error ||
            (loading
              ? "Estamos comprobando tu sesión…"
              : "Te llevamos al inicio de sesión…")}
        </p>
        {error && (
          <button
            className="pc-button pc-button-primary"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            Volver al acceso <Icon name="arrow" size={17} />
          </button>
        )}
        <Link href="/" className="subtle-link">
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
