"use client";

import { useState, useEffect, useMemo } from "react";
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
  PROPERTY_TYPE_COLORS,
  PROPERTY_TYPE_BG,
  PROPERTY_STATUS_COLORS,
  LISTING_TYPE_LABELS,
} from "@/lib/types";
import { formatAddressShort, propertyPrice, hasRooms } from "@/lib/property-helpers";

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

  async function fetchProperties() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*, owner:contacts!owner_contact_id(first_name, last_name)")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProperties((data ?? []) as PropertyRow[]);
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

  useEffect(() => { fetchProperties(); fetchOwners(); }, []);

  const filtered = useMemo(() => properties.filter((p) => {
    const q = search.toLowerCase();
    const addr = `${p.street ?? ""} ${p.house_number ?? ""} ${p.zip ?? ""} ${p.city ?? ""}`.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || addr.includes(q);
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchListing = listingFilter === "all" || p.listing_type === listingFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchType && matchListing && matchStatus;
  }), [properties, search, typeFilter, listingFilter, statusFilter]);

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
      <header className="header">
        <div className="hdr-greeting">
          <div className="hdr-title">Objekte</div>
          {!loading && (
            <div className="hdr-date">
              {properties.length === 0 ? "Noch keine Objekte" : `${properties.length} ${properties.length === 1 ? "Objekt" : "Objekte"}`}
              {filtered.length !== properties.length && ` · ${filtered.length} angezeigt`}
            </div>
          )}
        </div>
        <div className="hdr-right">
          {/* Suche */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--bg)", border: "1px solid rgba(0,0,0,0.11)",
            borderRadius: 10, padding: "0 11px", height: 36, width: 220,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Titel, Adresse…"
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
            onChange={(e) => setTypeFilter(e.target.value as PropertyType | "all")}
            style={{ height: 36, padding: "0 10px", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 10, fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <option value="all">Alle Typen</option>
            <option value="apartment">Wohnung</option>
            <option value="house">Haus</option>
            <option value="land">Grundstück</option>
            <option value="commercial">Gewerbe</option>
          </select>

          {/* Listing-Type-Filter */}
          <select
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value as SearchType | "all")}
            style={{ height: 36, padding: "0 10px", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 10, fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <option value="all">Kauf & Miete</option>
            <option value="buy">Kauf</option>
            <option value="rent">Miete</option>
          </select>

          {/* Status-Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | "all")}
            style={{ height: 36, padding: "0 10px", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 10, fontSize: 13, color: "var(--t1)", background: "var(--bg)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <option value="all">Alle Status</option>
            <option value="available">Verfügbar</option>
            <option value="reserved">Reserviert</option>
            <option value="sold">Verkauft</option>
            <option value="rented">Vermietet</option>
          </select>

          {/* Neues Objekt */}
          <button onClick={openSheet} className="hdr-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neues Objekt
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="body-wrap">
        {loading ? (
          <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 22px", borderBottom: i < 5 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
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
          <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  {["Objekt", "Typ", "Adresse", "Status", "Preis", "Eigentümer", "Erstellt"].map((h) => (
                    <th key={h} style={{ padding: "12px 22px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    className="h-row"
                    onClick={() => router.push(`/properties/${p.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                  >
                    <td style={{ padding: "14px 22px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: PROPERTY_TYPE_BG[p.type], display: "flex", alignItems: "center", justifyContent: "center", color: PROPERTY_TYPE_COLORS[p.type], flexShrink: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 500, color: "var(--t1)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                            {p.title}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--t3)" }}>
                            {LISTING_TYPE_LABELS[p.listing_type]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: PROPERTY_TYPE_BG[p.type], color: PROPERTY_TYPE_COLORS[p.type] }}>
                        {PROPERTY_TYPE_LABELS[p.type]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                      {formatAddressShort(p)}
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: PROPERTY_STATUS_COLORS[p.status].bg, color: PROPERTY_STATUS_COLORS[p.status].fg }}>
                        {PROPERTY_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t1)", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {propertyPrice(p)}
                    </td>
                    <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                      {p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : "—"}
                    </td>
                    <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t3)", whiteSpace: "nowrap" }}>
                      {fmtDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <select style={{ ...inp, cursor: "pointer" }} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PropertyType }))}>
                  <option value="apartment">Wohnung</option>
                  <option value="house">Haus</option>
                  <option value="land">Grundstück</option>
                  <option value="commercial">Gewerbe</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Vermarktung</label>
                <select style={{ ...inp, cursor: "pointer" }} value={form.listing_type} onChange={(e) => setForm((f) => ({ ...f, listing_type: e.target.value as SearchType }))}>
                  <option value="buy">Kauf</option>
                  <option value="rent">Miete</option>
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PropertyStatus }))}>
                <option value="available">Verfügbar</option>
                <option value="reserved">Reserviert</option>
                <option value="sold">Verkauft</option>
                <option value="rented">Vermietet</option>
              </select>
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
              <select
                style={{ ...inp, cursor: "pointer" }}
                value={form.owner_contact_id}
                onChange={(e) => setForm((f) => ({ ...f, owner_contact_id: e.target.value }))}
              >
                <option value="">— Kein Eigentümer —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                ))}
              </select>
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
