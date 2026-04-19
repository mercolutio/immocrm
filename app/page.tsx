"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";
import TodayFeed from "@/components/dashboard/today-feed";
import type { AppointmentItem } from "@/components/dashboard/types";
import { getTodayAppointments } from "@/lib/mock/appointments";
import { createClient } from "@/lib/supabase/client";
import { shouldSpawnNextInstance } from "@/lib/recurrence";
import type { Task } from "@/lib/types";

// ---------- Helpers ----------

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 17) return "Guten Tag";
  if (hour >= 17 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function formatDateDE(d: Date): string {
  return `${WEEKDAYS_DE[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function formatEUR(n: number): string {
  if (!n) return "€0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `€${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n).toLocaleString("de-DE")}`;
}

function relativeTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");

  if (d.toDateString() === now.toDateString()) {
    if (minutes < 1) return "gerade eben";
    if (minutes < 60) return `vor ${minutes} Min.`;
    return `Heute, ${hh}:${mm}`;
  }
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function dailyBuckets(dates: Date[], days: number): number[] {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const buckets = new Array(days).fill(0);
  for (const d of dates) {
    const diff = Math.floor((endOfToday.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
  }
  return buckets;
}

function dailyBucketsSum(entries: Array<{ date: Date; value: number }>, days: number): number[] {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const buckets = new Array(days).fill(0);
  for (const e of entries) {
    const diff = Math.floor((endOfToday.getTime() - e.date.getTime()) / (24 * 60 * 60 * 1000));
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += e.value;
  }
  return buckets;
}

// Normalize to 0..100 percent heights, min 8% so empty days are still visible.
function sparkHeights(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max <= 0) return values.map(() => 12);
  return values.map((v) => Math.max(8, Math.round((v / max) * 100)));
}

// ---------- Types ----------

type ActivityType = "call" | "email" | "viewing" | "meeting" | "note";

interface FeedItem {
  id: string;
  type: ActivityType;
  summary: string;
  sub: string;
  happenedAt: string;
}

interface DealRow {
  id: string;
  stage_id: string | null;
  commission: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface StageRow {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

interface PipeSnapItem {
  id: string;
  name: string;
  color: string;
  count: number;
  sum: number;
  isWon: boolean;
}

const FEED_COLORS: Record<ActivityType, { bg: string; fg: string }> = {
  call:    { bg: "var(--pur-bg)", fg: "#6D28D9" },
  email:   { bg: "var(--blu-bg)", fg: "#2457B3" },
  viewing: { bg: "var(--grn-bg)", fg: "#1E8A5C" },
  meeting: { bg: "var(--amb-bg)", fg: "#9A6514" },
  note:    { bg: "var(--accent-soft)", fg: "var(--accent)" },
};

function FeedIcon({ type }: { type: ActivityType }) {
  const c = FEED_COLORS[type];
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: c.fg, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "call":
      return <svg {...common}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.92.37 1.82.7 2.68a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.4-1.27a2 2 0 012.11-.45c.86.33 1.76.57 2.68.7A2 2 0 0122 16.92z"/></svg>;
    case "email":
      return <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    case "viewing":
      return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "meeting":
      return <svg {...common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case "note":
      return <svg {...common}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  }
}

// ---------- Component ----------

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [qaOpen, setQaOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // User + task status
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments] = useState<AppointmentItem[]>(() => getTodayAppointments());

  // Dashboard raw data
  const [allDeals, setAllDeals] = useState<DealRow[]>([]);
  const [allContacts, setAllContacts] = useState<Array<{ created_at: string }>>([]);
  const [pipelineStages, setPipelineStages] = useState<StageRow[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const isDone = localStorage.getItem("immocrm_onboarding_done") === "true";
    const hasWelcome = new URLSearchParams(window.location.search).get("welcome") === "1";
    if (!isDone || hasWelcome) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const meta = auth.user?.user_metadata ?? {};
      const firstMeta = String((meta.first_name as string | undefined) ?? "").trim();
      const fullMeta = String((meta.full_name as string | undefined) ?? "").trim();
      const derivedFirst = firstMeta || (fullMeta ? fullMeta.split(/\s+/)[0] : "");
      setUserFirstName(derivedFirst);

      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

      const [
        dueUpToTodayRes,
        dealsRes,
        contactsRes,
        stagesRes,
        activitiesRes,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .neq("status", "done")
          .not("due_date", "is", null)
          .lte("due_date", endOfToday.toISOString())
          .or(`assigned_to.eq.${uid},and(assigned_to.is.null,user_id.eq.${uid})`)
          .limit(100),
        supabase
          .from("deals")
          .select("id, stage_id, commission, created_at, updated_at, closed_at")
          .eq("user_id", uid),
        supabase
          .from("contacts")
          .select("created_at")
          .eq("user_id", uid)
          .eq("is_archived", false),
        supabase
          .from("pipeline_stages")
          .select("id, name, color, position, is_won, is_lost")
          .eq("user_id", uid)
          .order("position"),
        supabase
          .from("activities")
          .select("id, type, summary, happened_at, contacts(first_name, last_name), properties(title)")
          .eq("user_id", uid)
          .order("happened_at", { ascending: false })
          .limit(4),
      ]);

      setTasks((dueUpToTodayRes.data ?? []) as Task[]);

      setAllDeals((dealsRes.data ?? []) as DealRow[]);
      setAllContacts((contactsRes.data ?? []) as Array<{ created_at: string }>);
      setPipelineStages((stagesRes.data ?? []) as StageRow[]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feedItems: FeedItem[] = ((activitiesRes.data ?? []) as any[]).map((a) => {
        const contact = Array.isArray(a.contacts) ? a.contacts[0] : a.contacts;
        const property = Array.isArray(a.properties) ? a.properties[0] : a.properties;
        const subParts: string[] = [];
        if (property?.title) subParts.push(property.title);
        if (contact) {
          const full = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
          if (full) subParts.push(full);
        }
        return {
          id: a.id,
          type: a.type as ActivityType,
          summary: a.summary,
          sub: subParts.join(" · "),
          happenedAt: a.happened_at,
        };
      });
      setFeed(feedItems);
    })();
  }, [supabase]);

  // ---------- Derived ----------

  const mtdStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }, []);
  const lastMtdStart = useMemo(() => { const d = new Date(mtdStart); d.setMonth(d.getMonth() - 1); return d; }, [mtdStart]);

  const stageById = useMemo(() => new Map(pipelineStages.map((s) => [s.id, s])), [pipelineStages]);

  const kpis = useMemo(() => {
    const isWon    = (sid: string | null) => sid ? stageById.get(sid)?.is_won  === true : false;
    const isLost   = (sid: string | null) => sid ? stageById.get(sid)?.is_lost === true : false;
    const isTerminal = (sid: string | null) => isWon(sid) || isLost(sid);

    const provisionMTD = allDeals
      .filter((d) => d.closed_at && isWon(d.stage_id) && new Date(d.closed_at) >= mtdStart)
      .reduce((s, d) => s + (Number(d.commission) || 0), 0);
    const provisionLastMTD = allDeals
      .filter((d) => d.closed_at && isWon(d.stage_id)
        && new Date(d.closed_at) >= lastMtdStart && new Date(d.closed_at) < mtdStart)
      .reduce((s, d) => s + (Number(d.commission) || 0), 0);
    const provisionPct = provisionLastMTD > 0
      ? Math.round(((provisionMTD - provisionLastMTD) / provisionLastMTD) * 100)
      : null;

    const activeDeals = allDeals.filter((d) => !isTerminal(d.stage_id));
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newThisWeek = allDeals.filter((d) => new Date(d.created_at) >= sevenDaysAgo && !isTerminal(d.stage_id)).length;

    const contactsMTD = allContacts.filter((c) => new Date(c.created_at) >= mtdStart).length;
    const startToday = new Date(); startToday.setHours(0,0,0,0);
    const contactsToday = allContacts.filter((c) => new Date(c.created_at) >= startToday).length;

    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentWon = allDeals.filter((d) => d.closed_at && isWon(d.stage_id) && new Date(d.closed_at) >= ninetyDaysAgo);
    const avgCloseDays = recentWon.length > 0
      ? Math.round(recentWon.reduce((s, d) => s + (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / (24*60*60*1000), 0) / recentWon.length)
      : null;
    // Vormonat zum Vergleich: zwischen 180 und 90 Tagen
    const oneEightyDaysAgo = new Date(); oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
    const priorWon = allDeals.filter((d) => d.closed_at && isWon(d.stage_id)
      && new Date(d.closed_at) >= oneEightyDaysAgo && new Date(d.closed_at) < ninetyDaysAgo);
    const priorAvgCloseDays = priorWon.length > 0
      ? Math.round(priorWon.reduce((s, d) => s + (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / (24*60*60*1000), 0) / priorWon.length)
      : null;
    const closeDaysDelta = (avgCloseDays !== null && priorAvgCloseDays !== null) ? (avgCloseDays - priorAvgCloseDays) : null;

    const sparkProvision = sparkHeights(dailyBucketsSum(
      allDeals.filter((d) => d.closed_at && isWon(d.stage_id))
        .map((d) => ({ date: new Date(d.closed_at!), value: Number(d.commission) || 0 })),
      7,
    ));
    const sparkActive = sparkHeights(dailyBuckets(
      allDeals.filter((d) => !isTerminal(d.stage_id)).map((d) => new Date(d.created_at)),
      7,
    ));
    const sparkContacts = sparkHeights(dailyBuckets(allContacts.map((c) => new Date(c.created_at)), 7));
    const sparkClose = sparkHeights(recentWon.length > 0
      ? dailyBuckets(recentWon.map((d) => new Date(d.closed_at!)), 7)
      : [0,0,0,0,0,0,0]);

    return {
      provisionMTD, provisionPct,
      activeDeals: activeDeals.length, newThisWeek,
      contactsMTD, contactsToday,
      avgCloseDays, closeDaysDelta,
      sparkProvision, sparkActive, sparkContacts, sparkClose,
    };
  }, [allDeals, allContacts, stageById, mtdStart, lastMtdStart]);

  const pipeSnap = useMemo(() => {
    const byStage = new Map<string, { count: number; sum: number }>();
    for (const d of allDeals) {
      if (!d.stage_id) continue;
      const g = byStage.get(d.stage_id) ?? { count: 0, sum: 0 };
      g.count++;
      g.sum += Number(d.commission) || 0;
      byStage.set(d.stage_id, g);
    }
    const visible = pipelineStages.filter((s) => !s.is_lost).slice(0, 5);
    const items: PipeSnapItem[] = visible.map((s) => ({
      id: s.id, name: s.name, color: s.color,
      isWon: s.is_won,
      count: byStage.get(s.id)?.count ?? 0,
      sum: byStage.get(s.id)?.sum ?? 0,
    }));
    const maxCount = Math.max(1, ...items.map((i) => i.count));
    return { items, maxCount };
  }, [allDeals, pipelineStages]);

  const staleCount = useMemo(() => {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return allDeals.filter((d) => {
      const s = d.stage_id ? stageById.get(d.stage_id) : null;
      if (!s || s.is_won || s.is_lost) return false;
      return new Date(d.updated_at) < sevenDaysAgo;
    }).length;
  }, [allDeals, stageById]);

  const today = useMemo(() => new Date(), []);
  const greeting = greetingFor(today.getHours());

  const { overdueCount, dueTodayCount } = useMemo(() => {
    const startMs = new Date().setHours(0, 0, 0, 0);
    const endMs = new Date().setHours(23, 59, 59, 999);
    let overdue = 0;
    let dueToday = 0;
    for (const t of tasks) {
      if (!t.due_date) continue;
      const ts = new Date(t.due_date).getTime();
      if (ts < startMs) overdue++;
      else if (ts <= endMs) dueToday++;
    }
    return { overdueCount: overdue, dueTodayCount: dueToday };
  }, [tasks]);

  const urgentFragment = overdueCount > 0
    ? `${overdueCount} überfälliger Punkt${overdueCount === 1 ? "" : "e"}`
    : dueTodayCount > 0
      ? `${dueTodayCount} fällige${dueTodayCount === 1 ? "r Punkt" : " Punkte"} heute`
      : "alles klar heute";

  async function completeTaskById(taskId: string) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    await supabase.from("tasks").update({ status: "done" }).eq("id", t.id);
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const next = shouldSpawnNextInstance(t.due_date, t.recurrence, t.recurrence_end);
    if (next) {
      await supabase.from("tasks").insert({
        organization_id: t.organization_id, user_id: t.user_id,
        contact_id: t.contact_id, property_id: t.property_id, deal_id: t.deal_id,
        assigned_to: t.assigned_to, title: t.title, description: t.description,
        status: "planned", priority: t.priority, due_date: next,
        recurrence: t.recurrence, recurrence_end: t.recurrence_end,
      });
    }
  }

  const greetingText = userFirstName ? `${greeting}, ${userFirstName}.` : `${greeting}.`;
  const provisionTrendCls = kpis.provisionPct !== null
    ? (kpis.provisionPct >= 0 ? "up" : "down")
    : "up";
  const closeTrendCls = kpis.closeDaysDelta !== null
    ? (kpis.closeDaysDelta <= 0 ? "up" : "down")
    : "up";

  return (
    <DashboardLayout>
      <main className="main">
        {/* HEADER */}
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{greetingText}</h1>
            <p className="page-subtitle">{formatDateDE(today)} · {urgentFragment}</p>
          </div>
          <div className="page-header-right">
            <NotificationBell />
            <div className="qa-wrap">
              <button id="onb-btn-neu" className="btn-primary" onClick={() => setQaOpen(!qaOpen)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Neu
              </button>
              <div className={`quick-add-menu${qaOpen ? " open" : ""}`}>
                <Link href="/contacts" className="qa-item pop-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  Kontakt anlegen
                </Link>
                <Link href="/properties" className="qa-item pop-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Objekt anlegen
                </Link>
                <Link href="/pipeline" className="qa-item pop-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Deal eröffnen
                </Link>
                <Link href="/tasks" className="qa-item pop-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  Aufgabe erstellen
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="body-wrap" style={{ paddingTop: 20 }}>

          {/* KPI STRIP */}
          <div className="kpi-strip anim-0">
            <div className="kpi h-lift">
              <div className="kpi-label">Provision MTD</div>
              <div className="kpi-row">
                <div className="kpi-val">{formatEUR(kpis.provisionMTD)}</div>
              </div>
              <div className="kpi-footer">
                <div className={`kpi-trend ${provisionTrendCls}`}>
                  {kpis.provisionPct !== null
                    ? `${kpis.provisionPct >= 0 ? "↑" : "↓"} ${kpis.provisionPct >= 0 ? "+" : ""}${kpis.provisionPct}% ggü. Vormonat`
                    : "noch kein Vormonats-Vergleich"}
                </div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--grn)"} as React.CSSProperties}>
                  {kpis.sparkProvision.map((h, i) => (
                    <div key={i} className={`spark-bar${i >= 5 ? " hi" : ""}`} style={{height: `${h}%`}}/>
                  ))}
                </div>
              </div>
            </div>
            <div className="kpi h-lift">
              <div className="kpi-label">Aktive Deals</div>
              <div className="kpi-row">
                <div className="kpi-val">{kpis.activeDeals}</div>
                <span className="kpi-unit">Deals</span>
              </div>
              <div className="kpi-footer">
                <div className={`kpi-trend ${kpis.newThisWeek > 0 ? "up" : ""}`}>
                  {kpis.newThisWeek > 0 ? `↑ +${kpis.newThisWeek} diese Woche` : "keine neuen diese Woche"}
                </div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--grn)"} as React.CSSProperties}>
                  {kpis.sparkActive.map((h, i) => (
                    <div key={i} className={`spark-bar${i >= 5 ? " hi" : ""}`} style={{height: `${h}%`}}/>
                  ))}
                </div>
              </div>
            </div>
            <div className="kpi h-lift">
              <div className="kpi-label">Neue Kontakte</div>
              <div className="kpi-row">
                <div className="kpi-val">{kpis.contactsMTD}</div>
                <span className="kpi-unit">diesen Monat</span>
              </div>
              <div className="kpi-footer">
                <div className={`kpi-trend ${kpis.contactsToday > 0 ? "warn" : ""}`}>
                  {kpis.contactsToday > 0 ? `+${kpis.contactsToday} heute` : "heute noch keine"}
                </div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--amb)"} as React.CSSProperties}>
                  {kpis.sparkContacts.map((h, i) => (
                    <div key={i} className={`spark-bar${i >= 5 ? " hi" : ""}`} style={{height: `${h}%`}}/>
                  ))}
                </div>
              </div>
            </div>
            <div className="kpi h-lift">
              <div className="kpi-label">Ø Abschlusszeit</div>
              <div className="kpi-row">
                <div className="kpi-val">{kpis.avgCloseDays ?? "—"}</div>
                <span className="kpi-unit">Tage</span>
              </div>
              <div className="kpi-footer">
                <div className={`kpi-trend ${closeTrendCls}`}>
                  {kpis.closeDaysDelta !== null
                    ? `${kpis.closeDaysDelta <= 0 ? "↓" : "↑"} ${kpis.closeDaysDelta >= 0 ? "+" : ""}${kpis.closeDaysDelta}d ggü. Vormonat`
                    : "noch nicht genug Daten"}
                </div>
                <div className="kpi-sparkline" style={{"--spark-color": kpis.closeDaysDelta !== null && kpis.closeDaysDelta > 0 ? "var(--red)" : "var(--grn)"} as React.CSSProperties}>
                  {kpis.sparkClose.map((h, i) => (
                    <div key={i} className={`spark-bar${i >= 5 ? " hi" : ""}`} style={{height: `${h}%`}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID: HEUTE + KI */}
          <div className="main-grid anim-1">

            {/* TAGESSTART */}
            <TodayFeed
              tasks={tasks}
              appointments={appointments}
              onCompleteTask={completeTaskById}
            />


            {/* KI-PANEL */}
            <div className="ki-panel">
              <div className="ki-hdr">
                <div className="ki-hdr-l">
                  <div className="ki-dot"/>
                  <div className="ki-name">KI-Berater</div>
                </div>
                <div className="ki-tag">Live</div>
              </div>
              <div className="ki-cards">
                <div className="ki-card pop-item">
                  <div className="ki-chip chip-alert">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                    Handlungsbedarf
                  </div>
                  <div className="ki-body"><strong>Penthouse Charlottenburg</strong> — 14 Tage ohne Besichtigung.</div>
                  <div className="ki-data">Vergleich: Ø 8 Tage · Preis 5% über Markt</div>
                  <div className="ki-action">
                    Objekt öffnen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
                <div className="ki-card pop-item">
                  <div className="ki-chip chip-chance">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Chance erkannt
                  </div>
                  <div className="ki-body"><strong>Sarah König</strong> hat 3× nach Berlin-Mitte angefragt. Score: 94%.</div>
                  <div className="ki-data">2 passende Objekte · Optimaler Zeitpunkt</div>
                  <div className="ki-action">
                    Mail entwerfen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
                <div className="ki-card pop-item">
                  <div className="ki-chip chip-follow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Follow-up fällig
                  </div>
                  <div className="ki-body"><strong>Dr. Wagner</strong> — kein Feedback seit 48h nach Besichtigung.</div>
                  <div className="ki-data">Optimaler Nachfass-Zeitpunkt: jetzt</div>
                  <div className="ki-action">
                    Kontakt öffnen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="ki-input-wrap">
                <div className="ki-input-row">
                  <input className="ki-inp" type="text" placeholder="Frage die KI etwas…"/>
                  <button className="ki-send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0A1208" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM GRID — Pipeline + Feed */}
          <div className="bottom-grid anim-2" style={{ gridTemplateColumns: "1fr 1fr" }}>

            {/* PIPELINE */}
            <div className="card pipe-card">
              <div className="card-hdr">
                <span className="card-title">Pipeline-Snapshot</span>
                <Link className="card-cta" href="/pipeline">
                  Pipeline öffnen
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
              {pipeSnap.items.length === 0 ? (
                <div style={{ padding: "24px 0", color: "var(--t3)", fontSize: 13 }}>
                  Noch keine Pipeline-Stufen.
                </div>
              ) : (
                <div className="pipe-chart" style={{ gridTemplateColumns: `repeat(${pipeSnap.items.length}, 1fr)` }}>
                  {pipeSnap.items.map((s) => {
                    const h = Math.round((s.count / pipeSnap.maxCount) * 100);
                    const bg = s.isWon ? "var(--accent)" : `${s.color}cc`;
                    return (
                      <div className="pipe-col" key={s.id}>
                        <div className="pipe-n">{s.count}</div>
                        <div className="pipe-eur">{s.sum > 0 ? formatEUR(s.sum) : "—"}</div>
                        <div className="pipe-bar-wrap">
                          <div className="pipe-bar" style={{ height: `${Math.max(6, h)}%`, background: bg }}/>
                        </div>
                        <div className="pipe-label">{s.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {staleCount > 0 && (
                <Link href="/pipeline" className="funnel-alert" style={{ textDecoration: "none" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {staleCount} Deal{staleCount === 1 ? "" : "s"} ohne Aktivität seit &gt;7 Tagen → ansehen
                </Link>
              )}
            </div>

            {/* AKTIVITÄTS-FEED */}
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">Letzte Aktivitäten</span>
                <Link className="card-cta" href="/contacts">
                  Alle
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
              <div className="feed-list">
                {feed.length === 0 && (
                  <div style={{ padding: 20, fontSize: 13, color: "var(--t3)" }}>
                    Noch keine Aktivitäten erfasst.
                  </div>
                )}
                {feed.map((it) => (
                  <div key={it.id} className="feed-item pop-item">
                    <div className="feed-ico" style={{ background: FEED_COLORS[it.type].bg }}>
                      <FeedIcon type={it.type} />
                    </div>
                    <div>
                      <div className="feed-title">{it.summary}</div>
                      {it.sub && <div className="feed-sub">{it.sub}</div>}
                      <div className="feed-ts">{relativeTime(it.happenedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {showOnboarding && (
        <OnboardingOverlay
          onDone={() => {
            localStorage.setItem("immocrm_onboarding_done", "true");
            setShowOnboarding(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
