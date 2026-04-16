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
import type { Property, PropertyType, PropertyStatus, SearchType, Contact } from "@/lib/types";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_COLORS,
  LISTING_TYPE_LABELS,
  labelsToOptions,
} from "@/lib/types";
import AppSelect from "@/components/AppSelect";
import { formatAddressShort, propertyPrice, hasRooms } from "@/lib/property-helpers";
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

// ─── Row aus Query mit geladenem Eigentümer ────────────────────────────────
type PropertyRow = Property & {
  owner: Pick<Contact, "first_name" | "last_name"> | null;
};

// ─── Form type ──────────────────────────────────────────────────────────────
interface NewPropertyForm {
  title: string;
  type: PropertyType;
  listing_type: SearchType;
  status: PropertyStatus;
  description: string;
  street: string;
  house_number: string;
  zip: string;
  city: string;
  price: string;
  rent: string;
  area_sqm: string;
  rooms: string;
  owner_contact_id: string;
}

const EMPTY: NewPropertyForm = {
  title: "",
  type: "apartment",
  listing_type: "buy",
  status: "available",
  description: "",
  street: "",
  house_number: "",
  zip: "",
  city: "",
  price: "",
  rent: "",
  area_sqm: "",
  rooms: "",
  owner_contact_id: "",
};

function parseNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [owners, setOwners] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PropertyType | "all">("all");
  const [listingFilter, setListingFilter] = useState<SearchType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewPropertyForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { page, setPage, pageSize, setPageSize } = usePagination("properties");
  const { selectedIds, toggle, toggleAll, clear, setAll, isAllSelected, isSomeSelected, selectedCount } = useSelection(properties);

  const [bulkDropdown, setBulkDropdown] = useState<null | "status" | "owner">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [ownerSearchText, setOwnerSearchText] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any): any {
    let query = q.eq("is_archived", showArchived);
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (listingFilter !== "all") query = query.eq("listing_type", listingFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search.trim()) {
      const s = search.trim().replace(/[,()]/g, " ");
      query = query.or(`title.ilike.%${s}%,street.ilike.%${s}%,city.ilike.%${s}%,zip.ilike.%${s}%`);
    }
    return query;
  }

  async function fetchProperties() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("properties")
      .select("*, owner:contacts!owner_contact_id(first_name, last_name)", { count: "exact" });
    query = applyFilters(query);
    query = query.order("created_at", { ascending: false }).range(from, to);
    const { data, error, count } = await query;
    if (error) setError(error.message);
    else {
      setProperties((data ?? []) as PropertyRow[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }

  async function fetchOwners() {
    const supabase = createClient();
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .in("type", ["seller", "landlord", "both"])
      .eq("is_archived", false)
      .order("last_name");
    setOwners((data ?? []) as Contact[]);
  }

  useEffect(() => { fetchOwners(); }, []);
  useEffect(() => { fetchProperties(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showArchived, typeFilter, listingFilter, statusFilter, search, page, pageSize]);
  useEffect(() => { setPage(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showArchived, typeFilter, listingFilter, statusFilter, search]);

  async function handleSelectAllAcrossPages() {
    const supabase = createClient();
    let query = supabase.from("properties").select("id");
    query = applyFilters(query);
    const { data } = await query;
    if (data) setAll((data as { id: string }[]).map((d) => d.id));
  }

  async function handleBulkStatusChange(newStatus: PropertyStatus) {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("properties").update({ status: newStatus }).in("id", Array.from(selectedIds));
    setBulkDropdown(null);
    clear();
    await fetchProperties();
    setBulkBusy(false);
  }

  async function handleBulkOwnerAssign(ownerId: string | null) {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("properties").update({ owner_contact_id: ownerId }).in("id", Array.from(selectedIds));
    setBulkDropdown(null);
    setOwnerSearchText("");
    clear();
    await fetchProperties();
    setBulkBusy(false);
  }

  async function handleBulkArchiveToggle() {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("properties").update({ is_archived: !showArchived }).in("id", Array.from(selectedIds));
    clear();
    await fetchProperties();
    setBulkBusy(false);
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    const supabase = createClient();
    await supabase.from("properties").delete().in("id", Array.from(selectedIds));
    setConfirmDelete(false);
    clear();
    await fetchProperties();
    setBulkBusy(false);
  }

  async function handleBulkExport() {
    const supabase = createClient();
    const { data } = await supabase
      .from("properties")
      .select("*, owner:contacts!owner_contact_id(first_name, last_name)")
      .in("id", Array.from(selectedIds));
    if (!data || data.length === 0) return;
    const rows = (data as PropertyRow[]).map((p) => ({
      Titel: p.title,
      Typ: PROPERTY_TYPE_LABELS[p.type] ?? p.type,
      Vermarktung: LISTING_TYPE_LABELS[p.listing_type] ?? p.listing_type,
      Status: PROPERTY_STATUS_LABELS[p.status] ?? p.status,
      Straße: p.street ?? "",
      Hausnummer: p.house_number ?? "",
      PLZ: p.zip ?? "",
      Ort: p.city ?? "",
      Preis: p.price ?? "",
      Miete: p.rent ?? "",
      "Fläche m²": p.area_sqm ?? "",
      Zimmer: p.rooms ?? "",
      Eigentümer: p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : "",
      Erstellt: new Date(p.created_at).toLocaleDateString("de-DE"),
    }));
    exportToCsv(`objekte-${new Date().toISOString().slice(0, 10)}`, rows);
  }

  const filtered = properties;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const ownerSearchLower = ownerSearchText.toLowerCase();
  const filteredOwners = owners.filter((o) =>
    !ownerSearchLower || `${o.first_name} ${o.last_name}`.toLowerCase().includes(ownerSearchLower)
  );

  function openSheet() {
    setForm(EMPTY);
    setFormError(null);
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setFormError("Titel ist ein Pflichtfeld.");
      return;
    }
    const priceVal = parseNum(form.price);
    const rentVal = parseNum(form.rent);
    if (form.listing_type === "buy" && priceVal == null) {
      setFormError("Bitte Kaufpreis angeben.");
      return;
    }
    if (form.listing_type === "rent" && rentVal == null) {
      setFormError("Bitte Miete angeben.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFormError("Nicht eingeloggt."); setSaving(false); return; }
    const { data, error } = await supabase.from("properties").insert({
      user_id: user.id,
      title: form.title.trim(),
      type: form.type,
      listing_type: form.listing_type,
      status: form.status,
      description: form.description.trim() || null,
      street: form.street.trim() || null,
      house_number: form.house_number.trim() || null,
      zip: form.zip.trim() || null,
      city: form.city.trim() || null,
      price: form.listing_type === "buy" ? priceVal : null,
      rent: form.listing_type === "rent" ? rentVal : null,
      area_sqm: parseNum(form.area_sqm),
      rooms: hasRooms(form.type) ? parseNum(form.rooms) : null,
      owner_contact_id: form.owner_contact_id || null,
    }).select("id").single();
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    setSheetOpen(false);
    setSaving(false);
    if (data?.id) router.push(`/properties/${data.id}`);
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Objekte</h1>
          {!loading && (
            <div className="page-subtitle">
              {totalCount === 0 ? "Noch keine Objekte" : `${totalCount} ${totalCount === 1 ? "Objekt" : "Objekte"}`}
            </div>
          )}
        </div>
        <div className="page-header-right">
          <button onClick={openSheet} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neues Objekt
          </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="page-toolbar" style={{ flexWrap: "wrap" }}>
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Titel, Adresse…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} aria-label="Suche zurücksetzen">×</button>
          )}
        </div>

        <AppSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as PropertyType | "all")}
          options={[{ value: "all", label: "Alle Typen" }, ...labelsToOptions(PROPERTY_TYPE_LABELS)]}
          style={{ height: 37, borderRadius: 8, width: "auto", minWidth: 140 }}
        />

        <AppSelect
          value={listingFilter}
          onChange={(v) => setListingFilter(v as SearchType | "all")}
          options={[{ value: "all", label: "Kauf & Miete" }, ...labelsToOptions(LISTING_TYPE_LABELS)]}
          style={{ height: 37, borderRadius: 8, width: "auto", minWidth: 140 }}
        />

        <AppSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as PropertyStatus | "all")}
          options={[{ value: "all", label: "Alle Status" }, ...labelsToOptions(PROPERTY_STATUS_LABELS)]}
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
        <BulkActionBar
          count={selectedCount}
          totalCount={totalCount}
          onSelectAll={handleSelectAllAcrossPages}
          onClear={clear}
        >
          {/* Status ändern */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setBulkDropdown((v) => (v === "status" ? null : "status"))}
              style={actionBtn}
              disabled={bulkBusy}
            >
              Status ändern
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {bulkDropdown === "status" && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 160, zIndex: 50, padding: 4 }}>
                {(Object.keys(PROPERTY_STATUS_LABELS) as PropertyStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkStatusChange(s)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 13, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "var(--t1)", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {PROPERTY_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Eigentümer zuweisen */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setBulkDropdown((v) => (v === "owner" ? null : "owner"))}
              style={actionBtn}
              disabled={bulkBusy}
            >
              Eigentümer zuweisen
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {bulkDropdown === "owner" && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 240, maxHeight: 280, zIndex: 50, padding: 6, display: "flex", flexDirection: "column" }}>
                <input
                  placeholder="Eigentümer suchen…"
                  value={ownerSearchText}
                  onChange={(e) => setOwnerSearchText(e.target.value)}
                  style={{ ...inp, height: 32, fontSize: 12, marginBottom: 4 }}
                />
                <div style={{ overflowY: "auto", flex: 1 }}>
                  <button
                    onClick={() => handleBulkOwnerAssign(null)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 13, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "var(--t3)", fontStyle: "italic", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    — Kein Eigentümer —
                  </button>
                  {filteredOwners.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleBulkOwnerAssign(o.id)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 13, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "var(--t1)", fontFamily: "inherit" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {o.first_name} {o.last_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleBulkArchiveToggle} style={actionBtn} disabled={bulkBusy}>
            {showArchived ? "Wiederherstellen" : "Archivieren"}
          </button>

          {showArchived && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ ...actionBtn, color: "var(--red, #C93B2E)", borderColor: "rgba(201,59,46,0.25)" }}
              disabled={bulkBusy}
            >
              Löschen
            </button>
          )}

          <button onClick={handleBulkExport} style={actionBtn} disabled={bulkBusy}>
            Exportieren
          </button>
        </BulkActionBar>

        {loading ? (
          <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "16px 22px", borderBottom: i < 5 ? "1px solid var(--border-subtle)" : "none" }}>
                {[180, 90, 150, 100, 90, 75].map((w, j) => (
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>
              {search || typeFilter !== "all" || listingFilter !== "all" || statusFilter !== "all" ? "Keine Objekte gefunden" : "Noch keine Objekte"}
            </div>
            <div style={{ fontSize: 13, color: "var(--t3)" }}>
              {search || typeFilter !== "all" || listingFilter !== "all" || statusFilter !== "all" ? "Filter anpassen" : "Legen Sie Ihr erstes Objekt an"}
            </div>
            {!search && typeFilter === "all" && listingFilter === "all" && statusFilter === "all" && (
              <button onClick={openSheet} className="hdr-add-btn" style={{ marginTop: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Erstes Objekt anlegen
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="list-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 14px 12px 22px", width: 36, textAlign: "left" }}>
                    <SelectionCheckbox checked={isAllSelected} indeterminate={isSomeSelected} onChange={toggleAll} ariaLabel="Alle auswählen" />
                  </th>
                  {["Objekt", "Typ", "Adresse", "Status", "Preis", "Eigentümer", "Erstellt"].map((h) => (
                    <th key={h} style={{ padding: "12px 22px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                  <tr
                    key={p.id}
                    className="h-row"
                    onClick={() => router.push(`/properties/${p.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none", opacity: p.is_archived ? 0.6 : 1, background: isSelected ? "rgba(194,105,42,0.04)" : undefined }}
                  >
                    <td style={{ padding: "16px 14px 16px 22px", width: 36 }} onClick={(e) => e.stopPropagation()}>
                      <SelectionCheckbox checked={isSelected} onChange={() => toggle(p.id)} ariaLabel={`${p.title} auswählen`} />
                    </td>
                    <td style={{ padding: "16px 22px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="cell-primary" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                              {p.title}
                            </span>
                            {p.is_archived && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "var(--badge-gray-bg)", color: "var(--badge-gray)" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--badge-gray)" }}/>Archiviert
                              </span>
                            )}
                          </div>
                          <div className="cell-meta">{LISTING_TYPE_LABELS[p.listing_type]}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 22px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "var(--badge-accent-bg)", color: "var(--badge-accent)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--badge-accent)" }}/>
                        {PROPERTY_TYPE_LABELS[p.type]}
                      </span>
                    </td>
                    <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t2)" }}>
                      {formatAddressShort(p)}
                    </td>
                    <td style={{ padding: "16px 22px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: PROPERTY_STATUS_COLORS[p.status].bg, color: PROPERTY_STATUS_COLORS[p.status].fg }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PROPERTY_STATUS_COLORS[p.status].fg }}/>
                        {PROPERTY_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t1)", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {propertyPrice(p)}
                    </td>
                    <td style={{ padding: "16px 22px", fontSize: 13, color: "var(--t2)" }}>
                      {p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : "—"}
                    </td>
                    <td style={{ padding: "16px 22px", fontSize: 12, color: "var(--t3)", whiteSpace: "nowrap" }}>
                      {fmtDate(p.created_at)}
                    </td>
                  </tr>
                );})}
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
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Objekte endgültig löschen?"
        message={`${selectedCount} Objekt${selectedCount === 1 ? "" : "e"} werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Endgültig löschen"
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* SHEET: Neues Objekt */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          style={{ background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", padding: 0, width: 460, maxWidth: "95vw", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "26px 30px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <SheetHeader>
              <SheetTitle style={{ fontFamily: "var(--font-playfair, 'Playfair Display'), serif", fontSize: 22, fontWeight: 400, color: "var(--t1)" }}>
                Neues Objekt
              </SheetTitle>
            </SheetHeader>
          </div>

          <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
            <div>
              <label style={lbl}>Titel *</label>
              <input style={inp} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="3-Zimmer-Wohnung Altbau" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Typ</label>
                <AppSelect
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v as PropertyType }))}
                  options={labelsToOptions(PROPERTY_TYPE_LABELS)}
                  style={{ height: 38 }}
                />
              </div>
              <div>
                <label style={lbl}>Vermarktung</label>
                <AppSelect
                  value={form.listing_type}
                  onChange={(v) => setForm((f) => ({ ...f, listing_type: v as SearchType }))}
                  options={labelsToOptions(LISTING_TYPE_LABELS)}
                  style={{ height: 38 }}
                />
              </div>
            </div>

            <div>
              <label style={lbl}>Status</label>
              <AppSelect
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as PropertyStatus }))}
                options={labelsToOptions(PROPERTY_STATUS_LABELS)}
                style={{ height: 38 }}
              />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
              Adresse
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Straße</label>
                <input style={inp} value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Musterstraße" />
              </div>
              <div>
                <label style={lbl}>Nr.</label>
                <input style={inp} value={form.house_number} onChange={(e) => setForm((f) => ({ ...f, house_number: e.target.value }))} placeholder="12a" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div>
                <label style={lbl}>PLZ</label>
                <input style={inp} value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} placeholder="10115" />
              </div>
              <div>
                <label style={lbl}>Ort</label>
                <input style={inp} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Berlin" />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
              Eckdaten
            </div>
            <div style={{ display: "grid", gridTemplateColumns: hasRooms(form.type) ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
              {form.listing_type === "buy" ? (
                <div>
                  <label style={lbl}>Kaufpreis (€) *</label>
                  <input style={inp} type="text" inputMode="decimal" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="450000" />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Miete (€/Monat) *</label>
                  <input style={inp} type="text" inputMode="decimal" value={form.rent} onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))} placeholder="1200" />
                </div>
              )}
              <div>
                <label style={lbl}>Fläche (m²)</label>
                <input style={inp} type="text" inputMode="decimal" value={form.area_sqm} onChange={(e) => setForm((f) => ({ ...f, area_sqm: e.target.value }))} placeholder="85" />
              </div>
              {hasRooms(form.type) && (
                <div>
                  <label style={lbl}>Zimmer</label>
                  <input style={inp} type="text" inputMode="decimal" value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: e.target.value }))} placeholder="3" />
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Eigentümer</label>
              <AppSelect
                value={form.owner_contact_id}
                onChange={(v) => setForm((f) => ({ ...f, owner_contact_id: v }))}
                options={[
                  { value: "", label: "— Kein Eigentümer —" },
                  ...owners.map((o) => ({ value: o.id, label: `${o.first_name} ${o.last_name}` })),
                ]}
                placeholder="Eigentümer wählen…"
                style={{ height: 38 }}
              />
            </div>

            <div>
              <label style={lbl}>Beschreibung</label>
              <textarea
                style={{ ...inp, height: 88, padding: "8px 11px", resize: "none" }}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Kurze Beschreibung des Objekts…"
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
                {saving ? "Speichern…" : "Objekt speichern"}
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
