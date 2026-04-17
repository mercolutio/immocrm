"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppSelect from "@/components/AppSelect";
import SearchSelect, { type SearchSelectItem } from "@/components/SearchSelect";
import type { Property, PropertyType, PropertyStatus, SearchType, Contact } from "@/lib/types";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  LISTING_TYPE_LABELS,
  ENERGY_CERTIFICATE_TYPE_LABELS,
  ENERGY_EFFICIENCY_CLASS_LABELS,
  HEATING_TYPE_LABELS,
  PARKING_LABELS,
  BOOLEAN_YES_NO_LABELS,
  OUTDOOR_SPACE_LABELS,
  labelsToOptions,
} from "@/lib/types";
import { hasRooms } from "@/lib/property-helpers";
import { inp, lbl } from "@/lib/ui-tokens";

export default function PropertyForm({
  form,
  updateForm,
  owners,
}: {
  form: Partial<Property>;
  updateForm: (patch: Partial<Property>) => void;
  owners: Contact[];
}) {
  const [energyOpen, setEnergyOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedOwner = form.owner_contact_id
    ? owners.find((o) => o.id === form.owner_contact_id)
    : undefined;

  return (
    <>
      {/* ── Sektion: Objektdaten ── */}
      <div className="section-head">Objektdaten</div>
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
          displayValue={selectedOwner ? `${selectedOwner.first_name} ${selectedOwner.last_name}` : undefined}
          placeholder="Eigentümer suchen…"
          style={{ height: 36 }}
        />
      </div>

      {/* ── Sektion: Adresse ── */}
      <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0 2px" }} />
      <div className="section-head">Adresse</div>
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
      <div className="section-head">Eckdaten</div>
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
        <div className="section-head" style={{ flex: 1 }}>Energiedaten</div>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transform: energyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform var(--dur-out) var(--ease-out)" }}
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
        <div className="section-head" style={{ flex: 1 }}>Weitere Details</div>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transform: detailsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform var(--dur-out) var(--ease-out)" }}
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
    </>
  );
}
