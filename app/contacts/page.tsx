"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  labelsToOptions,
} from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import { useSelection } from "@/hooks/useSelection";
import { usePagination } from "@/hooks/usePagination";
import BulkActionBar from "@/components/BulkActionBar";
import SelectionCheckbox from "@/components/SelectionCheckbox";
import ConfirmDialog from "@/components/ConfirmDialog";
import { exportToCsv } from "@/lib/csv-export";
import { inp, lbl } from "@/lib/ui-tokens";

const actionBtn: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--t1)",
  background: "var(--bg)",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 7,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
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
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewContactForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { page, setPage, pageSize, setPageSize } = usePagination("contacts");
  const { selectedIds, toggle, toggleAll, clear, setAll, isAllSelected, isSomeSelected, selectedCount } = useSelection(contacts);

  const [bulkActionOpen, setBulkActionOpen] = useState<null | "type" | "archive">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Build the filter-predicate for a Supabase query (used by list + "select all")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any): any {
    let query = q.eq("is_archived", showArchived);
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (search.trim()) {
      const s = search.trim().replace(/[,()]/g, " ");
      query = query.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`
      );
    }
    return query;
  }

  async function fetchContacts() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase.from("contacts").select("*", { count: "exact" });
    query = applyFilters(query);
    query = query.order("created_at", { ascending: false }).range(from, to);
    const { data, error, count } = await query;
    if (error) setError(error.message);
    else {
      setContacts(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => { fetchContacts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showArchived, typeFilter, search, page, pageSize]);

  // Reset page to 1 when filters change (search handled via debouncing would be nicer, but ok)
  useEffect(() => { setPage(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showArchived, typeFilter, search]);

  async function handleSelectAllAcrossPages() {
    const supabase = createClient();
    let query = supabase.from("contacts").select("id");
    query = applyFilters(query);
    const { data } = await query;
    if (data) setAll((data as { id: string }[]).map((d) => d.id));
  }

  async function handleBulkTypeChange(newType: ContactType) {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ type: newType }).in("id", Array.from(selectedIds));
    setBulkActionOpen(null);
    clear();
    await fetchContacts();
    setBulkBusy(false);
  }

  async function handleBulkArchiveToggle() {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ is_archived: !showArchived }).in("id", Array.from(selectedIds));
    clear();
    await fetchContacts();
    setBulkBusy(false);
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("contacts").delete().in("id", Array.from(selectedIds));
    setConfirmDelete(false);
    clear();
    await fetchContacts();
    setBulkBusy(false);
  }

  async function handleBulkExport() {
    // Fetch ALL selected (could be across pages)
    const supabase = createClient();
    const { data } = await supabase.from("contacts").select("*").in("id", Array.from(selectedIds));
    if (!data || data.length === 0) return;
    const rows = (data as Contact[]).map((c) => ({
      Vorname: c.first_name,
      Nachname: c.last_name,
      "E-Mail": c.email ?? "",
      Telefon: c.phone ?? "",
      Typ: CONTACT_TYPE_LABELS[c.type] ?? c.type,
      Quelle: CONTACT_SOURCE_LABELS[c.source] ?? c.source,
      Notizen: c.notes ?? "",
      Erstellt: new Date(c.created_at).toLocaleDateString("de-DE"),
    }));
    exportToCsv(`kontakte-${new Date().toISOString().slice(0, 10)}`, rows);
  }

  const filtered = contacts; // filtering now done server-side

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFormError("Nicht eingeloggt."); setSaving(false); return; }
    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Kontakte</h1>
          {!loading && (
            <div className="page-subtitle">
              {totalCount === 0 ? "Noch keine Kontakte" : `${totalCount} ${totalCount === 1 ? "Kontakt" : "Kontakte"}`}
            </div>
          )}
        </div>
        <div className="page-header-right">
          <button onClick={openSheet} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neuer Kontakt
          </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="page-toolbar">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Name, E-Mail, Telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} aria-label="Suche zurücksetzen">×</button>
          )}
        </div>

        <AppSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ContactType | "all")}
          options={[{ value: "all", label: "Alle Typen" }, ...labelsToOptions(CONTACT_TYPE_LABELS)]}
          style={{ height: 37, borderRadius: 8, width: "auto", minWidth: 140 }}
        />

        <button
          onClick={() => setShowArchived((v) => !v)}
          className={showArchived ? "btn-icon active" : "btn-icon"}
          style={{ width: "auto", padding: "0 12px", gap: 6, fontSize: 13, color: showArchived ? "var(--accent)" : "var(--t3)" }}
          title="Archiv anzeigen"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          Archiv
        </button>
      </div>

      {/* BODY */}
      <div className="body-wrap anim-0" style={{ paddingTop: 16 }}>
        {/* BulkActionBar schiebt die Liste runter */}
        <BulkActionBar
          count={selectedCount}
          totalCount={totalCount}
          onSelectAll={handleSelectAllAcrossPages}
          onClear={clear}
        >
          {/* Typ ändern */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setBulkActionOpen((v) => (v === "type" ? null : "type"))}
              style={actionBtn}
              disabled={bulkBusy}
            >
              Typ ändern
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {bulkActionOpen === "type" && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                  minWidth: 160,
                  zIndex: 50,
                  padding: 4,
                }}
              >
                {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleBulkTypeChange(t)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      fontSize: 13,
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "var(--t1)",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {CONTACT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Archivieren / Wiederherstellen */}
          <button onClick={handleBulkArchiveToggle} style={actionBtn} disabled={bulkBusy}>
            {showArchived ? "Wiederherstellen" : "Archivieren"}
          </button>

          {/* Löschen (nur im Archiv) */}
          {showArchived && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ ...actionBtn, color: "var(--red, #C93B2E)", borderColor: "rgba(201,59,46,0.25)" }}
              disabled={bulkBusy}
            >
              Löschen
            </button>
          )}

          {/* Export */}
          <button onClick={handleBulkExport} style={actionBtn} disabled={bulkBusy}>
            Exportieren
          </button>
        </BulkActionBar>

        {loading ? (
          /* Skeleton */
          <div className="list-table-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "16px 22px", borderBottom: i < 5 ? "1px solid var(--border-subtle)" : "none" }}>
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
          <div className="view-fade" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <div className="content-reveal">
            <div className="list-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "12px 14px 12px 22px", width: 36, textAlign: "left" }}>
                      <SelectionCheckbox
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={toggleAll}
                        ariaLabel="Alle auswählen"
                      />
                    </th>
                    {[...["Name", "Typ", "E-Mail", "Telefon", "Quelle", "Erstellt"]].map((h) => (
                      <th key={h} style={{ padding: "12px 22px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const isSelected = selectedIds.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className="h-row"
                        onClick={() => router.push(`/contacts/${c.id}`)}
                        style={{
                          borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          opacity: c.is_archived ? 0.6 : 1,
                          background: isSelected ? "rgba(194,105,42,0.04)" : undefined,
                        }}
                      >
                        <td style={{ padding: "16px 14px 16px 22px", width: 36 }} onClick={(e) => e.stopPropagation()}>
                          <SelectionCheckbox
                            checked={isSelected}
                            onChange={() => toggle(c.id)}
                            ariaLabel={`${c.first_name} ${c.last_name} auswählen`}
                          />
                        </td>
                        <td style={{ padding: "16px 22px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--accent)", flexShrink: 0, letterSpacing: "0.02em" }}>
                              {c.first_name[0]?.toUpperCase()}{c.last_name[0]?.toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="cell-primary">{c.first_name} {c.last_name}</span>
                                {c.is_archived && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "var(--badge-gray-bg)", color: "var(--badge-gray)" }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--badge-gray)" }}/>Archiviert
                                  </span>
                                )}
                              </div>
                              {c.email && <div className="cell-meta">{c.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 22px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "var(--badge-accent-bg)", color: "var(--badge-accent)" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--badge-accent)" }}/>
                            {CONTACT_TYPE_LABELS[c.type]}
                          </span>
                        </td>
                        <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t2)" }}>{c.email ?? "—"}</td>
                        <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t2)" }}>{c.phone ?? "—"}</td>
                        <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t2)" }}>
                          {CONTACT_SOURCE_LABELS[c.source] ?? c.source}
                        </td>
                        <td style={{ padding: "16px 22px", fontSize: 12, color: "var(--t3)", whiteSpace: "nowrap" }}>
                          {fmtDate(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="table-footer">
                <div className="table-footer-info">
                  <span>Pro Seite:</span>
                  <AppSelect
                    value={String(pageSize)}
                    onChange={(v) => setPageSize(Number(v))}
                    options={[{ value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }]}
                    style={{ height: 28, borderRadius: 6, width: 66, fontSize: 12 }}
                  />
                  <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} von {totalCount}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="page-btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>← Zurück</button>
                  <span style={{ fontSize: 12, color: "var(--t2)", padding: "0 8px" }}>Seite {page} von {totalPages}</span>
                  <button className="page-btn" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Weiter →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete}
        title="Kontakte endgültig löschen?"
        message={`${selectedCount} Kontakt${selectedCount === 1 ? "" : "e"} werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Endgültig löschen"
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* SHEET: Neuer Kontakt */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          style={{ background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", padding: 0, width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "26px 30px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <SheetHeader>
              <SheetTitle style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 22, fontWeight: 400, color: "var(--t1)" }}>
                Neuer Kontakt
              </SheetTitle>
            </SheetHeader>
          </div>

          <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
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
              <AppSelect
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v as ContactType }))}
                options={labelsToOptions(CONTACT_TYPE_LABELS)}
                style={{ height: 38 }}
              />
            </div>
            <div>
              <label style={lbl}>Quelle</label>
              <AppSelect
                value={form.source}
                onChange={(v) => setForm((f) => ({ ...f, source: v as ContactSource }))}
                options={labelsToOptions(CONTACT_SOURCE_LABELS)}
                style={{ height: 38 }}
              />
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
