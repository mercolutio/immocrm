"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AppSelect from "@/components/AppSelect";
import TaskSheet from "@/components/TaskSheet";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/hooks/useOrganization";
import { shouldSpawnNextInstance } from "@/lib/recurrence";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  labelsToOptions,
} from "@/lib/types";

type View = "list" | "due" | "kanban";
type KanbanGroupBy = "status" | "priority" | "due" | "assignee";

interface TaskWithCounts extends Task {
  _checklist_total: number;
  _checklist_done: number;
  _attachments: number;
  _subtasks: number;
  _linked_label?: string;
}

function endOfToday(): Date {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
}

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

function endOfWeek(): Date {
  const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay() || 7)); d.setHours(23,59,59,999); return d;
}

function fmtDE(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dueBucket(iso: string | null): "overdue" | "today" | "week" | "later" | "none" {
  if (!iso) return "none";
  const d = new Date(iso).getTime();
  if (d < startOfToday().getTime()) return "overdue";
  if (d <= endOfToday().getTime()) return "today";
  if (d <= endOfWeek().getTime()) return "week";
  return "later";
}

function dueColor(iso: string | null): string {
  const b = dueBucket(iso);
  if (b === "overdue") return "var(--red)";
  if (b === "today") return "var(--badge-orange)";
  return "var(--t2)";
}

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const orgCtx = useOrganization();
  const [tasks, setTasks] = useState<TaskWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [view, setView] = useState<View>("list");
  const [groupBy, setGroupBy] = useState<KanbanGroupBy>("status");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  async function refetch() {
    setLoading(true);
    const { data: base } = await supabase
      .from("tasks")
      .select("*")
      .is("parent_task_id", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    const list = (base ?? []) as Task[];
    const ids = list.map((t) => t.id);

    // Bulk count checklist/attachments/subtasks
    const [{ data: chk }, { data: att }, { data: subs }] = await Promise.all([
      ids.length
        ? supabase.from("task_checklist_items").select("task_id, is_done").in("task_id", ids)
        : Promise.resolve({ data: [] as { task_id: string; is_done: boolean }[] }),
      ids.length
        ? supabase.from("task_attachments").select("task_id").in("task_id", ids)
        : Promise.resolve({ data: [] as { task_id: string }[] }),
      ids.length
        ? supabase.from("tasks").select("id, parent_task_id").in("parent_task_id", ids)
        : Promise.resolve({ data: [] as { id: string; parent_task_id: string }[] }),
    ]);

    const chkMap = new Map<string, { total: number; done: number }>();
    (chk ?? []).forEach((r) => {
      const cur = chkMap.get(r.task_id) ?? { total: 0, done: 0 };
      cur.total += 1; if (r.is_done) cur.done += 1;
      chkMap.set(r.task_id, cur);
    });
    const attMap = new Map<string, number>();
    (att ?? []).forEach((r) => attMap.set(r.task_id, (attMap.get(r.task_id) ?? 0) + 1));
    const subMap = new Map<string, number>();
    (subs ?? []).forEach((r) => subMap.set(r.parent_task_id, (subMap.get(r.parent_task_id) ?? 0) + 1));

    // Linked labels
    const contactIds = list.map((t) => t.contact_id).filter(Boolean) as string[];
    const propertyIds = list.map((t) => t.property_id).filter(Boolean) as string[];
    const [{ data: contacts }, { data: properties }] = await Promise.all([
      contactIds.length
        ? supabase.from("contacts").select("id, first_name, last_name").in("id", contactIds)
        : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
      propertyIds.length
        ? supabase.from("properties").select("id, title").in("id", propertyIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
    const cMap = new Map((contacts ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]));
    const pMap = new Map((properties ?? []).map((p) => [p.id, p.title]));

    const enriched: TaskWithCounts[] = list.map((t) => ({
      ...t,
      _checklist_total: chkMap.get(t.id)?.total ?? 0,
      _checklist_done: chkMap.get(t.id)?.done ?? 0,
      _attachments: attMap.get(t.id) ?? 0,
      _subtasks: subMap.get(t.id) ?? 0,
      _linked_label: t.contact_id ? cMap.get(t.contact_id)
        : t.property_id ? pMap.get(t.property_id)
        : t.deal_id ? "Deal"
        : undefined,
    }));

    setTasks(enriched);
    setLoading(false);
  }

  useEffect(() => { if (!orgCtx.loading) refetch(); /* eslint-disable-next-line */ }, [orgCtx.loading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (dueFilter !== "all" && dueBucket(t.due_date) !== dueFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && t.assigned_to) return false;
        if (assigneeFilter !== "unassigned" && t.assigned_to !== assigneeFilter) return false;
      }
      if (!q) return true;
      return t.title.toLowerCase().includes(q)
        || (t.description?.toLowerCase().includes(q) ?? false);
    });
  }, [tasks, search, statusFilter, priorityFilter, dueFilter, assigneeFilter]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.status !== "done" && dueBucket(t.due_date) === "overdue").length,
    [tasks],
  );

  async function toggleDone(t: Task) {
    const next = t.status === "done" ? "planned" : "done";
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x));
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    if (next === "done") {
      const spawn = shouldSpawnNextInstance(t.due_date, t.recurrence, t.recurrence_end);
      if (spawn && orgCtx.organization) {
        await supabase.from("tasks").insert({
          organization_id: orgCtx.organization.id,
          user_id: t.user_id,
          contact_id: t.contact_id, property_id: t.property_id, deal_id: t.deal_id,
          assigned_to: t.assigned_to,
          title: t.title, description: t.description,
          status: "planned", priority: t.priority,
          due_date: spawn,
          recurrence: t.recurrence, recurrence_end: t.recurrence_end,
        });
        refetch();
      }
    }
  }

  async function moveTo(t: Task, group: string) {
    let patch: Partial<Task> = {};
    if (groupBy === "status") patch = { status: group as TaskStatus };
    else if (groupBy === "priority") patch = { priority: group as TaskPriority };
    else if (groupBy === "assignee") patch = { assigned_to: group === "unassigned" ? null : group };
    else return;
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, ...patch } as TaskWithCounts : x));
    await supabase.from("tasks").update(patch).eq("id", t.id);
  }

  const isTeam = orgCtx.members.length > 1;

  if (orgCtx.loading || !orgCtx.organization) {
    return (
      <DashboardLayout>
        <div style={{ padding: 36, color: "var(--t3)" }}>Lade…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Aufgaben</h1>
          <p className="page-subtitle">
            {tasks.length} {tasks.length === 1 ? "Aufgabe" : "Aufgaben"}
            {overdueCount > 0 && ` · ${overdueCount} überfällig`}
          </p>
        </div>
        <div className="page-header-right">
          <button onClick={() => { setEditTask(null); setSheetOpen(true); }} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neue Aufgabe
          </button>
        </div>
      </header>

      <div className="page-toolbar">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="search-input" placeholder="Suche Aufgaben…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        <AppSelect value={statusFilter} onChange={setStatusFilter}
          style={{ width: "auto", minWidth: 120 }}
          options={[{ value: "all", label: "Alle Status" }, ...labelsToOptions(TASK_STATUS_LABELS)]} />

        <AppSelect value={priorityFilter} onChange={setPriorityFilter}
          style={{ width: "auto", minWidth: 120 }}
          options={[{ value: "all", label: "Alle Prioritäten" }, ...labelsToOptions(TASK_PRIORITY_LABELS)]} />

        <AppSelect value={dueFilter} onChange={setDueFilter}
          style={{ width: "auto", minWidth: 140 }}
          options={[
            { value: "all", label: "Alle Fälligkeiten" },
            { value: "overdue", label: "Überfällig" },
            { value: "today", label: "Heute" },
            { value: "week", label: "Diese Woche" },
            { value: "later", label: "Später" },
            { value: "none", label: "Ohne Datum" },
          ]} />

        {isTeam && (
          <AppSelect value={assigneeFilter} onChange={setAssigneeFilter}
            style={{ width: "auto", minWidth: 140 }}
            options={[
              { value: "all", label: "Alle Zuweisungen" },
              { value: "unassigned", label: "Nicht zugewiesen" },
              ...orgCtx.members.map((m) => ({
                value: m.user_id,
                label: orgCtx.memberProfiles[m.user_id]?.name || orgCtx.memberProfiles[m.user_id]?.email || m.user_id.slice(0, 8),
              })),
            ]} />
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {view === "kanban" && (
            <AppSelect value={groupBy} onChange={(v) => setGroupBy(v as KanbanGroupBy)}
              style={{ width: "auto", minWidth: 160 }}
              options={[
                { value: "status", label: "Nach Status" },
                { value: "priority", label: "Nach Priorität" },
                { value: "due", label: "Nach Fälligkeit" },
                ...(isTeam ? [{ value: "assignee", label: "Nach Zuweisung" }] : []),
              ]} />
          )}
          <div className="view-toggle">
            <button onClick={() => setView("list")} className={view === "list" ? "active" : ""} title="Liste">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button onClick={() => setView("due")} className={view === "due" ? "active" : ""} title="Nach Fälligkeit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <button onClick={() => setView("kanban")} className={view === "kanban" ? "active" : ""} title="Kanban">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="body-wrap" style={{ paddingTop: 18, ...(view === "kanban" ? { paddingRight: 0 } : {}) }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--t3)" }}>Lade…</div>
        ) : view === "list" ? (
          <TaskListView tasks={filtered} onEdit={(t) => { setEditTask(t); setSheetOpen(true); }}
            onToggleDone={toggleDone} isTeam={isTeam} memberProfiles={orgCtx.memberProfiles} />
        ) : view === "due" ? (
          <TaskByDueView tasks={filtered} onEdit={(t) => { setEditTask(t); setSheetOpen(true); }}
            onToggleDone={toggleDone} isTeam={isTeam} memberProfiles={orgCtx.memberProfiles} />
        ) : (
          <TaskKanbanView tasks={filtered} groupBy={groupBy} onEdit={(t) => { setEditTask(t); setSheetOpen(true); }}
            onMoveTo={moveTo} members={orgCtx.members} memberProfiles={orgCtx.memberProfiles} />
        )}
      </div>

      {sheetOpen && (
        <TaskSheet
          open={sheetOpen}
          onClose={() => { setSheetOpen(false); setEditTask(null); refetch(); }}
          mode={editTask ? "edit" : "create"}
          task={editTask}
          organizationId={orgCtx.organization.id}
          members={orgCtx.members}
          memberProfiles={orgCtx.memberProfiles}
        />
      )}
    </DashboardLayout>
  );
}

