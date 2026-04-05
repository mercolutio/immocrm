"use client";

import { useState, useEffect } from "react";
import OnboardingOverlay from "@/components/OnboardingOverlay";

export default function Dashboard() {
  const [qaOpen, setQaOpen] = useState(false);
  const [task1Done, setTask1Done] = useState(false);
  const [task2Done, setTask2Done] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const isDone = localStorage.getItem("immocrm_onboarding_done") === "true";
    const hasWelcome = new URLSearchParams(window.location.search).get("welcome") === "1";
    if (!isDone || hasWelcome) setShowOnboarding(true);
  }, []);

  return (
    <>
      {/* SIDEBAR */}
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
          <a className="sb-item active" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            Dashboard
          </a>
          <a className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Pipeline
            <span className="sb-badge">18</span>
          </a>
          <a id="onb-nav-objekte" className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Objekte
          </a>
          <a className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            Kontakte
          </a>

          <div className="sb-divider"/>
          <div className="sb-label">Kommunikation</div>

          <a className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Mails
            <span className="sb-badge">3</span>
          </a>
          <a className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Kalender
          </a>
          <a className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Aufgaben
            <span className="sb-badge red">2</span>
          </a>

          <div className="sb-divider"/>
          <div className="sb-ki">
            <div className="sb-ki-dot"/>
            <span className="sb-ki-label">KI-Berater</span>
            <div className="sb-ki-count">3</div>
          </div>
        </nav>

        <div className="sb-bottom">
          <a id="onb-nav-einstellungen" className="sb-item" href="#">
            <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            </svg>
            Einstellungen
          </a>
          <div className="sb-user">
            <div className="sb-avatar">MW</div>
            <div>
              <div className="sb-user-name">Max Wolff</div>
              <div className="sb-user-plan">Starter-Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* HEADER */}
        <header className="header">
          <div className="hdr-greeting">
            <div className="hdr-title">Guten Morgen, Maximilian.</div>
            <div className="hdr-date">Donnerstag, 3. April 2026 · 2 dringende Punkte heute</div>
          </div>
          <div className="hdr-right">
            <div className="qa-wrap">
              <button id="onb-btn-neu" className="hdr-add-btn" onClick={() => setQaOpen(!qaOpen)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Neu
              </button>
              <div className={`quick-add-menu${qaOpen ? " open" : ""}`}>
                <div className="qa-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  Kontakt anlegen
                </div>
                <div className="qa-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Objekt anlegen
                </div>
                <div className="qa-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Deal eröffnen
                </div>
                <div className="qa-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  Aufgabe erstellen
                </div>
              </div>
            </div>

            <div className="hdr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>Suchen…</span>
              <kbd>⌘K</kbd>
            </div>

            <div className="hdr-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <div className="notif-pip"/>
            </div>

            <div className="hdr-sep"/>
            <div className="hdr-avatar">MW</div>
          </div>
        </header>

        {/* BODY */}
        <div className="body-wrap">

          {/* KPI STRIP */}
          <div className="kpi-strip anim-0">
            <div className="kpi">
              <div className="kpi-label">Provision MTD</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <div className="kpi-val">€284k</div>
              </div>
              <div className="kpi-footer">
                <div className="kpi-trend up">↑ +12% diesen Monat</div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--grn)"} as React.CSSProperties}>
                  <div className="spark-bar" style={{height:"40%"}}/>
                  <div className="spark-bar" style={{height:"55%"}}/>
                  <div className="spark-bar" style={{height:"48%"}}/>
                  <div className="spark-bar" style={{height:"65%"}}/>
                  <div className="spark-bar" style={{height:"58%"}}/>
                  <div className="spark-bar hi" style={{height:"80%"}}/>
                  <div className="spark-bar hi" style={{height:"100%"}}/>
                </div>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Aktive Deals</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <div className="kpi-val">47</div><span className="kpi-unit">Deals</span>
              </div>
              <div className="kpi-footer">
                <div className="kpi-trend up">↑ +3 diese Woche</div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--grn)"} as React.CSSProperties}>
                  <div className="spark-bar" style={{height:"50%"}}/>
                  <div className="spark-bar" style={{height:"60%"}}/>
                  <div className="spark-bar" style={{height:"55%"}}/>
                  <div className="spark-bar" style={{height:"70%"}}/>
                  <div className="spark-bar" style={{height:"65%"}}/>
                  <div className="spark-bar hi" style={{height:"85%"}}/>
                  <div className="spark-bar hi" style={{height:"100%"}}/>
                </div>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Neue Kontakte</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <div className="kpi-val">124</div><span className="kpi-unit">gesamt</span>
              </div>
              <div className="kpi-footer">
                <div className="kpi-trend warn">+2 heute</div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--amb)"} as React.CSSProperties}>
                  <div className="spark-bar" style={{height:"70%"}}/>
                  <div className="spark-bar" style={{height:"60%"}}/>
                  <div className="spark-bar" style={{height:"75%"}}/>
                  <div className="spark-bar" style={{height:"55%"}}/>
                  <div className="spark-bar" style={{height:"80%"}}/>
                  <div className="spark-bar hi" style={{height:"90%"}}/>
                  <div className="spark-bar hi" style={{height:"100%"}}/>
                </div>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Ø Abschlusszeit</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <div className="kpi-val">38</div><span className="kpi-unit">Tage</span>
              </div>
              <div className="kpi-footer">
                <div className="kpi-trend down">↑ +4d ggü. Vormonat</div>
                <div className="kpi-sparkline" style={{"--spark-color":"var(--red)"} as React.CSSProperties}>
                  <div className="spark-bar" style={{height:"45%"}}/>
                  <div className="spark-bar" style={{height:"50%"}}/>
                  <div className="spark-bar" style={{height:"55%"}}/>
                  <div className="spark-bar" style={{height:"62%"}}/>
                  <div className="spark-bar" style={{height:"70%"}}/>
                  <div className="spark-bar hi" style={{height:"88%"}}/>
                  <div className="spark-bar hi" style={{height:"100%"}}/>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID: HEUTE + KI */}
          <div className="main-grid anim-1">

            {/* HEUTE */}
            <div className="card heute-card">
              <div className="card-hdr">
                <div className="heute-hdr">
                  <span className="card-title">Heute auf einen Blick</span>
                  <div className="urgency-badge">2</div>
                </div>
                <a className="card-cta" href="#">
                  Alle Aufgaben
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
              <div className="heute-list">
                <div className="heute-item">
                  <div className="h-priority" style={{background:"var(--red)"}}/>
                  <div className="h-ico" style={{background:"var(--red-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#C93B2E" strokeWidth="2" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="h-body">
                    <div className="h-title">Finanzierungsnachweis Fam. Müller läuft ab</div>
                    <div className="h-sub">EFH Potsdam · Kontakt jetzt anrufen</div>
                  </div>
                  <div className="h-right">
                    <div className="h-time" style={{color:"var(--red)"}}>Heute</div>
                    <button className="h-btn">Kontakt öffnen →</button>
                  </div>
                </div>
                <div className="heute-item">
                  <div className="h-priority" style={{background:"var(--blu)"}}/>
                  <div className="h-ico" style={{background:"var(--blu-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2457B3" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <div className="h-body">
                    <div className="h-title">Dr. Wagner: Follow-up überfällig (48h)</div>
                    <div className="h-sub">Villa am See besichtigt · kein Feedback</div>
                  </div>
                  <div className="h-right">
                    <div className="h-time" style={{color:"var(--t3)"}}>48h</div>
                    <button className="h-btn">Mail entwerfen →</button>
                  </div>
                </div>
                <div className="heute-item">
                  <div className="h-priority" style={{background:"var(--pur)"}}/>
                  <div className="h-ico" style={{background:"var(--pur-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="h-body">
                    <div className="h-title">Besichtigung: Loft Hamburg</div>
                    <div className="h-sub">Thomas Brandt · Jungfernstieg 12</div>
                  </div>
                  <div className="h-right">
                    <div className="h-time" style={{color:"var(--t2)"}}>15:00</div>
                    <button className="h-btn">Im Kalender →</button>
                  </div>
                </div>
                <div className={`heute-item${task1Done ? " done-item" : ""}`}>
                  <div className="h-priority" style={{background:"var(--accent)"}}/>
                  <div className={`h-check${task1Done ? " done" : ""}`} onClick={() => setTask1Done(!task1Done)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className="h-body">
                    <div className="h-title">Vertrag vorbereiten: Objekt #4521</div>
                    <div className="h-sub">Notartermin morgen früh</div>
                  </div>
                  <div className="h-right">
                    <div className="h-time" style={{color:"var(--t2)"}}>bis 14:00</div>
                    <button className="h-btn">Öffnen →</button>
                  </div>
                </div>
                <div className={`heute-item${task2Done ? " done-item" : ""}`}>
                  <div className="h-priority" style={{background:"var(--accent)"}}/>
                  <div className={`h-check${task2Done ? " done" : ""}`} onClick={() => setTask2Done(!task2Done)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className="h-body">
                    <div className="h-title">Exposé-Review: Loft Hamburg</div>
                    <div className="h-sub">Vor der Besichtigung um 15:00</div>
                  </div>
                  <div className="h-right">
                    <div className="h-time" style={{color:"var(--t2)"}}>bis 14:30</div>
                    <button className="h-btn">Öffnen →</button>
                  </div>
                </div>
              </div>
            </div>

            {/* KI-PANEL */}
            <div className="ki-panel">
              <div className="ki-hdr">
                <div className="ki-hdr-l">
                  <div className="ki-dot"/>
                  <div className="ki-name">KI-Berater</div>
                </div>
                <div className="ki-tag">Live</div>
              </div>
              <div className="ki-cards">
                <div className="ki-card">
                  <div className="ki-chip chip-alert">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                    Handlungsbedarf
                  </div>
                  <div className="ki-body"><strong>Penthouse Charlottenburg</strong> — 14 Tage ohne Besichtigung.</div>
                  <div className="ki-data">Vergleich: Ø 8 Tage · Preis 5% über Markt</div>
                  <div className="ki-action">
                    Objekt öffnen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
                <div className="ki-card">
                  <div className="ki-chip chip-chance">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Chance erkannt
                  </div>
                  <div className="ki-body"><strong>Sarah König</strong> hat 3× nach Berlin-Mitte angefragt. Score: 94%.</div>
                  <div className="ki-data">2 passende Objekte · Optimaler Zeitpunkt</div>
                  <div className="ki-action">
                    Mail entwerfen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
                <div className="ki-card">
                  <div className="ki-chip chip-follow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Follow-up fällig
                  </div>
                  <div className="ki-body"><strong>Dr. Wagner</strong> — kein Feedback seit 48h nach Besichtigung.</div>
                  <div className="ki-data">Optimaler Nachfass-Zeitpunkt: jetzt</div>
                  <div className="ki-action">
                    Kontakt öffnen
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="ki-input-wrap">
                <div className="ki-input-row">
                  <input className="ki-inp" type="text" placeholder="Frage die KI etwas…"/>
                  <button className="ki-send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0A1208" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM GRID */}
          <div className="bottom-grid anim-2">

            {/* PIPELINE */}
            <div className="card pipe-card">
              <div className="card-hdr">
                <span className="card-title">Pipeline-Snapshot</span>
                <a className="card-cta" href="#">
                  Pipeline öffnen
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
              <div className="pipe-chart">
                <div className="pipe-col">
                  <div className="pipe-n">85</div>
                  <div className="pipe-eur">€12,4M</div>
                  <div className="pipe-bar-wrap">
                    <div className="pipe-bar" style={{height:"100%",background:"rgba(194,105,42,0.22)"}}/>
                  </div>
                  <div className="pipe-label">Qualifizierung</div>
                </div>
                <div className="pipe-col">
                  <div className="pipe-n">32</div>
                  <div className="pipe-eur">€8,2M</div>
                  <div className="pipe-bar-wrap">
                    <div className="pipe-bar" style={{height:"38%",background:"rgba(194,105,42,0.42)"}}/>
                  </div>
                  <div className="pipe-label">Besichtigung</div>
                </div>
                <div className="pipe-col">
                  <div className="pipe-n">14</div>
                  <div className="pipe-eur">€4,1M</div>
                  <div className="pipe-bar-wrap">
                    <div className="pipe-bar" style={{height:"16%",background:"rgba(194,105,42,0.65)"}}/>
                  </div>
                  <div className="pipe-label">Verhandlung</div>
                </div>
                <div className="pipe-col">
                  <div className="pipe-n">6</div>
                  <div className="pipe-eur">€1,8M</div>
                  <div className="pipe-bar-wrap">
                    <div className="pipe-bar" style={{height:"7%",background:"#C2692A"}}/>
                  </div>
                  <div className="pipe-label">Abschluss</div>
                </div>
              </div>
              <div className="funnel-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                5 Deals ohne Aktivität seit &gt;7 Tagen → ansehen
              </div>
            </div>

            {/* AKTIVITÄTS-FEED */}
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">Letzte Aktivitäten</span>
                <a className="card-cta" href="#">
                  Alle
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
              <div className="feed-list">
                <div className="feed-item">
                  <div className="feed-ico" style={{background:"var(--blu-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2457B3" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <div className="feed-title">E-Mail von Sarah König</div>
                    <div className="feed-sub">Interesse an Penthouse Berlin-Mitte</div>
                    <div className="feed-ts">vor 12 Min.</div>
                  </div>
                </div>
                <div className="feed-item">
                  <div className="feed-ico" style={{background:"var(--grn-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1E8A5C" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <div className="feed-title">Besichtigung abgeschlossen</div>
                    <div className="feed-sub">Villa am See · Dr. Wagner</div>
                    <div className="feed-ts">Heute, 10:45</div>
                  </div>
                </div>
                <div className="feed-item">
                  <div className="feed-ico" style={{background:"var(--red-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#C93B2E" strokeWidth="2" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <div className="feed-title">Frist läuft ab</div>
                    <div className="feed-sub">Finanzierungsnachweis Fam. Müller</div>
                    <div className="feed-ts">Gestern</div>
                  </div>
                </div>
                <div className="feed-item">
                  <div className="feed-ico" style={{background:"var(--pur-bg)"}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </div>
                  <div>
                    <div className="feed-title">Neuer Lead: Thomas Brandt</div>
                    <div className="feed-sub">Loft Hamburg · via ImmoScout</div>
                    <div className="feed-ts">Gestern</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PORTAL-PERFORMANCE */}
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">Portal-Performance</span>
                <a className="card-cta" href="#">
                  Details
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>
                Leads · dieser Monat
              </div>
              <div className="portal-list">
                <div className="portal-item">
                  <div className="portal-ico" style={{background:"rgba(36,87,179,0.1)",color:"#2457B3"}}>IS</div>
                  <div className="portal-name">ImmoScout 24</div>
                  <div className="portal-track"><div className="portal-fill" style={{width:"82%",background:"rgba(36,87,179,0.45)"}}/></div>
                  <div className="portal-leads">41</div>
                  <div className="portal-cost" style={{color:"var(--grn)"}}>€3,20</div>
                </div>
                <div className="portal-item">
                  <div className="portal-ico" style={{background:"rgba(30,138,92,0.1)",color:"#1E8A5C"}}>IW</div>
                  <div className="portal-name">Immowelt</div>
                  <div className="portal-track"><div className="portal-fill" style={{width:"46%",background:"rgba(30,138,92,0.45)"}}/></div>
                  <div className="portal-leads">23</div>
                  <div className="portal-cost" style={{color:"var(--amb)"}}>€5,80</div>
                </div>
                <div className="portal-item">
                  <div className="portal-ico" style={{background:"rgba(194,105,42,0.1)",color:"var(--accent)"}}>EI</div>
                  <div className="portal-name">Eigene Website</div>
                  <div className="portal-track"><div className="portal-fill" style={{width:"30%",background:"rgba(194,105,42,0.45)"}}/></div>
                  <div className="portal-leads">15</div>
                  <div className="portal-cost" style={{color:"var(--grn)"}}>€1,10</div>
                </div>
                <div className="portal-item">
                  <div className="portal-ico" style={{background:"rgba(109,40,217,0.08)",color:"var(--pur)"}}>KV</div>
                  <div className="portal-name">Kleinanzeigen</div>
                  <div className="portal-track"><div className="portal-fill" style={{width:"22%",background:"rgba(109,40,217,0.35)"}}/></div>
                  <div className="portal-leads">11</div>
                  <div className="portal-cost" style={{color:"var(--red)"}}>€8,40</div>
                </div>
              </div>
              <div className="portal-footer">
                <div style={{fontSize:12,color:"var(--t3)"}}>Kosten pro Lead (Ø)</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>
                  €4,62 <span style={{fontSize:11,color:"var(--grn)",fontWeight:500}}>↓ −€0,80</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {showOnboarding && (
        <OnboardingOverlay
          onDone={() => {
            localStorage.setItem("immocrm_onboarding_done", "true");
            setShowOnboarding(false);
          }}
        />
      )}
    </>
  );
}
