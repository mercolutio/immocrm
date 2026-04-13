"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Deal, PipelineStage, Contact, Property } from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import SearchSelect from "@/components/SearchSelect";

// ─── Styles ────────────────────────────────────────────────────────────────
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

// ─── Types ─────────────────────────────────────────────────────────────────
type DealRow = Deal & {
  contact: Pick<Contact, "id" | "first_name" | "last_name"> | null;
  property: Pick<Property, "id" | "title" | "price" | "rent"> | null;
};

interface NewDealForm {
  contact_id: string;
  property_id: string;
  stage_id: string;
  commission: string;
  probability: string;
  expected_close_date: string;
  notes: string;
}

const EMPTY: NewDealForm = {
  contact_id: "",
  property_id: "",
  stage_id: "",
  commission: "",
  probability: "",
  expected_close_date: "",
  notes: "",
};

function formatEUR(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "heute";
  if (days === 1) return "seit 1 Tag";
  return `seit ${days} Tagen`;
}

function parseNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const router = useRouter();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewDealForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  // Sheet search display values
  const [contactDisplay, setContactDisplay] = useState("");
  const [propertyDisplay, setPropertyDisplay] = useState("");

  async function fetchData() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [stagesRes, dealsRes] = await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase.from("deals").select("*, contact:contacts(id, first_name, last_name), property:properties(id, title, price, rent)").order("created_at", { ascending: false }),
    ]);
    if (stagesRes.error) { setError(stagesRes.error.message); setLoading(false); return; }
    if (dealsRes.error) { setError(dealsRes.error.message); setLoading(false); return; }
    setStages(stagesRes.data as PipelineStage[]);
    setDeals(dealsRes.data as DealRow[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => deals.filter((d) => {
    const q = search.toLowerCase();
    const name = d.contact ? `${d.contact.first_name} ${d.contact.last_name}`.toLowerCase() : "";
    const title = d.property?.title?.toLowerCase() ?? "";
    const matchSearch = !q || name.includes(q) || title.includes(q);
    const matchStage = stageFilter === "all" || d.stage_id === stageFilter;
    return matchSearch && matchStage;
  }), [deals, search, stageFilter]);

  function openSheet(stageId?: string) {
    setForm({ ...EMPTY, stage_id: stageId || stages[0]?.id || "" });
    setFormError(null);
    setContactDisplay("");
    setPropertyDisplay("");
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.contact_id) { setFormError("Kontakt ist ein Pflichtfeld."); return; }
    setSaving(true);
    setFormError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFormError("Nicht eingeloggt."); setSaving(false); return; }
    const { data, error } = await supabase.from("deals").insert({
      user_id: user.id,
      contact_id: form.contact_id,
      property_id: form.property_id || null,
      stage_id: form.stage_id || null,
      commission: parseNum(form.commission),
      probability: parseNum(form.probability),
      expected_close_date: form.expected_close_date || null,
      notes: form.notes.trim() || null,
    }).select("id").single();
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSheetOpen(false);
    setSaving(false);
    if (data?.id) router.push(`/pipeline/${data.id}`);
  }

  async function handleDrop(stageId: string) {
    if (!dragDealId) return;
    setDragOverStage(null);
    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === dragDealId ? { ...d, stage_id: stageId } : d));
    const supabase = createClient();
    await supabase.from("deals").update({ stage_id: stageId }).eq("id", dragDealId);
    setDragDealId(null);
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ─── Kanban helpers ────────────────────────────────────────────────────────
  function dealsByStage(stageId: string) {
    return filtered.filter((d) => d.stage_id === stageId);
  }

  function stageTotal(stageId: string) {
    return dealsByStage(stageId).reduce((sum, d) => {
      return sum + (d.commission ?? d.property?.price ?? d.property?.rent ?? 0);
    }, 0);
  }

  // ─── Pipeline Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCommission = deals.reduce((s, d) => s + (d.commission ?? 0), 0);
    const weightedValue = deals.reduce((s, d) => {
      return s + ((d.commission ?? 0) * (d.probability ?? 0) / 100);
    }, 0);
    const avgAge = deals.length > 0
      ? Math.round(deals.reduce((s, d) => s + (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24), 0) / deals.length)
      : 0;
    const staleCount = deals.filter((d) => {
      const daysSinceUpdate = (Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate >= 7;
    }).length;
    return { totalCommission, weightedValue, dealCount: deals.length, avgAge, staleCount };
  }, [deals]);

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="header">
        <div className="hdr-greeting">
          <div className="hdr-title">Pipeline</div>
          {!loading && (
            <div className="hdr-date">
              {deals.length === 0 ? "Noch keine Deals" : `${deals.length} ${deals.length === 1 ? "Deal" : "Deals"}`}
              {filtered.length !== deals.length && ` · ${filtered.length} angezeigt`}
            </div>
          )}
        </div>
        <div className="hdr-right">
          {/* Suche */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--bg)", border: "1px solid rgba(0,0,0,0.11)",
            borderRadius: 10, padding: "0 11px", height: 36, width: 210,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Kontakt, Objekt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--t1)", flex: 1, fontFamily: "inherit" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>

          {/* Stage-Filter (nur Liste) */}
          {view === "list" && (
            <AppSelect
              value={stageFilter}
              onChange={(v) => setStageFilter(v)}
              options={[{ value: "all", label: "Alle Stages" }, ...stages.map((s) => ({ value: s.id, label: s.name }))]}
              style={{ height: 36, borderRadius: 10, width: "auto", minWidth: 140 }}
            />
          )}

          {/* View-Toggle */}
          <div style={{ display: "flex", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setView("kanban")}
              style={{
                height: 36, width: 38, display: "flex", alignItems: "center", justifyContent: "center",
                background: view === "kanban" ? "var(--accent)" : "var(--bg)",
                border: "none", cursor: "pointer", color: view === "kanban" ? "#fff" : "var(--t3)",
                transition: "all 0.15s",
              }}
              title="Kanban"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                height: 36, width: 38, display: "flex", alignItems: "center", justifyContent: "center",
                background: view === "list" ? "var(--accent)" : "var(--bg)",
                border: "none", borderLeft: "1px solid rgba(0,0,0,0.11)", cursor: "pointer", color: view === "list" ? "#fff" : "var(--t3)",
                transition: "all 0.15s",
              }}
              title="Liste"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Settings-Link */}
          <Link
            href="/settings/pipeline"
            style={{
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.11)", background: "var(--bg)",
              color: "var(--t3)", cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
            }}
            title="Pipeline-Einstellungen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </Link>

          {/* Neuer Deal */}
          <button onClick={() => openSheet()} className="hdr-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neuer Deal
          </button>
        </div>
      </header>

      {/* STATS BAR */}
      {!loading && !error && deals.length > 0 && (
        <div style={{ padding: "0 30px", marginBottom: view === "kanban" ? 0 : 0 }}>
          <div style={{ display: "flex", gap: 1, background: "var(--card)", borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", boxShadow: "0 1px 4px rgba(28,24,20,0.03)" }}>
            {[
              { label: "Gesamt-Provision", value: formatEUR(stats.totalCommission), color: "var(--t1)" },
              { label: "Gewichteter Wert", value: formatEUR(stats.weightedValue), color: "var(--accent)" },
              { label: "Deals", value: String(stats.dealCount), color: "var(--t1)" },
              { label: "Ø Alter", value: `${stats.avgAge} Tage`, color: "var(--t1)" },
              { label: "Inaktiv 7+ Tage", value: String(stats.staleCount), color: stats.staleCount > 0 ? "var(--red, #EF4444)" : "var(--t1)" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "14px 18px", borderRight: i < 4 ? "1px solid rgba(0,0,0,0.05)" : undefined }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: s.color, fontFamily: "var(--font-playfair, 'Playfair Display'), serif" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="body-wrap" style={{ padding: view === "kanban" ? "0 0 26px 30px" : undefined }}>
        {loading ? (
          <div style={{ display: "flex", gap: 16, padding: view === "kanban" ? "26px 0" : undefined }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: 280, flexShrink: 0, background: "var(--card)", borderRadius: 16, border: "1px solid rgba(0,0,0,0.05)", height: 300, animation: `pulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ background: "rgba(201,59,46,0.08)", border: "1px solid rgba(201,59,46,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--red)" }}>
            Fehler beim Laden: {error}
          </div>
        ) : view === "kanban" ? (
          /* ── KANBAN ── */
          <div style={{
            display: "flex", gap: 14, overflowX: "auto", paddingTop: 26, paddingBottom: 8, paddingRight: 30,
            height: "calc(100vh - 130px)", scrollbarWidth: "thin",
          }}>
            {stages.map((stage) => {
              const stageDeals = dealsByStage(stage.id);
              const total = stageTotal(stage.id);
              const isDragOver = dragOverStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => handleDrop(stage.id)}
                  style={{
                    width: 280, minWidth: 280, flexShrink: 0,
                    background: isDragOver ? "rgba(194,105,42,0.04)" : "var(--bg)",
                    borderRadius: 16,
                    border: isDragOver ? "1px dashed var(--accent)" : "1px solid rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Color bar */}
                  <div style={{ height: 4, borderRadius: "16px 16px 0 0", background: stage.color }} />

                  {/* Header */}
                  <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", flex: 1 }}>{stage.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, background: `${stage.color}18`, padding: "1px 7px", borderRadius: 8 }}>
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "0 10px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "thin" }}>
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragDealId(deal.id)}
                        onDragEnd={() => { setDragDealId(null); setDragOverStage(null); }}
                        onClick={() => router.push(`/pipeline/${deal.id}`)}
                        className="h-lift"
                        style={{
                          background: "var(--card)",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.06)",
                          padding: "12px 14px",
                          cursor: "grab",
                          display: "flex", flexDirection: "column", gap: 8,
                          boxShadow: "0 1px 4px rgba(28,24,20,0.04)",
                          opacity: dragDealId === deal.id ? 0.5 : 1,
                        }}
                      >
                        {/* Contact */}
                        {deal.contact && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: "linear-gradient(135deg, #C2692A, #E8955A)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0,
                            }}>
                              {deal.contact.first_name[0]?.toUpperCase()}{deal.contact.last_name[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {deal.contact.first_name} {deal.contact.last_name}
                            </span>
                          </div>
                        )}

                        {/* Property */}
                        {deal.property && (
                          <div style={{ fontSize: 12, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {deal.property.title}
                          </div>
                        )}

                        {/* Bottom row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t3)" }}>
                          {(deal.commission || deal.property?.price || deal.property?.rent) && (
                            <span style={{ fontWeight: 600, color: "var(--t2)" }}>
                              {formatEUR(deal.commission ?? deal.property?.price ?? deal.property?.rent ?? null)}
                            </span>
                          )}
                          <span style={{ flex: 1 }} />
                          <span>{daysSince(deal.updated_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer: Total + Button */}
                  {total > 0 && (
                    <div style={{ padding: "10px 16px 0", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Provision</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", fontFamily: "var(--font-playfair, 'Playfair Display'), serif" }}>{formatEUR(total)}</span>
                    </div>
                  )}
                  <div style={{ padding: "10px 10px 12px" }}>
                    <button
                      onClick={() => openSheet(stage.id)}
                      style={{
                        width: "100%", height: 34, border: "1px dashed rgba(0,0,0,0.12)",
                        borderRadius: 8, background: "transparent", cursor: "pointer",
                        fontSize: 12, color: "var(--t3)", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "var(--t3)"; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Deal hinzufügen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LISTENANSICHT ── */
          filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>
                {search || stageFilter !== "all" ? "Keine Deals gefunden" : "Noch keine Deals"}
              </div>
              <div style={{ fontSize: 13, color: "var(--t3)" }}>
                {search || stageFilter !== "all" ? "Filter anpassen" : "Legen Sie Ihren ersten Deal an"}
              </div>
              {!search && stageFilter === "all" && (
                <button onClick={() => openSheet()} className="hdr-add-btn" style={{ marginTop: 8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Ersten Deal anlegen
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    {["Kontakt", "Objekt", "Stage", "Provision", "Wahrscheinlichkeit", "Abschluss", "Erstellt"].map((h) => (
                      <th key={h} style={{ padding: "12px 22px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const stage = stages.find((s) => s.id === d.stage_id);
                    return (
                      <tr
                        key={d.id}
                        className="h-row"
                        onClick={() => router.push(`/pipeline/${d.id}`)}
                        style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                      >
                        <td style={{ padding: "14px 22px" }}>
                          {d.contact ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: "linear-gradient(135deg, #C2692A, #E8955A)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0,
                              }}>
                                {d.contact.first_name[0]?.toUpperCase()}{d.contact.last_name[0]?.toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 500, color: "var(--t1)", fontSize: 14 }}>
                                {d.contact.first_name} {d.contact.last_name}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: "var(--t3)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                          {d.property?.title ?? "—"}
                        </td>
                        <td style={{ padding: "14px 22px" }}>
                          {stage ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${stage.color}18`, color: stage.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                              {stage.name}
                            </span>
                          ) : (
                            <span style={{ color: "var(--t3)", fontSize: 12 }}>Ohne Stage</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t1)", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {d.commission ? formatEUR(d.commission) : "—"}
                        </td>
                        <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                          {d.probability != null ? `${d.probability} %` : "—"}
                        </td>
                        <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)", whiteSpace: "nowrap" }}>
                          {d.expected_close_date ? fmtDate(d.expected_close_date) : "—"}
                        </td>
                        <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t3)", whiteSpace: "nowrap" }}>
                          {fmtDate(d.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* SHEET: Neuer Deal */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          style={{ background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", padding: 0, width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column" }}
        >
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
                value={form.contact_id || null}
                onChange={(v) => { setForm((f) => ({ ...f, contact_id: v || "" })); }}
                onSearch={async (q) => {
                  const supabase = createClient();
                  let query = supabase.from("contacts").select("id, first_name, last_name").eq("is_archived", false).order("last_name").limit(20);
                  if (q.trim()) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
                  const { data } = await query;
                  return (data ?? []).map((c: { id: string; first_name: string; last_name: string }) => ({
                    value: c.id, label: `${c.first_name} ${c.last_name}`,
                  }));
                }}
                displayValue={contactDisplay}
                placeholder="Kontakt suchen…"
                style={{ height: 38 }}
              />
            </div>

            <div>
              <label style={lbl}>Objekt</label>
              <SearchSelect
                value={form.property_id || null}
                onChange={(v) => { setForm((f) => ({ ...f, property_id: v || "" })); }}
                onSearch={async (q) => {
                  const supabase = createClient();
                  let query = supabase.from("properties").select("id, title").eq("is_archived", false).order("title").limit(20);
                  if (q.trim()) query = query.ilike("title", `%${q}%`);
                  const { data } = await query;
                  return (data ?? []).map((p: { id: string; title: string }) => ({
                    value: p.id, label: p.title,
                  }));
                }}
                displayValue={propertyDisplay}
                placeholder="Objekt suchen…"
                style={{ height: 38 }}
              />
            </div>

            <div>
              <label style={lbl}>Stage</label>
              <AppSelect
                value={form.stage_id}
                onChange={(v) => setForm((f) => ({ ...f, stage_id: v }))}
                options={stages.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Stage wählen…"
                style={{ height: 38 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Provision (€)</label>
                <input style={inp} type="text" inputMode="decimal" value={form.commission} onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))} placeholder="z.B. 15000" />
              </div>
              <div>
                <label style={lbl}>Wahrscheinlichkeit (%)</label>
                <input style={inp} type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} placeholder="0-100" />
              </div>
            </div>

            <div>
              <label style={lbl}>Erwarteter Abschluss</label>
              <input style={inp} type="date" value={form.expected_close_date} onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))} />
            </div>

            <div>
              <label style={lbl}>Notizen</label>
              <textarea
                style={{ ...inp, height: 80, padding: "8px 11px", resize: "none" }}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Anmerkungen zum Deal…"
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
                {saving ? "Speichern…" : "Deal speichern"}
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
