import type { CSSProperties } from "react";

// ─── Shared Input/Label Styles ─────────────────────────────────────────────
export const inp: CSSProperties = {
  width: "100%",
  height: 37,
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  padding: "0 11px",
  fontSize: 13,
  color: "var(--t1)",
  background: "var(--input-bg)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const lbl: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--label)",
  display: "block",
  marginBottom: 6,
};

// ─── Activity-Typ-Farben (Timeline, Icons, Badges) ─────────────────────────
export const ACTIVITY_COLORS: Record<string, { bg: string; color: string }> = {
  note:        { bg: "var(--blu-bg)",  color: "var(--blu)" },
  call:        { bg: "var(--grn-bg)",  color: "var(--grn)" },
  email:       { bg: "var(--blu-bg)",  color: "var(--blu)" },
  viewing:     { bg: "var(--pur-bg)",  color: "var(--pur)" },
  meeting:     { bg: "var(--pur-bg)",  color: "var(--pur)" },
  task:        { bg: "var(--amb-bg)",  color: "var(--amb)" },
  appointment: { bg: "var(--pur-bg)",  color: "var(--pur)" },
};

// ─── Datums-Formatter ──────────────────────────────────────────────────────
export function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function nowLocalISO() {
  const d = new Date();
  d.setSeconds(0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
