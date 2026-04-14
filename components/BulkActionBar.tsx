"use client";

import { ReactNode } from "react";

interface Props {
  count: number;
  totalCount: number;
  onSelectAll?: () => void;
  onClear: () => void;
  children?: ReactNode;
}

export default function BulkActionBar({ count, totalCount, onSelectAll, onClear, children }: Props) {
  const open = count > 0;
  const canSelectAll = onSelectAll && count < totalCount;

  return (
    <div
      style={{
        maxHeight: open ? 80 : 0,
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transform: open ? "translateY(0)" : "translateY(-6px)",
        transition: "max-height 180ms ease, opacity 180ms ease, transform 180ms ease, margin 180ms ease",
        marginBottom: open ? 14 : 0,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
            {count} ausgewählt
          </span>
          {canSelectAll && (
            <button
              onClick={onSelectAll}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--accent)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                fontFamily: "inherit",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Alle {totalCount} auswählen
            </button>
          )}
          <button
            onClick={onClear}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--t3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              fontFamily: "inherit",
            }}
          >
            Auswahl aufheben
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
