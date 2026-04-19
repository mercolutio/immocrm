"use client";

import Link from "next/link";

export type ActivityType = "call" | "email" | "viewing" | "meeting" | "note";

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  summary: string;
  entities: string[];
  happenedAt: string;
}

interface Props {
  items: ActivityFeedItem[];
}

function compactRelative(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "jetzt";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (d.toDateString() === now.toDateString()) return `${hours} h`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "gestern";
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ width: 10, height: 10 }}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function TypeIcon({ type }: { type: ActivityType }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { width: 12, height: 12 },
  };
  switch (type) {
    case "call":
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.92.37 1.82.7 2.68a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.4-1.27a2 2 0 012.11-.45c.86.33 1.76.57 2.68.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "email":
      return (
        <svg {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case "viewing":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "meeting":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
  }
}

export default function ActivityFeedTile({ items }: Props) {
  return (
    <div
      style={{
        background: "#FBFAF7",
        border: "1px solid #E7E5E0",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 16px 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#3F3D38", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Aktivitäten
        </span>
        <Link
          href="/contacts"
          style={{
            fontSize: 12,
            color: "#78756E",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            textDecoration: "none",
            transition: "color 140ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#18120E")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#78756E")}
        >
          Alle <Chevron />
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "12px 16px 18px", fontSize: 12.5, color: "#A8A49C" }}>
          Noch keine Aktivitäten.
        </div>
      ) : (
        <div style={{ paddingBottom: 12 }}>
          {items.slice(0, 5).map((it) => (
            <div
              key={it.id}
              style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "8px 16px",
                fontSize: 12.5,
                transition: "background 140ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(120,117,110,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ color: "#A8A49C", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TypeIcon type={it.type} />
              </div>
              <div style={{ color: "#3F3D38", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#18120E", fontWeight: 600 }}>{it.summary}</strong>
                {it.entities.map((e, idx) => (
                  <span key={idx}>
                    <span style={{ color: "#A8A49C" }}> · </span>
                    <strong style={{ color: "#18120E", fontWeight: 600 }}>{e}</strong>
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 10.5,
                  color: "#A8A49C",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {compactRelative(it.happenedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
