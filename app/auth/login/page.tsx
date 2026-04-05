"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError("E-Mail oder Passwort ungültig.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F3EF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif",
      padding: "24px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 420,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#C2692A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
            fontSize: 18, fontWeight: 500, color: "#1C1814",
          }}>Immo CRM</span>
        </div>

        <h1 style={{
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontSize: 22, fontWeight: 400, color: "#1C1814",
          marginBottom: 6, letterSpacing: "-0.3px",
        }}>Willkommen zurück</h1>
        <p style={{ fontSize: 13, color: "#A8A49F", marginBottom: 28 }}>
          Melden Sie sich bei Ihrem Konto an
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#6A6460", display: "block", marginBottom: 6 }}>
              E-Mail-Adresse
            </label>
            <input
              type="email"
              required
              placeholder="max@beispiel.de"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#6A6460", display: "block", marginBottom: 6 }}>
              Passwort
            </label>
            <input
              type="password"
              required
              placeholder="Ihr Passwort"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)",
              borderRadius: 8, padding: "10px 12px",
              fontSize: 13, color: "#C93B2E",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? "Anmeldung…" : "Anmelden"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "#A8A49F", marginTop: 20, textAlign: "center" }}>
          Noch kein Konto?{" "}
          <a href="/auth/register" style={{ color: "#C2692A", fontWeight: 500, textDecoration: "none" }}>
            Kostenlos registrieren
          </a>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid rgba(0,0,0,0.11)",
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 14,
  color: "#1C1814",
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    background: loading ? "#D97D3A" : "#C2692A",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    marginTop: 4,
    transition: "background 0.14s",
  };
}
