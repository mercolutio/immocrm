"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import type {
  TaskTemplate,
  TaskTemplateItem,
  TaskPriority,
} from "@/lib/types";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from "@/lib/types";

type EditingTemplate = TaskTemplate & { items: TaskTemplateItem[] };

export default function TemplatesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EditingTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TaskTemplateItem[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as TaskTemplate[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function selectTemplate(t: TaskTemplate) {
    const { data } = await supabase
      .from("task_template_items")
      .select("*")
      .eq("template_id", t.id)
      .order("position");
    const tpl: EditingTemplate = { ...t, items: (data ?? []) as TaskTemplateItem[] };
    setSelected(tpl);
    setCreating(false);
    setName(tpl.name);
    setDescription(tpl.description ?? "");
    setItems(tpl.items);
  }

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setName("");
    setDescription("");
    setItems([]);
  }

  async function saveTemplate() {
    if (!name.trim()) return;
    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setSaving(false); return; }

    const { data: mem } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", uid)
      .limit(1)
      .single();
    if (!mem) { setSaving(false); return; }

    let templateId = selected?.id;

    if (creating) {
      const { data, error } = await supabase
        .from("task_templates")
        .insert({ name: name.trim(), description: description.trim() || null, organization_id: mem.organization_id, user_id: uid })
        .select("id")
        .single();
      if (error || !data) { setSaving(false); return; }
      templateId = data.id;
    } else if (selected) {
      await supabase
        .from("task_templates")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", selected.id);
    }

    if (!templateId) { setSaving(false); return; }

    await supabase.from("task_template_items").delete().eq("template_id", templateId);

    if (items.length > 0) {
      const rows = items.map((item, i) => ({
        template_id: templateId!,
        title: item.title,
        description: item.description || null,
        priority: item.priority,
        due_offset_days: item.due_offset_days,
        position: i,
        depends_on_item_id: null,
      }));
      await supabase.from("task_template_items").insert(rows);
    }

    setSaving(false);
    setCreating(false);
    await load();

    const { data: fresh } = await supabase
      .from("task_templates")
      .select("*")
      .eq("id", templateId)
      .single();
    if (fresh) await selectTemplate(fresh as TaskTemplate);
  }

  async function deleteTemplate(id: string) {
    await supabase.from("task_templates").delete().eq("id", id);
    if (selected?.id === id) {
      setSelected(null);
      setCreating(false);
    }
    setConfirmDelete(null);
    load();
  }

  function addItem() {
    if (!newTitle.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        template_id: selected?.id ?? "",
        title: newTitle.trim(),
        description: null,
        priority: "medium" as TaskPriority,
        due_offset_days: 0,
        position: prev.length,
        depends_on_item_id: null,
      },
    ]);
    setNewTitle("");
  }

  function updateItem(id: string, patch: Partial<TaskTemplateItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  const isEditing = selected || creating;

  if (loading) {
    return <DashboardLayout><div style={{ padding: 36, color: "var(--t3)" }}>Lade…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Aufgaben-Vorlagen</h1>
          <p className="page-subtitle">{templates.length} Vorlage{templates.length !== 1 ? "n" : ""}</p>
        </div>
        <div className="page-header-right">
          <NotificationBell />
          <button onClick={() => router.push("/tasks")} className="btn-ghost" style={{ marginRight: 8 }}>
            ← Aufgaben
          </button>
          <button onClick={startCreate} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neue Vorlage
          </button>
        </div>
      </header>

      <div className="body-wrap anim-0" style={{ display: "flex", gap: 20, paddingTop: 16, minHeight: "calc(100vh - 140px)" }}>
        {/* Sidebar: Template list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {templates.length === 0 && !creating && (
              <div className="view-fade" style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--t3)" }}>
                Noch keine Vorlagen erstellt
              </div>
            )}
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTemplate(t)}
                className="h-lift"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: selected?.id === t.id ? "var(--accent-soft)" : "var(--card)",
                  border: selected?.id === t.id ? "1px solid var(--accent)" : "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(28,24,20,0.04)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{t.name}</div>
                {t.description && (
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                  {new Date(t.created_at).toLocaleDateString("de-DE")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main: Template editor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isEditing ? (
            <div className="view-fade" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="12" y2="16"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>Vorlage auswählen</div>
              <div style={{ fontSize: 13, color: "var(--t3)" }}>oder eine neue Vorlage erstellen</div>
            </div>
          ) : (
            <div className="card content-reveal" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 500, color: "var(--t1)", margin: 0 }}>
                  {creating ? "Neue Vorlage" : "Vorlage bearbeiten"}
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {selected && (
                    <button
                      onClick={() => setConfirmDelete(selected.id)}
                      className="btn-ghost"
                      style={{ color: "var(--red)", fontSize: 12 }}
                    >
                      Löschen
                    </button>
                  )}
                  <button onClick={saveTemplate} disabled={saving || !name.trim()} className="btn-primary">
                    {saving ? "Speichert…" : "Speichern"}
                  </button>
                </div>
              </div>

              {/* Name + Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <div>
                  <label className="stat-label">Name</label>
                  <input
                    className="input-field"
                    placeholder="z.B. Verkaufsauftrag Standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="stat-label">Beschreibung (optional)</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Kurze Beschreibung der Vorlage…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Items */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)", marginBottom: 12 }}>
                  Aufgaben-Schritte ({items.length})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((item, idx) => {
                    const pc = TASK_PRIORITY_COLORS[item.priority];
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10,
                          background: "var(--surface-subtle)",
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, width: 20, textAlign: "center", flexShrink: 0 }}>
                          {idx + 1}
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            style={{
                              width: "100%", border: "none", background: "transparent",
                              fontSize: 13, fontWeight: 500, color: "var(--t1)", outline: "none",
                              fontFamily: "inherit",
                            }}
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            placeholder="Aufgaben-Titel"
                          />
                        </div>

                        {/* Priority */}
                        <select
                          value={item.priority}
                          onChange={(e) => updateItem(item.id, { priority: e.target.value as TaskPriority })}
                          style={{
                            fontSize: 11, fontWeight: 500, border: "none", borderRadius: 6,
                            padding: "2px 6px", background: pc.bg, color: pc.fg,
                            cursor: "pointer", fontFamily: "inherit", outline: "none",
                          }}
                        >
                          {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>

                        {/* Due offset */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <input
                            type="number"
                            min={0}
                            value={item.due_offset_days}
                            onChange={(e) => updateItem(item.id, { due_offset_days: Number(e.target.value) || 0 })}
                            style={{
                              width: 44, fontSize: 12, border: "1px solid rgba(0,0,0,0.1)",
                              borderRadius: 6, padding: "2px 6px", textAlign: "center",
                              background: "var(--card)", fontFamily: "inherit", outline: "none",
                            }}
                          />
                          <span style={{ fontSize: 11, color: "var(--t3)" }}>Tage</span>
                        </div>

                        {/* Move / Delete */}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                            style={{ border: "none", background: "transparent", cursor: idx > 0 ? "pointer" : "default", opacity: idx > 0 ? 0.5 : 0.2, fontSize: 14, padding: 2 }}>
                            ↑
                          </button>
                          <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                            style={{ border: "none", background: "transparent", cursor: idx < items.length - 1 ? "pointer" : "default", opacity: idx < items.length - 1 ? 0.5 : 0.2, fontSize: 14, padding: 2 }}>
                            ↓
                          </button>
                          <button onClick={() => removeItem(item.id)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--red)", opacity: 0.6, fontSize: 14, padding: 2 }}>
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add item */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    className="input-field"
                    placeholder="Neuen Schritt hinzufügen…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                    style={{ flex: 1 }}
                  />
                  <button onClick={addItem} disabled={!newTitle.trim()} className="btn-ghost">
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Vorlage löschen?"
        message="Diese Vorlage und alle zugehörigen Schritte werden unwiderruflich gelöscht."
        confirmLabel="Endgültig löschen"
        destructive
        onConfirm={() => confirmDelete && deleteTemplate(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </DashboardLayout>
  );
}
