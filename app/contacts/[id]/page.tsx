"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import LinkSection from "@/components/LinkSection";
import { usePopover } from "@/components/detail/usePopover";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Note, Activity, ActivityType, ContactType, ContactSource, SearchProfile, Property, PropertyType, SearchType, Task, TaskPriority, Deal, PipelineStage } from "@/lib/types";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_TYPE_BG,
  ACTIVITY_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_COLORS,
  PROPERTY_TYPE_BG,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_COLORS,
  CONTACT_SOURCE_LABELS,
  SEARCH_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  labelsToOptions,
} from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import DatePicker from "@/components/DatePicker";
import SearchSelect from "@/components/SearchSelect";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { inp, lbl } from "@/lib/ui-tokens";

const ACTIVITY_COLORS: Record<string, { bg: string; color: string }> = {
  note:        { bg: "var(--blu-bg)",  color: "var(--blu)" },
  call:        { bg: "var(--grn-bg)",  color: "var(--grn)" },
  task:        { bg: "var(--amb-bg)",  color: "var(--amb)" },
  appointment: { bg: "var(--pur-bg)",  color: "var(--pur)" },
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
function nowLocalISO() {
  const d = new Date();
  d.setSeconds(0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
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
    case "task":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [searchProfiles, setSearchProfiles] = useState<SearchProfile[]>([]);
  const [spForms, setSpForms] = useState<Record<string, Partial<SearchProfile>>>({});
  const [spExpanded, setSpExpanded] = useState<Record<string, boolean>>({});
  const [addingSp, setAddingSp] = useState(false);

  const [openForm, setOpenForm] = useState<"note" | "call" | "task" | "appointment" | null>(null);
  const activityPop = usePopover();
  const [fNote, setFNote] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fDatetime, setFDatetime] = useState("");
  const [fCallResult, setFCallResult] = useState("reached");
  const [fPriority, setFPriority] = useState<"low" | "medium" | "high">("medium");
  const [fApptNote, setFApptNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [archiving, setArchiving] = useState(false);
  const [contactProperties, setContactProperties] = useState<Property[]>([]);
  const [contactDeals, setContactDeals] = useState<(Deal & { stage: Pick<PipelineStage, "id" | "name" | "color"> | null })[]>([]);

  // Deal-Sheet State
  const [dealSheetOpen, setDealSheetOpen] = useState(false);
  const [dealStages, setDealStages] = useState<PipelineStage[]>([]);
  const [dealForm, setDealForm] = useState({ property_id: "", stage_id: "", commission: "", probability: "", expected_close_date: "", notes: "" });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealFormError, setDealFormError] = useState<string | null>(null);
  const [dealPropertyDisplay, setDealPropertyDisplay] = useState("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "direct" | "deal">("all");
  const morePop = usePopover();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [cRes, nRes, aRes, tRes, spRes] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("notes").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("contact_id", id).order("happened_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("search_profiles").select("*").eq("contact_id", id).order("created_at", { ascending: true }),
      ]);
      if (cRes.error || !cRes.data) {
        setError(cRes.error?.message ?? "Kontakt nicht gefunden.");
      } else {
        setContact(cRes.data);
        setForm(cRes.data);
      }
      let allNotes = nRes.data ?? [];
      let allActivities = aRes.data ?? [];
      let allTasks = tRes.data ?? [];
      const profiles: SearchProfile[] = spRes.data ?? [];
      setSearchProfiles(profiles);
      const forms: Record<string, Partial<SearchProfile>> = {};
      profiles.forEach((p) => { forms[p.id] = { ...p }; });
      setSpForms(forms);

      // Objekte des Kontakts (als Eigentümer)
      const { data: propData } = await supabase
        .from("properties")
        .select("id, title, type, status, listing_type, is_archived")
        .eq("owner_contact_id", id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      setContactProperties((propData ?? []) as Property[]);

      // Deals des Kontakts
      const { data: dealsData } = await supabase
        .from("deals")
        .select("*, stage:pipeline_stages(id, name, color)")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });
      setContactDeals((dealsData ?? []) as typeof contactDeals);

      // Cross-linked: also load activities from this contact's deals (where contact_id was not set)
      const dealIds = (dealsData ?? []).map((d: { id: string }) => d.id);
      if (dealIds.length > 0) {
        const [extraNotes, extraActivities, extraTasks] = await Promise.all([
          supabase.from("notes").select("*").in("deal_id", dealIds).is("contact_id", null),
          supabase.from("activities").select("*").in("deal_id", dealIds).is("contact_id", null),
          supabase.from("tasks").select("*").in("deal_id", dealIds).is("contact_id", null),
        ]);
        allNotes = [...allNotes, ...(extraNotes.data ?? [])];
        allActivities = [...allActivities, ...(extraActivities.data ?? [])];
        allTasks = [...allTasks, ...(extraTasks.data ?? [])];
      }

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

  // ── Dirty helpers ─────────────────────────────────────────────────────────
  function updateForm(patch: Partial<Contact>) {
    setForm((f) => ({ ...f, ...patch }));
    setIsDirty(true);
  }
  function updateSpField(profileId: string, patch: Partial<SearchProfile>) {
    setSpForms((f) => ({ ...f, [profileId]: { ...f[profileId], ...patch } }));
    setIsDirty(true);
  }

  // ── Delete search profile ─────────────────────────────────────────────────
  async function deleteSearchProfile(profileId: string) {
    if (!confirm("Suchprofil wirklich löschen?")) return;
    const supabase = createClient();
    await supabase.from("search_profiles").delete().eq("id", profileId);
    setSearchProfiles((prev) => prev.filter((p) => p.id !== profileId));
    setSpForms((prev) => { const n = { ...prev }; delete n[profileId]; return n; });
    setSpExpanded((prev) => { const n = { ...prev }; delete n[profileId]; return n; });
  }

  // ── Discard ───────────────────────────────────────────────────────────────
  function handleDiscard() {
    if (!contact) return;
    setForm(contact);
    const forms: Record<string, Partial<SearchProfile>> = {};
    searchProfiles.forEach((p) => { forms[p.id] = { ...p }; });
    setSpForms(forms);
    setIsDirty(false);
    setSaveError(null);
  }

  // ── Deal Sheet ────────────────────────────────────────────────────────────
  async function openDealSheet() {
    const supabase = createClient();
    const { data: stagesData } = await supabase.from("pipeline_stages").select("*").order("position");
    const stages = (stagesData ?? []) as PipelineStage[];
    setDealStages(stages);
    setDealForm({ property_id: "", stage_id: stages[0]?.id ?? "", commission: "", probability: "", expected_close_date: "", notes: "" });
    setDealFormError(null);
    setDealPropertyDisplay("");
    setDealSheetOpen(true);
  }

  async function saveDeal() {
    setDealSaving(true);
    setDealFormError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDealFormError("Nicht eingeloggt."); setDealSaving(false); return; }
    const parseNum = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const { data, error: err } = await supabase.from("deals").insert({
      user_id: user.id,
      contact_id: id,
      property_id: dealForm.property_id || null,
      stage_id: dealForm.stage_id || null,
      commission: parseNum(dealForm.commission),
      probability: parseNum(dealForm.probability),
      expected_close_date: dealForm.expected_close_date || null,
      notes: dealForm.notes.trim() || null,
    }).select("id").single();
    if (err) { setDealFormError(err.message); setDealSaving(false); return; }
    setDealSheetOpen(false);
    setDealSaving(false);
    if (data?.id) router.push(`/pipeline/${data.id}`);
  }

  // ── Unsaved-changes guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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

    // Suchprofile speichern (nur bei buyer / tenant / both)
    if (["buyer", "tenant", "both"].includes(form.type ?? "") && searchProfiles.length > 0) {
      await Promise.all(
        searchProfiles.map((profile) => {
          const f = spForms[profile.id] ?? {};
          return supabase.from("search_profiles").update({
            type: f.type ?? profile.type,
            property_type: f.property_type ?? profile.property_type,
            min_area: f.min_area ?? null,
            max_area: f.max_area ?? null,
            min_rooms: f.min_rooms ?? null,
            max_rooms: f.max_rooms ?? null,
            max_price: f.max_price ?? null,
            cities: f.cities ?? null,
            notes: f.notes ?? null,
          }).eq("id", profile.id);
        })
      );
      setSearchProfiles((prev) => prev.map((p) => ({ ...p, ...spForms[p.id] } as SearchProfile)));
    }

    setIsDirty(false);
    setSaving(false);
  }

  // ── Archive / Restore ─────────────────────────────────────────────────────
  async function handleArchive() {
    const isArchived = contact?.is_archived;
    const msg = isArchived
      ? "Kontakt wiederherstellen?"
      : "Kontakt archivieren? Er wird aus der Liste ausgeblendet.";
    if (!confirm(msg)) return;
    setArchiving(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ is_archived: !isArchived }).eq("id", id);
    if (isArchived) {
      setContact((c) => c ? { ...c, is_archived: false } : c);
      setArchiving(false);
    } else {
      router.push("/contacts");
    }
  }

  // ── Open form helper ──────────────────────────────────────────────────────
  function openFormFor(type: "note" | "call" | "task" | "appointment") {
    setFNote(""); setFTitle(""); setFDatetime(nowLocalISO());
    setFCallResult("reached"); setFPriority("medium"); setFApptNote("");
    setOpenForm(type);
    activityPop.close();
  }

  // ── Submit activity form ──────────────────────────────────────────────────
  async function handleSubmitForm() {
    if (!openForm) return;
    if (openForm === "note" && !fNote.trim()) return;
    if ((openForm === "task" || openForm === "appointment") && !fTitle.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    if (openForm === "note") {
      const { data } = await supabase
        .from("notes")
        .insert({ contact_id: id, body: fNote.trim(), user_id: user.id })
        .select().single();
      if (data) setNotes((n) => [data, ...n]);
    } else if (openForm === "call") {
      const { data } = await supabase
        .from("activities")
        .insert({ contact_id: id, user_id: user.id, type: "call", summary: fNote.trim() || "Anruf", happened_at: fDatetime + ":00", notes: fCallResult })
        .select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "appointment") {
      const { data } = await supabase
        .from("activities")
        .insert({ contact_id: id, user_id: user.id, type: "meeting", summary: fTitle.trim(), happened_at: fDatetime + ":00", notes: fApptNote.trim() || null })
        .select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "task") {
      const { getMyOrgId } = await import("@/lib/supabase/org");
      const orgId = await getMyOrgId(supabase, user.id);
      if (!orgId) { setSubmitting(false); return; }
      const { data } = await supabase
        .from("tasks")
        .insert({ contact_id: id, user_id: user.id, organization_id: orgId, title: fTitle.trim(), due_date: fDatetime ? fDatetime + ":00" : null, priority: fPriority })
        .select().single();
      if (data) setTasks((t) => [data, ...t]);
    }

    setOpenForm(null);
    setSubmitting(false);
  }

  // ── Timeline items ────────────────────────────────────────────────────────
  type TimelineItem =
    | { kind: "note"; id: string; body: string; created_at: string; deal_id?: string | null; contact_id?: string | null }
    | { kind: "activity"; id: string; type: ActivityType; summary: string; notes?: string | null; happened_at: string; deal_id?: string | null; contact_id?: string | null }
    | { kind: "task"; id: string; title: string; priority: TaskPriority; due_date: string | null; created_at: string; deal_id?: string | null; contact_id?: string | null };

  const CALL_RESULT_LABELS: Record<string, string> = {
    reached: "Erreicht",
    not_reached: "Nicht erreicht",
    callback: "Rückruf vereinbart",
  };
  const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

  const allTimeline: TimelineItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, body: n.body, created_at: n.created_at, deal_id: (n as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (n as unknown as Record<string, unknown>).contact_id as string | null })),
    ...activities.map((a) => ({ kind: "activity" as const, id: a.id, type: a.type, summary: a.summary, notes: a.notes, happened_at: a.happened_at, deal_id: (a as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (a as unknown as Record<string, unknown>).contact_id as string | null })),
    ...tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, priority: t.priority, due_date: t.due_date, created_at: t.created_at, deal_id: (t as unknown as Record<string, unknown>).deal_id as string | null, contact_id: (t as unknown as Record<string, unknown>).contact_id as string | null })),
  ].sort((a, b) => {
    const dateA = a.kind === "activity" ? a.happened_at : a.created_at;
    const dateB = b.kind === "activity" ? b.happened_at : b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  function getSource(item: TimelineItem): "direct" | "deal" {
    return item.deal_id && !item.contact_id ? "deal" : "direct";
  }

  const hasMixedSources = allTimeline.some((item) => getSource(item) === "deal");

  const timeline = allTimeline.filter((item) => {
    // Tab filter
    if (activeTab === "note" && item.kind !== "note") return false;
    if (activeTab === "call" && !(item.kind === "activity" && item.type === "call")) return false;
    if (activeTab === "appointment" && !(item.kind === "activity" && item.type === "meeting")) return false;
    if (activeTab === "task" && item.kind !== "task") return false;
    // Source filter
    if (sourceFilter !== "all" && getSource(item) !== sourceFilter) return false;
    return true;
  });

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = contact
    ? `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  // ── Column height ─────────────────────────────────────────────────────────
  const colStyle: React.CSSProperties = {
    height: "calc(100vh - 62px)",
    overflowY: "auto",
    scrollbarWidth: "thin",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="detail-header">
        <Link href="/contacts" className="detail-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kontakte
        </Link>

        {contact && (
          <>
            <svg className="detail-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <div className="detail-title">
              {contact.first_name} {contact.last_name}
            </div>
            {contact.is_archived && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, padding: "5px 12px", background: "var(--amb-bg)", border: "1px solid rgba(194,150,42,0.15)", borderRadius: 8, fontSize: 12, color: "var(--amb)", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
                Archiviert
                <button
                  onClick={handleArchive}
                  style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}
                >
                  Wiederherstellen
                </button>
              </div>
            )}
          </>
        )}

        <div className="detail-actions">
          {/* 3-Punkte-Menü */}
          <div style={{ position: "relative" }}>
            <button
              ref={morePop.triggerRef}
              onClick={morePop.toggle}
              className="btn-icon"
              aria-label="Weitere Optionen"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {morePop.open && (
              <div ref={morePop.popoverRef} className="popover right-anchored">
                <button
                  onClick={() => { morePop.close(); handleArchive(); }}
                  disabled={archiving || loading}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: contact?.is_archived ? "var(--grn)" : "var(--red)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  {contact?.is_archived ? "Wiederherstellen" : "Archivieren"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      {loading ? (
        <div style={{ display: "flex", gap: 16, padding: "26px 30px" }}>
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 22, boxShadow: "0 2px 8px rgba(28,24,20,0.055)" }}>
              <SkeletonBox w="100%" h={120} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 22, boxShadow: "0 2px 8px rgba(28,24,20,0.055)" }}>
              <SkeletonBox w="100%" h={200} />
            </div>
          </div>
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 22, boxShadow: "0 2px 8px rgba(28,24,20,0.055)" }}>
              <SkeletonBox w="100%" h={80} />
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ margin: "26px 30px", background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
          {error}
        </div>
      ) : (
        <div className="contact-detail anim-0" style={{ display: "flex", gap: 0, flex: 1, overflow: "hidden" }}>

          {/* ── LINKE SPALTE: Kontaktdaten ── */}
          <div
            style={{
              ...colStyle,
              width: 280,
              minWidth: 280,
              borderRight: "1px solid rgba(0,0,0,0.05)",
              background: "var(--card)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "4px 0 16px rgba(28,24,20,0.06)",
              zIndex: 1,
            }}
          >
            {/* Avatar + Name */}
            <div style={{ padding: "28px 24px 22px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg2)", border: "1px solid rgba(194,105,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 500, color: "var(--t1)", margin: "0 auto 14px", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
                {initials}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--t1)", lineHeight: 1.2, marginBottom: 8 }}>
                {contact?.first_name} {contact?.last_name}
              </div>
              {contact && (
                <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: CONTACT_TYPE_BG[contact.type], color: CONTACT_TYPE_COLORS[contact.type] }}>
                  {CONTACT_TYPE_LABELS[contact.type]}
                </span>
              )}
            </div>

            {/* Formularfelder */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Vorname *</label>
                <input style={inp} value={form.first_name ?? ""} onChange={(e) => updateForm({ first_name: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Nachname *</label>
                <input style={inp} value={form.last_name ?? ""} onChange={(e) => updateForm({ last_name: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>E-Mail</label>
                <input style={inp} type="email" value={form.email ?? ""} onChange={(e) => updateForm({ email: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Telefon</label>
                <input style={inp} type="tel" value={form.phone ?? ""} onChange={(e) => updateForm({ phone: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Typ</label>
                <AppSelect
                  value={form.type ?? "buyer"}
                  onChange={(v) => updateForm({ type: v as ContactType })}
                  options={labelsToOptions(CONTACT_TYPE_LABELS)}
                  style={{ height: 36 }}
                />
              </div>
              <div>
                <label style={lbl}>Quelle</label>
                <AppSelect
                  value={form.source ?? "other"}
                  onChange={(v) => updateForm({ source: v as ContactSource })}
                  options={labelsToOptions(CONTACT_SOURCE_LABELS)}
                  style={{ height: 36 }}
                />
              </div>
              <div>
                <label style={lbl}>Interne Notizen</label>
                <textarea
                  style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                  value={form.notes ?? ""}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  placeholder="Persönliche Notizen…"
                />
              </div>
              {/* ── Suchprofile ── */}
              {["buyer", "tenant", "both"].includes(form.type ?? "") && (() => {
                function spSummary(f: Partial<SearchProfile>): string {
                  const parts: string[] = [];
                  if (f.type) parts.push(f.type === "buy" ? "Kauf" : "Miete");
                  if (f.property_type) parts.push({ apartment: "Wohnung", house: "Haus", land: "Grundstück", commercial: "Gewerbe" }[f.property_type] ?? "");
                  if (f.cities?.length) parts.push(f.cities.slice(0, 2).join(", "));
                  if (f.max_price) parts.push(`max. ${Number(f.max_price).toLocaleString("de-DE")}€`);
                  return parts.filter(Boolean).join(" · ") || "Neues Suchprofil";
                }
                return (
                  <>
                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
                      <div className="section-head" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>
                        <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Suchprofile {searchProfiles.length > 0 ? `(${searchProfiles.length})` : ""}
                      </div>
                      <button
                        className="btn-ghost"
                        disabled={addingSp}
                        onClick={async () => {
                          setAddingSp(true);
                          const supabase = createClient();
                          const { data } = await supabase.from("search_profiles").insert({ contact_id: id, type: "buy", property_type: "apartment" }).select().single();
                          if (data) {
                            setSearchProfiles((prev) => [...prev, data]);
                            setSpForms((prev) => ({ ...prev, [data.id]: { ...data } }));
                            setSpExpanded((prev) => ({ ...prev, [data.id]: true }));
                          }
                          setAddingSp(false);
                        }}
                        style={{ height: 26, padding: "0 8px", fontSize: 12, flexShrink: 0 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        {addingSp ? "…" : "Hinzufügen"}
                      </button>
                    </div>

                    {/* Profil-Karten */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {searchProfiles.length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--t2)", padding: "6px 0" }}>Noch keine Suchprofile</div>
                        )}
                        {searchProfiles.map((profile) => {
                          const f = spForms[profile.id] ?? {};
                          const isOpen = !!spExpanded[profile.id];
                          return (
                            <div key={profile.id} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                              {/* Karten-Kopfzeile */}
                              <div className="h-accordion" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--bg2)", cursor: "pointer" }} onClick={() => setSpExpanded((prev) => ({ ...prev, [profile.id]: !prev[profile.id] }))}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform var(--dur-out) var(--ease-out)" }}><polyline points="6 9 12 15 18 9"/></svg>
                                <span style={{ fontSize: 12, color: "var(--t1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{spSummary(f)}</span>
                                <button
                                  className="h-icon-btn danger"
                                  onClick={(e) => { e.stopPropagation(); deleteSearchProfile(profile.id); }}
                                  style={{ width: 22, height: 22 }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                </button>
                              </div>

                              {/* Karten-Felder */}
                              {isOpen && (
                                <div style={{ padding: "13px 11px", display: "flex", flexDirection: "column", gap: 10 }}>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                      <label style={lbl}>Typ</label>
                                      <AppSelect
                                        value={f.type ?? "buy"}
                                        onChange={(v) => updateSpField(profile.id, { type: v as SearchType })}
                                        options={labelsToOptions(SEARCH_TYPE_LABELS)}
                                        style={{ height: 34 }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <label style={lbl}>Immobilientyp</label>
                                      <AppSelect
                                        value={f.property_type ?? "apartment"}
                                        onChange={(v) => updateSpField(profile.id, { property_type: v as PropertyType })}
                                        options={labelsToOptions(PROPERTY_TYPE_LABELS)}
                                        style={{ height: 34 }}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label style={lbl}>Fläche (m²)</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input style={{ ...inp, width: "50%" }} type="number" placeholder="Min" value={f.min_area ?? ""} onChange={(e) => updateSpField(profile.id, { min_area: e.target.value ? Number(e.target.value) : null })} />
                                      <input style={{ ...inp, width: "50%" }} type="number" placeholder="Max" value={f.max_area ?? ""} onChange={(e) => updateSpField(profile.id, { max_area: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                  </div>
                                  <div>
                                    <label style={lbl}>Zimmer</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input style={{ ...inp, width: "50%" }} type="number" placeholder="Min" value={f.min_rooms ?? ""} onChange={(e) => updateSpField(profile.id, { min_rooms: e.target.value ? Number(e.target.value) : null })} />
                                      <input style={{ ...inp, width: "50%" }} type="number" placeholder="Max" value={f.max_rooms ?? ""} onChange={(e) => updateSpField(profile.id, { max_rooms: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                  </div>
                                  <div>
                                    <label style={lbl}>{f.type === "rent" ? "Max. Miete (€/Mo.)" : "Max. Budget (€)"}</label>
                                    <input style={inp} type="number" placeholder="z.B. 450000" value={f.max_price ?? ""} onChange={(e) => updateSpField(profile.id, { max_price: e.target.value ? Number(e.target.value) : null })} />
                                  </div>
                                  <div>
                                    <label style={lbl}>Städte</label>
                                    <input style={inp} placeholder="München, Augsburg" value={f.cities ? f.cities.join(", ") : ""} onChange={(e) => updateSpField(profile.id, { cities: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null })} />
                                  </div>
                                  <div>
                                    <label style={lbl}>Notizen</label>
                                    <textarea style={{ ...inp, height: 60, padding: "7px 10px", resize: "none" }} placeholder="Weitere Wünsche…" value={f.notes ?? ""} onChange={(e) => updateSpField(profile.id, { notes: e.target.value || null })} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  </>
                );
              })()}

            </div>

            <div style={{ flexShrink: 0, padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--t2)", lineHeight: 1.6 }}>
              Erstellt {contact ? fmtDate(contact.created_at) : "—"}<br />
              Geändert {contact ? fmtDate(contact.updated_at) : "—"}
            </div>

          </div>

          {/* ── MITTLERE SPALTE: Aktivitäten ── */}
          <div style={{ ...colStyle, flex: 1, padding: "20px 22px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* Tab-Leiste + Kontext-Button */}
            {(() => {
              const tabLabels: Record<ActiveTab, string> = { all: "Alle", note: "Notiz", call: "Anruf", task: "Aufgabe", appointment: "Termin" };
              const tabIcons: Record<ActiveTab, React.ReactNode> = {
                all: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
                note: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                call: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
                task: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
                appointment: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
              };
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div className="tab-strip">
                    {(["all", "note", "call", "task", "appointment"] as ActiveTab[]).map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button key={tab} className={`tab-strip-item${isActive ? " active" : ""}`} onClick={() => { setActiveTab(tab); setOpenForm(null); }}>
                          {tabIcons[tab]}{tabLabels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  {activeTab === "all" ? (
                    <div style={{ position: "relative" }}>
                      <button
                        ref={activityPop.triggerRef}
                        className="btn-primary"
                        onClick={activityPop.toggle}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Aktivität
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {activityPop.open && (
                        <div ref={activityPop.popoverRef} className="popover right-anchored" style={{ minWidth: 150 }}>
                          {(["note", "call", "task", "appointment"] as const).map((t) => (
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
                      onClick={() => openForm === activeTab ? setOpenForm(null) : openFormFor(activeTab as "note" | "call" | "task" | "appointment")}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {tabLabels[activeTab]}
                    </button>
                  )}
                </div>
              );
            })()}

            {hasMixedSources && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {([
                  { key: "all" as const, label: "Alle" },
                  { key: "direct" as const, label: "Direkt" },
                  { key: "deal" as const, label: "via Deal" },
                ]).map((chip) => {
                  const isActive = sourceFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => setSourceFilter(chip.key)}
                      className={`filter-chip${isActive ? " active" : ""}`}
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
                {openForm === "appointment" && (
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
                  const dealBadge = source === "deal" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--t2)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      <span>via Deal</span>
                    </div>
                  ) : null;

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
                          {dealBadge}
                        </div>
                      </div>
                    );
                  }
                  const isNote = item.kind === "note";
                  const dateStr = isNote ? item.created_at : (item as Extract<TimelineItem, { kind: "activity" }>).happened_at;
                  const typeLabel = isNote ? "Notiz" : ACTIVITY_TYPE_LABELS[(item as Extract<TimelineItem, { kind: "activity" }>).type] ?? "Aktivität";
                  const itemType = isNote ? "note" : (item as Extract<TimelineItem, { kind: "activity" }>).type;
                  const content = isNote ? (item as Extract<TimelineItem, { kind: "note" }>).body : (item as Extract<TimelineItem, { kind: "activity" }>).summary;
                  const rawExtra = isNote ? null : (item as Extract<TimelineItem, { kind: "activity" }>).notes;
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
                        {dealBadge}
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
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="section-head muted" style={{ marginBottom: 6 }}>
              Verknüpfungen
            </div>

            <LinkSection
              title="Deals"
              count={contactDeals.length}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              }
              onAdd={openDealSheet}
            >
              {contactDeals.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {contactDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/pipeline/${deal.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", textDecoration: "none" }}
                    >
                      {deal.stage && <span style={{ width: 6, height: 6, borderRadius: "50%", background: deal.stage.color, flexShrink: 0 }} />}
                      <span style={{ fontSize: 12.5, color: "var(--t1)", flex: 1 }}>{deal.stage?.name ?? "Ohne Phase"}</span>
                      {deal.commission != null && (
                        <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 500 }}>
                          {deal.commission.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : undefined}
            </LinkSection>

            <LinkSection
              title="Objekte"
              count={contactProperties.length}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              }
            >
              {contactProperties.length > 0 && (
                <div>
                  {contactProperties.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/properties/${p.id}`}
                      className="h-row"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", textDecoration: "none", borderBottom: i < contactProperties.length - 1 ? "1px solid var(--border)" : "none" }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: PROPERTY_TYPE_BG[p.type], display: "flex", alignItems: "center", justifyContent: "center", color: PROPERTY_TYPE_COLORS[p.type], flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--t2)" }}>
                          {PROPERTY_TYPE_LABELS[p.type]}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: PROPERTY_STATUS_COLORS[p.status].bg, color: PROPERTY_STATUS_COLORS[p.status].fg }}>
                        {PROPERTY_STATUS_LABELS[p.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </LinkSection>

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
      {/* ── Unsaved Changes Floating Card ── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.8; }
          60%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        transform: isDirty ? "translateY(0)" : "translateY(16px)",
        opacity: isDirty ? 1 : 0,
        pointerEvents: isDirty ? "auto" : "none",
        transition: "opacity var(--dur-out) var(--ease-out), transform var(--dur-out) var(--ease-out)",
        zIndex: 1000,
        background: "#18120E",
        border: "none",
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        padding: "13px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        minWidth: 340,
      }}>
        {/* Pulsierender Kreis */}
        <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(232,139,80,0.5)",
            animation: "pulse-ring 1.6s ease-out infinite",
          }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--accent-light)" }} />
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500, flex: 1 }}>Ungespeicherte Änderungen</span>
        {saveError && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{saveError}</span>}
        <button
          className="unsaved-discard"
          onClick={handleDiscard}
          disabled={saving}
          style={{ height: 32, padding: "0 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 7, fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          Verwerfen
        </button>
        <button
          className="unsaved-save"
          onClick={handleSave}
          disabled={saving}
          style={{ height: 32, padding: "0 14px", background: "var(--accent)", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>
      {/* DEAL SHEET */}
      <Sheet open={dealSheetOpen} onOpenChange={setDealSheetOpen}>
        <SheetContent style={{ background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", padding: 0, width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "26px 30px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <SheetHeader>
              <SheetTitle style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 22, fontWeight: 400, color: "var(--t1)" }}>
                Neuer Deal
              </SheetTitle>
            </SheetHeader>
          </div>
          <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
            {/* Contact (pre-filled, read-only) */}
            <div>
              <label style={lbl}>Kontakt</label>
              <div style={{ ...inp, display: "flex", alignItems: "center", color: "var(--t1)", background: "var(--bg2)" }}>
                {contact ? `${contact.first_name} ${contact.last_name}` : "—"}
              </div>
            </div>

            <div>
              <label style={lbl}>Objekt</label>
              <SearchSelect
                value={dealForm.property_id || null}
                onChange={(v) => setDealForm((f) => ({ ...f, property_id: v || "" }))}
                onSearch={async (q) => {
                  const sb = createClient();
                  let query = sb.from("properties").select("id, title").eq("is_archived", false).order("title").limit(20);
                  if (q.trim()) query = query.ilike("title", `%${q}%`);
                  const { data } = await query;
                  return (data ?? []).map((p: { id: string; title: string }) => ({ value: p.id, label: p.title }));
                }}
                displayValue={dealPropertyDisplay}
                placeholder="Objekt suchen…"
                style={{ height: 38 }}
              />
            </div>

            <div>
              <label style={lbl}>Stage</label>
              <AppSelect
                value={dealForm.stage_id}
                onChange={(v) => setDealForm((f) => ({ ...f, stage_id: v }))}
                options={dealStages.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Stage wählen…"
                style={{ height: 38 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Provision (€)</label>
                <input style={inp} type="text" inputMode="decimal" value={dealForm.commission} onChange={(e) => setDealForm((f) => ({ ...f, commission: e.target.value }))} placeholder="z.B. 15000" />
              </div>
              <div>
                <label style={lbl}>Wahrscheinlichkeit (%)</label>
                <input style={inp} type="number" min="0" max="100" value={dealForm.probability} onChange={(e) => setDealForm((f) => ({ ...f, probability: e.target.value }))} placeholder="0-100" />
              </div>
            </div>

            <div>
              <label style={lbl}>Erwarteter Abschluss</label>
              <DatePicker value={dealForm.expected_close_date || null} onChange={(v) => setDealForm((f) => ({ ...f, expected_close_date: v ?? "" }))} />
            </div>

            <div>
              <label style={lbl}>Notizen</label>
              <textarea style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }} value={dealForm.notes} onChange={(e) => setDealForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Anmerkungen zum Deal…" />
            </div>

            {dealFormError && (
              <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--red)" }}>
                {dealFormError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button
                onClick={saveDeal}
                disabled={dealSaving}
                style={{ flex: 1, height: 40, background: dealSaving ? "var(--accent-mid)" : "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: dealSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {dealSaving ? "Speichern…" : "Deal speichern"}
              </button>
              <button
                onClick={() => setDealSheetOpen(false)}
                style={{ height: 40, padding: "0 16px", background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 14, color: "var(--t2)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
