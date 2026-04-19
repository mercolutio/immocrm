"use client";

import Link from "next/link";
import type { TodayFeedItem } from "./types";

interface Props {
  item: TodayFeedItem;
  isLast: boolean;
  onCompleteTask?: (taskId: string) => void;
}

function startOfTodayMs(): number {
  return new Date().setHours(0, 0, 0, 0);
}

function hasSpecificTime(iso: string): boolean {
  const d = new Date(iso);
  return !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
}

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function daysOverdue(iso: string): number {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
}

type TimeDisplay = {
  text: string;
  style: "time" | "overdue" | "muted";
};

function timeDisplay(item: TodayFeedItem): TimeDisplay {
  if (item.kind === "appointment") {
    return { text: formatHHMM(item.startsAt), style: "time" };
  }
  if (item.dueAt && new Date(item.dueAt).getTime() < startOfTodayMs()) {
    const days = daysOverdue(item.dueAt);
    const label = days <= 0 ? "heute zu spät" : `${days} Tag${days === 1 ? "" : "e"} zu spät`;
    return { text: label, style: "overdue" };
  }
  if (item.dueAt && hasSpecificTime(item.dueAt)) {
    return { text: formatHHMM(item.dueAt), style: "time" };
  }
  return { text: "heute", style: "muted" };
}

function TaskIcon({ priority }: { priority: "low" | "medium" | "high" }) {
  if (priority === "high") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function AppointmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function TodayFeedRow({ item, isLast, onCompleteTask }: Props) {
  const isTask = item.kind === "task";
  const isOverdue = isTask && !!item.dueAt && new Date(item.dueAt).getTime() < startOfTodayMs();
  const time = timeDisplay(item);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "24px 30px 110px 1fr auto",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    minHeight: 72,
    borderBottom: isLast ? undefined : "1px solid #EDEBE6",
    transition: "background 140ms ease",
  };

  const detailHref = isTask ? `/tasks` : `/`;

  let timeColor = "#18120E";
  let timeFont = "'DM Mono', ui-monospace, monospace";
  let timeSize = 13;
  let timeWeight: number | string = 500;
  let timeCase: "uppercase" | "none" = "none";
  let timeLetter = "0";
  if (time.style === "overdue") {
    timeColor = "var(--accent)";
    timeFont = "var(--font-dm-sans, 'DM Sans'), sans-serif";
    timeSize = 12.5;
    timeWeight = 600;
  } else if (time.style === "muted") {
    timeColor = "#A8A49C";
    timeFont = "var(--font-dm-sans, 'DM Sans'), sans-serif";
    timeSize = 10.5;
    timeWeight = 600;
    timeCase = "uppercase";
    timeLetter = "0.1em";
  }

  return (
    <div
      style={rowStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(120,117,110,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* First column: checkbox for tasks, Terra marker for appointments */}
      {isTask ? (
        <button
          type="button"
          onClick={() => onCompleteTask?.(item.id)}
          aria-label="Als erledigt markieren"
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: "1.5px solid #D4D1CA",
            background: "#FBFAF7",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            padding: 0,
            transition: "all 140ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#D4D1CA")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 9, height: 9, color: "#fff", opacity: 0 }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      ) : (
        <div
          aria-hidden
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: 24,
          }}
        >
          <div style={{ width: 2, height: 24, background: "#C2692A", borderRadius: 1 }} />
        </div>
      )}

      {/* Type icon */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          display: "grid",
          placeItems: "center",
          background: "rgba(120,117,110,0.08)",
          color: "#57554F",
        }}
      >
        <div style={{ width: 11, height: 11 }}>
          {isTask ? <TaskIcon priority={item.priority} /> : <AppointmentIcon />}
        </div>
      </div>

      {/* Time / overdue label — single line */}
      <div
        style={{
          fontFamily: timeFont,
          fontSize: timeSize,
          fontWeight: timeWeight,
          color: timeColor,
          textTransform: timeCase,
          letterSpacing: timeLetter,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {time.text}
      </div>

      {/* Title + sub */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#18120E",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </div>
        {item.description && (
          <div
            style={{
              fontSize: 13,
              color: "#78756E",
              marginTop: 3,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.description}
          </div>
        )}
      </div>

      {/* Action */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Link
          href={detailHref}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isOverdue ? "var(--accent)" : "#3F3D38",
            padding: "6px 10px",
            borderRadius: 6,
            textDecoration: "none",
            transition: "background 140ms ease, color 140ms ease",
          }}
          onMouseEnter={(e) => {
            if (isOverdue) {
              e.currentTarget.style.background = "rgba(194,105,42,0.08)";
              e.currentTarget.style.color = "#A0561F";
            } else {
              e.currentTarget.style.background = "rgba(42,40,36,0.06)";
              e.currentTarget.style.color = "#18120E";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isOverdue ? "var(--accent)" : "#3F3D38";
          }}
        >
          Öffnen
        </Link>
      </div>
    </div>
  );
}
