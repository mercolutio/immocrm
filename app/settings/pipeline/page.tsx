"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PipelineStage } from "@/lib/types";

// ─── Preset Colors ────────────────────────────────────────────────────────
const COLORS = [
  "#3B82F6", "#8B5CF6", "#F59E0B", "#C2692A",
  "#10B981", "#6B7280", "#EF4444", "#EC4899",
];

const DEFAULT_STAGES = [
  { name: "Qualifizierung", color: "#3B82F6", position: 0 },
  { name: "Besichtigung",   color: "#8B5CF6", position: 1 },
  { name: "Verhandlung",    color: "#F59E0B", position: 2 },
  { name: "Notariat",       color: "#C2692A", position: 3 },
  { name: "Abschluss",      color: "#10B981", position: 4 },
  { name: "Verloren",       color: "#6B7280", position: 5 },
];

// ─── Styles ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)",
  border: "1px solid rgba(0,0,0,0.05)",
  padding: "22px 24px",
};

const lbl: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--t3)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SettingsPipelinePage() {
  const supabase = createClient();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  // ─── Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position");
      if (data) setStages(data);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus rename input
  useEffect(() => {
    if (editingId && renameRef.current) renameRef.current.focus();
  }, [editingId]);

  // ─── Rename ───────────────────────────────────────────────────────────
  async function saveRename(stageId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) { setEditingId(null); return; }
    setSaving(true);
    await supabase.from("pipeline_stages").update({ name: trimmed }).eq("id", stageId);
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name: trimmed } : s)));
    setEditingId(null);
    setSaving(false);
  }

  // ─── Color ────────────────────────────────────────────────────────────
  async function changeColor(stageId: string, color: string) {
    setColorPickerId(null);
    setSaving(true);
    await supabase.from("pipeline_stages").update({ color }).eq("id", stageId);
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, color } : s)));
    setSaving(false);
  }

  // ─── Reorder (drag & drop) ───────────────────────────────────────────
  async function handleDrop(overIdx: number) {
    if (dragIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...stages];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, position: i }));
    setStages(updated);
    setDragIdx(null);
    setDragOverIdx(null);

    setSaving(true);
    await Promise.all(
      updated.map((s, i) =>
        supabase.from("pipeline_stages").update({ position: i }).eq("id", s.id)
      )
    );
    setSaving(false);
  }

  // ─── Delete ───────────────────────────────────────────────────────────
  async function deleteStage(stageId: string) {
    setSaving(true);
    await supabase.from("pipeline_stages").delete().eq("id", stageId);
    const remaining = stages.filter((s) => s.id !== stageId);
    // re-normalize positions
    const updated = remaining.map((s, i) => ({ ...s, position: i }));
    setStages(updated);
    await Promise.all(
      updated.map((s, i) =>
        supabase.from("pipeline_stages").update({ position: i }).eq("id", s.id)
      )
    );
    setConfirmDeleteId(null);
    setSaving(false);
  }

  // ─── Add ──────────────────────────────────────────────────────────────
  async function addStage() {
    const pos = stages.length;
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    setSaving(true);
    const { data } = await supabase
      .from("pipeline_stages")
      .insert({ user_id: me.user.id, name: "Neue Phase", color: "#6B7280", position: pos, is_default: false })
      .select()
      .single();
    if (data) {
      setStages((prev) => [...prev, data]);
      setEditingId(data.id);
      setEditingName(data.name);
    }
    setSaving(false);
  }

  // ─── Reset to Defaults ────────────────────────────────────────────────
  async function resetToDefaults() {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    setSaving(true);

    // Delete all existing stages for this user
    await supabase.from("pipeline_stages").delete().eq("user_id", me.user.id);

    // Insert defaults
    const inserts = DEFAULT_STAGES.map((s) => ({
      user_id: me.user!.id,
      name: s.name,
      color: s.color,
      position: s.position,
      is_default: true,
    }));
    const { data } = await supabase.from("pipeline_stages").insert(inserts).select().order("position");
    if (data) setStages(data);
    setConfirmReset(false);
    setSaving(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>Pipeline-Phasen</div>
          <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 2 }}>
            Verwalte die Phasen deiner Deal-Pipeline. Ziehe Phasen per Drag & Drop um sie neu zu ordnen.
          </div>
        </div>
        {saving && (
          <div style={{ fontSize: 11, color: "var(--t3)", display: "flex", alignItems: "center", gap: 6 }}>
            <div className="spinner" style={{ width: 14, height: 14 }} />
            Speichern…
          </div>
        )}
      </div>

      {/* Stages Table */}
      <div style={card}>
        {/* Column Headers */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 60px 50px", gap: 12, alignItems: "center", padding: "0 0 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: 4 }}>
          <div />
          <div style={lbl}>Phase</div>
          <div style={{ ...lbl, textAlign: "center" }}>Farbe</div>
          <div />
        </div>

        {/* Stage Rows */}
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            onDrop={() => handleDrop(idx)}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 60px 50px",
              gap: 12,
              alignItems: "center",
              padding: "10px 0",
              borderBottom: idx < stages.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
              background: dragOverIdx === idx ? "rgba(194,105,42,0.04)" : undefined,
              opacity: dragIdx === idx ? 0.4 : 1,
              cursor: "grab",
              transition: "background 0.15s, opacity 0.15s",
            }}
          >
            {/* Grip Handle */}
            <div style={{ display: "flex", justifyContent: "center", color: "var(--t4)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>

            {/* Name (click to edit) */}
            <div>
              {editingId === stage.id ? (
                <input
                  ref={renameRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => saveRename(stage.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(stage.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={{
                    width: "100%",
                    height: 32,
                    border: "1px solid var(--accent)",
                    borderRadius: 6,
                    padding: "0 10px",
                    fontSize: 13,
                    color: "var(--t1)",
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#fff",
                  }}
                />
              ) : (
                <div
                  onClick={() => { setEditingId(stage.id); setEditingName(stage.name); }}
                  style={{ fontSize: 13.5, color: "var(--t1)", cursor: "text", padding: "4px 0" }}
                >
                  {stage.name}
                </div>
              )}
            </div>

            {/* Color Dot + Picker */}
            <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <button
                onClick={() => setColorPickerId(colorPickerId === stage.id ? null : stage.id)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: stage.color,
                  border: "2px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
              {colorPickerId === stage.id && (
                <div
                  style={{
                    position: "absolute",
                    top: 30,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                    zIndex: 100,
                  }}
                >
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => changeColor(stage.id, c)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: c,
                        border: c === stage.color ? "2px solid var(--t1)" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        transition: "transform 0.1s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Delete */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setConfirmDeleteId(stage.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t4)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--t4)"; }}
                title="Phase löschen"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Add Stage Button */}
        <button
          onClick={addStage}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent)",
            background: "none",
            border: "1px dashed rgba(194,105,42,0.3)",
            borderRadius: 8,
            cursor: "pointer",
            width: "100%",
            justifyContent: "center",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(194,105,42,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Phase hinzufügen
        </button>
      </div>

      {/* Reset to Defaults */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setConfirmReset(true)}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--t3)",
            background: "none",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 7,
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--t1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--t3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.1)"; }}
        >
          Auf Standard zurücksetzen
        </button>
      </div>

      {/* ─── Confirm Delete Dialog ───────────────────────────────────────── */}
      {confirmDeleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "26px 28px",
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
              Phase löschen?
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5, marginBottom: 20 }}>
              Deals in dieser Phase werden auf &ldquo;Ohne Phase&rdquo; gesetzt. Diese Aktion kann nicht rückgängig gemacht werden.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--t2)",
                  background: "var(--bg2)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteStage(confirmDeleteId)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#fff",
                  background: "var(--red, #EF4444)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Reset Dialog ────────────────────────────────────────── */}
      {confirmReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "26px 28px",
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
              Auf Standard zurücksetzen?
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5, marginBottom: 20 }}>
              Alle benutzerdefinierten Phasen werden gelöscht und durch die 6 Standard-Phasen ersetzt. Bestehende Deals behalten ihre Zuordnung nicht.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--t2)",
                  background: "var(--bg2)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={resetToDefaults}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#fff",
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
