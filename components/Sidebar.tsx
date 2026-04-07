"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  function active(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="sb-logo-row">
          <div className="sb-logo-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <span className="sb-logo-name">Immo CRM</span>
        </div>
        <div className="sb-logo-sub">Einzelmakler · DACH</div>
      </div>

      <nav className="sb-nav">
        <div className="sb-label">Hauptmenü</div>

        <Link href="/" className={`sb-item${active("/") ? " active" : ""}`}>
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </Link>

        <Link href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Pipeline
          <span className="sb-badge">18</span>
        </Link>

        <Link id="onb-nav-objekte" href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Objekte
        </Link>

        <Link href="/contacts" className={`sb-item${active("/contacts") ? " active" : ""}`}>
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          Kontakte
        </Link>

        <div className="sb-divider"/>
        <div className="sb-label">Kommunikation</div>

        <Link href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Mails
          <span className="sb-badge">3</span>
        </Link>

        <Link href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Kalender
        </Link>

        <Link href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          Aufgaben
          <span className="sb-badge red">2</span>
        </Link>

        <div className="sb-divider"/>
        <div className="sb-ki">
          <div className="sb-ki-dot"/>
          <span className="sb-ki-label">KI-Berater</span>
          <div className="sb-ki-count">3</div>
        </div>
      </nav>

      <div className="sb-bottom">
        <Link id="onb-nav-einstellungen" href="#" className="sb-item">
          <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
          </svg>
          Einstellungen
        </Link>
        <div className="sb-user">
          <div className="sb-avatar">BJ</div>
          <div>
            <div className="sb-user-name">Bilal El-Jourani</div>
            <div className="sb-user-plan">Trial-Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
