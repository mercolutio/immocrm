"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Note, Activity, ContactType, ContactSource } from "@/lib/types";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_TYPE_BG,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/types";

// ─── Styles ─────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%",
  height: 38,
  border: "1px solid rgba(0,0,0,0.11)",
  borderRadius: 7,
  padding: "0 11px",
  fontSize: 13,
  color: "var(--t1)",
  background: "var(--bg)",
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
const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "20px 24px",
};
const cardTitle: React.CSSProperties = {
  fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
  fontSize: 14,
  fontWeight: 400,
  color: "var(--t1)",
  marginBottom: 16,
};

function SkeletonBox({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ height: h, width: w, background: "var(--bg2)", borderRadius: 4 }} />;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state mirrors the contact fields
  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Archive
  const [archiving, setArchiving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [cRes, nRes, aRes] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("notes").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("contact_id", id).order("happened_at", { ascending: false }),
      ]);
      if (cRes.error || !cRes.data) {
        setError(cRes.error?.message ?? "Kontakt nicht gefunden.");
      } else {
        setContact(cRes.data);
        setForm(cRes.data);
      }
      setNotes(nRes.data ?? []);
      setActivities(aRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.first_name?.trim() || !form.last_name?.trim()) {
      setSaveError("Vorname und Nachname sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .update({
        first_name: form.first_name?.trim(),
        last_name: form.last_name?.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        type: form.type,
        source: form.source,
        notes: form.notes?.trim() || null,
      })
      .eq("id", id);
    if (error) {
      setSaveError(error.message);
    } else {
      setContact((c) => ({ ...c!, ...form } as Contact));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  async function handleArchive() {
    if (!confirm("Kontakt archivieren? Er wird aus der Liste ausgeblendet.")) return;
    setArchiving(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ is_archived: true }).eq("id", id);
    router.push("/contacts");
  }

  // ── Add note ──────────────────────────────────────────────────────────────
  async function handleAddNote() {
    const body = newNote.trim();
    if (!body) return;
    setAddingNote(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notes")
      .insert({ contact_id: id, body })
      .select()
      .single();
    if (data) {
      setNotes((n) => [data, ...n]);
      setNewNote("");
    }
    setAddingNote(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="header">
        <Link
          href="/contacts"
          style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--t2)", fontSize: 13, textDecoration: "none", marginRight: 12, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kontakte
        </Link>

        <div style={{ flex: 1 }}>
          {loading ? (
            <SkeletonBox w={200} h={19} />
          ) : (
            <div className="hdr-title">
              {contact?.first_name} {contact?.last_name}
            </div>
          )}
        </div>

        <div className="hdr-right">
          {saveError && (
            <span style={{ fontSize: 12, color: "var(--red)" }}>{saveError}</span>
          )}
          {saved && (
            <span style={{ fontSize: 12, color: "var(--grn)", fontWeight: 500 }}>Gespeichert ✓</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{ height: 34, padding: "0 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1, transition: "opacity 0.14s" }}
          >
            {saving ? "Speichern…" : "Änderungen speichern"}
          </button>
          <button
            onClick={handleArchive}
            disabled={archiving || loading}
            style={{ height: 34, padding: "0 14px", background: "rgba(201,59,46,0.08)", color: "var(--red)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Archivieren
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="body-wrap">
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={card}>
                <SkeletonBox w={100} h={13} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
                  {[...Array(6)].map((_, i) => <div key={i}><SkeletonBox w={60} h={11} /><div style={{ marginTop: 6 }}><SkeletonBox w="100%" h={38} /></div></div>)}
                </div>
              </div>
            </div>
            <div style={card}><SkeletonBox w={80} h={13} /></div>
          </div>
        ) : error ? (
          <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
            {error}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

            {/* ── Linke Spalte ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Kontaktdaten */}
              <div style={card}>
                <div style={cardTitle}>Kontaktdaten</div>

                {/* Typ-Badge */}
                {contact && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: CONTACT_TYPE_BG[contact.type], color: CONTACT_TYPE_COLORS[contact.type] }}>
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </span>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={lbl}>Vorname *</label>
                    <input style={inp} value={form.first_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Nachname *</label>
                    <input style={inp} value={form.last_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>E-Mail</label>
                    <input style={inp} type="email" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Telefon</label>
                    <input style={inp} type="tel" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Typ</label>
                    <select style={{ ...inp, height: 38, cursor: "pointer" }} value={form.type ?? "buyer"} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}>
                      <option value="buyer">Käufer</option>
                      <option value="seller">Verkäufer</option>
                      <option value="both">Käufer & Verkäufer</option>
                      <option value="tenant">Mieter</option>
                      <option value="landlord">Vermieter</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Quelle</label>
                    <select style={{ ...inp, height: 38, cursor: "pointer" }} value={form.source ?? "other"} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ContactSource }))}>
                      <option value="website">Website</option>
                      <option value="referral">Empfehlung</option>
                      <option value="portal">Portal</option>
                      <option value="cold">Kaltakquise</option>
                      <option value="other">Sonstige</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={lbl}>Interne Notizen</label>
                  <textarea
                    style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Persönliche Notizen zu diesem Kontakt…"
                  />
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--t3)" }}>
                  Erstellt am {contact ? fmtDate(contact.created_at) : "—"} · Zuletzt geändert {contact ? fmtDate(contact.updated_at) : "—"}
                </div>
              </div>

              {/* Notizen */}
              <div style={card}>
                <div style={cardTitle}>Notizen ({notes.length})</div>

                {/* Neue Notiz */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <textarea
                    style={{ ...inp, flex: 1, height: 60, padding: "8px 11px", resize: "none" }}
                    placeholder="Neue Notiz hinzufügen…"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                    style={{ height: 60, padding: "0 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: !newNote.trim() ? 0.5 : 1, flexShrink: 0 }}
                  >
                    {addingNote ? "…" : "Speichern"}
                  </button>
                </div>

                {notes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "var(--t3)" }}>
                    Noch keine Notizen vorhanden
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {notes.map((n) => (
                      <div key={n.id} style={{ padding: "12px 14px", background: "var(--bg)", borderRadius: 9, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>{fmtDateTime(n.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Rechte Spalte: Aktivitäten ── */}
            <div style={card}>
              <div style={cardTitle}>Aktivitäten ({activities.length})</div>

              {activities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "var(--t3)" }}>
                  Noch keine Aktivitäten
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {activities.map((a, i) => (
                    <div
                      key={a.id}
                      style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < activities.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <ActivityIcon type={a.type} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                          {ACTIVITY_TYPE_LABELS[a.type]}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.4 }}>{a.summary}</div>
                        {a.notes && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>{a.notes}</div>}
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{fmtDateTime(a.happened_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Activity icon helper ────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const s = { width: 13, height: 13, color: "var(--t2)" };
  switch (type) {
    case "call":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
    case "email":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case "viewing":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "meeting":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    default:
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
  }
}
