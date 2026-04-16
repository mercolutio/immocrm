"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "./actions";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    orgName: "",
    email: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Nutzer + Org via Server Action anlegen (Admin-Client, kein E-Mail-Versand)
    const result = await registerUser(form);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 2. Direkt einloggen
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (loginError) {
      setError("Konto erstellt, aber Login fehlgeschlagen: " + loginError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard?welcome=1");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif",
      padding: "24px",
    }}>
      <div style={{
        background: "var(--card)",
        borderRadius: 16,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 420,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div className="auth-stagger-0" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 18, fontWeight: 500, color: "var(--t1)",
          }}>Immo CRM</span>
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 22, fontWeight: 500, color: "var(--t1)",
          marginBottom: 6, letterSpacing: "-0.3px",
        }}>Konto erstellen</h1>
        <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 28 }}>
          14 Tage kostenlos testen · Keine Kreditkarte nötig
        </p>

        <form onSubmit={handleSubmit} className="auth-stagger-1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Name des Maklerbüros</label>
            <input
              type="text"
              required
              placeholder="z.B. Wolff Immobilien"
              value={form.orgName}
              onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label style={labelStyle}>E-Mail-Adresse</label>
            <input
              type="email"
              required
              placeholder="max@beispiel.de"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label style={labelStyle}>Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Mindestens 8 Zeichen"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-field"
            />
          </div>

          {error && (
            <div className="error-shake" style={{
              background: "var(--red-bg)", border: "1px solid rgba(201,59,46,0.2)",
              borderRadius: 8, padding: "10px 12px",
              fontSize: 13, color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? "Wird erstellt…" : "Kostenlos registrieren"}
          </button>
        </form>

        <p className="auth-stagger-2" style={{ fontSize: 13, color: "var(--t3)", marginTop: 20, textAlign: "center" }}>
          Bereits registriert?{" "}
          <a href="/auth/login" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>
            Anmelden
          </a>
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "var(--label)",
  display: "block", marginBottom: 6,
};

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    background: loading ? "var(--accent-hover)" : "var(--accent)",
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
