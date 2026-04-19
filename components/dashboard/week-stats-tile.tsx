"use client";

// TODO: echte Wochen-Metriken (Zielumsatz, Besichtigungen, Neue Leads) aus Supabase anbinden.

import Link from "next/link";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ width: 10, height: 10 }}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

const PLAYFAIR_VALUE: React.CSSProperties = {
  fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
  fontSize: 22,
  fontWeight: 400,
  color: "#18120E",
  letterSpacing: "-0.01em",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
};

export default function WeekStatsTile() {
  const goalCurrent = 284;
  const goalTarget = 320;
  const goalPct = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));
  const viewings = 8;
  const newLeads = 3;

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
          Diese Woche
        </span>
        <Link
          href="/"
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
          Berichte <Chevron />
        </Link>
      </div>

      <div style={{ paddingBottom: 8 }}>
        <div style={{ padding: "6px 16px 10px" }}>
          <div style={{ fontSize: 11.5, color: "#78756E", fontWeight: 500 }}>Zielumsatz</div>
          <div style={{ ...PLAYFAIR_VALUE, marginTop: 4, whiteSpace: "nowrap" }}>
            €{goalCurrent}k
            <span style={{ fontSize: 13, color: "#78756E", fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif", fontWeight: 400, marginLeft: 4 }}>
              von €{goalTarget}k
            </span>
          </div>
          <div style={{ marginTop: 7, height: 3, background: "#E7E5E0", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${goalPct}%`, background: "#C2692A", borderRadius: 2, transition: "width 600ms ease" }} />
          </div>
        </div>

        <div style={{ padding: "10px 16px", borderTop: "1px solid #EDEBE6" }}>
          <div style={{ fontSize: 11.5, color: "#78756E", fontWeight: 500 }}>Besichtigungen absolviert</div>
          <div style={{ ...PLAYFAIR_VALUE, marginTop: 4 }}>{viewings}</div>
        </div>

        <div style={{ padding: "10px 16px", borderTop: "1px solid #EDEBE6" }}>
          <div style={{ fontSize: 11.5, color: "#78756E", fontWeight: 500 }}>Neue Leads</div>
          <div style={{ ...PLAYFAIR_VALUE, marginTop: 4 }}>{newLeads}</div>
        </div>
      </div>
    </div>
  );
}
