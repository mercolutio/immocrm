"use client";

import Link from "next/link";

export interface PipelineStageRow {
  id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface StagnationAlert {
  count: number;
  stageName: string;
  daysMin: number;
}

interface Props {
  stages: PipelineStageRow[];
  dealsByStage: Record<string, number>;
  stagnationAlert?: StagnationAlert | null;
}

const SHORT_NAMES: Record<string, string> = {
  "Lead": "Lead",
  "Qualifizierung": "Qualifiz.",
  "Besichtigung": "Besich.",
  "Verhandlung": "Verhandl.",
  "Notariat": "Notariat",
  "Abschluss": "Abschluss",
  "Gewonnen": "Gewonnen",
  "Verloren": "Verloren",
};

function shortName(name: string): string {
  return SHORT_NAMES[name] ?? (name.length > 10 ? name.slice(0, 8) + "." : name);
}

function Chevron({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ width: size, height: size }}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: "#C2692A", flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function PipelineTile({ stages, dealsByStage, stagnationAlert }: Props) {
  const visible = stages.filter((s) => !s.is_lost).slice(0, 6);
  const maxCount = Math.max(1, ...visible.map((s) => dealsByStage[s.id] ?? 0));

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
          Pipeline
        </span>
        <Link
          href="/pipeline"
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
          Board öffnen <Chevron />
        </Link>
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: "18px 16px 22px", fontSize: 13, color: "#A8A49C" }}>
          Noch keine Pipeline-Stufen.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${visible.length}, 1fr)`, padding: "0 16px 6px" }}>
          {visible.map((s, i) => {
            const count = dealsByStage[s.id] ?? 0;
            const width = Math.max(8, Math.round((count / maxCount) * 100));
            const isAccent = s.is_won;
            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateRows: "auto auto auto",
                  gap: 4,
                  padding: "10px 10px 10px 0",
                  borderRight: i === visible.length - 1 ? "none" : "1px dashed #EDEBE6",
                  cursor: "pointer",
                  transition: "background 140ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(120,117,110,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 10.5, color: "#78756E", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                  {shortName(s.name)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
                    fontSize: 22,
                    fontWeight: 400,
                    color: "#18120E",
                    letterSpacing: "-0.01em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {count}
                </div>
                <div style={{ height: 3, background: "#E7E5E0", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${width}%`,
                      background: isAccent ? "#C2692A" : "#78756E",
                      borderRadius: 2,
                      transition: "width 600ms ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stagnationAlert && (
        <Link
          href="/pipeline"
          style={{
            margin: "2px 16px 14px",
            padding: "10px 12px",
            background: "rgba(194,105,42,0.06)",
            borderLeft: "2px solid #C2692A",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12.5,
            color: "#3F3D38",
            textDecoration: "none",
            cursor: "pointer",
            transition: "background 140ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(194,105,42,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(194,105,42,0.06)")}
        >
          <WarnIcon />
          <span>
            <strong style={{ color: "#18120E", fontWeight: 600 }}>
              {stagnationAlert.count} Deal{stagnationAlert.count === 1 ? "" : "s"}
            </strong>{" "}
            in {stagnationAlert.stageName} stagnieren seit {stagnationAlert.daysMin}+ Tagen
          </span>
          <span style={{ marginLeft: "auto", color: "#A8A49C" }}>
            <Chevron size={11} />
          </span>
        </Link>
      )}
    </div>
  );
}
