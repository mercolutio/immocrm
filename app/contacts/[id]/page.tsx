"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Note, Activity, ActivityType, ContactType, ContactSource, SearchProfile, PropertyType, SearchType } from "@/lib/types";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_TYPE_BG,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/types";

// ─── Styles ─────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%",
  height: 36,
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
  fontSize: 11,
  fontWeight: 500,
  color: "var(--t3)",
  display: "block",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
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

// ─── Verknüpfungs-Sektion ───────────────────────────────────────────────────
function LinkSection({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>{title}</span>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(194,105,42,0.1)", color: "var(--accent)", padding: "1px 7px", borderRadius: 8 }}>{count}</span>
        )}
        <button style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border-md)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--t2)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t3)" }}>
        Noch keine Verknüpfungen
      </div>
    </div>
  );
}

// ─── Activity icon helper ────────────────────────────────────────────────────
function ActivityIcon({ type, size = 13 }: { type: string; size?: number }) {
  const s = { width: size, height: size };
  switch (type) {
    case "call":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
    case "email":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case "viewing":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "meeting":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "note":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    default:
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
  }
}

type ActiveTab = "all" | "note" | "call" | "task" | "appointment";

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

  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [searchProfile, setSearchProfile] = useState<SearchProfile | null>(null);
  const [spForm, setSpForm] = useState<Partial<SearchProfile>>({});
  const [spVisible, setSpVisible] = useState(false);
  const [creatingSp, setCreatingSp] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [cRes, nRes, aRes, spRes] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("notes").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("contact_id", id).order("happened_at", { ascending: false }),
        supabase.from("search_profiles").select("*").eq("contact_id", id).maybeSingle(),
      ]);
      if (cRes.error || !cRes.data) {
        setError(cRes.error?.message ?? "Kontakt nicht gefunden.");
      } else {
        setContact(cRes.data);
        setForm(cRes.data);
      }
      setNotes(nRes.data ?? []);
      setActivities(aRes.data ?? []);
      if (spRes.data) {
        setSearchProfile(spRes.data);
        setSpForm(spRes.data);
        setSpVisible(true);
      }
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
      setSaving(false);
      return;
    }

    setContact((c) => ({ ...c!, ...form } as Contact));

    // Suchprofil speichern (nur bei buyer / tenant / both)
    const showSp = ["buyer", "tenant", "both"].includes(form.type ?? "");
    if (showSp && spVisible) {
      const spFields = {
        type: spForm.type ?? "buy",
        property_type: spForm.property_type ?? "apartment",
        min_area: spForm.min_area ?? null,
        max_area: spForm.max_area ?? null,
        min_rooms: spForm.min_rooms ?? null,
        max_rooms: spForm.max_rooms ?? null,
        max_price: spForm.max_price ?? null,
        cities: spForm.cities ?? null,
        notes: spForm.notes ?? null,
      };
      if (searchProfile) {
        await supabase.from("search_profiles").update(spFields).eq("id", searchProfile.id);
      } else {
        const { data: spData } = await supabase
          .from("search_profiles")
          .insert({ contact_id: id, ...spFields })
          .select()
          .single();
        if (spData) setSearchProfile(spData);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddingNote(false); return; }
    const { data } = await supabase
      .from("notes")
      .insert({ contact_id: id, body, user_id: user.id })
      .select()
      .single();
    if (data) {
      setNotes((n) => [data, ...n]);
      setNewNote("");
    }
    setAddingNote(false);
  }

  // ── Timeline items (notes + activities merged, sorted by date desc) ────────
  type TimelineItem =
    | { kind: "note"; id: string; body: string; created_at: string }
    | { kind: "activity"; id: string; type: ActivityType; summary: string; notes?: string | null; happened_at: string };

  const timeline: TimelineItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, body: n.body, created_at: n.created_at })),
    ...activities.map((a) => ({ kind: "activity" as const, id: a.id, type: a.type, summary: a.summary, notes: a.notes, happened_at: a.happened_at })),
  ].sort((a, b) => {
    const dateA = a.kind === "note" ? a.created_at : a.happened_at;
    const dateB = b.kind === "note" ? b.created_at : b.happened_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = contact
    ? `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  // ── Column height ─────────────────────────────────────────────────────────
  const colStyle: React.CSSProperties = {
    height: "calc(100vh - 58px)",
    overflowY: "auto",
    scrollbarWidth: "thin",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="header">
        <Link
          href="/contacts"
          style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--t2)", fontSize: 13, textDecoration: "none", marginRight: 8, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kontakte
        </Link>

        <div style={{ flex: 1 }} />

        <div className="hdr-right">
          {/* 3-Punkte-Menü */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--t2)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {showMoreMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border-md)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 5, minWidth: 160, zIndex: 500 }}>
                <button
                  onClick={() => { setShowMoreMenu(false); handleArchive(); }}
                  disabled={archiving || loading}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  Archivieren
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      {loading ? (
        <div style={{ display: "flex", gap: 16, padding: "18px 22px" }}>
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <SkeletonBox w="100%" h={120} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <SkeletonBox w="100%" h={200} />
            </div>
          </div>
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <SkeletonBox w="100%" h={80} />
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ margin: "18px 22px", background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 0, flex: 1, overflow: "hidden" }}>

          {/* ── LINKE SPALTE: Kontaktdaten ── */}
          <div
            style={{
              ...colStyle,
              width: 280,
              minWidth: 280,
              borderRight: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Avatar + Name */}
            <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #C2692A, #E8955A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 auto 12px" }}>
                {initials}
              </div>
              <div style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 18, fontWeight: 400, color: "var(--t1)", lineHeight: 1.2, marginBottom: 8 }}>
                {contact?.first_name} {contact?.last_name}
              </div>
              {contact && (
                <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: CONTACT_TYPE_BG[contact.type], color: CONTACT_TYPE_COLORS[contact.type] }}>
                  {CONTACT_TYPE_LABELS[contact.type]}
                </span>
              )}
            </div>

            {/* Formularfelder */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
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
                <select style={{ ...inp, height: 36, cursor: "pointer" }} value={form.type ?? "buyer"} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContactType }))}>
                  <option value="buyer">Käufer</option>
                  <option value="seller">Verkäufer</option>
                  <option value="both">Käufer & Verkäufer</option>
                  <option value="tenant">Mieter</option>
                  <option value="landlord">Vermieter</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Quelle</label>
                <select style={{ ...inp, height: 36, cursor: "pointer" }} value={form.source ?? "other"} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ContactSource }))}>
                  <option value="website">Website</option>
                  <option value="referral">Empfehlung</option>
                  <option value="portal">Portal</option>
                  <option value="cold">Kaltakquise</option>
                  <option value="other">Sonstige</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Interne Notizen</label>
                <textarea
                  style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Persönliche Notizen…"
                />
              </div>
              {/* ── Suchprofil ── */}
              {["buyer", "tenant", "both"].includes(form.type ?? "") && (
                <>
                  <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 8px" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Suchprofil</span>
                  </div>

                  {!spVisible ? (
                    <button
                      onClick={async () => {
                        setCreatingSp(true);
                        const supabase = createClient();
                        const { data } = await supabase
                          .from("search_profiles")
                          .insert({ contact_id: id, type: "buy", property_type: "apartment" })
                          .select()
                          .single();
                        if (data) {
                          setSearchProfile(data);
                          setSpForm(data);
                          setSpVisible(true);
                        }
                        setCreatingSp(false);
                      }}
                      disabled={creatingSp}
                      style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--t2)", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {creatingSp ? "Wird angelegt…" : "Suchprofil anlegen"}
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={lbl}>Gesuchter Typ</label>
                        <select style={{ ...inp, height: 36, cursor: "pointer" }} value={spForm.type ?? "buy"} onChange={(e) => setSpForm((f) => ({ ...f, type: e.target.value as SearchType }))}>
                          <option value="buy">Kaufen</option>
                          <option value="rent">Mieten</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Immobilientyp</label>
                        <select style={{ ...inp, height: 36, cursor: "pointer" }} value={spForm.property_type ?? "apartment"} onChange={(e) => setSpForm((f) => ({ ...f, property_type: e.target.value as PropertyType }))}>
                          <option value="apartment">Wohnung</option>
                          <option value="house">Haus</option>
                          <option value="land">Grundstück</option>
                          <option value="commercial">Gewerbe</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Fläche (m²)</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input style={{ ...inp, width: "50%" }} type="number" placeholder="Min" value={spForm.min_area ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, min_area: e.target.value ? Number(e.target.value) : null }))} />
                          <input style={{ ...inp, width: "50%" }} type="number" placeholder="Max" value={spForm.max_area ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, max_area: e.target.value ? Number(e.target.value) : null }))} />
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Zimmer</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input style={{ ...inp, width: "50%" }} type="number" placeholder="Min" value={spForm.min_rooms ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, min_rooms: e.target.value ? Number(e.target.value) : null }))} />
                          <input style={{ ...inp, width: "50%" }} type="number" placeholder="Max" value={spForm.max_rooms ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, max_rooms: e.target.value ? Number(e.target.value) : null }))} />
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>{spForm.type === "rent" ? "Max. Miete (€/Monat)" : "Max. Budget (€)"}</label>
                        <input style={inp} type="number" placeholder="z.B. 450000" value={spForm.max_price ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, max_price: e.target.value ? Number(e.target.value) : null }))} />
                      </div>
                      <div>
                        <label style={lbl}>Städte (kommasepariert)</label>
                        <input
                          style={inp}
                          placeholder="z.B. München, Augsburg"
                          value={spForm.cities ? spForm.cities.join(", ") : ""}
                          onChange={(e) => setSpForm((f) => ({ ...f, cities: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null }))}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Notizen zum Suchprofil</label>
                        <textarea style={{ ...inp, height: 70, padding: "8px 11px", resize: "none" }} placeholder="Weitere Wünsche…" value={spForm.notes ?? ""} onChange={(e) => setSpForm((f) => ({ ...f, notes: e.target.value || null }))} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6 }}>
                Erstellt {contact ? fmtDate(contact.created_at) : "—"}<br />
                Geändert {contact ? fmtDate(contact.updated_at) : "—"}
              </div>
            </div>

            {/* Save-Button (sticky unten) */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {saveError && <div style={{ fontSize: 11, color: "var(--red)" }}>{saveError}</div>}
              {saved && <div style={{ fontSize: 11, color: "var(--grn)", fontWeight: 500 }}>Gespeichert ✓</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%", height: 36, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1, transition: "opacity 0.14s" }}
              >
                {saving ? "Speichern…" : "Änderungen speichern"}
              </button>
            </div>
          </div>

          {/* ── MITTLERE SPALTE: Aktivitäten ── */}
          <div style={{ ...colStyle, flex: 1, padding: "18px 20px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

            {/* Tab-Leiste */}
            <div style={{ display: "flex", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 5, flexShrink: 0 }}>
              {(["all", "note", "call", "task", "appointment"] as ActiveTab[]).map((tab) => {
                const labels: Record<ActiveTab, string> = { all: "Alle", note: "Notiz", call: "Anruf", task: "Aufgabe", appointment: "Termin" };
                const icons: Record<ActiveTab, React.ReactNode> = {
                  all: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
                  note: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                  call: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
                  task: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
                  appointment: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                };
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 32, borderRadius: 7, border: "none", fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.14s", background: isActive ? "var(--accent)" : "transparent", color: isActive ? "#fff" : "var(--t2)" }}
                  >
                    {icons[tab]}
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Eingabe-Panel — nur bei spezifischen Tabs */}
            {activeTab !== "all" && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", flexShrink: 0 }}>
                {activeTab === "note" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea
                      style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                      placeholder="Notiz hinzufügen…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={handleAddNote}
                        disabled={addingNote || !newNote.trim()}
                        style={{ height: 34, padding: "0 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: !newNote.trim() ? 0.5 : 1 }}
                      >
                        {addingNote ? "…" : "Notiz speichern"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px 0", textAlign: "center", fontSize: 13, color: "var(--t3)" }}>
                    {activeTab === "call" && "Anruf protokollieren — kommt bald"}
                    {activeTab === "task" && "Aufgabe erstellen — kommt bald"}
                    {activeTab === "appointment" && "Termin anlegen — kommt bald"}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {timeline.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--t3)" }}>
                  Noch keine Aktivitäten vorhanden
                </div>
              ) : (
                timeline.map((item, i) => {
                  const isNote = item.kind === "note";
                  const dateStr = isNote ? item.created_at : (item as Extract<TimelineItem, { kind: "activity" }>).happened_at;
                  const typeLabel = isNote ? "Notiz" : ACTIVITY_TYPE_LABELS[(item as Extract<TimelineItem, { kind: "activity" }>).type] ?? "Aktivität";
                  const itemType = isNote ? "note" : (item as Extract<TimelineItem, { kind: "activity" }>).type;
                  const content = isNote ? (item as Extract<TimelineItem, { kind: "note" }>).body : (item as Extract<TimelineItem, { kind: "activity" }>).summary;
                  const extraNotes = isNote ? null : (item as Extract<TimelineItem, { kind: "activity" }>).notes;

                  return (
                    <div key={item.id} style={{ paddingBottom: i < timeline.length - 1 ? 10 : 0 }}>
                      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
                            <ActivityIcon type={itemType} size={11} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{typeLabel}</span>
                          <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: "auto" }}>{fmtDateTime(dateStr)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{content}</div>
                        {extraNotes && (
                          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{extraNotes}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RECHTE SPALTE: Verknüpfungen ── */}
          <div
            style={{
              ...colStyle,
              width: 260,
              minWidth: 260,
              borderLeft: "1px solid var(--border)",
              background: "var(--bg)",
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 4 }}>
              Verknüpfungen
            </div>

            <LinkSection
              title="Deals"
              count={0}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              }
            />

            <LinkSection
              title="Objekte"
              count={0}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              }
            />

            <LinkSection
              title="Dokumente"
              count={0}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              }
            />

          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
