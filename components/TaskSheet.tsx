"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetPortal, SheetOverlay } from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import AppSelect from "@/components/AppSelect";
import DatePicker from "@/components/DatePicker";
import SearchSelect, { SearchSelectItem } from "@/components/SearchSelect";
import { createClient } from "@/lib/supabase/client";
import { shouldSpawnNextInstance } from "@/lib/recurrence";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskRecurrence,
  TaskChecklistItem,
  TaskComment,
  TaskAttachment,
  OrganizationMember,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCE_LABELS,
  TASK_STATUS_COLORS,
  labelsToOptions,
} from "@/lib/types";

export type TaskLink = { type: "contact" | "property" | "deal"; id: string; label: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (task: Task) => void;
  mode: "create" | "edit";
  task?: Task | null;
  initialLink?: TaskLink | null;
  initialStatus?: TaskStatus;
  initialPriority?: TaskPriority;
  initialAssignedTo?: string | null;
  initialParentTaskId?: string | null;
  organizationId: string;
  members: OrganizationMember[];
  memberProfiles: Record<string, { name: string; email: string }>;
  variant?: "modal" | "peek";
}

type TabKey = "details" | "checklist" | "comments" | "attachments" | "subtasks";

export default function TaskSheet({
  open, onClose, onSaved, mode, task, initialLink, initialStatus, initialPriority,
  initialAssignedTo, initialParentTaskId, organizationId, members, memberProfiles,
  variant = "modal",
}: Props) {
  const isPeek = variant === "peek";
  const supabase = useMemo(() => createClient(), []);
  const isEdit = mode === "edit" && !!task;
  const [tab, setTab] = useState<TabKey>("details");

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? "planned");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? initialPriority ?? "medium");
  const [dueDate, setDueDate] = useState<string | null>(
    task?.due_date ? task.due_date.slice(0, 10) : null,
  );
  const [assignedTo, setAssignedTo] = useState<string | null>(
    task?.assigned_to ?? initialAssignedTo ?? null,
  );
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task?.recurrence ?? "none");
  const [recurrenceEnd, setRecurrenceEnd] = useState<string | null>(task?.recurrence_end ?? null);

  const [linkType, setLinkType] = useState<"none" | "contact" | "property" | "deal">(
    task?.contact_id ? "contact"
      : task?.property_id ? "property"
      : task?.deal_id ? "deal"
      : initialLink?.type ?? "none",
  );
  const [linkId, setLinkId] = useState<string | null>(
    task?.contact_id ?? task?.property_id ?? task?.deal_id ?? initialLink?.id ?? null,
  );
  const [linkLabel, setLinkLabel] = useState<string>(initialLink?.label ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on (re-)open
  useEffect(() => {
    if (!open) return;
    setTab("details");
    setError(null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? initialStatus ?? "planned");
    setPriority(task?.priority ?? initialPriority ?? "medium");
    setDueDate(task?.due_date ? task.due_date.slice(0, 10) : null);
    setAssignedTo(task?.assigned_to ?? initialAssignedTo ?? null);
    setRecurrence(task?.recurrence ?? "none");
    setRecurrenceEnd(task?.recurrence_end ?? null);
    setLinkType(
      task?.contact_id ? "contact"
        : task?.property_id ? "property"
        : task?.deal_id ? "deal"
        : initialLink?.type ?? "none",
    );
    setLinkId(task?.contact_id ?? task?.property_id ?? task?.deal_id ?? initialLink?.id ?? null);
    setLinkLabel(initialLink?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const isTeam = members.length > 1;

  async function searchLinks(q: string): Promise<SearchSelectItem[]> {
    if (linkType === "none") return [];
    if (linkType === "contact") {
      const { data } = await supabase.from("contacts")
        .select("id, first_name, last_name, email").ilike("last_name", `%${q}%`).limit(20);
      return (data ?? []).map((c) => ({
        value: c.id,
        label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—",
        sublabel: c.email ?? undefined,
      }));
    }
    if (linkType === "property") {
      const { data } = await supabase.from("properties")
        .select("id, title, city").ilike("title", `%${q}%`).limit(20);
      return (data ?? []).map((p) => ({
        value: p.id, label: p.title ?? "—", sublabel: p.city ?? undefined,
      }));
    }
    const { data } = await supabase.from("deals")
      .select("id, contact_id, property_id").limit(20);
    return (data ?? []).map((d) => ({
      value: d.id, label: `Deal ${d.id.slice(0, 6)}`,
    }));
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate,
        assigned_to: assignedTo,
        recurrence,
        recurrence_end: recurrence === "none" ? null : recurrenceEnd,
        contact_id: linkType === "contact" ? linkId : null,
        property_id: linkType === "property" ? linkId : null,
        deal_id: linkType === "deal" ? linkId : null,
      };

      let savedTask: Task | null = null;

      if (isEdit && task) {
        const wasDone = task.status === "done";
        const nowDone = status === "done";
        const { data, error: e } = await supabase.from("tasks")
          .update(payload).eq("id", task.id).select().single();
        if (e) throw e;
        savedTask = data as Task;

        if (!wasDone && nowDone) {
          const nextDue = shouldSpawnNextInstance(task.due_date, task.recurrence, task.recurrence_end);
          if (nextDue) {
            await supabase.from("tasks").insert({
              ...payload,
              organization_id: organizationId,
              user_id: task.user_id,
              status: "planned",
              due_date: nextDue,
              parent_task_id: null,
            });
          }
        }
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const { data, error: e } = await supabase.from("tasks").insert({
          ...payload,
          organization_id: organizationId,
          user_id: auth.user?.id,
          parent_task_id: initialParentTaskId ?? null,
        }).select().single();
        if (e) throw e;
        savedTask = data as Task;
      }

      if (savedTask) onSaved?.(savedTask);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: memberProfiles[m.user_id]?.name || memberProfiles[m.user_id]?.email || m.user_id.slice(0, 8),
  }));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()} modal={!isPeek}>
      <SheetPortal>
        {!isPeek && <SheetOverlay />}
        <SheetPrimitive.Content
          onPointerDownOutside={(e) => { if (isPeek) e.preventDefault(); }}
          onInteractOutside={(e) => { if (isPeek) e.preventDefault(); }}
          className={
            isPeek
              ? "fixed inset-y-0 right-0 z-40 h-full w-full sm:max-w-[480px] bg-[var(--card)] shadow-[-12px_0_32px_rgba(28,24,20,0.08)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-150 data-[state=open]:duration-200"
              : "fixed inset-y-0 right-0 z-50 h-full w-full sm:max-w-[560px] bg-[var(--card)] shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-300"
          }
          style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)" }}
        >
          <SheetPrimitive.Title className="sr-only">
            {isEdit ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </SheetPrimitive.Title>

          {/* HEADER */}
          <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--t1)", margin: 0 }}>
                {isEdit ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
              </h2>
              <button onClick={onClose} className="btn-icon" aria-label="Schließen"
                style={{ width: 32, height: 32 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* TABS */}
            {isEdit && (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {(["details", "checklist", "comments", "attachments", "subtasks"] as TabKey[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{
                      padding: "8px 12px",
                      fontSize: 12, fontWeight: 500,
                      color: tab === t ? "var(--t1)" : "var(--t3)",
                      background: "none",
                      border: "none",
                      borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}>
                    {t === "details" ? "Details"
                      : t === "checklist" ? "Checkliste"
                      : t === "comments" ? "Kommentare"
                      : t === "attachments" ? "Anhänge"
                      : "Subtasks"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BODY */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {(!isEdit || tab === "details") && (
              <DetailsTab
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                status={status} setStatus={setStatus}
                priority={priority} setPriority={setPriority}
                dueDate={dueDate} setDueDate={setDueDate}
                assignedTo={assignedTo} setAssignedTo={setAssignedTo}
                recurrence={recurrence} setRecurrence={setRecurrence}
                recurrenceEnd={recurrenceEnd} setRecurrenceEnd={setRecurrenceEnd}
                linkType={linkType} setLinkType={setLinkType}
                linkId={linkId} setLinkId={setLinkId}
                linkLabel={linkLabel} setLinkLabel={setLinkLabel}
                searchLinks={searchLinks}
                isTeam={isTeam}
                memberOptions={memberOptions}
                lockedLink={!!initialLink}
              />
            )}
            {isEdit && task && tab === "checklist" && <ChecklistTab taskId={task.id} />}
            {isEdit && task && tab === "comments" && (
              <CommentsTab taskId={task.id} isTeam={isTeam} memberProfiles={memberProfiles} />
            )}
            {isEdit && task && tab === "attachments" && (
              <AttachmentsTab taskId={task.id} organizationId={organizationId} />
            )}
            {isEdit && task && tab === "subtasks" && (
              <SubtasksTab parent={task} organizationId={organizationId}
                members={members} memberProfiles={memberProfiles} />
            )}
          </div>

          {/* FOOTER */}
          {(tab === "details" || !isEdit) && (
            <div style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              background: "var(--surface-subtle)",
            }}>
              {error ? <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span> : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} className="btn-ghost" disabled={saving}>Abbrechen</button>
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? "Speichern…" : (isEdit ? "Speichern" : "Aufgabe anlegen")}
                </button>
              </div>
            </div>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}

// ============================================================
// Details Tab
// ============================================================
interface DetailsTabProps {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  status: TaskStatus; setStatus: (v: TaskStatus) => void;
  priority: TaskPriority; setPriority: (v: TaskPriority) => void;
  dueDate: string | null; setDueDate: (v: string | null) => void;
  assignedTo: string | null; setAssignedTo: (v: string | null) => void;
  recurrence: TaskRecurrence; setRecurrence: (v: TaskRecurrence) => void;
  recurrenceEnd: string | null; setRecurrenceEnd: (v: string | null) => void;
  linkType: "none" | "contact" | "property" | "deal";
  setLinkType: (v: "none" | "contact" | "property" | "deal") => void;
  linkId: string | null; setLinkId: (v: string | null) => void;
  linkLabel: string; setLinkLabel: (v: string) => void;
  searchLinks: (q: string) => Promise<SearchSelectItem[]>;
  isTeam: boolean;
  memberOptions: { value: string; label: string }[];
  lockedLink: boolean;
}

function DetailsTab(p: DetailsTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Titel *">
        <input className="input-field" value={p.title} onChange={(e) => p.setTitle(e.target.value)}
          placeholder="z.B. Rückruf Herr Meier" autoFocus />
      </Field>

      <Field label="Beschreibung">
        <textarea
          value={p.description}
          onChange={(e) => p.setDescription(e.target.value)}
          placeholder="Zusätzliche Details…"
          rows={3}
          style={{
            width: "100%", padding: "10px 11px",
            border: "1px solid var(--border-strong)", borderRadius: 8,
            fontSize: 13, fontFamily: "inherit", color: "var(--t1)",
            background: "var(--card)", resize: "vertical",
          }}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Status">
          <AppSelect value={p.status} onChange={(v) => p.setStatus(v as TaskStatus)}
            options={labelsToOptions(TASK_STATUS_LABELS)} />
        </Field>
        <Field label="Priorität">
          <AppSelect value={p.priority} onChange={(v) => p.setPriority(v as TaskPriority)}
            options={labelsToOptions(TASK_PRIORITY_LABELS)} />
        </Field>
      </div>

      <Field label="Fällig am">
        <DatePicker value={p.dueDate} onChange={p.setDueDate} placeholder="Datum auswählen" />
      </Field>

      {p.isTeam && (
        <Field label="Zuweisen an">
          <AppSelect value={p.assignedTo ?? ""} onChange={(v) => p.setAssignedTo(v || null)}
            options={[{ value: "", label: "Nicht zugewiesen" }, ...p.memberOptions]} />
        </Field>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Wiederholen">
          <AppSelect value={p.recurrence} onChange={(v) => p.setRecurrence(v as TaskRecurrence)}
            options={labelsToOptions(TASK_RECURRENCE_LABELS)} />
        </Field>
        {p.recurrence !== "none" && (
          <Field label="Wiederholen bis">
            <DatePicker value={p.recurrenceEnd} onChange={p.setRecurrenceEnd} placeholder="Optional" />
          </Field>
        )}
      </div>

      <Field label="Verknüpfung">
        {p.lockedLink && p.linkLabel ? (
          <div style={{
            padding: "8px 11px", border: "1px solid var(--border)", borderRadius: 8,
            background: "var(--surface-subtle)", fontSize: 13, color: "var(--t1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{p.linkLabel}</span>
            <span style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase" }}>
              {p.linkType === "contact" ? "Kontakt" : p.linkType === "property" ? "Objekt" : "Deal"}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["none", "contact", "property", "deal"] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => { p.setLinkType(t); p.setLinkId(null); p.setLinkLabel(""); }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    border: "1px solid var(--border-strong)",
                    background: p.linkType === t ? "var(--accent-soft)" : "var(--card)",
                    color: p.linkType === t ? "var(--t1)" : "var(--t3)",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  {t === "none" ? "Keine" : t === "contact" ? "Kontakt" : t === "property" ? "Objekt" : "Deal"}
                </button>
              ))}
            </div>
            {p.linkType !== "none" && (
              <SearchSelect
                value={p.linkId}
                displayValue={p.linkLabel || undefined}
                onChange={(v) => p.setLinkId(v)}
                onSearch={async (q) => {
                  const res = await p.searchLinks(q);
                  return res;
                }}
                placeholder={`${p.linkType === "contact" ? "Kontakt" : p.linkType === "property" ? "Objekt" : "Deal"} suchen…`}
              />
            )}
          </div>
        )}
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

// ============================================================
// Checklist Tab
// ============================================================
function ChecklistTab({ taskId }: { taskId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("task_checklist_items")
        .select("*").eq("task_id", taskId).order("position");
      setItems((data ?? []) as TaskChecklistItem[]);
    })();
  }, [supabase, taskId]);

  async function addItem() {
    if (!newLabel.trim()) return;
    const pos = items.length;
    const { data } = await supabase.from("task_checklist_items")
      .insert({ task_id: taskId, label: newLabel.trim(), position: pos })
      .select().single();
    if (data) setItems((prev) => [...prev, data as TaskChecklistItem]);
    setNewLabel("");
  }

  async function toggleItem(it: TaskChecklistItem) {
    const next = !it.is_done;
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, is_done: next } : x));
    await supabase.from("task_checklist_items").update({ is_done: next }).eq("id", it.id);
  }

  async function updateLabel(it: TaskChecklistItem, label: string) {
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, label } : x));
    await supabase.from("task_checklist_items").update({ label }).eq("id", it.id);
  }

  async function removeItem(it: TaskChecklistItem) {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await supabase.from("task_checklist_items").delete().eq("id", it.id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={it.is_done} onChange={() => toggleItem(it)} />
          <input
            className="input-field"
            value={it.label}
            onChange={(e) => updateLabel(it, e.target.value)}
            style={{
              flex: 1,
              textDecoration: it.is_done ? "line-through" : "none",
              color: it.is_done ? "var(--t3)" : "var(--t1)",
            }}
          />
          <button onClick={() => removeItem(it)} className="btn-icon"
            style={{ width: 32, height: 32 }} aria-label="Löschen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-2 14H7L5 6"/>
            </svg>
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          className="input-field"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          placeholder="+ Neues Item"
          style={{ flex: 1 }}
        />
        <button onClick={addItem} className="btn-ghost">Hinzufügen</button>
      </div>
    </div>
  );
}

