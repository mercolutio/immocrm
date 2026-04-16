"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AppSelect from "@/components/AppSelect";
import TaskSheet from "@/components/TaskSheet";
import DatePicker from "@/components/DatePicker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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
} from "@/lib/types";

type View = "list" | "board";
type GroupBy = "none" | "due" | "status" | "priority" | "assignee";

interface TaskRow extends Task {
  _checklist_total: number;
  _checklist_done: number;
  _attachments: number;
  _subtasks: number;
  _linked_label?: string;
  _linked_kind?: "contact" | "property" | "deal";
}

// ============================================================
// Helpers
// ============================================================
function endOfToday(): Date { const d = new Date(); d.setHours(23,59,59,999); return d; }
function startOfToday(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }
function endOfWeek(): Date { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay() || 7)); d.setHours(23,59,59,999); return d; }

function fmtDE(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function dueBucket(iso: string | null): "overdue" | "today" | "week" | "later" | "none" {
  if (!iso) return "none";
  const d = new Date(iso).getTime();
  if (d < startOfToday().getTime()) return "overdue";
  if (d <= endOfToday().getTime()) return "today";
  if (d <= endOfWeek().getTime()) return "week";
  return "later";
}

function dueColor(iso: string | null, done: boolean): string {
  if (done) return "var(--t3)";
  const b = dueBucket(iso);
  if (b === "overdue") return "var(--red)";
  if (b === "today") return "var(--badge-orange)";
  return "var(--t2)";
}

const DUE_LABELS: Record<string, string> = {
  overdue: "Überfällig", today: "Heute", week: "Diese Woche", later: "Später", none: "Ohne Datum",
};
const DUE_COLORS: Record<string, string> = {
  overdue: "var(--red)", today: "var(--badge-orange)", week: "var(--badge-blue)",
  later: "var(--t2)", none: "var(--t3)",
};

// ============================================================
// Main Page
// ============================================================
export default function TasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const orgCtx = useOrganization();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dueFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState<View>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("due");
  const [peekTaskId, setPeekTaskId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [flashQuickAdd, setFlashQuickAdd] = useState(0);

  const focusQuickAdd = useCallback(() => {
    quickAddRef.current?.focus();
    setFlashQuickAdd((n) => n + 1);
  }, []);

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

    const [{ data: chk }, { data: att }, { data: subs }] = await Promise.all([
      ids.length ? supabase.from("task_checklist_items").select("task_id, is_done").in("task_id", ids) : Promise.resolve({ data: [] as { task_id: string; is_done: boolean }[] }),
      ids.length ? supabase.from("task_attachments").select("task_id").in("task_id", ids) : Promise.resolve({ data: [] as { task_id: string }[] }),
      ids.length ? supabase.from("tasks").select("id, parent_task_id").in("parent_task_id", ids) : Promise.resolve({ data: [] as { id: string; parent_task_id: string }[] }),
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

    const contactIds = list.map((t) => t.contact_id).filter(Boolean) as string[];
    const propertyIds = list.map((t) => t.property_id).filter(Boolean) as string[];
    const dealIds = list.map((t) => t.deal_id).filter(Boolean) as string[];
    const [{ data: contacts }, { data: properties }, { data: deals }] = await Promise.all([
      contactIds.length ? supabase.from("contacts").select("id, first_name, last_name").in("id", contactIds) : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
      propertyIds.length ? supabase.from("properties").select("id, title").in("id", propertyIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      dealIds.length ? supabase.from("deals").select("id, title").in("id", dealIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
    const cMap = new Map((contacts ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]));
    const pMap = new Map((properties ?? []).map((p) => [p.id, p.title]));
    const dMap = new Map((deals ?? []).map((d) => [d.id, d.title ?? `Deal ${d.id.slice(0, 6)}`]));

    const enriched: TaskRow[] = list.map((t) => {
      let linkedLabel: string | undefined;
      let linkedKind: "contact" | "property" | "deal" | undefined;
      if (t.contact_id) { linkedLabel = cMap.get(t.contact_id); linkedKind = "contact"; }
      else if (t.property_id) { linkedLabel = pMap.get(t.property_id); linkedKind = "property"; }
      else if (t.deal_id) { linkedLabel = dMap.get(t.deal_id) ?? "Deal"; linkedKind = "deal"; }
      return {
        ...t,
        _checklist_total: chkMap.get(t.id)?.total ?? 0,
        _checklist_done: chkMap.get(t.id)?.done ?? 0,
        _attachments: attMap.get(t.id) ?? 0,
        _subtasks: subMap.get(t.id) ?? 0,
        _linked_label: linkedLabel,
        _linked_kind: linkedKind,
      };
    });

    setTasks(enriched);
    setLoading(false);
  }

  useEffect(() => { if (!orgCtx.loading) refetch(); /* eslint-disable-next-line */ }, [orgCtx.loading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!showDone && t.status === "done") return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (dueFilter !== "all" && dueBucket(t.due_date) !== dueFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && t.assigned_to) return false;
        if (assigneeFilter !== "unassigned" && t.assigned_to !== assigneeFilter) return false;
      }
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false);
    });
  }, [tasks, search, statusFilter, priorityFilter, dueFilter, assigneeFilter, showDone]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.status !== "done" && dueBucket(t.due_date) === "overdue").length,
    [tasks],
  );
  const openCount = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);

  const isTeam = orgCtx.members.length > 1;

  // ---- Mutations ----
  const patchTask = useCallback(async (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } as TaskRow : x));
    await supabase.from("tasks").update(patch).eq("id", id);
  }, [supabase]);

  const toggleDone = useCallback(async (t: Task) => {
    const next = t.status === "done" ? "planned" : "done";
    await patchTask(t.id, { status: next });
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
  }, [patchTask, supabase, orgCtx.organization]);

  async function quickCreate(title: string, prefill?: Partial<Task>): Promise<boolean> {
    if (!title.trim() || !orgCtx.organization) return false;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { data, error } = await supabase.from("tasks").insert({
      organization_id: orgCtx.organization.id,
      user_id: uid,
      title: title.trim(),
      priority: "medium",
      status: "planned",
      recurrence: "none",
      ...prefill,
    }).select().single();
    if (error || !data) return false;
    refetch();
    return true;
  }

  async function moveTaskTo(t: Task, col: string) {
    let patch: Partial<Task> = {};
    if (groupBy === "status") patch = { status: col as TaskStatus };
    else if (groupBy === "priority") patch = { priority: col as TaskPriority };
    else if (groupBy === "assignee") patch = { assigned_to: col === "unassigned" ? null : col };
    else if (groupBy === "due") {
      const today = new Date();
      if (col === "today") patch = { due_date: today.toISOString().slice(0, 10) };
      else if (col === "overdue") { const d = new Date(); d.setDate(d.getDate() - 1); patch = { due_date: d.toISOString().slice(0, 10) }; }
      else if (col === "week") { const d = new Date(); d.setDate(d.getDate() + 3); patch = { due_date: d.toISOString().slice(0, 10) }; }
      else if (col === "later") { const d = new Date(); d.setDate(d.getDate() + 14); patch = { due_date: d.toISOString().slice(0, 10) }; }
      else if (col === "none") patch = { due_date: null };
    }
    if (Object.keys(patch).length) await patchTask(t.id, patch);
  }

  // ---- Keyboard ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inEditable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (inEditable) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "c") { e.preventDefault(); focusQuickAdd(); }
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape") { setPeekTaskId(null); setCreateMode(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusQuickAdd]);

  const peekTask = useMemo(() => tasks.find((t) => t.id === peekTaskId) ?? null, [tasks, peekTaskId]);

  if (orgCtx.loading || !orgCtx.organization) {
    return <DashboardLayout><div style={{ padding: 36, color: "var(--t3)" }}>Lade…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Aufgaben</h1>
          <p className="page-subtitle">
            {openCount} offen
            {overdueCount > 0 && ` · ${overdueCount} überfällig`}
            {tasks.length - openCount > 0 && ` · ${tasks.length - openCount} erledigt`}
          </p>
        </div>
        <div className="page-header-right">
          <button onClick={focusQuickAdd} className="btn-primary"
            title="Neue Aufgabe (c)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neue Aufgabe
            <kbd style={{ marginLeft: 6, fontSize: 10, opacity: 0.7, fontFamily: "inherit" }}>c</kbd>
          </button>
        </div>
      </header>

      <div className="page-toolbar">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input ref={searchRef} className="search-input" placeholder="Suche Aufgaben… (/)"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        <AppSelect value={statusFilter} onChange={setStatusFilter}
          style={{ width: "auto", minWidth: 120 }}
          options={[{ value: "all", label: "Alle Status" },
            ...(Object.entries(TASK_STATUS_LABELS) as [string, string][]).map(([v, l]) => ({ value: v, label: l }))]} />

        <AppSelect value={priorityFilter} onChange={setPriorityFilter}
          style={{ width: "auto", minWidth: 120 }}
          options={[{ value: "all", label: "Alle Prioritäten" },
            ...(Object.entries(TASK_PRIORITY_LABELS) as [string, string][]).map(([v, l]) => ({ value: v, label: l }))]} />

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

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--t2)", cursor: "pointer", marginLeft: 4, whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)}
            style={{ accentColor: "var(--accent)" }} />
          Erledigte zeigen
        </label>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <AppSelect value={groupBy} onChange={(v) => setGroupBy(v as GroupBy)}
            style={{ width: "auto", minWidth: 150 }}
            options={[
              { value: "none", label: "Keine Gruppierung" },
              { value: "due", label: "Nach Fälligkeit" },
              { value: "status", label: "Nach Status" },
              { value: "priority", label: "Nach Priorität" },
              ...(isTeam ? [{ value: "assignee", label: "Nach Zuweisung" }] : []),
            ]} />
          <div className="view-toggle">
            <button onClick={() => setView("list")} className={view === "list" ? "active" : ""} title="Liste">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button onClick={() => setView("board")} className={view === "board" ? "active" : ""} title="Board">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="body-wrap anim-0" style={{ paddingTop: 18, ...(view === "board" ? { paddingRight: 0 } : {}) }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--t3)" }}>Lade…</div>
        ) : view === "list" ? (
          <div key="list" className="view-fade content-reveal">
          <ListView
            tasks={filtered}
            groupBy={groupBy}
            quickAddRef={quickAddRef}
            flashQuickAdd={flashQuickAdd}
            isTeam={isTeam}
            memberProfiles={orgCtx.memberProfiles}
            members={orgCtx.members}
            onPeek={setPeekTaskId}
            onToggleDone={toggleDone}
            onPatch={patchTask}
            onQuickCreate={quickCreate}
            onMoveTo={moveTaskTo}
          />
          </div>
        ) : (
          <div key="board" className="view-fade content-reveal">
          <BoardView
            tasks={filtered}
            groupBy={groupBy === "none" ? "status" : groupBy}
            isTeam={isTeam}
            memberProfiles={orgCtx.memberProfiles}
            members={orgCtx.members}
            onPeek={setPeekTaskId}
            onPatch={patchTask}
            onQuickCreate={quickCreate}
          />
          </div>
        )}
      </div>

      {/* Peek-Panel: Edit */}
      {peekTask && (
        <TaskSheet
          key={`edit-${peekTask.id}`}
          open={true}
          onClose={() => { setPeekTaskId(null); refetch(); }}
          mode="edit"
          task={peekTask}
          organizationId={orgCtx.organization.id}
          members={orgCtx.members}
          memberProfiles={orgCtx.memberProfiles}
          variant="peek"
        />
      )}
      {/* Create (full modal) */}
      {createMode && (
        <TaskSheet
          open={true}
          onClose={() => { setCreateMode(false); refetch(); }}
          mode="create"
          organizationId={orgCtx.organization.id}
          members={orgCtx.members}
          memberProfiles={orgCtx.memberProfiles}
        />
      )}
    </DashboardLayout>
  );
}

