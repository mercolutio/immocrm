"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [tooltipState, setTooltipState] = useState<{ label: string; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  function active(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const W = collapsed ? 52 : 220;

  function onMouseEnter(e: React.MouseEvent, label: string) {
    if (!collapsed) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipState({ label, y: rect.top + rect.height / 2 - 13 });
  }

  function onMouseLeave() {
    setTooltipState(null);
  }

  return (
    <>
      {collapsed && tooltipState && (
        <div
          style={{
            position: "fixed",
            left: 60,
            top: tooltipState.y,
            pointerEvents: "none",
            background: "#1e1812",
            color: "rgba(255,255,255,0.9)",
            fontSize: 12,
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 9999,
          }}
        >
          {tooltipState.label}
        </div>
      )}

      <aside
        className="sidebar"
        style={{
          width: W,
          minWidth: W,
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* LOGO + TOGGLE */}
        <div
          className="sb-logo"
          style={{
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: collapsed ? 8 : 0,
            padding: collapsed ? "14px 0" : "16px 14px",
          }}
        >
          <div className="sb-logo-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>

          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(255,255,255,0.13)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.75)",
              transition: "background 0.14s, color 0.14s",
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)";
              (e.currentTarget as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.13)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <nav className="sb-nav" style={{ overflow: collapsed ? "visible" : undefined }}>
          {!collapsed && <div className="sb-label">Hauptmenü</div>}

          <Link
            href="/"
            className={`sb-item${active("/") ? " active" : ""}`}
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Dashboard")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            {!collapsed && "Dashboard"}
          </Link>

          <Link
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Pipeline")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {!collapsed && "Pipeline"}
            {!collapsed && <span className="sb-badge">18</span>}
          </Link>

          <Link
            id="onb-nav-objekte"
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Objekte")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {!collapsed && "Objekte"}
          </Link>

          <Link
            href="/contacts"
            className={`sb-item${active("/contacts") ? " active" : ""}`}
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Kontakte")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            {!collapsed && "Kontakte"}
          </Link>

          {!collapsed && <div className="sb-divider"/>}
          {!collapsed && <div className="sb-label">Kommunikation</div>}
          {collapsed && <div className="sb-divider" style={{ margin: "6px 10px" }}/>}

          <Link
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Mails")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            {!collapsed && "Mails"}
            {!collapsed && <span className="sb-badge">3</span>}
          </Link>

          <Link
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Kalender")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {!collapsed && "Kalender"}
          </Link>

          <Link
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Aufgaben")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            {!collapsed && "Aufgaben"}
            {!collapsed && <span className="sb-badge red">2</span>}
          </Link>

          {!collapsed && <div className="sb-divider"/>}
          {collapsed && <div className="sb-divider" style={{ margin: "6px 10px" }}/>}

          <div
            className="sb-ki"
            style={collapsed ? {
              margin: "6px 4px",
              padding: "8px 0",
              justifyContent: "center",
            } : undefined}
            onMouseEnter={(e) => onMouseEnter(e, "KI-Berater")}
            onMouseLeave={onMouseLeave}
          >
            <div className="sb-ki-dot"/>
            {!collapsed && <span className="sb-ki-label">KI-Berater</span>}
            {!collapsed && <div className="sb-ki-count">3</div>}
          </div>
        </nav>

        <div className="sb-bottom">
          <Link
            id="onb-nav-einstellungen"
            href="#"
            className="sb-item"
            style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
            onMouseEnter={(e) => onMouseEnter(e, "Einstellungen")}
            onMouseLeave={onMouseLeave}
          >
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            </svg>
            {!collapsed && "Einstellungen"}
          </Link>
          <div
            className="sb-user"
            style={collapsed ? { justifyContent: "center", padding: "12px 0" } : undefined}
            onMouseEnter={(e) => onMouseEnter(e, "Bilal El-Jourani")}
            onMouseLeave={onMouseLeave}
          >
            <div className="sb-avatar">BJ</div>
            {!collapsed && (
              <div>
                <div className="sb-user-name">Bilal El-Jourani</div>
                <div className="sb-user-plan">Trial-Plan</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