// ============================================================
// List View
// ============================================================
function TaskListView({
  tasks, onEdit, onToggleDone, isTeam, memberProfiles,
}: {
  tasks: TaskWithCounts[];
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
}) {
  if (tasks.length === 0) {
    return (
      <div className="list-table-wrap" style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
        Keine Aufgaben gefunden.
      </div>
    );
  }
  const headers: string[] = ["", "Titel", "Priorität", "Status", "Fällig"];
  if (isTeam) headers.push("Zugewiesen");
  headers.push("Verknüpft");
  return (
    <div className="list-table-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: i === 0 ? "12px 8px 12px 22px" : "12px 22px",
                width: i === 0 ? 42 : undefined,
                textAlign: "left",
                fontSize: 11, fontWeight: 600, color: "var(--t3)",
                textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => {
            const sc = TASK_STATUS_COLORS[t.status];
            const pc = TASK_PRIORITY_COLORS[t.priority];
            const assignee = t.assigned_to ? (memberProfiles[t.assigned_to]?.name || memberProfiles[t.assigned_to]?.email) : null;
            const done = t.status === "done";
            return (
              <tr key={t.id} className="h-row"
                style={{
                  cursor: "pointer",
                  borderBottom: i < tasks.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  opacity: done ? 0.7 : 1,
                }}
                onClick={() => onEdit(t)}
              >
                <td style={{ padding: "14px 8px 14px 22px", width: 42 }}
                    onClick={(e) => { e.stopPropagation(); onToggleDone(t); }}>
                  <input type="checkbox" checked={done} onChange={() => {}}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent)" }} />
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <div className="cell-primary" style={{
                    textDecoration: done ? "line-through" : "none",
                    color: done ? "var(--t3)" : "var(--t1)",
                    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  }}>
                    <span>{t.title}</span>
                    {t.recurrence !== "none" && <span title="Wiederholt sich" style={{ fontSize: 11, color: "var(--t3)" }}>↻</span>}
                    {t._checklist_total > 0 && (
                      <span style={{ fontSize: 11, color: "var(--t3)" }}>✓ {t._checklist_done}/{t._checklist_total}</span>
                    )}
                    {t._attachments > 0 && (
                      <span style={{ fontSize: 11, color: "var(--t3)" }}>◎ {t._attachments}</span>
                    )}
                    {t._subtasks > 0 && (
                      <span style={{ fontSize: 11, color: "var(--t3)" }}>↳ {t._subtasks}</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                    color: pc.fg, background: pc.bg,
                  }}>
                    {TASK_PRIORITY_LABELS[t.priority]}
                  </span>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                    color: sc.fg, background: sc.bg,
                  }}>
                    {TASK_STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td style={{ padding: "14px 22px", color: done ? "var(--t3)" : dueColor(t.due_date), fontSize: 13, whiteSpace: "nowrap" }}>
                  {fmtDE(t.due_date)}
                </td>
                {isTeam && (
                  <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                    {assignee ?? <span style={{ color: "var(--t3)" }}>—</span>}
                  </td>
                )}
                <td style={{ padding: "14px 22px", fontSize: 13, color: "var(--t2)" }}>
                  {t._linked_label ?? <span style={{ color: "var(--t3)" }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// By Due View
// ============================================================
function TaskByDueView(props: {
  tasks: TaskWithCounts[];
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
}) {
  const groups: { key: string; label: string; color: string; items: TaskWithCounts[] }[] = [
    { key: "overdue", label: "Überfällig", color: "var(--red)", items: [] },
    { key: "today", label: "Heute", color: "var(--badge-orange)", items: [] },
    { key: "week", label: "Diese Woche", color: "var(--badge-blue)", items: [] },
    { key: "later", label: "Später", color: "var(--t2)", items: [] },
    { key: "none", label: "Ohne Datum", color: "var(--t3)", items: [] },
  ];
  props.tasks.forEach((t) => {
    const b = dueBucket(t.due_date);
    groups.find((g) => g.key === b)?.items.push(t);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {groups.map((g) => g.items.length > 0 && (
        <div key={g.key}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
            color: g.color,
          }}>
            {g.label}
            <span style={{ color: "var(--t3)", fontWeight: 500 }}>({g.items.length})</span>
          </div>
          <TaskListView
            tasks={g.items}
            onEdit={props.onEdit}
            onToggleDone={props.onToggleDone}
            isTeam={props.isTeam}
            memberProfiles={props.memberProfiles}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Kanban View
// ============================================================
function TaskKanbanView({
  tasks, groupBy, onEdit, onMoveTo, members, memberProfiles,
}: {
  tasks: TaskWithCounts[];
  groupBy: KanbanGroupBy;
  onEdit: (t: Task) => void;
  onMoveTo: (t: Task, group: string) => void;
  members: import("@/lib/types").OrganizationMember[];
  memberProfiles: Record<string, { name: string; email: string }>;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  type Col = { key: string; label: string; color: string };
  const cols: Col[] = (() => {
    if (groupBy === "status") {
      return (Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([k, l]) => ({
        key: k, label: l, color: TASK_STATUS_COLORS[k].fg,
      }));
    }
    if (groupBy === "priority") {
      return (Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([k, l]) => ({
        key: k, label: l, color: TASK_PRIORITY_COLORS[k].fg,
      }));
    }
    if (groupBy === "due") {
      return [
        { key: "overdue", label: "Überfällig", color: "var(--red)" },
        { key: "today", label: "Heute", color: "var(--badge-orange)" },
        { key: "week", label: "Diese Woche", color: "var(--badge-blue)" },
        { key: "later", label: "Später", color: "var(--t2)" },
        { key: "none", label: "Ohne Datum", color: "var(--t3)" },
      ];
    }
    return [
      { key: "unassigned", label: "Nicht zugewiesen", color: "var(--t3)" },
      ...members.map((m) => ({
        key: m.user_id,
        label: memberProfiles[m.user_id]?.name || memberProfiles[m.user_id]?.email || m.user_id.slice(0, 8),
        color: "var(--accent)",
      })),
    ];
  })();

  function bucket(t: Task): string {
    if (groupBy === "status") return t.status;
    if (groupBy === "priority") return t.priority;
    if (groupBy === "due") return dueBucket(t.due_date);
    return t.assigned_to ?? "unassigned";
  }

  const readonly = groupBy === "due";

  return (
    <div style={{
      display: "flex", gap: 14, overflowX: "auto",
      paddingTop: 10, paddingBottom: 8, paddingRight: 30,
      height: "calc(100vh - 180px)",
    }}>
      {cols.map((col) => {
        const items = tasks.filter((t) => bucket(t) === col.key);
        const isDragOver = dragOver === col.key;
        return (
          <div key={col.key}
            onDragOver={(e) => { if (!readonly) { e.preventDefault(); setDragOver(col.key); } }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              if (readonly || !dragId) return;
              const t = tasks.find((x) => x.id === dragId);
              if (t) onMoveTo(t, col.key);
              setDragId(null); setDragOver(null);
            }}
            style={{
              width: 280, minWidth: 280, flexShrink: 0,
              background: isDragOver ? "rgba(194,105,42,0.04)" : "var(--bg)",
              border: isDragOver ? "1px dashed var(--accent)" : "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16, display: "flex", flexDirection: "column",
            }}>
            <div style={{ height: 4, borderRadius: "16px 16px 0 0", background: col.color }} />
            <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", flex: 1 }}>{col.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: col.color, background: `${col.color}18`, padding: "1px 7px", borderRadius: 8 }}>
                {items.length}
              </span>
            </div>
            {readonly && (
              <div style={{ padding: "0 16px 10px", fontSize: 11, color: "var(--t3)" }}>
                In dieser Ansicht keine Verschiebung möglich.
              </div>
            )}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((t) => {
                const pc = TASK_PRIORITY_COLORS[t.priority];
                const progress = t._checklist_total > 0 ? (t._checklist_done / t._checklist_total) : 0;
                return (
                  <div key={t.id}
                    draggable={!readonly}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={() => onEdit(t)}
                    className="h-lift"
                    style={{
                      background: "var(--card)", borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.06)", padding: "10px 12px",
                      cursor: readonly ? "pointer" : "grab",
                      display: "flex", flexDirection: "column", gap: 6,
                      boxShadow: "0 1px 4px rgba(28,24,20,0.04)",
                      opacity: dragId === t.id ? 0.5 : 1,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ flex: 1 }}>{t.title}</span>
                      {t.recurrence !== "none" && <span style={{ fontSize: 11 }}>🔁</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, color: pc.fg, background: pc.bg }}>
                        {TASK_PRIORITY_LABELS[t.priority]}
                      </span>
                      <span style={{ fontSize: 11, color: dueColor(t.due_date) }}>{fmtDE(t.due_date)}</span>
                    </div>
                    {t._checklist_total > 0 && (
                      <div style={{ height: 3, background: "var(--surface-subtle)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)" }} />
                      </div>
                    )}
                    {(t._attachments > 0 || t._subtasks > 0 || t.assigned_to) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--t3)" }}>
                        {t._attachments > 0 && <span>📎 {t._attachments}</span>}
                        {t._subtasks > 0 && <span>↪︎ {t._subtasks}</span>}
                        {t.assigned_to && <span style={{ marginLeft: "auto" }}>
                          {memberProfiles[t.assigned_to]?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("") || "—"}
                        </span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
