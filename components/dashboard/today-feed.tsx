"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import type { AppointmentItem, TaskItem, TodayFeedItem } from "./types";
import { taskToItem } from "./types";
import TodayFeedGroupLabel from "./today-feed-group-label";
import TodayFeedRow from "./today-feed-row";

interface Props {
  tasks: Task[];
  appointments: AppointmentItem[];
  onCompleteTask: (taskId: string) => void;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function isNoSpecificTime(iso: string): boolean {
  const d = new Date(iso);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

function sortForToday(a: TodayFeedItem, b: TodayFeedItem): number {
  const aIso = a.kind === "task" ? a.dueAt : a.startsAt;
  const bIso = b.kind === "task" ? b.dueAt : b.startsAt;
  const aNoTime = !aIso || isNoSpecificTime(aIso);
  const bNoTime = !bIso || isNoSpecificTime(bIso);
  if (aNoTime && !bNoTime) return 1;
  if (!aNoTime && bNoTime) return -1;
  if (aNoTime && bNoTime) return 0;
  return new Date(aIso!).getTime() - new Date(bIso!).getTime();
}

export default function TodayFeed({ tasks, appointments, onCompleteTask }: Props) {
  const { overdueItems, todayItems } = useMemo(() => {
    const start = startOfToday();
    const end = endOfToday();
    const overdue: TaskItem[] = [];
    const todayTasks: TaskItem[] = [];
    for (const t of tasks) {
      if (!t.due_date) continue;
      const ts = new Date(t.due_date).getTime();
      if (ts < start) {
        overdue.push(taskToItem(t));
      } else if (ts <= end) {
        todayTasks.push(taskToItem(t));
      }
    }
    overdue.sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
    const today: TodayFeedItem[] = [...todayTasks, ...appointments].sort(sortForToday);
    return { overdueItems: overdue, todayItems: today };
  }, [tasks, appointments]);

  const hasAnything = overdueItems.length > 0 || todayItems.length > 0;

  return (
    <section className="today-feed">
      {!hasAnything && (
        <div
          style={{
            padding: "32px 20px",
            background: "#FBFAF7",
            border: "1px solid #E7E5E0",
            borderRadius: 10,
            textAlign: "center",
            fontSize: 13.5,
            color: "#78756E",
            lineHeight: 1.5,
          }}
        >
          Nichts Dringendes für heute.
          <div style={{ marginTop: 6, fontSize: 12.5, color: "#A8A49C" }}>
            Gute Gelegenheit, bei ruhenden Kontakten nachzufassen.
          </div>
        </div>
      )}

      {overdueItems.length > 0 && (
        <>
          <TodayFeedGroupLabel label="Überfällig" count={overdueItems.length} urgent />
          <div
            style={{
              background: "#FBFAF7",
              border: "1px solid #E7E5E0",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {overdueItems.map((it, i) => (
              <TodayFeedRow
                key={it.id}
                item={it}
                isLast={i === overdueItems.length - 1}
                onCompleteTask={onCompleteTask}
              />
            ))}
          </div>
        </>
      )}

      {todayItems.length > 0 && (
        <>
          <div style={{ marginTop: overdueItems.length > 0 ? 26 : 0 }}>
            <TodayFeedGroupLabel label="Heute" count={todayItems.length} />
          </div>
          <div
            style={{
              background: "#FBFAF7",
              border: "1px solid #E7E5E0",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {todayItems.map((it, i) => (
              <TodayFeedRow
                key={it.id}
                item={it}
                isLast={i === todayItems.length - 1}
                onCompleteTask={onCompleteTask}
              />
            ))}
          </div>
        </>
      )}

      {hasAnything && (
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <Link
            href="/tasks"
            style={{
              fontSize: 12.5,
              color: "#78756E",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 500,
              transition: "color 140ms ease, background 140ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#18120E";
              e.currentTarget.style.background = "rgba(42,40,36,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#78756E";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Alle Aufgaben öffnen →
          </Link>
        </div>
      )}
    </section>
  );
}
