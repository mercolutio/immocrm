"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import type { Deal, PipelineStage, Contact, Property, Note, Activity, Task, TaskPriority } from "@/lib/types";
import { TASK_PRIORITY_LABELS, labelsToOptions } from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import SearchSelect from "@/components/SearchSelect";
import { fmtDate, fmtDateTime, nowLocalISO, ACTIVITY_COLORS } from "@/lib/ui-tokens";

// ─── Styles ─────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", height: 37, border: "1px solid rgba(0,0,0,0.11)",
  borderRadius: 8, padding: "0 11px", fontSize: 13, color: "var(--t1)",
  background: "var(--bg)", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: "var(--t3)", display: "block",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em",
};

// ─── LinkSection ────────────────────────────────────────────────────────────
function LinkSection({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>{title}</span>
      </div>
      {children ?? (
        <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t3)" }}>
          Nicht verknüpft
        </div>
      )}
    </div>
  );
}

// ─── Activity icon ──────────────────────────────────────────────────────────
function activityIcon(type: string) {
  const size = 13;
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const };
  if (type === "call") return <svg {...props}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
  if (type === "viewing") return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  if (type === "meeting") return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

type ActiveTab = "all" | "note" | "call" | "viewing" | "task";

// ─── Page ───────────────────────────────────────────────────────────────────
export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Deal>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [openForm, setOpenForm] = useState<"note" | "call" | "task" | "viewing" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [fNote, setFNote] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fDatetime, setFDatetime] = useState("");
  const [fCallResult, setFCallResult] = useState("reached");
  const [fPriority, setFPriority] = useState<TaskPriority>("medium");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");

  // Local call result labels (same as contacts/properties)
  const CALL_RESULT_LABELS: Record<string, string> = {
    reached: "Erreicht", not_reached: "Nicht erreicht", callback: "Rückruf vereinbart",
  };

  function updateForm(patch: Partial<Deal>) {
    setForm((f) => ({ ...f, ...patch }));
    setIsDirty(true);
  }

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [dealRes, stagesRes, notesRes, activitiesRes, tasksRes] = await Promise.all([
        supabase.from("deals").select("*").eq("id", id).single(),
        supabase.from("pipeline_stages").select("*").order("position"),
        supabase.from("notes").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("deal_id", id).order("happened_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      ]);
      if (dealRes.error || !dealRes.data) { setError("Deal nicht gefunden"); setLoading(false); return; }
      const d = dealRes.data as Deal;
      setDeal(d);
      setForm(d);
      setStages(stagesRes.data as PipelineStage[] ?? []);
      setNotes(notesRes.data ?? []);
      setActivities(activitiesRes.data ?? []);
      setTasks(tasksRes.data ?? []);

      if (d.contact_id) {
        const { data } = await supabase.from("contacts").select("*").eq("id", d.contact_id).single();
        if (data) setContact(data as Contact);
      }
      if (d.property_id) {
        const { data } = await supabase.from("properties").select("*").eq("id", d.property_id).single();
        if (data) setProperty(data as Property);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase.from("deals").update({
      contact_id: form.contact_id || null,
      property_id: form.property_id || null,
      stage_id: form.stage_id || null,
      probability: form.probability ?? null,
      commission: form.commission ?? null,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes?.trim() || null,
    }).eq("id", id);
    if (error) { setSaveError(error.message); setSaving(false); return; }
    setDeal((d) => ({ ...d!, ...form } as Deal));
    // Reload contact/property if changed
    if (form.contact_id !== deal?.contact_id) {
      if (form.contact_id) {
        const { data } = await supabase.from("contacts").select("*").eq("id", form.contact_id).single();
        setContact(data as Contact);
      } else setContact(null);
    }
    if (form.property_id !== deal?.property_id) {
      if (form.property_id) {
        const { data } = await supabase.from("properties").select("*").eq("id", form.property_id).single();
        setProperty(data as Property);
      } else setProperty(null);
    }
    setIsDirty(false);
    setSaving(false);
  }

  function handleDiscard() {
    if (!deal) return;
    setForm(deal);
    setIsDirty(false);
    setSaveError(null);
  }

  function openFormFor(type: "note" | "call" | "task" | "viewing") {
    setFNote(""); setFTitle(""); setFDatetime(nowLocalISO());
    setFCallResult("reached"); setFPriority("medium");
    setOpenForm(type);
    setShowDropdown(false);
  }

  async function handleSubmitForm() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (openForm === "note") {
      if (!fNote.trim()) return;
      const { data } = await supabase.from("notes").insert({ deal_id: id, user_id: user.id, body: fNote.trim() }).select().single();
      if (data) setNotes((n) => [data, ...n]);
    } else if (openForm === "call") {
      const summary = `Anruf — ${CALL_RESULT_LABELS[fCallResult] ?? fCallResult}`;
      const { data } = await supabase.from("activities").insert({ deal_id: id, user_id: user.id, type: "call", summary, happened_at: fDatetime, notes: fNote.trim() || null }).select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "viewing") {
      const { data } = await supabase.from("activities").insert({ deal_id: id, user_id: user.id, type: "viewing", summary: "Besichtigung", happened_at: fDatetime, notes: fNote.trim() || null }).select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "task") {
      if (!fTitle.trim()) return;
      const { data } = await supabase.from("tasks").insert({ deal_id: id, user_id: user.id, title: fTitle.trim(), due_date: fDatetime ? fDatetime.slice(0, 10) : null, priority: fPriority }).select().single();
      if (data) setTasks((t) => [data, ...t]);
    }
    setOpenForm(null);
  }

  // Close dropdown on click outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Timeline items
  type TimelineItem = { kind: "note"; date: string; data: Note } | { kind: "activity"; date: string; type: string; data: Activity } | { kind: "task"; date: string; data: Task };
  const timeline: TimelineItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, date: n.created_at, data: n })),
    ...activities.map((a) => ({ kind: "activity" as const, date: a.happened_at, type: a.type, data: a })),
    ...tasks.map((t) => ({ kind: "task" as const, date: t.created_at, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTimeline = timeline.filter((item) => {
    if (activeTab === "note") return item.kind === "note";
    if (activeTab === "call") return item.kind === "activity" && item.type === "call";
    if (activeTab === "viewing") return item.kind === "activity" && item.type === "viewing";
    if (activeTab === "task") return item.kind === "task";
    return true;
  });

  const colStyle: React.CSSProperties = {
    height: "calc(100vh - 62px)", overflowY: "auto", scrollbarWidth: "thin",
  };

  const currentStage = stages.find((s) => s.id === form.stage_id);

  if (loading) {
    return (
      <DashboardLayout>
        <header className="header">
          <Link href="/pipeline" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--t2)", fontSize: 13, textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Pipeline
          </Link>
        </header>
        <div style={{ display: "flex" }}>
          {[280, undefined, 260].map((w, i) => (
            <div key={i} style={{ width: w, flex: w ? undefined : 1, padding: 22 }}>
              {[1, 2, 3].map((j) => (
                <div key={j} style={{ height: 14, background: "var(--bg2)", borderRadius: 4, marginBottom: 12, animation: `pulse 1.4s ease-in-out ${j * 0.1}s infinite` }} />
              ))}
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
      </DashboardLayout>
    );
  }

  if (error || !deal) {
    return (
      <DashboardLayout>
        <header className="header">
          <Link href="/pipeline" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--t2)", fontSize: 13, textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Pipeline
          </Link>
        </header>
        <div className="body-wrap">
          <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
            {error ?? "Deal nicht gefunden"}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="header">
        <Link href="/pipeline" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--t2)", fontSize: 13, textDecoration: "none", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Pipeline
        </Link>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0, marginLeft: 16 }}>
          <div style={{
            fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
            fontSize: 22, fontWeight: 400, color: "var(--t1)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {contact ? `${contact.first_name} ${contact.last_name}` : "Deal"}
          </div>
          {currentStage && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${currentStage.color}18`, color: currentStage.color, flexShrink: 0 }}>
              {currentStage.name}
            </span>
          )}
        </div>
      </header>

      {/* THREE COLUMNS */}
      <div style={{ display: "flex" }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ ...colStyle, width: 280, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", background: "var(--card)", boxShadow: "4px 0 16px rgba(28,24,20,0.03)", padding: "22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Deal-Daten</div>

          <div>
            <label style={lbl}>Kontakt</label>
            <SearchSelect
              value={form.contact_id ?? null}
              onChange={(v) => updateForm({ contact_id: v || null })}
              onSearch={async (q) => {
                const supabase = createClient();
                let query = supabase.from("contacts").select("id, first_name, last_name").eq("is_archived", false).order("last_name").limit(20);
                if (q.trim()) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
                const { data } = await query;
                return (data ?? []).map((c: { id: string; first_name: string; last_name: string }) => ({
                  value: c.id, label: `${c.first_name} ${c.last_name}`,
                }));
              }}
              displayValue={contact ? `${contact.first_name} ${contact.last_name}` : undefined}
              placeholder="Kontakt suchen…"
              style={{ height: 36 }}
            />
          </div>

          <div>
            <label style={lbl}>Objekt</label>
            <SearchSelect
              value={form.property_id ?? null}
              onChange={(v) => updateForm({ property_id: v || null })}
              onSearch={async (q) => {
                const supabase = createClient();
                let query = supabase.from("properties").select("id, title").eq("is_archived", false).order("title").limit(20);
                if (q.trim()) query = query.ilike("title", `%${q}%`);
                const { data } = await query;
                return (data ?? []).map((p: { id: string; title: string }) => ({
                  value: p.id, label: p.title,
                }));
              }}
              displayValue={property?.title}
              placeholder="Objekt suchen…"
              style={{ height: 36 }}
            />
          </div>

          <div>
            <label style={lbl}>Stage</label>
            <AppSelect
              value={form.stage_id ?? ""}
              onChange={(v) => updateForm({ stage_id: v || null })}
              options={[{ value: "", label: "— Ohne Stage —" }, ...stages.map((s) => ({ value: s.id, label: s.name }))]}
              style={{ height: 36 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Wahrscheinlichkeit</label>
              <input style={inp} type="number" min="0" max="100" placeholder="%" value={form.probability ?? ""} onChange={(e) => updateForm({ probability: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Provision (€)</label>
              <input style={inp} type="number" value={form.commission ?? ""} onChange={(e) => updateForm({ commission: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div>
            <label style={lbl}>Erwarteter Abschluss</label>
            <input style={inp} type="date" value={form.expected_close_date ?? ""} onChange={(e) => updateForm({ expected_close_date: e.target.value || null })} />
          </div>

          {/* ── Sektion: Notizen ── */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Notizen</div>
          <textarea
            style={{ ...inp, height: 100, padding: "8px 11px", resize: "vertical" }}
            value={form.notes ?? ""}
            onChange={(e) => updateForm({ notes: e.target.value })}
            placeholder="Notizen zum Deal…"
          />
        </div>

        {/* ── MIDDLE COLUMN ── */}
        <div style={{ ...colStyle, flex: 1, padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Tabs + Add button */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
            {(["all", "note", "call", "viewing", "task"] as ActiveTab[]).map((tab) => {
              const labels: Record<ActiveTab, string> = { all: "Alle", note: "Notizen", call: "Anrufe", viewing: "Besichtigungen", task: "Aufgaben" };
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 14px", fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--accent)" : "var(--t3)",
                    background: "transparent", border: "none", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            <div style={{ position: "relative" }}>
              <button
                ref={triggerRef}
                onClick={() => setShowDropdown((v) => !v)}
                style={{
                  height: 32, padding: "0 10px", background: "var(--accent)", color: "#fff",
                  border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Neu
              </button>
              {showDropdown && (
                <div ref={dropdownRef} style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
                  background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(28,24,20,0.12)", padding: 4, minWidth: 160,
                }}>
                  {[
                    { key: "note", label: "Notiz", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                    { key: "call", label: "Anruf", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
                    { key: "viewing", label: "Besichtigung", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
                    { key: "task", label: "Aufgabe", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => openFormFor(item.key as "note" | "call" | "viewing" | "task")}
                      style={{ padding: "7px 11px", borderRadius: 6, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--t1)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {item.icon} {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inline form */}
          {openForm && (
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {openForm === "note" ? "Neue Notiz" : openForm === "call" ? "Anruf protokollieren" : openForm === "viewing" ? "Besichtigung" : "Neue Aufgabe"}
              </div>
              {openForm === "task" ? (
                <div>
                  <input style={inp} placeholder="Aufgabentitel…" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Fällig am</label>
                      <input style={inp} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Priorität</label>
                      <AppSelect value={fPriority} onChange={(v) => setFPriority(v as TaskPriority)} options={labelsToOptions(TASK_PRIORITY_LABELS)} style={{ height: 36 }} />
                    </div>
                  </div>
                </div>
              ) : openForm === "call" ? (
                <div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Datum/Uhrzeit</label>
                      <input style={inp} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Ergebnis</label>
                      <AppSelect value={fCallResult} onChange={(v) => setFCallResult(v)} options={labelsToOptions(CALL_RESULT_LABELS)} style={{ height: 36 }} />
                    </div>
                  </div>
                  <textarea style={{ ...inp, height: 60, padding: "8px 11px", resize: "none", marginTop: 8 }} placeholder="Notiz zum Anruf…" value={fNote} onChange={(e) => setFNote(e.target.value)} />
                </div>
              ) : openForm === "viewing" ? (
                <div>
                  <label style={lbl}>Datum/Uhrzeit</label>
                  <input style={inp} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                  <textarea style={{ ...inp, height: 60, padding: "8px 11px", resize: "none", marginTop: 8 }} placeholder="Notiz zur Besichtigung…" value={fNote} onChange={(e) => setFNote(e.target.value)} />
                </div>
              ) : (
                <textarea style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }} placeholder="Notiz schreiben…" value={fNote} onChange={(e) => setFNote(e.target.value)} autoFocus />
              )}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setOpenForm(null)} style={{ height: 32, padding: "0 12px", background: "transparent", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 7, fontSize: 12, color: "var(--t2)", cursor: "pointer", fontFamily: "inherit" }}>Abbrechen</button>
                <button onClick={handleSubmitForm} style={{ height: 32, padding: "0 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Speichern</button>
              </div>
            </div>
          )}

          {/* Timeline */}
          {filteredTimeline.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--t3)" }}>
              Noch keine Einträge
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {filteredTimeline.map((item, i) => {
                const isNote = item.kind === "note";
                const isActivity = item.kind === "activity";
                const isTask = item.kind === "task";
                const type = isActivity ? item.data.type : isNote ? "note" : "task";
                const ac = ACTIVITY_COLORS[type] ?? ACTIVITY_COLORS.note;
                return (
                  <div key={`${item.kind}-${item.data.id}`} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < filteredTimeline.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: ac.bg, color: ac.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {isTask ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      ) : activityIcon(type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>
                        {isNote ? "Notiz" : isTask ? item.data.title : (item.data as Activity).summary}
                      </div>
                      {isNote && <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 4, whiteSpace: "pre-wrap" }}>{(item.data as Note).body}</div>}
                      {isActivity && (item.data as Activity).notes && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{(item.data as Activity).notes}</div>}
                      {isTask && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>Priorität: {TASK_PRIORITY_LABELS[item.data.priority as TaskPriority] ?? item.data.priority}</div>}
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{fmtDateTime(item.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ ...colStyle, width: 260, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg)", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 6 }}>
            Verknüpfungen
          </div>

          <LinkSection
            title="Kontakt"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          >
            {contact && (
              <Link href={`/contacts/${contact.id}`} className="h-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #C2692A, #E8955A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                  {contact.first_name[0]?.toUpperCase()}{contact.last_name[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{contact.first_name} {contact.last_name}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>{contact.email ?? contact.phone ?? ""}</div>
                </div>
              </Link>
            )}
          </LinkSection>

          <LinkSection
            title="Objekt"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          >
            {property && (
              <Link href={`/properties/${property.id}`} className="h-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{property.title}</div>
                </div>
              </Link>
            )}
          </LinkSection>

          {/* Stage info */}
          <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>Stage-Info</span>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {currentStage && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: currentStage.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{currentStage.name}</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                Erstellt am {fmtDate(deal.created_at)}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                Letzte Änderung {fmtDate(deal.updated_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING SAVE BUTTON */}
      <div style={{
        position: "fixed", bottom: 24, left: 24,
        transform: isDirty ? "translateY(0)" : "translateY(16px)",
        opacity: isDirty ? 1 : 0,
        pointerEvents: isDirty ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        zIndex: 1000,
        background: "var(--accent)", border: "none", borderRadius: 12,
        boxShadow: "0 8px 32px rgba(194,105,42,0.35), 0 2px 8px rgba(0,0,0,0.1)",
        padding: "13px 18px", display: "flex", alignItems: "center", gap: 14, minWidth: 340,
      }}>
        <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,255,255,0.5)", animation: "pulse-ring 1.6s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff" }} />
        </div>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.95)", fontWeight: 500, flex: 1 }}>
          Ungespeicherte Änderungen
        </span>
        {saveError && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{saveError}</span>}
        <button onClick={handleDiscard} disabled={saving} style={{ height: 32, padding: "0 12px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontSize: 13, color: "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "inherit" }}>
          Verwerfen
        </button>
        <button onClick={handleSave} disabled={saving} style={{ height: 32, padding: "0 14px", background: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "var(--accent)", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.8}60%{transform:scale(2.8);opacity:0}100%{transform:scale(2.8);opacity:0} }
      `}</style>
    </DashboardLayout>
  );
}
