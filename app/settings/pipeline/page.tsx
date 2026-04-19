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
  { name: "Lead",           color: "#78756E", position: 0 },
  { name: "Qualifizierung", color: "#3B82F6", position: 1 },
  { name: "Besichtigung",   color: "#8B5CF6", position: 2 },
  { name: "Verhandlung",    color: "#F59E0B", position: 3 },
  { name: "Abschluss",      color: "#C2692A", position: 4 },
  { name: "Gewonnen",       color: "#10B981", position: 5 },
  { name: "Verloren",       color: "#6B7280", position: 6 },
];

// Card-Padding für den Stages-Table-Wrap (über .card Utility mit Padding-Override)
const cardInner: React.CSSProperties = { padding: "22px 24px" };

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SettingsPipelinePage() {
  const supabase = createClient();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [originalStages, setOriginalStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [pendingAdds, setPendingAdds] = useState<string[]>([]);
  const renameRef = useRef<HTMLInputElement>(null);

  // ─── Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position");
      if (data) {
        setStages(data);
        setOriginalStages(data);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus rename input
  useEffect(() => {
    if (editingId && renameRef.current) renameRef.current.focus();
  }, [editingId]);

  // Beforeunload guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ─── Rename (local) ──────────────────────────────────────────────────
  function saveRename(stageId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) { setEditingId(null); return; }
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name: trimmed } : s)));
    setEditingId(null);
    setIsDirty(true);
  }

  // ─── Color (local) ───────────────────────────────────────────────────
  function changeColor(stageId: string, color: string) {
    setColorPickerId(null);
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, color } : s)));
    setIsDirty(true);
  }

  // ─── Reorder (local, drag & drop) ────────────────────────────────────
  function handleDrop(overIdx: number) {
    if (dragIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setDropTargetIdx(null);
      return;
    }
    const reordered = [...stages];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, position: i }));
    setStages(updated);
    setDragIdx(null);
    setDropTargetIdx(null);
    setIsDirty(true);
  }

  // ─── Delete (local) ──────────────────────────────────────────────────
  function deleteStage(stageId: string) {
    // Only track real (non-pending-add) stages for server deletion
    if (!pendingAdds.includes(stageId)) {
      setPendingDeletes((prev) => [...prev, stageId]);
    } else {
      setPendingAdds((prev) => prev.filter((id) => id !== stageId));
    }
    const remaining = stages.filter((s) => s.id !== stageId);
    const updated = remaining.map((s, i) => ({ ...s, position: i }));
    setStages(updated);
    setConfirmDeleteId(null);
    setIsDirty(true);
  }

  // ─── Add (local) ─────────────────────────────────────────────────────
  function addStage() {
    const tempId = crypto.randomUUID();
    const newStage: PipelineStage = {
      id: tempId,
      created_at: new Date().toISOString(),
      user_id: "",
      name: "Neue Phase",
      color: "#6B7280",
      position: stages.length,
      is_default: false,
    };
    setStages((prev) => [...prev, newStage]);
    setPendingAdds((prev) => [...prev, tempId]);
    setEditingId(tempId);
    setEditingName("Neue Phase");
    setIsDirty(true);
  }

  // ─── Save All Changes ────────────────────────────────────────────────
  async function handleSave() {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    setSaving(true);

    // 1. Delete removed stages
    for (const id of pendingDeletes) {
      await supabase.from("pipeline_stages").delete().eq("id", id);
    }

    // 2. Insert new stages (replace temp IDs with real ones)
    const idMap = new Map<string, string>(); // tempId → realId
    for (const tempId of pendingAdds) {
      const stage = stages.find((s) => s.id === tempId);
      if (!stage) continue;
      const { data } = await supabase
        .from("pipeline_stages")
        .insert({ user_id: me.user.id, name: stage.name, color: stage.color, position: stage.position, is_default: false })
        .select()
        .single();
      if (data) idMap.set(tempId, data.id);
    }

    // 3. Update existing stages (name, color, position)
    const existingUpdates = stages.filter((s) => !pendingAdds.includes(s.id));
    await Promise.all(
      existingUpdates.map((s) =>
        supabase.from("pipeline_stages").update({ name: s.name, color: s.color, position: s.position }).eq("id", s.id)
      )
    );

    // 4. Replace temp IDs in local state with real IDs
    const finalStages = stages.map((s) => {
      const realId = idMap.get(s.id);
      return realId ? { ...s, id: realId } : s;
    });

    setStages(finalStages);
    setOriginalStages(finalStages);
    setPendingDeletes([]);
    setPendingAdds([]);
    setIsDirty(false);
    setSaving(false);
  }

  // ─── Discard Changes ─────────────────────────────────────────────────
  function handleDiscard() {
    setStages([...originalStages]);
    setPendingDeletes([]);
    setPendingAdds([]);
    setIsDirty(false);
    setEditingId(null);
    setColorPickerId(null);
  }

  // ─── Reset to Defaults (immediate save — smart reassignment) ─────────
  async function resetToDefaults() {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    setSaving(true);

    const oldStages = [...originalStages.length > 0 ? originalStages : stages];
    const defaultNames = DEFAULT_STAGES.map((s) => s.name.toLowerCase());

    // 1. Insert new defaults
    const inserts = DEFAULT_STAGES.map((s) => ({
      user_id: me.user!.id,
      name: s.name,
      color: s.color,
      position: s.position,
      is_default: true,
    }));
    const { data: newStages } = await supabase
      .from("pipeline_stages")
      .insert(inserts)
      .select()
      .order("position");
    if (!newStages) { setSaving(false); return; }

    const newByName = new Map(newStages.map((s) => [s.name.toLowerCase(), s.id]));
    const qualId = newByName.get("qualifizierung")!;

    // 2. Reassign deals from old stages to matching new stages
    for (const old of oldStages) {
      const matchName = defaultNames.find((dn) => dn === old.name.trim().toLowerCase());
      const targetId = matchName ? newByName.get(matchName)! : qualId;
      await supabase.from("deals").update({ stage_id: targetId }).eq("stage_id", old.id);
    }

    // 3. Delete all old stages
    const oldIds = oldStages.map((s) => s.id);
    if (oldIds.length > 0) {
      await supabase.from("pipeline_stages").delete().in("id", oldIds);
    }

    // 4. Also delete any pending-add stages that were never saved
    // (they don't exist in DB, so no server call needed)

    setStages(newStages);
    setOriginalStages(newStages);
    setPendingDeletes([]);
    setPendingAdds([]);
    setIsDirty(false);
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
    <div className="anim-0" style={{ maxWidth: 680, paddingBottom: isDirty ? 80 : 0 }}>
      <style>{`
        .stage-name-hover:hover { background: rgba(0,0,0,0.04); }
        .stage-name-hover:hover .edit-icon { opacity: 1 !important; }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 className="page-title" style={{ fontSize: 22, letterSpacing: "-0.3px" }}>Pipeline-Phasen</h1>
        <p className="page-subtitle">
          Verwalte die Phasen deiner Deal-Pipeline. Ziehe Phasen per Drag &amp; Drop um sie neu zu ordnen.
        </p>
      </div>

      {/* Stages Table */}
      <div className="card" style={cardInner}>
        {/* Column Headers */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 60px 50px", gap: 12, alignItems: "center", padding: "0 0 10px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 4 }}>
          <div />
          <div className="stat-label" style={{ marginBottom: 0 }}>Phase</div>
          <div className="stat-label" style={{ marginBottom: 0, textAlign: "center" }}>Farbe</div>
          <div />
        </div>

        {/* Stage Rows */}
        {stages.map((stage, idx) => (
          <div key={stage.id}>
            {/* Insertion line indicator */}
            <div style={{
              height: dropTargetIdx === idx && dragIdx !== null && dragIdx !== idx ? 2 : 0,
              background: "var(--accent)",
              borderRadius: 1,
              margin: dropTargetIdx === idx && dragIdx !== null && dragIdx !== idx ? "4px 0" : "0",
              transition: "height 0.12s, margin 0.12s",
            }} />

            <div
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setDropTargetIdx(idx); }}
              onDragLeave={() => { if (dropTargetIdx === idx) setDropTargetIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setDropTargetIdx(null); }}
              onDrop={() => handleDrop(idx)}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 60px 50px",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: idx < stages.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
                opacity: dragIdx === idx ? 0.35 : 1,
                transform: dragIdx === idx ? "scale(0.98)" : undefined,
                cursor: "grab",
                transition: "opacity 0.15s, transform 0.15s",
              }}
            >
              {/* Grip Handle */}
              <div style={{ display: "flex", justifyContent: "center", color: "var(--t3)" }}>
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
                    className="stage-name-hover"
                    style={{ fontSize: 13.5, color: "var(--t1)", cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "background 0.15s", margin: "0 -8px" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {stage.name}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0, transition: "opacity 0.15s", color: "var(--t3)" }} className="edit-icon">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </span>
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
                    color: "var(--t3)",
                    padding: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--t3)"; }}
                  title="Phase löschen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Trailing drop zone (for dropping after last item) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDropTargetIdx(stages.length); }}
          onDragLeave={() => { if (dropTargetIdx === stages.length) setDropTargetIdx(null); }}
          onDrop={() => handleDrop(stages.length)}
          style={{ minHeight: 8 }}
        >
          <div style={{
            height: dropTargetIdx === stages.length && dragIdx !== null ? 2 : 0,
            background: "var(--accent)",
            borderRadius: 1,
            margin: dropTargetIdx === stages.length && dragIdx !== null ? "4px 0" : "0",
            transition: "height 0.12s, margin 0.12s",
          }} />
        </div>

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
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 8 }}>
              Auf Standard zurücksetzen?
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5, marginBottom: 20 }}>
              Deals in Standard-Phasen behalten ihre Zuordnung. Deals in benutzerdefinierten Phasen werden nach &ldquo;Qualifizierung&rdquo; verschoben.
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

      {/* ─── Floating Save Bar ───────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-ring-settings {
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
            animation: "pulse-ring-settings 1.6s ease-out infinite",
          }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--accent-light)" }} />
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500, flex: 1 }}>Ungespeicherte Änderungen</span>
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
    </div>
  );
}
