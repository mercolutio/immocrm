"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import type { Property, PropertyType, PropertyStatus, SearchType, Contact, Note, Activity, ActivityType, SearchProfile, Task, TaskPriority, PropertyImage, Deal, PipelineStage } from "@/lib/types";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_COLORS,
  PROPERTY_TYPE_BG,
  PROPERTY_STATUS_COLORS,
  LISTING_TYPE_LABELS,
  ACTIVITY_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  ENERGY_CERTIFICATE_TYPE_LABELS,
  ENERGY_EFFICIENCY_CLASS_LABELS,
  HEATING_TYPE_LABELS,
  PARKING_LABELS,
  BOOLEAN_YES_NO_LABELS,
  OUTDOOR_SPACE_LABELS,
  labelsToOptions,
} from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import DatePicker from "@/components/DatePicker";
import SearchSelect, { type SearchSelectItem } from "@/components/SearchSelect";
import { formatEUR, propertyPrice, hasRooms } from "@/lib/property-helpers";
import { resizeImage } from "@/lib/image-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { inp, lbl } from "@/lib/ui-tokens";

const ACTIVITY_COLORS: Record<string, { bg: string; color: string }> = {
  note:    { bg: "var(--blu-bg)", color: "var(--blu)" },
  call:    { bg: "var(--grn-bg)", color: "var(--grn)" },
  viewing: { bg: "var(--pur-bg)", color: "var(--pur)" },
  meeting: { bg: "var(--pur-bg)", color: "var(--pur)" },
  email:   { bg: "var(--blu-bg)", color: "var(--blu)" },
  task:    { bg: "var(--amb-bg)", color: "var(--amb)" },
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

// ─── Activity icon ──────────────────────────────────────────────────────────
function ActivityIcon({ type, size = 13 }: { type: string; size?: number }) {
  const s = { width: size, height: size };
  switch (type) {
    case "call":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.06 6.06l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
    case "email":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case "viewing":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
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

// ─── Verknüpfungs-Sektion (Placeholder) ─────────────────────────────────────
function LinkSection({ icon, title, count, onAdd, children }: { icon: React.ReactNode; title: string; count: number; onAdd?: () => void; children?: React.ReactNode }) {
  return (
    <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>{title}</span>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(194,105,42,0.1)", color: "var(--accent)", padding: "1px 7px", borderRadius: 8 }}>{count}</span>
        )}
        {onAdd && (
          <button onClick={onAdd} className="h-icon-btn" style={{ width: 24, height: 24 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
      </div>
      {children ?? (
        <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t2)" }}>
          Noch keine Einträge
        </div>
      )}
    </div>
  );
}

type ActiveTab = "all" | "note" | "call" | "viewing" | "task";

// ─── Page ───────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Contact | null>(null);
  const [owners, setOwners] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interessenten, setInteressenten] = useState<(SearchProfile & { contact: Pick<Contact, "id" | "first_name" | "last_name" | "type"> | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Property>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [openForm, setOpenForm] = useState<"note" | "call" | "task" | "viewing" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [fNote, setFNote] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fDatetime, setFDatetime] = useState("");
  const [fCallResult, setFCallResult] = useState("reached");
  const [fPriority, setFPriority] = useState<TaskPriority>("medium");
  const [fViewNote, setFViewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [archiving, setArchiving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "direct" | "deal">("all");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // ── Images ────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [propertyDeals, setPropertyDeals] = useState<(Deal & { stage: Pick<PipelineStage, "id" | "name" | "color"> | null; contact: Pick<Contact, "id" | "first_name" | "last_name"> | null })[]>([]);
  // Deal-Sheet State
  const [dealSheetOpen, setDealSheetOpen] = useState(false);
  const [dealStages, setDealStages] = useState<PipelineStage[]>([]);
  const [dealForm, setDealForm] = useState({ contact_id: "", stage_id: "", commission: "", probability: "", expected_close_date: "", notes: "" });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealFormError, setDealFormError] = useState<string | null>(null);
  const [dealContactDisplay, setDealContactDisplay] = useState("");

  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOverGallery, setDragOverGallery] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [pRes, nRes, aRes, tRes, ownersRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase.from("notes").select("*").eq("property_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("property_id", id).order("happened_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("property_id", id).order("created_at", { ascending: false }),
        supabase.from("contacts").select("*").in("type", ["seller", "landlord", "both"]).eq("is_archived", false).order("last_name"),
      ]);
      if (pRes.error || !pRes.data) {
        setError(pRes.error?.message ?? "Objekt nicht gefunden.");
        setLoading(false);
        return;
      }
      const p = pRes.data as Property;
      setProperty(p);
      setForm(p);
      let allNotes = nRes.data ?? [];
      let allActivities = aRes.data ?? [];
      let allTasks = tRes.data ?? [];
      let ownersList = (ownersRes.data ?? []) as Contact[];

      // Eigentümer laden
      if (p.owner_contact_id) {
        const { data: ownerData } = await supabase.from("contacts").select("*").eq("id", p.owner_contact_id).single();
        setOwner(ownerData as Contact);
        // Archivierter Eigentümer: in Dropdown-Liste einfügen falls nicht vorhanden
        if (ownerData?.is_archived && !ownersList.find((o) => o.id === ownerData.id)) {
          ownersList = [ownerData as Contact, ...ownersList];
        }
      }
      setOwners(ownersList);

      // Interessenten (search_profiles mit passendem Typ, Eigentümer ausschließen)
      let spQuery = supabase
        .from("search_profiles")
        .select("*, contact:contacts(id, first_name, last_name, type, is_archived)")
        .eq("property_type", p.type)
        .eq("type", p.listing_type);
      if (p.owner_contact_id) spQuery = spQuery.neq("contact_id", p.owner_contact_id);

      const [spRes, imgRes] = await Promise.all([
        spQuery,
        supabase
          .from("property_images")
          .select("*")
          .eq("property_id", id)
          .order("position"),
      ]);
      const interessentenRaw = (spRes.data ?? []) as (SearchProfile & { contact: (Pick<Contact, "id" | "first_name" | "last_name" | "type"> & { is_archived: boolean }) | null })[];
      setInteressenten(interessentenRaw.filter((sp) => !sp.contact?.is_archived) as (SearchProfile & { contact: Pick<Contact, "id" | "first_name" | "last_name" | "type"> | null })[]);
      setImages((imgRes.data ?? []) as PropertyImage[]);

      // Deals des Objekts
      const { data: dealsData } = await supabase
        .from("deals")
        .select("*, stage:pipeline_stages(id, name, color), contact:contacts(id, first_name, last_name)")
        .eq("property_id", id)
        .order("created_at", { ascending: false });
      setPropertyDeals((dealsData ?? []) as typeof propertyDeals);

      // Cross-linked: also load activities from this property's deals (where property_id was not set)
      const dealIds = (dealsData ?? []).map((d: { id: string }) => d.id);
      if (dealIds.length > 0) {
        const [extraNotes, extraActivities, extraTasks] = await Promise.all([
          supabase.from("notes").select("*").in("deal_id", dealIds).is("property_id", null),
          supabase.from("activities").select("*").in("deal_id", dealIds).is("property_id", null),
          supabase.from("tasks").select("*").in("deal_id", dealIds).is("property_id", null),
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

  // ── Dropdown außen schließen ──────────────────────────────────────────────
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropdownRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // ── Dirty helpers ─────────────────────────────────────────────────────────
  function updateForm(patch: Partial<Property>) {
    setForm((f) => ({ ...f, ...patch }));
    setIsDirty(true);
  }

  function handleDiscard() {
    if (!property) return;
    setForm(property);
    setIsDirty(false);
    setSaveError(null);
  }

  // ── Deal Sheet ────────────────────────────────────────────────────────────
  async function openDealSheet() {
    const sb = createClient();
    const { data: stagesData } = await sb.from("pipeline_stages").select("*").order("position");
    const stages = (stagesData ?? []) as PipelineStage[];
    setDealStages(stages);
    setDealForm({ contact_id: "", stage_id: stages[0]?.id ?? "", commission: "", probability: "", expected_close_date: "", notes: "" });
    setDealFormError(null);
    setDealContactDisplay("");
    setDealSheetOpen(true);
  }

  async function saveDeal() {
    if (!dealForm.contact_id) { setDealFormError("Kontakt ist ein Pflichtfeld."); return; }
    setDealSaving(true);
    setDealFormError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setDealFormError("Nicht eingeloggt."); setDealSaving(false); return; }
    const parseNum = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const { data, error: err } = await sb.from("deals").insert({
      user_id: user.id,
      contact_id: dealForm.contact_id,
      property_id: id,
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

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title?.trim()) {
      setSaveError("Titel ist ein Pflichtfeld.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("properties")
      .update({
        title: form.title?.trim(),
        type: form.type,
        listing_type: form.listing_type,
        status: form.status,
        description: form.description?.trim() || null,
        street: form.street?.trim() || null,
        house_number: form.house_number?.trim() || null,
        zip: form.zip?.trim() || null,
        city: form.city?.trim() || null,
        price: form.listing_type === "buy" ? (form.price ?? null) : null,
        rent: form.listing_type === "rent" ? (form.rent ?? null) : null,
        area_sqm: form.area_sqm ?? null,
        rooms: hasRooms(form.type ?? "apartment") ? (form.rooms ?? null) : null,
        owner_contact_id: form.owner_contact_id || null,
        energy_certificate_type: form.energy_certificate_type || null,
        energy_efficiency_class: form.energy_efficiency_class || null,
        energy_consumption: form.energy_consumption ?? null,
        heating_type: form.heating_type || null,
        construction_year: form.construction_year ?? null,
        primary_energy_source: form.primary_energy_source?.trim() || null,
        floor_number: form.type === "apartment" ? (form.floor_number ?? null) : null,
        total_floors: ["apartment", "house"].includes(form.type ?? "") ? (form.total_floors ?? null) : null,
        parking: form.parking || null,
        basement: form.basement ?? null,
        elevator: form.elevator ?? null,
        outdoor_space: form.outdoor_space || null,
        plot_area: ["house", "land"].includes(form.type ?? "") ? (form.plot_area ?? null) : null,
      })
      .eq("id", id);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setProperty((p) => ({ ...p!, ...form } as Property));

    // Eigentümer neu laden falls geändert
    if (form.owner_contact_id !== property?.owner_contact_id) {
      if (form.owner_contact_id) {
        const { data: ownerData } = await supabase.from("contacts").select("*").eq("id", form.owner_contact_id).single();
        setOwner(ownerData as Contact);
      } else {
        setOwner(null);
      }
    }

    setIsDirty(false);
    setSaving(false);
  }

  async function handleArchive() {
    const isArchived = property?.is_archived;
    const msg = isArchived
      ? "Objekt wiederherstellen?"
      : "Objekt archivieren? Es wird aus der Liste ausgeblendet.";
    if (!confirm(msg)) return;
    setArchiving(true);
    const supabase = createClient();
    await supabase.from("properties").update({ is_archived: !isArchived }).eq("id", id);
    if (isArchived) {
      setProperty((p) => p ? { ...p, is_archived: false } : p);
      setArchiving(false);
    } else {
      router.push("/properties");
    }
  }

  function openFormFor(type: "note" | "call" | "task" | "viewing") {
    setFNote(""); setFTitle(""); setFDatetime(nowLocalISO());
    setFCallResult("reached"); setFPriority("medium"); setFViewNote("");
    setOpenForm(type);
    setShowDropdown(false);
  }

  async function handleSubmitForm() {
    if (!openForm) return;
    if (openForm === "note" && !fNote.trim()) return;
    if ((openForm === "task" || openForm === "viewing") && !fTitle.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    if (openForm === "note") {
      const { data } = await supabase
        .from("notes")
        .insert({ property_id: id, body: fNote.trim(), user_id: user.id })
        .select().single();
      if (data) setNotes((n) => [data, ...n]);
    } else if (openForm === "call") {
      const { data } = await supabase
        .from("activities")
        .insert({ property_id: id, user_id: user.id, type: "call", summary: fNote.trim() || "Anruf", happened_at: fDatetime + ":00", notes: fCallResult })
        .select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "viewing") {
      const { data } = await supabase
        .from("activities")
        .insert({ property_id: id, user_id: user.id, type: "viewing", summary: fTitle.trim(), happened_at: fDatetime + ":00", notes: fViewNote.trim() || null })
        .select().single();
      if (data) setActivities((a) => [data, ...a]);
    } else if (openForm === "task") {
      const { getMyOrgId } = await import("@/lib/supabase/org");
      const orgId = await getMyOrgId(supabase, user.id);
      if (!orgId) { setSubmitting(false); return; }
      const { data } = await supabase
        .from("tasks")
        .insert({ property_id: id, user_id: user.id, organization_id: orgId, title: fTitle.trim(), due_date: fDatetime ? fDatetime + ":00" : null, priority: fPriority })
        .select().single();
      if (data) setTasks((t) => [data, ...t]);
    }

    setOpenForm(null);
    setSubmitting(false);
  }

  // ── Keyboard navigation (ESC + Pfeiltasten) ─────────────────────────────
  useEffect(() => {
    if (!showGallery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowGallery(false);
      if (e.key === "ArrowLeft")  setGalleryIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setGalleryIdx((i) => (i + 1) % images.length);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showGallery, images.length]);

  // ── Image helpers ─────────────────────────────────────────────────────────
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  function imgUrl(path: string) {
    return `${SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
  }
  function thumbUrl(img: PropertyImage) {
    return imgUrl(img.thumb_path ?? img.storage_path);
  }

  const coverImage = images.find((i) => i.is_cover) ?? images[0] ?? null;

  async function uploadFiles(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const newImages: PropertyImage[] = [];
    let maxPos = images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const uuid = crypto.randomUUID();
      const mainPath = `${user.id}/${id}/${uuid}.webp`;
      const tPath = `${user.id}/${id}/${uuid}_thumb.webp`;

      try {
        const [mainBlob, thumbBlob] = await Promise.all([
          resizeImage(file, 1920, 0.85),
          resizeImage(file, 400, 0.75),
        ]);

        const [mainRes, thumbRes] = await Promise.all([
          supabase.storage.from("property-images").upload(mainPath, mainBlob, { contentType: "image/webp" }),
          supabase.storage.from("property-images").upload(tPath, thumbBlob, { contentType: "image/webp" }),
        ]);

        if (mainRes.error) { console.error("Main upload error:", mainRes.error.message); continue; }
        if (thumbRes.error) console.error("Thumb upload error:", thumbRes.error.message);

        const { data, error: dbErr } = await supabase
          .from("property_images")
          .insert({
            property_id: id,
            user_id: user.id,
            storage_path: mainPath,
            thumb_path: thumbRes.error ? null : tPath,
            file_name: file.name,
            position: maxPos,
            is_cover: images.length === 0 && newImages.length === 0,
          })
          .select()
          .single();
        if (!dbErr && data) {
          newImages.push(data as PropertyImage);
          maxPos++;
        }
      } catch (err) {
        console.error("Image processing error:", err);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
  }

  async function deleteImage(img: PropertyImage) {
    const supabase = createClient();
    await supabase.storage.from("property-images").remove([img.storage_path]);
    await supabase.from("property_images").delete().eq("id", img.id);
    setImages((prev) => {
      const next = prev.filter((i) => i.id !== img.id);
      // Falls Cover gelöscht, erstes Bild zum Cover machen
      if (img.is_cover && next.length > 0) {
        next[0] = { ...next[0], is_cover: true };
        supabase.from("property_images").update({ is_cover: true }).eq("id", next[0].id);
      }
      return next;
    });
    // Wenn aktueller Gallery-Index out of bounds, korrigieren
    setGalleryIdx((i) => Math.min(i, Math.max(0, images.length - 2)));
  }

  async function setCover(img: PropertyImage) {
    const supabase = createClient();
    // Altes Cover entfernen
    const oldCover = images.find((i) => i.is_cover);
    if (oldCover) {
      await supabase.from("property_images").update({ is_cover: false }).eq("id", oldCover.id);
    }
    await supabase.from("property_images").update({ is_cover: true }).eq("id", img.id);
    setImages((prev) => prev.map((i) => ({ ...i, is_cover: i.id === img.id })));
  }

  async function reorderImages(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, position: i }));
    setImages(updated);

    const supabase = createClient();
    for (const img of updated) {
      await supabase.from("property_images").update({ position: img.position }).eq("id", img.id);
    }
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  type TimelineItem =
    | { kind: "note"; id: string; body: string; created_at: string; deal_id?: string | null; property_id?: string | null }
    | { kind: "activity"; id: string; type: ActivityType; summary: string; notes?: string | null; happened_at: string; deal_id?: string | null; property_id?: string | null }
    | { kind: "task"; id: string; title: string; priority: TaskPriority; due_date: string | null; created_at: string; deal_id?: string | null; property_id?: string | null };

  const CALL_RESULT_LABELS: Record<string, string> = {
    reached: "Erreicht",
    not_reached: "Nicht erreicht",
    callback: "Rückruf vereinbart",
  };
  const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

  const allTimeline: TimelineItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, body: n.body, created_at: n.created_at, deal_id: (n as unknown as Record<string, unknown>).deal_id as string | null, property_id: (n as unknown as Record<string, unknown>).property_id as string | null })),
    ...activities.map((a) => ({ kind: "activity" as const, id: a.id, type: a.type, summary: a.summary, notes: a.notes, happened_at: a.happened_at, deal_id: (a as unknown as Record<string, unknown>).deal_id as string | null, property_id: (a as unknown as Record<string, unknown>).property_id as string | null })),
    ...tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, priority: t.priority, due_date: t.due_date, created_at: t.created_at, deal_id: (t as unknown as Record<string, unknown>).deal_id as string | null, property_id: (t as unknown as Record<string, unknown>).property_id as string | null })),
  ].sort((a, b) => {
    const dateA = a.kind === "activity" ? a.happened_at : a.created_at;
    const dateB = b.kind === "activity" ? b.happened_at : b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  function getSource(item: TimelineItem): "direct" | "deal" {
    return item.deal_id && !item.property_id ? "deal" : "direct";
  }

  const hasMixedSources = allTimeline.some((item) => getSource(item) === "deal");

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
    height: "calc(100vh - 62px)",
    overflowY: "auto",
    scrollbarWidth: "thin",
  };

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="detail-header">
        <Link href="/properties" className="detail-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Objekte
        </Link>

        {property && (
          <>
            <svg className="detail-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <div className="detail-title" style={{ maxWidth: 420 }}>
              {property.title}
            </div>
          </>
        )}

        <div className="detail-actions">
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className="btn-icon"
              aria-label="Weitere Optionen"
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
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: property?.is_archived ? "var(--grn)" : "var(--red)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  {property?.is_archived ? "Wiederherstellen" : "Archivieren"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Archiv-Banner */}
      {property?.is_archived && (
        <div style={{ margin: "0 30px", padding: "10px 16px", background: "var(--amb-bg)", border: "1px solid rgba(194,150,42,0.2)", borderRadius: 10, fontSize: 13, color: "var(--amb)", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          Dieses Objekt ist archiviert.
          <button
            onClick={handleArchive}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
          >
            Wiederherstellen
          </button>
        </div>
      )}

      {/* BODY */}
      {loading ? (
        <div style={{ display: "flex", gap: 16, padding: "26px 30px" }}>
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 22, boxShadow: "0 2px 8px rgba(28,24,20,0.055)" }}>
              <SkeletonBox w="100%" h={120} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 22, boxShadow: "0 2px 8px rgba(28,24,20,0.055)" }}>
              <SkeletonBox w="100%" h={200} />
            </div>
          </div>
          <div style={{ width: 280, flexShrink: 0 }}>
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
        <div className="property-detail anim-0" style={{ display: "flex", gap: 0, flex: 1, overflow: "hidden" }}>

          {/* ── LINKE SPALTE: Objektdaten ── */}
          <div
            style={{
              ...colStyle,
              width: 300,
              minWidth: 300,
              borderRight: "1px solid rgba(0,0,0,0.05)",
              background: "var(--card)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "4px 0 16px rgba(28,24,20,0.06)",
              zIndex: 1,
            }}
          >
            {/* Header: Hero-Bild + Titel */}
            <div style={{ borderBottom: "1px solid var(--border)", textAlign: "center" }}>
              {/* Hero-Bild oder Upload-Placeholder */}
              {coverImage ? (
                <div
                  style={{ position: "relative", width: "100%", height: 180, cursor: "pointer", overflow: "hidden" }}
                  onClick={() => { setGalleryIdx(images.indexOf(coverImage)); setShowGallery(true); }}
                >
                  <img
                    src={thumbUrl(coverImage)}
                    alt={property?.title ?? "Objektbild"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {uploading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Wird hochgeladen…</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    {images.length}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  style={{
                    width: "100%", height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                    cursor: uploading ? "default" : "pointer",
                    background: "var(--bg2)", borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLElement).style.background = "var(--bg3, rgba(0,0,0,0.06))"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
                >
                  {uploading ? (
                    <>
                      <div style={{ width: 24, height: 24, border: "2.5px solid rgba(0,0,0,0.1)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      <span style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>Wird hochgeladen…</span>
                    </>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>Fotos hinzufügen</span>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) { uploadFiles(Array.from(e.target.files)); e.target.value = ""; } }} />

              <div style={{ padding: "16px 24px 18px" }}>
              <div style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 18, fontWeight: 400, color: "var(--t1)", lineHeight: 1.3, marginBottom: 10, padding: "0 8px" }}>
                {property?.title}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {property && (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: PROPERTY_TYPE_BG[property.type], color: PROPERTY_TYPE_COLORS[property.type] }}>
                      {PROPERTY_TYPE_LABELS[property.type]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: PROPERTY_STATUS_COLORS[property.status].bg, color: PROPERTY_STATUS_COLORS[property.status].fg }}>
                      {PROPERTY_STATUS_LABELS[property.status]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "var(--bg2)", color: "var(--t2)" }}>
                      {LISTING_TYPE_LABELS[property.listing_type]}
                    </span>
                  </>
                )}
              </div>
              </div>
            </div>

            {/* Formular */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* ── Sektion: Objektdaten ── */}
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Objektdaten</div>
              <div>
                <label style={lbl}>Titel *</label>
                <input style={inp} value={form.title ?? ""} onChange={(e) => updateForm({ title: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Typ</label>
                  <AppSelect
                    value={form.type ?? "apartment"}
                    onChange={(v) => updateForm({ type: v as PropertyType })}
                    options={labelsToOptions(PROPERTY_TYPE_LABELS)}
                    style={{ height: 36 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Vermarktung</label>
                  <AppSelect
                    value={form.listing_type ?? "buy"}
                    onChange={(v) => updateForm({ listing_type: v as SearchType })}
                    options={labelsToOptions(LISTING_TYPE_LABELS)}
                    style={{ height: 36 }}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <AppSelect
                  value={form.status ?? "available"}
                  onChange={(v) => updateForm({ status: v as PropertyStatus })}
                  options={labelsToOptions(PROPERTY_STATUS_LABELS)}
                  style={{ height: 36 }}
                />
              </div>
              <div>
                <label style={lbl}>Beschreibung</label>
                <textarea
                  style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                  value={form.description ?? ""}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  placeholder="Kurzbeschreibung…"
                />
              </div>
              <div>
                <label style={lbl}>Eigentümer</label>
                <SearchSelect
                  value={form.owner_contact_id ?? null}
                  onChange={(v) => updateForm({ owner_contact_id: v || null })}
                  onSearch={async (q) => {
                    const supabase = createClient();
                    let query = supabase
                      .from("contacts")
                      .select("id, first_name, last_name, is_archived")
                      .in("type", ["seller", "landlord", "both"])
                      .order("last_name")
                      .limit(20);
                    if (q.trim()) {
                      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
                    }
                    const { data } = await query;
                    return (data ?? []).map((o: { id: string; first_name: string; last_name: string; is_archived: boolean }) => ({
                      value: o.id,
                      label: `${o.first_name} ${o.last_name}`,
                      sublabel: o.is_archived ? "archiviert" : undefined,
                    })) as SearchSelectItem[];
                  }}
                  displayValue={
                    form.owner_contact_id
                      ? owners.find((o) => o.id === form.owner_contact_id)
                        ? `${owners.find((o) => o.id === form.owner_contact_id)!.first_name} ${owners.find((o) => o.id === form.owner_contact_id)!.last_name}`
                        : undefined
                      : undefined
                  }
                  placeholder="Eigentümer suchen…"
                  style={{ height: 36 }}
                />
              </div>

              {/* ── Sektion: Adresse ── */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Adresse</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>Straße</label>
                  <input style={inp} value={form.street ?? ""} onChange={(e) => updateForm({ street: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Nr.</label>
                  <input style={inp} value={form.house_number ?? ""} onChange={(e) => updateForm({ house_number: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>PLZ</label>
                  <input style={inp} value={form.zip ?? ""} onChange={(e) => updateForm({ zip: e.target.value })} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>Ort</label>
                  <input style={inp} value={form.city ?? ""} onChange={(e) => updateForm({ city: e.target.value })} />
                </div>
              </div>

              {/* ── Sektion: Eckdaten ── */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Eckdaten</div>
              {form.listing_type === "buy" ? (
                <div>
                  <label style={lbl}>Kaufpreis (€)</label>
                  <input style={inp} type="number" value={form.price ?? ""} onChange={(e) => updateForm({ price: e.target.value ? Number(e.target.value) : null })} />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Miete (€/Monat)</label>
                  <input style={inp} type="number" value={form.rent ?? ""} onChange={(e) => updateForm({ rent: e.target.value ? Number(e.target.value) : null })} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Fläche (m²)</label>
                  <input style={inp} type="number" value={form.area_sqm ?? ""} onChange={(e) => updateForm({ area_sqm: e.target.value ? Number(e.target.value) : null })} />
                </div>
                {hasRooms(form.type ?? "apartment") && (
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Zimmer</label>
                    <input style={inp} type="number" step="0.5" value={form.rooms ?? ""} onChange={(e) => updateForm({ rooms: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                )}
              </div>

              {/* ── Sektion: Energiedaten (ausklappbar) ── */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
              <div
                onClick={() => setEnergyOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 6 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)", flex: 1 }}>Energiedaten</div>
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
                  style={{ flexShrink: 0, transform: energyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div style={{ display: "grid", gridTemplateRows: energyOpen ? "1fr" : "0fr", transition: "grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
                <div style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={lbl}>Energieausweis-Typ</label>
                    <AppSelect
                      value={form.energy_certificate_type ?? ""}
                      onChange={(v) => updateForm({ energy_certificate_type: v || null })}
                      options={[{ value: "", label: "— Nicht angegeben —" }, ...labelsToOptions(ENERGY_CERTIFICATE_TYPE_LABELS)]}
                      style={{ height: 36 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Effizienzklasse</label>
                      <AppSelect
                        value={form.energy_efficiency_class ?? ""}
                        onChange={(v) => updateForm({ energy_efficiency_class: v || null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(ENERGY_EFFICIENCY_CLASS_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Verbrauch</label>
                      <input style={inp} type="number" placeholder="kWh/m²·a" value={form.energy_consumption ?? ""} onChange={(e) => updateForm({ energy_consumption: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Heizungsart</label>
                      <AppSelect
                        value={form.heating_type ?? ""}
                        onChange={(v) => updateForm({ heating_type: v || null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(HEATING_TYPE_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Baujahr</label>
                      <input style={inp} type="number" placeholder="z.B. 1985" value={form.construction_year ?? ""} onChange={(e) => updateForm({ construction_year: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Wesentlicher Energieträger</label>
                    <input style={inp} type="text" value={form.primary_energy_source ?? ""} onChange={(e) => updateForm({ primary_energy_source: e.target.value })} />
                  </div>
                </div>
                </div>
              </div>

              {/* ── Sektion: Weitere Details (ausklappbar) ── */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
              <div
                onClick={() => setDetailsOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 6 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)", flex: 1 }}>Weitere Details</div>
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
                  style={{ flexShrink: 0, transform: detailsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div style={{ display: "grid", gridTemplateRows: detailsOpen ? "1fr" : "0fr", transition: "grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
                <div style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(form.type === "apartment" || form.type === "house") && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {form.type === "apartment" && (
                        <div style={{ flex: 1 }}>
                          <label style={lbl}>Etage</label>
                          <input style={inp} type="number" placeholder="z.B. 3" value={form.floor_number ?? ""} onChange={(e) => updateForm({ floor_number: e.target.value ? Number(e.target.value) : null })} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Gesamtetagen</label>
                        <input style={inp} type="number" placeholder="z.B. 5" value={form.total_floors ?? ""} onChange={(e) => updateForm({ total_floors: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Keller</label>
                      <AppSelect
                        value={form.basement === true ? "true" : form.basement === false ? "false" : ""}
                        onChange={(v) => updateForm({ basement: v === "true" ? true : v === "false" ? false : null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(BOOLEAN_YES_NO_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Aufzug</label>
                      <AppSelect
                        value={form.elevator === true ? "true" : form.elevator === false ? "false" : ""}
                        onChange={(v) => updateForm({ elevator: v === "true" ? true : v === "false" ? false : null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(BOOLEAN_YES_NO_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Stellplatz</label>
                      <AppSelect
                        value={form.parking ?? ""}
                        onChange={(v) => updateForm({ parking: v || null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(PARKING_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Balkon/Terrasse</label>
                      <AppSelect
                        value={form.outdoor_space ?? ""}
                        onChange={(v) => updateForm({ outdoor_space: v || null })}
                        options={[{ value: "", label: "—" }, ...labelsToOptions(OUTDOOR_SPACE_LABELS)]}
                        style={{ height: 36 }}
                      />
                    </div>
                  </div>
                  {(form.type === "house" || form.type === "land") && (
                    <div>
                      <label style={lbl}>Grundstücksfläche</label>
                      <input style={inp} type="number" placeholder="m²" value={form.plot_area ?? ""} onChange={(e) => updateForm({ plot_area: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* ── Sektion: Fotos ── */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)" }}>Fotos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {images.slice(0, 6).map((img, i) => (
                  <div
                    key={img.id}
                    onClick={() => { setGalleryIdx(i); setShowGallery(true); }}
                    style={{
                      width: 74, height: 54, borderRadius: 8, overflow: "hidden", cursor: "pointer",
                      border: img.is_cover ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.08)",
                      position: "relative", flexShrink: 0,
                    }}
                  >
                    <img src={thumbUrl(img)} alt={img.file_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {img.is_cover && (
                      <div style={{ position: "absolute", top: 2, left: 2, width: 14, height: 14, borderRadius: 3, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                      </div>
                    )}
                  </div>
                ))}
                {images.length > 6 && (
                  <div
                    onClick={() => { setGalleryIdx(0); setShowGallery(true); }}
                    style={{ width: 74, height: 54, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--t2)" }}
                  >
                    +{images.length - 6}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setGalleryIdx(0); setShowGallery(true); }}
                className="h-menu-item"
                style={{
                  width: "100%", height: 34, borderRadius: 8, border: "1px dashed rgba(0,0,0,0.15)", background: "none",
                  fontSize: 12, fontWeight: 500, color: "var(--t2)", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                {images.length === 0 ? "Fotos hinzufügen" : `Alle ${images.length} Fotos verwalten`}
              </button>

            </div>

            <div style={{ flexShrink: 0, padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--t2)", lineHeight: 1.6 }}>
              Erstellt {property ? fmtDate(property.created_at) : "—"}<br />
              Geändert {property ? fmtDate(property.updated_at) : "—"}
            </div>
          </div>

          {/* ── MITTLERE SPALTE: Aktivitäten ── */}
          <div style={{ ...colStyle, flex: 1, padding: "20px 22px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {(() => {
              const tabLabels: Record<ActiveTab, string> = { all: "Alle", note: "Notiz", call: "Anruf", viewing: "Besichtigung", task: "Aufgabe" };
              const tabIcons: Record<ActiveTab, React.ReactNode> = {
                all: <ActivityIcon type="all" size={12} />,
                note: <ActivityIcon type="note" size={12} />,
                call: <ActivityIcon type="call" size={12} />,
                viewing: <ActivityIcon type="viewing" size={12} />,
                task: <ActivityIcon type="task" size={12} />,
              };
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ flex: 1, display: "flex", gap: 6, background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: 5, boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                    {(["all", "note", "call", "viewing", "task"] as ActiveTab[]).map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button key={tab} className={isActive ? undefined : "h-menu-item"} onClick={() => { setActiveTab(tab); setOpenForm(null); }}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 8, border: "none", fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer", fontFamily: "inherit", background: isActive ? "var(--accent)" : undefined, color: isActive ? "#fff" : "var(--t2)" }}>
                          {tabIcons[tab]}{tabLabels[tab]}
                        </button>
                      );
                    })}
                  </div>

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
                        <div ref={dropdownRef} style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border-md)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 5, minWidth: 160, zIndex: 500 }}>
                          {(["note", "call", "viewing", "task"] as const).map((t) => (
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
                  { key: "all" as const, label: "Alle" },
                  { key: "direct" as const, label: "Direkt" },
                  { key: "deal" as const, label: "via Deal" },
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
                        cursor: "pointer", fontFamily: "inherit",
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
                {openForm === "viewing" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input autoFocus style={inp} placeholder="Titel (z.B. Besichtigung Familie Müller) *" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Datum / Uhrzeit</label>
                      <input style={{ ...inp, colorScheme: "light" }} type="datetime-local" value={fDatetime} onChange={(e) => setFDatetime(e.target.value)} />
                    </div>
                    <textarea style={{ ...inp, height: 60, padding: "8px 11px", resize: "none" }}
                      placeholder="Notiz (optional)…" value={fViewNote} onChange={(e) => setFViewNote(e.target.value)} />
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
                            <div style={{ width: 24, height: 24, borderRadius: 7, background: ACTIVITY_COLORS.task.bg, display: "flex", alignItems: "center", justifyContent: "center", color: ACTIVITY_COLORS.task.color, flexShrink: 0 }}>
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
                          <div style={{ width: 24, height: 24, borderRadius: 7, background: ACTIVITY_COLORS[itemType]?.bg ?? "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: ACTIVITY_COLORS[itemType]?.color ?? "var(--t2)", flexShrink: 0 }}>
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
              width: 280,
              minWidth: 280,
              borderLeft: "1px solid var(--border)",
              background: "var(--bg)",
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: 6 }}>
              Verknüpfungen
            </div>

            {/* Eckdaten-Card */}
            {property && (
              <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t3)", marginBottom: 10 }}>Eckdaten</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--t2)" }}>{property.listing_type === "rent" ? "Miete" : "Preis"}</span>
                    <span style={{ color: "var(--t1)", fontWeight: 500 }}>{propertyPrice(property)}</span>
                  </div>
                  {property.area_sqm != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--t2)" }}>Fläche</span>
                      <span style={{ color: "var(--t1)", fontWeight: 500 }}>{property.area_sqm} m²</span>
                    </div>
                  )}
                  {property.rooms != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--t2)" }}>Zimmer</span>
                      <span style={{ color: "var(--t1)", fontWeight: 500 }}>{property.rooms}</span>
                    </div>
                  )}
                  {property.area_sqm != null && property.price != null && property.listing_type === "buy" && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                      <span style={{ color: "var(--t2)" }}>Preis/m²</span>
                      <span style={{ color: "var(--t1)", fontWeight: 500 }}>{formatEUR(Math.round(property.price / property.area_sqm))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Eigentümer-Card */}
            {owner && (
              <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t3)" }}>
                  Eigentümer
                </div>
                <Link
                  href={`/contacts/${owner.id}`}
                  className="h-row"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none" }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #C2692A, #E8955A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                    {owner.first_name[0]?.toUpperCase()}{owner.last_name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {owner.first_name} {owner.last_name}
                      </span>
                      {owner.is_archived && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: "var(--amb-bg)", color: "var(--amb)", flexShrink: 0 }}>Archiviert</span>
                      )}
                    </div>
                    {owner.email && (
                      <div style={{ fontSize: 11, color: "var(--t2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {owner.email}
                      </div>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              </div>
            )}

            {/* Interessenten */}
            <LinkSection
              title="Interessenten"
              count={interessenten.length}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                  <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              }
            >
              {interessenten.length === 0 ? (
                <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 12, color: "var(--t2)" }}>
                  Keine passenden Suchprofile
                </div>
              ) : (
                <div>
                  {interessenten.map((sp, i) => sp.contact && (
                    <Link
                      key={sp.id}
                      href={`/contacts/${sp.contact.id}`}
                      className="h-row"
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", textDecoration: "none", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #C2692A, #E8955A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                        {sp.contact.first_name[0]?.toUpperCase()}{sp.contact.last_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {sp.contact.first_name} {sp.contact.last_name}
                        </div>
                        {sp.max_price && (
                          <div style={{ fontSize: 10, color: "var(--t2)" }}>
                            max. {formatEUR(sp.max_price)}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </LinkSection>

            {/* Deals */}
            <LinkSection
              title="Deals"
              count={propertyDeals.length}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              }
              onAdd={openDealSheet}
            >
              {propertyDeals.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {propertyDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/pipeline/${deal.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", textDecoration: "none" }}
                    >
                      {deal.stage && <span style={{ width: 6, height: 6, borderRadius: "50%", background: deal.stage.color, flexShrink: 0 }} />}
                      <span style={{ fontSize: 12.5, color: "var(--t1)", flex: 1 }}>
                        {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : "Ohne Kontakt"}
                      </span>
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
          </div>

        </div>
      )}

      {/* ── GALLERY OVERLAY ── */}
      {showGallery && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "dialogBackdropIn 200ms ease both",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowGallery(false); }}
          onDragOver={(e) => { e.preventDefault(); if (dragIdx === null && e.dataTransfer.types.includes("Files")) setDragOverGallery(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverGallery(false); }}
          onDrop={(e) => { e.preventDefault(); setDragOverGallery(false); if (dragIdx === null && e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        >
          {/* Drag overlay indicator — only for external file drops, not internal reorder */}
          {dragOverGallery && dragIdx === null && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 2001, pointerEvents: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(194,105,42,0.12)", border: "3px dashed var(--accent)",
              borderRadius: 20,
            }}>
              <div style={{ background: "var(--card)", borderRadius: 16, padding: "24px 40px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", textAlign: "center" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 8 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>Fotos hier ablegen</div>
              </div>
            </div>
          )}

          <div
            style={{
              width: "min(1380px, 94vw)", maxHeight: "94vh",
              background: "var(--card)", borderRadius: 20, overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gallery Header — Title + Actions + Close */}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)", flex: 1 }}>
                Fotos verwalten
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--t2)", marginLeft: 8 }}>{images.length} Foto{images.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Cover Button — always visible when images exist */}
              {images.length > 0 && (
                <button
                  onClick={() => { if (!images[galleryIdx]?.is_cover) setCover(images[galleryIdx]); }}
                  disabled={images[galleryIdx]?.is_cover}
                  style={{
                    height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: images[galleryIdx]?.is_cover ? "rgba(194,105,42,0.1)" : "var(--bg)",
                    cursor: images[galleryIdx]?.is_cover ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
                    color: images[galleryIdx]?.is_cover ? "var(--accent)" : "var(--t2)", fontFamily: "inherit",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={images[galleryIdx]?.is_cover ? "var(--accent)" : "none"} stroke={images[galleryIdx]?.is_cover ? "none" : "currentColor"} strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                  {images[galleryIdx]?.is_cover ? "Cover" : "Als Cover"}
                </button>
              )}

              {/* Delete Button */}
              {images.length > 0 && (
                <button
                  onClick={() => deleteImage(images[galleryIdx])}
                  style={{
                    height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(201,59,46,0.2)",
                    background: "rgba(201,59,46,0.06)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
                    color: "var(--red)", fontFamily: "inherit",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  Löschen
                </button>
              )}

              {/* Close */}
              <button
                onClick={() => setShowGallery(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Main Image */}
            {images.length > 0 ? (
              <div style={{ position: "relative", width: "100%", aspectRatio: "3/2", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                <img
                  src={imgUrl(images[galleryIdx]?.storage_path ?? "")}
                  alt={images[galleryIdx]?.file_name ?? ""}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />

                {/* Nav Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setGalleryIdx((i) => (i - 1 + images.length) % images.length)}
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button
                      onClick={() => setGalleryIdx((i) => (i + 1) % images.length)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </>
                )}

                {/* Counter */}
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
                  {galleryIdx + 1} / {images.length}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div
                style={{
                  height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                  background: "var(--bg)",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 14, color: "var(--t2)", fontWeight: 500 }}>Fotos hierher ziehen</span>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>oder</span>
                <button
                  onClick={() => galleryFileRef.current?.click()}
                  className="btn-primary"
                  style={{ height: 34, padding: "0 16px", fontSize: 13 }}
                >
                  Dateien auswählen
                </button>
              </div>
            )}

            {/* Thumbnail strip + Upload button */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, overflowX: "auto" }}>
              <div style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto", scrollbarWidth: "thin", paddingBottom: 2, alignItems: "center" }}>
                {images.map((img, i) => (
                  <div key={img.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {/* Insertion marker */}
                    <div style={{
                      width: dropTargetIdx === i && dragIdx !== null && dragIdx !== i ? 3 : 0,
                      height: 40, borderRadius: 2, background: "var(--accent)", flexShrink: 0,
                      margin: dropTargetIdx === i && dragIdx !== null && dragIdx !== i ? "0 3px" : 0,
                      transition: "width 0.12s, margin 0.12s",
                    }} />
                    <div
                      draggable
                      onDragStart={(e) => { setDragIdx(i); e.stopPropagation(); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTargetIdx(i); }}
                      onDragLeave={() => { if (dropTargetIdx === i) setDropTargetIdx(null); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null) { reorderImages(dragIdx, i); setDragIdx(null); setDropTargetIdx(null); } }}
                      onDragEnd={() => { setDragIdx(null); setDropTargetIdx(null); }}
                      onClick={() => setGalleryIdx(i)}
                      style={{
                        width: 64, height: 48, borderRadius: 8, overflow: "hidden", cursor: "grab", flexShrink: 0,
                        border: galleryIdx === i ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.08)",
                        opacity: dragIdx === i ? 0.35 : 1,
                        transform: dragIdx === i ? "scale(0.9)" : "scale(1)",
                        position: "relative",
                        transition: "border 0.1s, opacity 0.15s, transform 0.15s",
                        margin: "0 3px",
                      }}
                    >
                      <img src={thumbUrl(img)} alt={img.file_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                      {img.is_cover && (
                        <div style={{ position: "absolute", top: 2, left: 2, width: 12, height: 12, borderRadius: 2, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload + button */}
              <div
                onClick={() => galleryFileRef.current?.click()}
                style={{
                  width: 64, height: 48, borderRadius: 8, flexShrink: 0, cursor: "pointer",
                  border: "2px dashed rgba(0,0,0,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)",
                  transition: "all 0.15s",
                }}
              >
                {uploading ? (
                  <div style={{ width: 16, height: 16, border: "2px solid var(--t3)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                )}
              </div>
              <input ref={galleryFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) { uploadFiles(Array.from(e.target.files)); e.target.value = ""; } }} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Save */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.8; }
          60%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        transform: isDirty ? "translateY(0)" : "translateY(16px)",
        opacity: isDirty ? 1 : 0,
        pointerEvents: isDirty ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
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
          onClick={handleDiscard}
          disabled={saving}
          style={{ height: 32, padding: "0 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 7, fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          Verwerfen
        </button>
        <button
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
            <div>
              <label style={lbl}>Kontakt *</label>
              <SearchSelect
                value={dealForm.contact_id || null}
                onChange={(v) => setDealForm((f) => ({ ...f, contact_id: v || "" }))}
                onSearch={async (q) => {
                  const sb = createClient();
                  let query = sb.from("contacts").select("id, first_name, last_name").eq("is_archived", false).order("last_name").limit(20);
                  if (q.trim()) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
                  const { data } = await query;
                  return (data ?? []).map((c: { id: string; first_name: string; last_name: string }) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }));
                }}
                displayValue={dealContactDisplay}
                placeholder="Kontakt suchen…"
                style={{ height: 38 }}
              />
            </div>

            {/* Property (pre-filled, read-only) */}
            <div>
              <label style={lbl}>Objekt</label>
              <div style={{ ...inp, display: "flex", alignItems: "center", color: "var(--t1)", background: "var(--bg2)" }}>
                {property?.title ?? "—"}
              </div>
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
