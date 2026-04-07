"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function active(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const W = collapsed ? 52 : 220;

  return (
    <aside
      className="sidebar"
      style={{
        width: W,
        minWidth: W,
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* LOGO */}
      <div
        className="sb-logo"
        style={{
          padding: collapsed ? "18px 0" : undefined,
          display: "flex",
          flexDirection: collapsed ? "column" : undefined,
          alignItems: "center",
          justifyContent: collapsed ? "center" : undefined,
          gap: collapsed ? 0 : undefined,
        }}
      >
        <div className="sb-logo-row" style={{ justifyContent: collapsed ? "center" : undefined }}>
          <div className="sb-logo-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>
          {!collapsed && <span className="sb-logo-name">Immo CRM</span>}
        </div>
        {!collapsed && <div className="sb-logo-sub">Einzelmakler · DACH</div>}
      </div>

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        style={{
          position: "absolute",
          top: 16,
          right: collapsed ? "50%" : 10,
          transform: collapsed ? "translateX(50%)" : "none",
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.4)",
          transition: "all 0.14s",
          zIndex: 10,
          padding: 0,
          marginTop: collapsed ? 4 : 0,
        }}
      >
        <svg
          width="12"
          height="12"
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

      <nav className="sb-nav" style={{ overflow: collapsed ? "visible" : undefined }}>
        {!collapsed && <div className="sb-label">Hauptmenü</div>}

        <Link
          href="/"
          className={`sb-item${active("/") ? " active" : ""}`}
          title={collapsed ? "Dashboard" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Pipeline" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Objekte" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Kontakte" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Mails" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Kalender" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Aufgaben" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "KI-Berater" : undefined}
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
          title={collapsed ? "Einstellungen" : undefined}
          style={{ justifyContent: collapsed ? "center" : undefined, gap: collapsed ? 0 : undefined, padding: collapsed ? "8px 0" : undefined }}
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
          title={collapsed ? "Bilal El-Jourani" : undefined}
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
  );
}
