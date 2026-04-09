# Immo CRM — Projekt-Kontext für Claude Code

## Projekt
SaaS CRM für Immobilienmakler im DACH-Markt.
Ziel: Bessere UX als onOffice/Propstack + tiefere KI-Integration.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Datenbank + Auth: Supabase (noch nicht eingerichtet)
- Styling: Tailwind CSS + shadcn/ui
- Payments: Stripe (Phase 2)
- KI: Anthropic API (Phase 2)
- Hosting: Vercel (Phase 2)

## Design-System
- Primärfarbe (Accent): #C2692A
- Hintergrund: #F5F3EF
- Sidebar-Hintergrund: #18120E (dunkel)
- Schriften: Playfair Display (Überschriften), DM Sans (Fließtext)
- UI-Stil: Editorial + Warm Modern — Weißraum als aktives Designelement, Tiefe durch Schatten

## Design System (detailliert)

### Typografie — Wann welche Schrift

**Playfair Display (Serif)** für alles mit Gewicht und editorialem Charakter:
- KPI-Zahlen: 46px, font-weight 500, letter-spacing -1.5px
- Dashboard-Begrüßung (`.hdr-title`): 22px, font-weight 400
- Alle Card-/Section-Headlines (`.card-title`): 16px, font-weight 400
- Pipeline-Zahlen über den Bars (`.pipe-n`): 24px, font-weight 500
- KI-Berater-Name im Panel

**DM Sans (Sans-Serif)** für alles Funktionale:
- Body-Text, Labels, Meta, Buttons, Inputs, Zeitstempel
- Uppercase-Labels: 10px, font-weight 600, letter-spacing 0.09em
- Navigation, Badges, Chips

**Typskala (Modular, 8px-Basis):**
`10 → 11.5 → 12 → 12.5 → 13 → 13.5 → 14 → 16 → 22 → 24 → 46`

### Abstands-Prinzipien
- Body-Wrap-Padding: 26px oben/unten, 30px links/rechts
- Card-Padding: 22px 24px
- Grid-Gaps: 16–18px zwischen allen Karten
- Listen-Zeilen (Heute, Feed): mindestens 13px vertical padding
- Sidebar-Nav-Items: padding 9px 12px, gap 2px zwischen Items
- #F5F3EF ist aktives Designelement — atmen lassen, nicht füllen

### Schatten-System
- Ruhe-Schatten (alle Karten): `0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)`
- Hover-Schatten: `0 6px 20px rgba(28,24,20,0.09), 0 2px 6px rgba(28,24,20,0.06)` + translateY(-2px)
- Kein reiner Border als primäre Karten-Abgrenzung — Schatten übernimmt die Tiefe
- Border-Opacity: rgba(0,0,0,0.05) — nahezu unsichtbar

### Farbregeln für #C2692A (Terrakotta)
Einsetzen für: CTA-Buttons, aktiver Sidebar-Zustand (inset 3px border), "Heute"-Karte (linker Akzent), KI-Chance-Badges, Sparkline-Highlights, Link-Hover
Nicht für: Füllfarben großer Flächen, Dekorationselemente ohne Funktion
Faustregel: Terrakotta ist der einzige Farbpunkt — er muss verdient sein.

## Aktueller Stand
- Next.js 14 initialisiert
- shadcn/ui installiert
- Dashboard-Design existiert als HTML-Prototyp

## Nächste Schritte (MVP Monat 1)
1. Login/Auth mit Supabase
2. Multi-Tenant Struktur
3. Kontaktverwaltung
4. Objektverwaltung

## Regeln für dieses Projekt
- Alle UI-Texte auf Deutsch
- Komponenten in /components ablegen
- Eine Aufgabe vollständig fertigstellen bevor die nächste beginnt
- Nach jeder funktionierenden Einheit committen
