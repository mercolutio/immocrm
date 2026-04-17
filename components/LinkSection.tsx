import type { ReactNode } from "react";

export default function LinkSection({
  icon,
  title,
  count,
  onAdd,
  emptyText = "Noch keine Verknüpfungen",
  children,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  onAdd?: () => void;
  emptyText?: string;
  children?: ReactNode;
}) {
  return (
    <div className="h-lift" style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>{title}</span>
        {count != null && count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(194,105,42,0.1)", color: "var(--accent)", padding: "1px 7px", borderRadius: 8 }}>{count}</span>
        )}
        {onAdd && (
          <button onClick={onAdd} className="h-icon-btn" style={{ width: 24, height: 24 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
      </div>
      {children ?? (
        <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t3)" }}>
          {emptyText}
        </div>
      )}
    </div>
  );
}