// ============================================================
// Comments Tab
// ============================================================
function CommentsTab({
  taskId, isTeam, memberProfiles,
}: { taskId: string; isTeam: boolean; memberProfiles: Record<string, { name: string; email: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("task_comments")
        .select("*").eq("task_id", taskId).order("created_at");
      setComments((data ?? []) as TaskComment[]);
    })();
  }, [supabase, taskId]);

  async function send() {
    if (!text.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const { data } = await supabase.from("task_comments").insert({
      task_id: taskId, user_id: auth.user?.id, content: text.trim(),
    }).select().single();
    if (data) setComments((prev) => [...prev, data as TaskComment]);
    setText("");
  }

  if (!isTeam) {
    return (
      <div style={{
        padding: 16, background: "var(--surface-subtle)",
        borderRadius: 8, border: "1px solid var(--border)",
        fontSize: 13, color: "var(--t3)",
      }}>
        Kommentare sind in Team-Organisationen verfügbar. Lade weitere Mitglieder in den Einstellungen ein.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {comments.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Noch keine Kommentare.</div>
      )}
      {comments.map((c) => {
        const p = memberProfiles[c.user_id];
        return (
          <div key={c.id} style={{
            padding: 12, background: "var(--surface-subtle)",
            borderRadius: 8, border: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>
                {p?.name || p?.email || c.user_id.slice(0, 8)}
              </span>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>
                {new Date(c.created_at).toLocaleString("de-DE")}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--t1)", whiteSpace: "pre-wrap" }}>{c.content}</div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kommentar schreiben…"
          rows={2}
          style={{
            flex: 1, padding: "8px 11px",
            border: "1px solid var(--border-strong)", borderRadius: 8,
            fontSize: 13, fontFamily: "inherit", color: "var(--t1)",
            background: "var(--card)", resize: "vertical",
          }}
        />
        <button onClick={send} className="btn-primary" style={{ alignSelf: "flex-end" }}>Senden</button>
      </div>
    </div>
  );
}

// ============================================================
// Attachments Tab
// ============================================================
function AttachmentsTab({ taskId, organizationId }: { taskId: string; organizationId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("task_attachments")
        .select("*").eq("task_id", taskId).order("created_at", { ascending: false });
      setItems((data ?? []) as TaskAttachment[]);
    })();
  }, [supabase, taskId]);

  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      alert("Datei ist größer als 20 MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const path = `${organizationId}/${taskId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { data } = await supabase.from("task_attachments").insert({
        task_id: taskId, user_id: uid, storage_path: path,
        file_name: file.name, mime_type: file.type, size_bytes: file.size,
      }).select().single();
      if (data) setItems((prev) => [data as TaskAttachment, ...prev]);
    } catch (e) {
      alert("Upload fehlgeschlagen: " + (e instanceof Error ? e.message : "Unbekannt"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function download(a: TaskAttachment) {
    const { data } = await supabase.storage.from("task-attachments")
      .createSignedUrl(a.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function remove(a: TaskAttachment) {
    if (!confirm(`"${a.file_name}" wirklich löschen?`)) return;
    await supabase.storage.from("task-attachments").remove([a.storage_path]);
    await supabase.from("task_attachments").delete().eq("id", a.id);
    setItems((prev) => prev.filter((x) => x.id !== a.id));
  }

  function fmtSize(n: number | null) {
    if (!n) return "";
    if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(n / 1024)} KB`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <input ref={fileRef} type="file" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <button onClick={() => fileRef.current?.click()} className="btn-ghost" disabled={uploading}>
          {uploading ? "Lädt hoch…" : "+ Datei hochladen"}
        </button>
      </div>
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Keine Anhänge.</div>
      )}
      {items.map((a) => (
        <div key={a.id} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
          border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)",
        }}>
          <div style={{ fontSize: 13, color: "var(--t1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.file_name}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)" }}>{fmtSize(a.size_bytes)}</div>
          <button onClick={() => download(a)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Download</button>
          <button onClick={() => remove(a)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--red)" }}>Löschen</button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Subtasks Tab
// ============================================================
function SubtasksTab({
  parent, organizationId, members, memberProfiles,
}: {
  parent: Task;
  organizationId: string;
  members: OrganizationMember[];
  memberProfiles: Record<string, { name: string; email: string }>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [subs, setSubs] = useState<Task[]>([]);
  const [childOpen, setChildOpen] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function refetch() {
    const { data } = await supabase.from("tasks")
      .select("*").eq("parent_task_id", parent.id).order("created_at");
    setSubs((data ?? []) as Task[]);
  }

  useEffect(() => { refetch(); }, [parent.id]); // eslint-disable-line

  async function toggleDone(t: Task) {
    const next = t.status === "done" ? "planned" : "done";
    setSubs((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x));
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={() => setCreateOpen(true)} className="btn-ghost" style={{ alignSelf: "flex-start" }}>
        + Subtask hinzufügen
      </button>
      {subs.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Keine Subtasks.</div>
      )}
      {subs.map((t) => {
        const c = TASK_STATUS_COLORS[t.status];
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)",
          }}>
            <input type="checkbox" checked={t.status === "done"} onChange={() => toggleDone(t)} />
            <button onClick={() => setChildOpen(t)} style={{
              flex: 1, textAlign: "left", background: "none", border: "none",
              fontSize: 13, color: "var(--t1)", cursor: "pointer", padding: 0, fontFamily: "inherit",
              textDecoration: t.status === "done" ? "line-through" : "none",
            }}>
              {t.title}
            </button>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20,
              color: c.fg, background: c.bg,
            }}>
              {({ planned: "Geplant", in_progress: "In Arbeit", on_hold: "Wartet", done: "Erledigt" } as const)[t.status]}
            </span>
          </div>
        );
      })}

      {createOpen && (
        <TaskSheet
          open={createOpen} onClose={() => { setCreateOpen(false); refetch(); }}
          mode="create" organizationId={organizationId}
          members={members} memberProfiles={memberProfiles}
          initialParentTaskId={parent.id}
        />
      )}
      {childOpen && (
        <TaskSheet
          open={!!childOpen} onClose={() => { setChildOpen(null); refetch(); }}
          mode="edit" task={childOpen}
          organizationId={organizationId}
          members={members} memberProfiles={memberProfiles}
        />
      )}
    </div>
  );
}
