"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Contact, ContactType, ContactSource } from "@/lib/types";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_SOURCE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_TYPE_BG,
} from "@/lib/types";

// ─── Shared input styles ────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%",
  height: 38,
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 7,
  padding: "0 11px",
  fontSize: 13,
  color: "var(--t1)",
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--t2)",
  display: "block",
  marginBottom: 5,
};

// ─── Form type ──────────────────────────────────────────────────────────────
interface NewContactForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  type: ContactType;
  source: ContactSource;
  notes: string;
}

const EMPTY: NewContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  type: "buyer",
  source: "other",
  notes: "",
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewContactForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchContacts() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setContacts(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchContacts(); }, []);

  const filtered = useMemo(() => contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false);
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  }), [contacts, search, typeFilter]);

  function openSheet() {
    setForm(EMPTY);
    setFormError(null);
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("Vorname und Nachname sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.from("contacts").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      type: form.type,
      source: form.source,
      notes: form.notes.trim() || null,
    });
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    setSheetOpen(false);
    fetchContacts();
    setSaving(false);
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="header">
        <div style={{ flex: 1 }}>
          <div className="hdr-title">Kontakte</div>
        </div>
        <div className="hdr-right">
          {/* Suche */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--bg)", border: "1px solid rgba(0,0,0,0.11)",
            borderRadius: 8, padding: "0 11px", height: 34, width: 210,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Name, E-Mail, Telefon…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--t1)", flex: 1, fontFamily: "inherit" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>

          {/* Typ-Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContactType | "all")}
            style={{ height: 34, padding: "0 10px", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 8, fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <option value="all">Alle Typen</option>
            <option value="buyer">Käufer</option>
            <option value="seller">Verkäufer</option>
            <option value="both">Käufer & Verkäufer</option>
            <option value="tenant">Mieter</option>
            <option value="landlord">Vermieter</option>
          </select>

          {/* Neuer Kontakt */}
          <button onClick={openSheet} className="hdr-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neuer Kontakt
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="body-wrap">
        {loading ? (
          /* Skeleton */
          <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 20px", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
                {[150, 80, 140, 110, 80, 75].map((w, j) => (
                  <div key={j} style={{ height: 13, width: w, background: "var(--bg2)", borderRadius: 4, flexShrink: 0, animation: `pulse 1.4s ease-in-out ${j * 0.08}s infinite` }} />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
            Fehler beim Laden: {error}
          </div>
        ) : filtered.length === 0 ? (
          /* Leerer Zustand */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>
              {search || typeFilter !== "all" ? "Keine Kontakte gefunden" : "Noch keine Kontakte"}
            </div>
            <div style={{ fontSize: 13, color: "var(--t3)" }}>
              {search || typeFilter !== "all" ? "Suchkriterien anpassen" : "Legen Sie Ihren ersten Kontakt an"}
            </div>
            {!search && typeFilter === "all" && (
              <button onClick={openSheet} className="hdr-add-btn" style={{ marginTop: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ersten Kontakt anlegen
              </button>
            )}
          </div>
        ) : (
          /* Tabelle */
          <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Typ", "E-Mail", "Telefon", "Quelle", "Erstellt"].map((h) => (
                    <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 18px" }}>
                      <Link href={`/contacts/${c.id}`} style={{ fontWeight: 500, color: "var(--t1)", textDecoration: "none", fontSize: 14 }}>
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: CONTACT_TYPE_BG[c.type], color: CONTACT_TYPE_COLORS[c.type] }}>
                        {CONTACT_TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--t2)" }}>{c.email ?? "—"}</td>
                    <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--t2)" }}>{c.phone ?? "—"}</td>
                    <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--t2)" }}>
                      {CONTACT_SOURCE_LABELS[c.source] ?? c.source}
                    </td>
                    <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--t3)", whiteSpace: "nowrap" }}>
                      {fmtDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SHEET: Neuer Kontakt */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          style={{ background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", padding: 0, width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <SheetHeader>
              <SheetTitle style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 20, fontWeight: 400, color: "var(--t1)" }}>
                Neuer Kontakt
              </SheetTitle>
            </SheetHeader>
          </div>

          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 15, overflowY: "auto", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Vorname *</label>
                <input style={inp} value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} placeholder="Max" />
              </div>
              <div>
                <label style={lbl}>Nachname *</label>
                <input style={inp} value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} placeholder="Mustermann" />
              </div>
            </div>
            <div>
              <label style={lbl}>E-Mail</label>
              <input style={inp} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="max@beispiel.de" />
            </div>
            <div>
              <label style={lbl}>Telefon</label>
              <input style={inp} type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+49 170 1234567" />
            </div>
            <div>
              <label style={lbl}>Typ</label>
              <select style={{ ...inp, height: 38, cursor: "pointer" }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}>
                <option value="buyer">Käufer</option>
                <option value="seller">Verkäufer</option>
                <option value="both">Käufer & Verkäufer</option>
                <option value="tenant">Mieter</option>
                <option value="landlord">Vermieter</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Quelle</label>
              <select style={{ ...inp, height: 38, cursor: "pointer" }} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ContactSource }))}>
                <option value="website">Website</option>
                <option value="referral">Empfehlung</option>
                <option value="portal">Portal</option>
                <option value="cold">Kaltakquise</option>
                <option value="other">Sonstige</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Notizen</label>
              <textarea
                style={{ ...inp, height: 88, padding: "8px 11px", resize: "none" }}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Interne Notizen zum Kontakt…"
              />
            </div>

            {formError && (
              <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--red)" }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, height: 40, background: saving ? "var(--accent-mid)" : "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.14s" }}
              >
                {saving ? "Speichern…" : "Kontakt speichern"}
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                style={{ height: 40, padding: "0 16px", background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 14, color: "var(--t2)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </DashboardLayout>
  );
}
