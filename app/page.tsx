"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";
import TodayFeed from "@/components/dashboard/today-feed";
import type { AppointmentItem } from "@/components/dashboard/types";
import PipelineTile, { type PipelineStageRow } from "@/components/dashboard/pipeline-tile";
import ActivityFeedTile, { type ActivityFeedItem, type ActivityType } from "@/components/dashboard/activity-feed-tile";
import WeekStatsTile from "@/components/dashboard/week-stats-tile";
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

// ---------- Types ----------

interface DealRow {
  id: string;
  stage_id: string | null;
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
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageRow[]>([]);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);

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
          .select("id, stage_id")
          .eq("user_id", uid),
        supabase
          .from("pipeline_stages")
          .select("id, name, position, is_won, is_lost")
          .eq("user_id", uid)
          .order("position"),
        supabase
          .from("activities")
          .select("id, type, summary, happened_at, contacts(first_name, last_name), properties(title)")
          .eq("user_id", uid)
          .order("happened_at", { ascending: false })
          .limit(5),
      ]);

      setTasks((dueUpToTodayRes.data ?? []) as Task[]);
      setDeals((dealsRes.data ?? []) as DealRow[]);
      setPipelineStages((stagesRes.data ?? []) as PipelineStageRow[]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feedItems: ActivityFeedItem[] = ((activitiesRes.data ?? []) as any[]).map((a) => {
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
      setActivities(feedItems);
    })();
  }, [supabase]);

  // ---------- Derived ----------

  const dealsByStage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) {
      if (!d.stage_id) continue;
      m[d.stage_id] = (m[d.stage_id] ?? 0) + 1;
    }
    return m;
  }, [deals]);

  // TODO: echte Stagnations-Berechnung (deals.updated_at älter als 21 Tage) nachziehen;
  // Pattern liegt in app/pipeline/page.tsx:289.
  const stagnationAlert = { count: 3, stageName: "Verhandlung", daysMin: 21 };

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
        <div className="body-wrap">

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

          {/* BOTTOM GRID — Pipeline / Aktivitäten / Diese Woche */}
          <section
            className="anim-2"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 8 }}
          >
            <PipelineTile
              stages={pipelineStages}
              dealsByStage={dealsByStage}
              stagnationAlert={stagnationAlert}
            />
            <ActivityFeedTile items={activities} />
            <WeekStatsTile />
          </section>
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
