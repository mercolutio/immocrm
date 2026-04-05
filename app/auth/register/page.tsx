"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    const supabase = createClient();

    // 1. Nutzer registrieren
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Registrierung fehlgeschlagen.");
      setLoading(false);
      return;
    }

    // 2. Organisation anlegen
    const slug = form.orgName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: form.orgName, slug })
      .select()
      .single();

    if (orgError || !org) {
      setError("Organisation konnte nicht angelegt werden: " + orgError?.message);
      setLoading(false);
      return;
    }

    // 3. Nutzer als Owner eintragen
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: authData.user.id,
        role: "owner",
      });

    if (memberError) {
      setError("Mitgliedschaft konnte nicht erstellt werden: " + memberError.message);
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
        }}>Konto erstellen</h1>
        <p style={{ fontSize: 13, color: "#A8A49F", marginBottom: 28 }}>
          14 Tage kostenlos testen · Keine Kreditkarte nötig
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#6A6460", display: "block", marginBottom: 6 }}>
              Name des Maklerbüros
            </label>
            <input
              type="text"
              required
              placeholder="z.B. Wolff Immobilien"
              value={form.orgName}
              onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
              style={inputStyle}
            />
          </div>
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
              minLength={8}
              placeholder="Mindestens 8 Zeichen"
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
            {loading ? "Wird erstellt…" : "Kostenlos registrieren"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "#A8A49F", marginTop: 20, textAlign: "center" }}>
          Bereits registriert?{" "}
          <a href="/auth/login" style={{ color: "#C2692A", fontWeight: 500, textDecoration: "none" }}>
            Anmelden
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