// ============================================================
// List View (with group-by + collapsible sections)
// ============================================================
interface ListViewProps {
  tasks: TaskRow[];
  groupBy: GroupBy;
  quickAddRef: React.RefObject<HTMLInputElement>;
  flashQuickAdd: number;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
  members: { user_id: string; role: string }[];
  onPeek: (id: string) => void;
  onToggleDone: (t: Task) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onQuickCreate: (title: string, prefill?: Partial<Task>) => Promise<boolean>;
  onMoveTo: (t: Task, col: string) => void;
}

function ListView(p: ListViewProps) {
  const groups = useMemo(() => buildGroups(p.tasks, p.groupBy, p.members, p.memberProfiles), [p.tasks, p.groupBy, p.members, p.memberProfiles]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setCollapsed((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {p.groupBy === "none" ? (
        <SectionBlock
          headerKey="all"
          label={null}
          color="var(--t3)"
          items={p.tasks}
          collapsed={false}
          onToggle={() => {}}
          showQuickAdd
          quickAddRef={p.quickAddRef}
          flashQuickAdd={p.flashQuickAdd}
          sectionPrefill={{}}
          isTeam={p.isTeam}
          memberProfiles={p.memberProfiles}
          members={p.members}
          onPeek={p.onPeek}
          onToggleDone={p.onToggleDone}
          onPatch={p.onPatch}
          onQuickCreate={p.onQuickCreate}
          onDropTo={null}
        />
      ) : (
        groups.map((g, i) => (
          <SectionBlock
            key={g.key}
            headerKey={g.key}
            label={g.label}
            color={g.color}
            items={g.items}
            collapsed={collapsed.has(g.key)}
            onToggle={() => toggle(g.key)}
            showQuickAdd={i === 0}
            quickAddRef={i === 0 ? p.quickAddRef : undefined}
            flashQuickAdd={i === 0 ? p.flashQuickAdd : 0}
            sectionPrefill={g.prefill}
            isTeam={p.isTeam}
            memberProfiles={p.memberProfiles}
            members={p.members}
            onPeek={p.onPeek}
            onToggleDone={p.onToggleDone}
            onPatch={p.onPatch}
            onQuickCreate={p.onQuickCreate}
            onDropTo={(t) => p.onMoveTo(t, g.key)}
          />
        ))
      )}
      {p.tasks.length === 0 && p.groupBy === "none" && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
          Keine Aufgaben.
        </div>
      )}
    </div>
  );
}

interface Group {
  key: string;
  label: string;
  color: string;
  items: TaskRow[];
  prefill: Partial<Task>;
}

function buildGroups(
  tasks: TaskRow[],
  groupBy: GroupBy,
  members: { user_id: string; role: string }[],
  memberProfiles: Record<string, { name: string; email: string }>,
  keepEmpty = false,
): Group[] {
  const groups: Group[] = [];
  if (groupBy === "due") {
    (["overdue", "today", "week", "later", "none"] as const).forEach((k) => {
      const prefill: Partial<Task> = {};
      if (k === "today") { const d = new Date(); prefill.due_date = d.toISOString().slice(0, 10); }
      if (k === "week")  { const d = new Date(); d.setDate(d.getDate() + 3); prefill.due_date = d.toISOString().slice(0, 10); }
      if (k === "later") { const d = new Date(); d.setDate(d.getDate() + 14); prefill.due_date = d.toISOString().slice(0, 10); }
      groups.push({
        key: k, label: DUE_LABELS[k], color: DUE_COLORS[k],
        items: tasks.filter((t) => dueBucket(t.due_date) === k),
        prefill,
      });
    });
  } else if (groupBy === "status") {
    (Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).forEach(([k, l]) => {
      groups.push({
        key: k, label: l, color: TASK_STATUS_COLORS[k].fg,
        items: tasks.filter((t) => t.status === k),
        prefill: { status: k },
      });
    });
  } else if (groupBy === "priority") {
    (Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).forEach(([k, l]) => {
      groups.push({
        key: k, label: l, color: TASK_PRIORITY_COLORS[k].fg,
        items: tasks.filter((t) => t.priority === k),
        prefill: { priority: k },
      });
    });
  } else if (groupBy === "assignee") {
    groups.push({
      key: "unassigned", label: "Nicht zugewiesen", color: "var(--t3)",
      items: tasks.filter((t) => !t.assigned_to),
      prefill: { assigned_to: null },
    });
    members.forEach((m) => {
      const label = memberProfiles[m.user_id]?.name || memberProfiles[m.user_id]?.email || m.user_id.slice(0, 8);
      groups.push({
        key: m.user_id, label, color: "var(--accent)",
        items: tasks.filter((t) => t.assigned_to === m.user_id),
        prefill: { assigned_to: m.user_id },
      });
    });
  }
  if (keepEmpty) return groups;
  return groups.filter((g) => g.items.length > 0 || g.key === "today" || g.key === "overdue");
}

// ============================================================
// Section (collapsible group)
// ============================================================
interface SectionProps {
  headerKey: string;
  label: string | null;
  color: string;
  items: TaskRow[];
  collapsed: boolean;
  onToggle: () => void;
  showQuickAdd: boolean;
  quickAddRef?: React.RefObject<HTMLInputElement>;
  flashQuickAdd?: number;
  sectionPrefill: Partial<Task>;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
  members: { user_id: string; role: string }[];
  onPeek: (id: string) => void;
  onToggleDone: (t: Task) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onQuickCreate: (title: string, prefill?: Partial<Task>) => Promise<boolean>;
  onDropTo: ((t: Task) => void) | null;
}

function SectionBlock(p: SectionProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      onDragOver={(e) => { if (p.onDropTo) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!p.onDropTo) return;
        setDragOver(false);
        const id = e.dataTransfer.getData("text/task-id");
        if (id) p.onDropTo({ id } as Task);
      }}
      style={{
        borderRadius: 10,
        background: dragOver ? "rgba(194,105,42,0.04)" : "transparent",
        transition: "background 0.12s",
        padding: dragOver ? 2 : 0,
      }}
    >
      {p.label !== null && (
        <button
          onClick={p.onToggle}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 2px", marginBottom: 6,
            color: p.color, fontSize: 11, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em",
            fontFamily: "inherit",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            style={{ transform: p.collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>{p.label}</span>
          <span style={{ color: "var(--t3)", fontWeight: 500 }}>({p.items.length})</span>
        </button>
      )}

      <div style={{
        display: "grid",
        gridTemplateRows: p.collapsed ? "0fr" : "1fr",
        transition: "grid-template-rows 220ms cubic-bezier(0.22,0.61,0.36,1)",
      }}>
        <div style={{ overflow: "hidden" }}>
          <div className="list-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {p.showQuickAdd && (
                  <QuickAddRow
                    inputRef={p.quickAddRef}
                    flashSignal={p.flashQuickAdd ?? 0}
                    onCreate={p.onQuickCreate}
                    sectionPrefill={p.sectionPrefill}
                    isTeam={p.isTeam}
                  />
                )}
                {p.items.map((t, i) => (
                  <TaskListRow
                    key={t.id}
                    task={t}
                    last={i === p.items.length - 1}
                    isTeam={p.isTeam}
                    memberProfiles={p.memberProfiles}
                    members={p.members}
                    onPeek={p.onPeek}
                    onToggleDone={p.onToggleDone}
                    onPatch={p.onPatch}
                  />
                ))}
                {p.items.length === 0 && !p.showQuickAdd && (
                  <tr>
                    <td colSpan={6} style={{ padding: "18px 22px", color: "var(--t3)", fontSize: 12, textAlign: "center" }}>
                      Keine Aufgaben in dieser Gruppe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Quick-Add Row (always visible, Enter keeps open)
// ============================================================
function QuickAddRow({
  inputRef, onCreate, sectionPrefill, isTeam, flashSignal,
}: {
  inputRef?: React.RefObject<HTMLInputElement>;
  onCreate: (title: string, prefill?: Partial<Task>) => Promise<boolean>;
  sectionPrefill: Partial<Task>;
  isTeam: boolean;
  flashSignal: number;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [priority, setPriority] = useState<TaskPriority | undefined>();
  const [status, setStatus] = useState<TaskStatus | undefined>();
  const [dueDate, setDueDate] = useState<string | null | undefined>();
  const [flashing, setFlashing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flashSignal <= 0) return;
    setFlashing(false);
    const id = requestAnimationFrame(() => setFlashing(true));
    return () => cancelAnimationFrame(id);
  }, [flashSignal]);

  const active = focused || val.trim().length > 0;

  async function submit() {
    if (!val.trim() || busy) return;
    setBusy(true);
    const prefill: Partial<Task> = { ...sectionPrefill };
    if (priority !== undefined) prefill.priority = priority;
    if (status !== undefined) prefill.status = status;
    if (dueDate !== undefined) prefill.due_date = dueDate;
    const ok = await onCreate(val, prefill);
    if (ok) { setVal(""); setPriority(undefined); setStatus(undefined); setDueDate(undefined); }
    setBusy(false);
    inputRef?.current?.focus();
  }

  const pc = priority ? TASK_PRIORITY_COLORS[priority] : null;
  const sc = status ? TASK_STATUS_COLORS[status] : null;

  return (
    <tr>
      <td colSpan={isTeam ? 7 : 6} style={{ padding: "8px 14px" }}>
        <div
          ref={wrapRef}
          onAnimationEnd={() => setFlashing(false)}
          className={flashing ? "quickadd-flash" : ""}
          style={{
            borderRadius: 10,
            border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: active
              ? "0 0 0 3px var(--accent-soft), 0 1px 2px rgba(28,24,20,0.03)"
              : "0 1px 2px rgba(28,24,20,0.03)",
            transition: "border-color 120ms ease, box-shadow 120ms ease",
            padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: active ? 10 : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={active ? "var(--accent)" : "var(--t3)"} strokeWidth="2.5" strokeLinecap="round"
              style={{ flexShrink: 0, transition: "stroke 120ms ease" }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <input
              ref={inputRef}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submit(); }
                if (e.key === "Escape") {
                  setVal(""); setPriority(undefined); setStatus(undefined); setDueDate(undefined);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="+ Aufgabe hinzufügen — Enter speichert"
              disabled={busy}
              style={{
                flex: 1, minWidth: 0,
                border: "none", background: "transparent", outline: "none",
                fontSize: 14, color: "var(--t1)", fontFamily: "inherit", padding: 0,
              }}
            />
            <kbd style={{ fontSize: 10, color: "var(--t3)", opacity: active ? 1 : 0, transition: "opacity 120ms" }}>↵</kbd>
          </div>
          {active && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingLeft: 24 }}>
              <QuickAddDate value={dueDate ?? null} onChange={setDueDate} />
              <QuickAddChip
                label={priority ? TASK_PRIORITY_LABELS[priority] : "Priorität"}
                fg={pc?.fg ?? "var(--t2)"} bg={pc?.bg ?? "var(--surface-subtle)"}
                active={priority !== undefined}
                onClear={priority !== undefined ? () => setPriority(undefined) : undefined}
                options={(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([v, l]) => ({
                  value: v, label: l, fg: TASK_PRIORITY_COLORS[v].fg, bg: TASK_PRIORITY_COLORS[v].bg,
                }))}
                onPick={(v) => setPriority(v as TaskPriority)}
                icon={
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
                    <line x1="17" y1="16" x2="23" y2="16"/>
                  </svg>
                }
              />
              <QuickAddChip
                label={status ? TASK_STATUS_LABELS[status] : "Status"}
                fg={sc?.fg ?? "var(--t2)"} bg={sc?.bg ?? "var(--surface-subtle)"}
                active={status !== undefined}
                onClear={status !== undefined ? () => setStatus(undefined) : undefined}
                options={(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => ({
                  value: v, label: l, fg: TASK_STATUS_COLORS[v].fg, bg: TASK_STATUS_COLORS[v].bg,
                }))}
                onPick={(v) => setStatus(v as TaskStatus)}
                icon={
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                }
              />
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--t3)" }}>Esc zum Abbrechen</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function QuickAddDate({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 9px", borderRadius: 14,
          border: active ? "1px solid var(--accent)" : "1px dashed var(--border-strong)",
          background: active ? "var(--accent-soft)" : "transparent",
          color: active ? "var(--accent)" : "var(--t2)",
          fontSize: 11, fontWeight: 500, fontFamily: "inherit",
          cursor: "pointer",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {value ? fmtDE(value) : "Fällig"}
          {active && (
            <span onClick={(e) => { e.stopPropagation(); onChange(null); }}
              style={{ marginLeft: 2, cursor: "pointer", fontSize: 13, lineHeight: 1, opacity: 0.7 }}>×</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 8,
          boxShadow: "0 6px 24px rgba(28,24,20,0.1)" }}>
        <DatePicker value={value} onChange={(v) => { onChange(v); setOpen(false); }} placeholder="Datum" />
      </PopoverContent>
    </Popover>
  );
}

function QuickAddChip({
  label, fg, bg, active, options, onPick, onClear, icon,
}: {
  label: string; fg: string; bg: string; active: boolean;
  options: { value: string; label: string; fg: string; bg: string }[];
  onPick: (v: string) => void;
  onClear?: () => void;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 9px", borderRadius: 14,
          border: active ? "1px solid transparent" : "1px dashed var(--border-strong)",
          background: active ? bg : "transparent",
          color: active ? fg : "var(--t2)",
          fontSize: 11, fontWeight: 500, fontFamily: "inherit",
          cursor: "pointer",
        }}>
          {icon}
          {label}
          {active && onClear && (
            <span onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{ marginLeft: 2, cursor: "pointer", fontSize: 13, lineHeight: 1, opacity: 0.7 }}>×</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, minWidth: 160,
          boxShadow: "0 6px 24px rgba(28,24,20,0.1)" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {options.map((o) => (
            <button key={o.value} className="pop-item" onClick={() => { onPick(o.value); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                border: "none", background: "transparent", borderRadius: 6, cursor: "pointer",
                textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                color: o.fg, background: o.bg }}>{o.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Task Row (list)
// ============================================================
interface RowProps {
  task: TaskRow;
  last: boolean;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
  members: { user_id: string; role: string }[];
  onPeek: (id: string) => void;
  onToggleDone: (t: Task) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
}

function TaskListRow({ task: t, last, isTeam, memberProfiles, members, onPeek, onToggleDone, onPatch }: RowProps) {
  const done = t.status === "done";
  const sc = TASK_STATUS_COLORS[t.status];
  const pc = TASK_PRIORITY_COLORS[t.priority];
  const assignee = t.assigned_to ? (memberProfiles[t.assigned_to]?.name || memberProfiles[t.assigned_to]?.email) : null;

  return (
    <tr className="h-row"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
      style={{
        cursor: "pointer",
        borderBottom: last ? "none" : "1px solid var(--border-subtle)",
        opacity: done ? 0.6 : 1,
        transition: "opacity 300ms ease",
      }}
      onClick={() => onPeek(t.id)}
    >
      <td style={{ padding: "12px 8px 12px 22px", width: 42 }}
          onClick={(e) => { e.stopPropagation(); onToggleDone(t); }}>
        <input type="checkbox" checked={done} onChange={() => {}}
          style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent)" }} />
      </td>
      <td style={{ padding: "12px 22px" }}>
        <div className="cell-primary" style={{
          textDecoration: done ? "line-through" : "none",
          color: done ? "var(--t3)" : "var(--t1)",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          transition: "color 300ms ease",
        }}>
          <span>{t.title}</span>
          {t.recurrence !== "none" && <span title="Wiederholt sich" style={{ fontSize: 11, color: "var(--t3)" }}>↻</span>}
          {t._checklist_total > 0 && (
            <span style={{ fontSize: 11, color: "var(--t3)" }}>✓ {t._checklist_done}/{t._checklist_total}</span>
          )}
          {t._attachments > 0 && <span style={{ fontSize: 11, color: "var(--t3)" }}>◎ {t._attachments}</span>}
          {t._subtasks > 0 && <span style={{ fontSize: 11, color: "var(--t3)" }}>↳ {t._subtasks}</span>}
        </div>
      </td>
      <td style={{ padding: "12px 22px" }} onClick={(e) => e.stopPropagation()}>
        <InlineBadge
          label={TASK_PRIORITY_LABELS[t.priority]}
          fg={pc.fg} bg={pc.bg}
          options={(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([v, l]) => ({
            value: v, label: l, fg: TASK_PRIORITY_COLORS[v].fg, bg: TASK_PRIORITY_COLORS[v].bg,
          }))}
          onPick={(v) => onPatch(t.id, { priority: v as TaskPriority })}
        />
      </td>
      <td style={{ padding: "12px 22px" }} onClick={(e) => e.stopPropagation()}>
        <InlineBadge
          label={TASK_STATUS_LABELS[t.status]}
          fg={sc.fg} bg={sc.bg}
          options={(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => ({
            value: v, label: l, fg: TASK_STATUS_COLORS[v].fg, bg: TASK_STATUS_COLORS[v].bg,
          }))}
          onPick={(v) => onPatch(t.id, { status: v as TaskStatus })}
        />
      </td>
      <td style={{ padding: "12px 22px", color: dueColor(t.due_date, done), fontSize: 13, whiteSpace: "nowrap" }}>
        {fmtDE(t.due_date)}
      </td>
      {isTeam && (
        <td style={{ padding: "12px 22px", fontSize: 13, color: "var(--t2)" }} onClick={(e) => e.stopPropagation()}>
          <InlineAssignee
            current={t.assigned_to}
            label={assignee ?? "—"}
            members={members}
            memberProfiles={memberProfiles}
            onPick={(v) => onPatch(t.id, { assigned_to: v })}
          />
        </td>
      )}
      <td style={{ padding: "12px 22px", fontSize: 13, color: "var(--t2)" }}>
        {t._linked_label
          ? <LinkedChip kind={t._linked_kind} label={t._linked_label} />
          : <span style={{ color: "var(--t3)" }}>—</span>}
      </td>
    </tr>
  );
}

function LinkedChip({ kind, label, compact = false }: {
  kind: "contact" | "property" | "deal" | undefined;
  label: string;
  compact?: boolean;
}) {
  const icon = kind === "contact" ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ) : kind === "property" ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: compact ? "1px 6px" : "2px 8px",
      borderRadius: 4,
      background: "var(--surface-subtle)",
      color: "var(--t2)",
      fontSize: compact ? 10 : 12, fontWeight: 500,
      maxWidth: compact ? 140 : 200,
    }}>
      {icon}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
}

// ============================================================
// Inline Badge (Popover-Select on badge)
// ============================================================
function InlineBadge({
  label, fg, bg, options, onPick,
}: {
  label: string;
  fg: string; bg: string;
  options: { value: string; label: string; fg: string; bg: string }[];
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={{
          display: "inline-block", border: "none",
          fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
          color: fg, background: bg,
          cursor: "pointer", fontFamily: "inherit",
        }}>{label}</button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}
        style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: 4, minWidth: 160,
          boxShadow: "0 6px 24px rgba(28,24,20,0.1)",
        }}
        className="">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {options.map((o) => (
            <button key={o.value} className="pop-item" onClick={() => { onPick(o.value); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", border: "none", background: "transparent",
                borderRadius: 6, cursor: "pointer", textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                color: o.fg, background: o.bg,
              }}>{o.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InlineAssignee({
  current, label, members, memberProfiles, onPick,
}: {
  current: string | null;
  label: string;
  members: { user_id: string; role: string }[];
  memberProfiles: Record<string, { name: string; email: string }>;
  onPick: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={{
          border: "none", background: "transparent",
          fontSize: 13, color: current ? "var(--t2)" : "var(--t3)",
          cursor: "pointer", padding: "2px 6px", borderRadius: 6,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >{label}</button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}
        style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: 4, minWidth: 200,
          boxShadow: "0 6px 24px rgba(28,24,20,0.1)",
        }}
        className="">
        <button className="pop-item" onClick={() => { onPick(null); setOpen(false); }}
          style={{ padding: "6px 10px", border: "none", background: "transparent",
            textAlign: "left", fontSize: 13, color: "var(--t3)", borderRadius: 6,
            cursor: "pointer", width: "100%", fontFamily: "inherit" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >Nicht zugewiesen</button>
        {members.map((m) => {
          const n = memberProfiles[m.user_id]?.name || memberProfiles[m.user_id]?.email || m.user_id.slice(0, 8);
          return (
            <button key={m.user_id} className="pop-item" onClick={() => { onPick(m.user_id); setOpen(false); }}
              style={{ padding: "6px 10px", border: "none", background: "transparent",
                textAlign: "left", fontSize: 13, color: "var(--t1)", borderRadius: 6,
                cursor: "pointer", width: "100%", fontFamily: "inherit",
                fontWeight: current === m.user_id ? 600 : 400 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >{n}</button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Board View (Trello-like, inline add per column)
// ============================================================
interface BoardProps {
  tasks: TaskRow[];
  groupBy: Exclude<GroupBy, "none">;
  isTeam: boolean;
  memberProfiles: Record<string, { name: string; email: string }>;
  members: { user_id: string; role: string }[];
  onPeek: (id: string) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onQuickCreate: (title: string, prefill?: Partial<Task>) => Promise<boolean>;
}

function BoardView(p: BoardProps) {
  const groups = useMemo(() => buildGroups(p.tasks, p.groupBy, p.members, p.memberProfiles, true), [p.tasks, p.groupBy, p.members, p.memberProfiles]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const readonly = p.groupBy === "due";

  function handleDrop(colKey: string) {
    if (!dragId || readonly) return;
    const t = p.tasks.find((x) => x.id === dragId);
    if (!t) return;
    let patch: Partial<Task> = {};
    if (p.groupBy === "status") patch = { status: colKey as TaskStatus };
    else if (p.groupBy === "priority") patch = { priority: colKey as TaskPriority };
    else if (p.groupBy === "assignee") patch = { assigned_to: colKey === "unassigned" ? null : colKey };
    p.onPatch(t.id, patch);
    setDragId(null); setDragOver(null);
  }

  return (
    <div style={{
      display: "flex", gap: 12, overflowX: "auto",
      paddingBottom: 8, paddingRight: 30, paddingLeft: 0,
      height: "calc(100vh - 200px)",
    }}>
      {groups.map((g) => {
        const isOver = dragOver === g.key;
        return (
          <div key={g.key}
            onDragOver={(e) => { if (!readonly) { e.preventDefault(); setDragOver(g.key); } }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(g.key)}
            style={{
              width: 272, minWidth: 272, flexShrink: 0,
              display: "flex", flexDirection: "column",
              borderRadius: 10,
              border: isOver ? "1.5px dashed var(--accent)" : "1px solid var(--border-subtle)",
              background: isOver ? "rgba(194,105,42,0.04)" : "var(--surface-subtle)",
              transition: "border-color 140ms ease, background 140ms ease",
              maxHeight: "100%",
            }}
          >
            <div style={{
              padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: g.color,
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", flex: 1 }}>{g.label}</span>
              <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>{g.items.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {g.items.map((t) => (
                <BoardCard key={t.id} t={t}
                  isDragging={dragId === t.id}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null); }}
                  onPeek={() => p.onPeek(t.id)}
                  assigneeLabel={t.assigned_to ? (p.memberProfiles[t.assigned_to]?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("") || "?") : null}
                />
              ))}
            </div>
            <BoardQuickAdd onCreate={(title) => p.onQuickCreate(title, g.prefill)} />
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({
  t, isDragging, onDragStart, onDragEnd, onPeek, assigneeLabel,
}: {
  t: TaskRow; isDragging: boolean;
  onDragStart: () => void; onDragEnd: () => void;
  onPeek: () => void;
  assigneeLabel: string | null;
}) {
  const pc = TASK_PRIORITY_COLORS[t.priority];
  const progress = t._checklist_total > 0 ? (t._checklist_done / t._checklist_total) : 0;
  const done = t.status === "done";
  return (
    <div draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onPeek}
      className="h-lift"
      style={{
        background: "var(--card)", borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.05)", padding: "9px 11px",
        cursor: isDragging ? "grabbing" : "grab",
        display: "flex", flexDirection: "column", gap: 6,
        boxShadow: isDragging
          ? "0 8px 24px rgba(28,24,20,0.12), 0 2px 6px rgba(28,24,20,0.06)"
          : "0 1px 2px rgba(28,24,20,0.03)",
        opacity: isDragging ? 0.85 : (done ? 0.6 : 1),
        transform: isDragging ? "scale(1.03) rotate(1deg)" : "none",
        transition: "transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
      }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: done ? "var(--t3)" : "var(--t1)",
        textDecoration: done ? "line-through" : "none", lineHeight: 1.3 }}>
        {t.title}
        {t.recurrence !== "none" && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--t3)" }}>↻</span>}
      </div>
      {t._checklist_total > 0 && (
        <div style={{ height: 3, background: "var(--surface-subtle)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)" }} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 20,
          color: pc.fg, background: pc.bg,
        }}>{TASK_PRIORITY_LABELS[t.priority]}</span>
        {t.due_date && (
          <span style={{ fontSize: 11, color: dueColor(t.due_date, done) }}>{fmtDE(t.due_date)}</span>
        )}
        {t._attachments > 0 && <span style={{ fontSize: 10, color: "var(--t3)" }}>◎ {t._attachments}</span>}
        {t._subtasks > 0 && <span style={{ fontSize: 10, color: "var(--t3)" }}>↳ {t._subtasks}</span>}
        {t._linked_label && <LinkedChip kind={t._linked_kind} label={t._linked_label} compact />}
        {assigneeLabel && (
          <span style={{
            marginLeft: "auto", fontSize: 9, fontWeight: 600,
            width: 20, height: 20, borderRadius: "50%",
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{assigneeLabel}</span>
        )}
      </div>
    </div>
  );
}

function BoardQuickAdd({ onCreate }: { onCreate: (title: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  async function submit() {
    if (!val.trim() || busy) return;
    setBusy(true);
    const ok = await onCreate(val);
    if (ok) { setVal(""); ref.current?.focus(); }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{
          margin: 8, padding: "8px 10px",
          border: "none", background: "transparent",
          textAlign: "left", fontSize: 12, color: "var(--t3)",
          cursor: "pointer", borderRadius: 6, fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >+ Aufgabe hinzufügen</button>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") { setOpen(false); setVal(""); }
        }}
        onBlur={() => { if (!val.trim()) setOpen(false); }}
        placeholder="Titel eingeben… Enter"
        disabled={busy}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 6,
          border: "1px solid var(--accent)",
          background: "var(--card)",
          fontSize: 13, color: "var(--t1)", fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
