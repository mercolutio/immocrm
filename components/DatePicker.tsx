"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseISO(v: string | null): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDE(v: string | null): string {
  const d = parseISO(v);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({ value, onChange, placeholder, style }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState<Date>(() => selected ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Build 6x7 grid
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    // Monday = 0
    const dowRaw = first.getDay(); // 0=Sun..6=Sat
    const leading = (dowRaw + 6) % 7;
    const start = new Date(year, month, 1 - leading);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      out.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return out;
  }, [year, month]);

  const goMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setViewDate(selected ?? new Date()); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{
            width: "100%",
            height: 37,
            border: open ? "1px solid var(--accent)" : "1px solid var(--input-border)",
            borderRadius: 8,
            padding: "0 11px",
            fontSize: 13,
            color: selected ? "var(--t1)" : "var(--placeholder)",
            background: "var(--input-bg)",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            textAlign: "left",
            transition: "border-color 0.15s",
            ...style,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {selected ? formatDE(value) : (placeholder ?? "TT.MM.JJJJ")}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        style={{
          width: 260,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          boxShadow: "0 4px 16px rgba(28,24,20,0.12)",
          padding: 10,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="Vorheriger Monat"
            style={{ width: 26, height: 26, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
            {MONTHS[month]} {year}
          </div>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="Nächster Monat"
            style={{ width: 26, height: 26, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Weekdays */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ fontSize: 10, fontWeight: 600, color: "var(--t2)", textAlign: "center", padding: "4px 0" }}>{w}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const isSelected = selected ? isSameDay(d, selected) : false;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(toISO(d)); setOpen(false); }}
                style={{
                  height: 30,
                  border: isToday && !isSelected ? "1px solid var(--accent)" : "none",
                  borderRadius: 6,
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "#fff" : (inMonth ? "var(--t1)" : "var(--t3)"),
                  fontSize: 12,
                  fontWeight: isSelected || isToday ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--row-divider)" }}>
          <button
            type="button"
            onClick={() => { onChange(toISO(today)); setOpen(false); }}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 500, fontFamily: "inherit", padding: "4px 6px", borderRadius: 4 }}
          >
            Heute
          </button>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--t2)", fontFamily: "inherit", padding: "4px 6px", borderRadius: 4 }}
            >
              Löschen
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
