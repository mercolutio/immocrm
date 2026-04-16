"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import type { Deal, PipelineStage, Contact, Property, Note, Activity, Task, TaskPriority, ActivityType } from "@/lib/types";
import { ACTIVITY_TYPE_LABELS, TASK_PRIORITY_LABELS, labelsToOptions } from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import DatePicker from "@/components/DatePicker";
import SearchSelect from "@/components/SearchSelect";
import { fmtDate, fmtDateTime, nowLocalISO, ACTIVITY_COLORS, inp, lbl } from "@/lib/ui-tokens";

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
function ActivityIcon({ type, size = 11 }: { type: string; size?: number }) {
  const s = { width: size, height: size };
  switch (type) {
    case "call":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
    case "viewing":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "meeting":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "note":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case "task":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
    default:
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  }
}

type ActiveTab = "all" | "note" | "call" | "viewing" | "task";
type SourceFilter = "all" | "deal" | "contact" | "property";

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
  const [fApptNote, setFApptNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const CALL_RESULT_LABELS: Record<string, string> = {
    reached: "Erreicht", not_reached: "Nicht erreicht", callback: "Rückruf vereinbart",
  };
  const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

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
      const [dealRes, stagesRes] = await Promise.all([
        supabase.from("deals").select("*").eq("id", id).single(),
        supabase.from("pipeline_stages").select("*").order("position"),
      ]);
      if (dealRes.error || !dealRes.data) { setError("Deal nicht gefunden"); setLoading(false); return; }
      const d = dealRes.data as Deal;
      setDeal(d);
      setForm(d);
      setStages(stagesRes.data as PipelineStage[] ?? []);

      // Load contact + property
      let loadedContact: Contact | null = null;
      let loadedProperty: Property | null = null;
      if (d.contact_id) {
        const { data } = await supabase.from("contacts").select("*").eq("id", d.contact_id).single();
        if (data) { loadedContact = data as Contact; setContact(loadedContact); }
      }
      if (d.property_id) {
        const { data } = await supabase.from("properties").select("*").eq("id", d.property_id).single();
        if (data) { loadedProperty = data as Property; setProperty(loadedProperty); }
      }

      // Load activities for this deal
      const [notesRes, activitiesRes, tasksRes] = await Promise.all([
        supabase.from("notes").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("deal_id", id).order("happened_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      ]);

      let allNotes = notesRes.data ?? [];
      let allActivities = activitiesRes.data ?? [];
      let allTasks = tasksRes.data ?? [];

      // Cross-linked: also load contact/property activities without deal_id
      const extraQueries: Promise<void>[] = [];
      if (d.contact_id) {
        extraQueries.push(
          Promise.all([
            supabase.from("notes").select("*").eq("contact_id", d.contact_id).is("deal_id", null),
            supabase.from("activities").select("*").eq("contact_id", d.contact_id).is("deal_id", null),
            supabase.from("tasks").select("*").eq("contact_id", d.contact_id).is("deal_id", null),
          ]).then(([n, a, t]) => {
            allNotes = [...allNotes, ...(n.data ?? [])];
            allActivities = [...allActivities, ...(a.data ?? [])];
            allTasks = [...allTasks, ...(t.data ?? [])];
          })
        );
      }
      if (d.property_id) {
        extraQueries.push(
          Promise.all([
            supabase.from("notes").select("*").eq("property_id", d.property_id).is("deal_id", null),
            supabase.from("activities").select("*").eq("property_id", d.property_id).is("deal_id", null),
            supabase.from("tasks").select("*").eq("property_id", d.property_id).is("deal_id", null),
          ]).then(([n, a, t]) => {
            allNotes = [...allNotes, ...(n.data ?? [])];
            allActivities = [...allActivities, ...(a.data ?? [])];
            allTasks = [...allTasks, ...(t.data ?? [])];
          })
        );
      }
      await Promise.all(extraQueries);

      // Deduplicate by id
      const dedup = <T extends { id: string }>(arr: T[]) => {
        const seen = new Set<string>();
        return arr.filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
      };
      setNotes(dedup(allNotes));
      setActivities(dedup(allActivities));
      setTasks(dedup(allTasks));
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
    setFCallResult("reached"); setFPriority("medium"); setFApptNote("");
    setOpenForm(type);
    setShowDropdown(false);
  }

  async function handleSubmitForm() {
    if (!openForm) return;
    if (openForm === "note" && !fNote.trim()) return;
    if (openForm === "task" && !fTitle.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Cross-link: also set contact_id and property_id from the deal
    const crossLink = {
      contact_id: deal?.contact_id ?? null,
      property_id: deal?.property_id ?? null,
    };

    if (openForm === "note") {
      const { data } = await supabase.from("notes").insert({ deal_id: id, ...crossLink, user_id: user.id, body: fNote.trim() }).select().single();
      if (data) setNotes((n) => [data, ...n]);
    } else if (openForm === "call") {
      const summary = `Anruf — ${CALL_RESULT_LABELS[fCallResult] ?? fCallResult}`;
      const { data } = await supabase.from("activities").insert({ deal_id: id, ...crossLink, user_id: user.id, type: "call", summary, happened_at: fDatetime, notes: fNote.trim() || null }).select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "viewing") {
      const { data } = await supabase.from("activities").insert({ deal_id: id, ...crossLink, user_id: user.id, type: "viewing", summary: fTitle.trim() || "Besichtigung", happened_at: fDatetime, notes: fApptNote.trim() || null }).select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "task") {
      const { getMyOrgId } = await import("@/lib/supabase/org");
      const orgId = await getMyOrgId(supabase, user.id);
      if (!orgId) { setSubmitting(false); return; }
      const { data } = await supabase.from("tasks").insert({ deal_id: id, ...crossLink, user_id: user.id, organization_id: orgId, title: fTitle.trim(), due_date: fDatetime ? fDatetime.slice(0, 10) : null, priority: fPriority }).select().single();
      if (data) setTasks((t) => [data, ...t]);
    }
    setOpenForm(null);
    setSubmitting(false);
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
  type TimelineItem =
    | { kind: "note"; id: string; body: string; created_at: string; deal_id?: string | null; contact_id?: string | null; property_id?: string | null }
    | { kind: "activity"; id: string; type: ActivityType; summary: string; notes?: string | null; happened_at: string; deal_id?: string | null; contact_id?: string | null; property_id?: string | null }
    | { kind: "task"; id: string; title: string; priority: TaskPriority; due_date: string | null; created_at: string; deal_id?: string | null; contact_id?: string | null; property_id?: string | null };

  const allTimeline: TimelineItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, body: n.body, created_at: n.created_at, deal_id: (n as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (n as unknown as Record<string, unknown>).contact_id as string | null, property_id: (n as unknown as Record<string, unknown>).property_id as string | null })),
    ...activities.map((a) => ({ kind: "activity" as const, id: a.id, type: a.type, summary: a.summary, notes: a.notes, happened_at: a.happened_at, deal_id: (a as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (a as unknown as Record<string, unknown>).contact_id as string | null, property_id: (a as unknown as Record<string, unknown>).property_id as string | null })),
    ...tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, priority: t.priority, due_date: t.due_date, created_at: t.created_at, deal_id: (t as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (t as unknown as Record<string, unknown>).contact_id as string | null, property_id: (t as unknown as Record<string, unknown>).property_id as string | null })),
  ];
  allTimeline.sort((a, b) => {
    const da = a.kind === "activity" ? a.happened_at : a.created_at;
    const db = b.kind === "activity" ? b.happened_at : b.created_at;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  // Determine source for each item
  function getSource(item: TimelineItem): "deal" | "contact" | "property" {
    if (item.deal_id === id) return "deal";
    if (item.contact_id && !item.deal_id) return "contact";
    if (item.property_id && !item.deal_id) return "property";
    return "deal";
  }

  // Check if multiple sources exist
  const hasMixedSources = useMemo(() => {
    const sources = new Set(allTimeline.map(getSource));
    return sources.size > 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTimeline.length, id]);

  const timeline = allTimeline.filter((item) => {
    // Tab filter
    if (activeTab === "note" && item.kind !== "note") return false;
    if (activeTab === "call" && !(item.kind === "activity" && item.type === "call")) return false;
    if (activeTab === "viewing" && !(item.kind === "activity" && item.type === "viewing")) return false;
    if (activeTab === "task" && item.kind !== "task") return false;
    // Source filter
    if (sourceFilter !== "all" && getSource(item) !== sourceFilter) return false;
    return true;
  });

  const colStyle: React.CSSProperties = {
    height: "calc(100vh - 62px)", overflowY: "auto", scrollbarWidth: "thin",
  };

  const currentStage = stages.find((s) => s.id === form.stage_id);

  // Tab config
  const tabLabels: Record<ActiveTab, string> = { all: "Alle", note: "Notiz", call: "Anruf", task: "Aufgabe", viewing: "Besichtigung" };
  const tabIcons: Record<ActiveTab, React.ReactNode> = {
    all: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    note: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    call: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    task: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    viewing: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <header className="detail-header">
          <Link href="/pipeline" className="detail-back">
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
        <header className="detail-header">
          <Link href="/pipeline" className="detail-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Pipeline
          </Link>
        </header>
        <div className="body-wrap anim-0">
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
      <header className="detail-header">
        <Link href="/pipeline" className="detail-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Pipeline
        </Link>
        <svg className="detail-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <div className="detail-title">
          {contact ? `${contact.first_name} ${contact.last_name}` : "Deal"}
        </div>
        {currentStage && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${currentStage.color}18`, color: currentStage.color, flexShrink: 0 }}>
            {currentStage.name}
          </span>
        )}
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
            <DatePicker value={form.expected_close_date ?? null} onChange={(v) => updateForm({ expected_close_date: v })} />
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

        {/* ── MIDDLE COLUMN: Aktivitäten ── */}
        <div style={{ ...colStyle, flex: 1, padding: "20px 22px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Tab-Leiste + Kontext-Button */}
          {(() => {
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ flex: 1, display: "flex", gap: 6, background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: 5, boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                  {(["all", "note", "call", "task", "viewing"] as ActiveTab[]).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button key={tab} className={isActive ? undefined : "h-menu-item"} onClick={() => { setActiveTab(tab); setOpenForm(null); }}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 8, border: "none", fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer", fontFamily: "inherit", background: isActive ? "var(--accent)" : undefined, color: isActive ? "#fff" : "var(--t2)" }}>
                        {tabIcons[tab]}{tabLabels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Kontext-Button */}
                {activeTab === "all" ? (
                  <div style={{ position: "relative" }}>
                    <button
                      ref={triggerRef}
                      className="btn-primary"
                      onClick={() => setShowDropdown((v) => !v)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Aktivität
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {showDropdown && (
                      <div ref={dropdownRef} style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border-md)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 5, minWidth: 150, zIndex: 500 }}>
                        {(["note", "call", "task", "viewing"] as const).map((t) => (
                          <button key={t} className="h-menu-item" onClick={() => openFormFor(t)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: "var(--t1)", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                            {tabIcons[t]}{tabLabels[t]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => openForm === activeTab ? setOpenForm(null) : openFormFor(activeTab as "note" | "call" | "task" | "viewing")}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {tabLabels[activeTab]}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Source-Filter Chips */}
          {hasMixedSources && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {([
                { key: "all" as SourceFilter, label: "Alle" },
                { key: "deal" as SourceFilter, label: "Dieser Deal" },
                ...(contact ? [{ key: "contact" as SourceFilter, label: contact.first_name + " " + contact.last_name }] : []),
                ...(property ? [{ key: "property" as SourceFilter, label: property.title }] : []),
              ]).map((chip) => {
                const isActive = sourceFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setSourceFilter(chip.key)}
                    style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: isActive ? 600 : 400,
                      border: isActive ? "none" : "1px solid rgba(0,0,0,0.08)",
                      background: isActive ? "var(--accent)" : "var(--card)",
                      color: isActive ? "#fff" : "var(--t2)",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline-Formular */}
          {openForm && (
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, padding: "16px 18px", flexShrink: 0, boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
              {openForm === "note" && (
                <textarea autoFocus style={{ ...inp, height: 90, padding: "8px 11px", resize: "none" }}
                  placeholder="Notiz…" value={fNote} onChange={(e) => setFNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitForm(); }} />
              )}
              {openForm === "call" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea autoFocus style={{ ...inp, height: 70, padding: "8px 11px", resize: "none" }}
                    placeholder="Gesprächsnotiz…" value={fNote} onChange={(e) => setFNote(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Datum / Uhrzeit</label>
                      <input style={{ ...inp, colorScheme: "light" }} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Ergebnis</label>
                      <AppSelect
                        value={fCallResult}
                        onChange={(v) => setFCallResult(v)}
                        options={labelsToOptions(CALL_RESULT_LABELS)}
                        style={{ height: 36 }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {openForm === "task" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input autoFocus style={inp} placeholder="Titel *" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Fällig am</label>
                      <input style={{ ...inp, colorScheme: "light" }} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Priorität</label>
                      <AppSelect
                        value={fPriority}
                        onChange={(v) => setFPriority(v as TaskPriority)}
                        options={labelsToOptions(TASK_PRIORITY_LABELS)}
                        style={{ height: 36 }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {openForm === "viewing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input autoFocus style={inp} placeholder="Titel *" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Datum / Uhrzeit</label>
                    <input style={{ ...inp, colorScheme: "light" }} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                  </div>
                  <textarea style={{ ...inp, height: 60, padding: "8px 11px", resize: "none" }}
                    placeholder="Notiz (optional)…" value={fApptNote} onChange={(e) => setFApptNote(e.target.value)} />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button className="btn-ghost" onClick={() => setOpenForm(null)} disabled={submitting}
                  style={{ height: 32 }}>
                  Abbrechen
                </button>
                <button className="btn-primary" onClick={handleSubmitForm} disabled={submitting}
                  style={{ height: 32, padding: "0 14px" }}>
                  {submitting ? "…" : "Speichern"}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div key={activeTab} className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timeline.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--t2)" }}>
                Noch keine Aktivitäten vorhanden
              </div>
            ) : (
              timeline.map((item, i) => {
                const source = getSource(item);

                if (item.kind === "task") {
                  return (
                    <div key={item.id} style={{ paddingBottom: i < timeline.length - 1 ? 12 : 0 }}>
                      <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 7, background: ACTIVITY_COLORS.task.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: ACTIVITY_COLORS.task.color, flexShrink: 0 }}>
                            <ActivityIcon type="task" size={11} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ACTIVITY_COLORS.task.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>Aufgabe</span>
                          <span style={{ fontSize: 11, color: "var(--t2)", marginLeft: "auto" }}>{fmtDateTime(item.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.6 }}>{item.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: "var(--t2)" }}>Priorität: {PRIORITY_LABELS[item.priority]}</span>
                          {item.due_date && <span style={{ fontSize: 11, color: "var(--t2)" }}>· Fällig: {fmtDateTime(item.due_date)}</span>}
                        </div>
                        {/* Source badge */}
                        {source !== "deal" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--t2)" }}>
                            {source === "contact" && contact && (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span>via {contact.first_name} {contact.last_name}</span>
                              </>
                            )}
                            {source === "property" && property && (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                <span>via {property.title}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const isNote = item.kind === "note";
                const dateStr = isNote ? item.created_at : item.happened_at;
                const typeLabel = isNote ? "Notiz" : (ACTIVITY_TYPE_LABELS[item.type as ActivityType] ?? "Aktivität");
                const itemType = isNote ? "note" : item.type;
                const content = isNote ? item.body : item.summary;
                const rawExtra = isNote ? null : item.notes;
                const extraNotes = rawExtra ? (CALL_RESULT_LABELS[rawExtra] ?? rawExtra) : null;

                return (
                  <div key={item.id} style={{ paddingBottom: i < timeline.length - 1 ? 12 : 0 }}>
                    <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 7, background: ACTIVITY_COLORS[itemType]?.bg ?? "var(--bg2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: ACTIVITY_COLORS[itemType]?.color ?? "var(--t2)", flexShrink: 0 }}>
                          <ActivityIcon type={itemType} size={11} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: ACTIVITY_COLORS[itemType]?.color ?? "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{typeLabel}</span>
                        <span style={{ fontSize: 11, color: "var(--t2)", marginLeft: "auto" }}>{fmtDateTime(dateStr)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{content}</div>
                      {extraNotes && (
                        <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>{extraNotes}</div>
                      )}
                      {/* Source badge */}
                      {source !== "deal" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--t2)" }}>
                          {source === "contact" && contact && (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              <span>via {contact.first_name} {contact.last_name}</span>
                            </>
                          )}
                          {source === "property" && property && (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                              <span>via {property.title}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                  <div style={{ fontSize: 11, color: "var(--t2)" }}>{contact.email ?? contact.phone ?? ""}</div>
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
              <div style={{ fontSize: 11, color: "var(--t2)" }}>
                Erstellt am {fmtDate(deal.created_at)}
              </div>
              <div style={{ fontSize: 11, color: "var(--t2)" }}>
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
        background: "#18120E", border: "none", borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        padding: "13px 18px", display: "flex", alignItems: "center", gap: 14, minWidth: 340,
      }}>
        <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(232,139,80,0.5)", animation: "pulse-ring 1.6s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--accent-light)" }} />
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500, flex: 1 }}>
          Ungespeicherte Änderungen
        </span>
        {saveError && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{saveError}</span>}
        <button onClick={handleDiscard} disabled={saving} style={{ height: 32, padding: "0 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 7, fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
          Verwerfen
        </button>
        <button onClick={handleSave} disabled={saving} style={{ height: 32, padding: "0 14px", background: "var(--accent)", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.8}60%{transform:scale(2.8);opacity:0}100%{transform:scale(2.8);opacity:0} }
      `}</style>
    </DashboardLayout>
  );
}
