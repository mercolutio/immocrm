# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt
SaaS CRM für Immobilienmakler im DACH-Markt.
Ziel: Bessere UX als onOffice/Propstack + tiefere KI-Integration.

## Tech Stack
- **Framework**: Next.js 14 (App Router, React 18, TypeScript strict)
- **DB + Auth**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Styling**: Tailwind CSS + shadcn/ui (stone base, CSS variables) + custom CSS in `app/dashboard.css` / `app/globals.css`
- **Formulare**: react-hook-form + zod + `@hookform/resolvers`
- **UI-Primitives**: Radix UI, Base UI, lucide-react, cmdk
- **E2E-Tests**: Playwright
- **Payments**: Stripe (Phase 2, noch nicht integriert)
- **KI**: Anthropic API (Phase 2, noch nicht integriert)
- **Hosting**: Vercel (Phase 2)

## Commands

```bash
npm run dev           # Dev-Server auf http://localhost:3000
npm run build         # Next.js Production-Build
npm run start         # Startet Build-Output
npm run lint          # next lint (eslint-config-next)
npm run test:e2e      # Playwright E2E (inkl. automatischer webServer-Start)
npm run test:e2e:ui   # Playwright im UI-Mode
```

**Einzelnen Test ausführen:**
```bash
npx playwright test tests/e2e/navigation.spec.ts
npx playwright test -g "Login-Seite lädt"        # nach Namen filtern
npx playwright test --project=smoke              # nur Smoke-Tests (ohne Auth)
npx playwright test --project=authenticated      # authentifizierte Tests
```

**Environment:**
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `.env.test.local` (für Playwright): `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, optional `E2E_BASE_URL`, `E2E_NO_WEBSERVER=1`
- Middleware/Pages überspringen Auth-Checks, wenn Supabase-Env-Vars fehlen — App bleibt lokal lauffähig ohne DB.

## Architektur

### Routing-Struktur (App Router)
```
app/
  layout.tsx              Lädt Fonts (DM Sans + Playfair) + globals.css
  page.tsx                Dashboard (Start-Route, client-side)
  auth/login|register|callback   Auth-Flows (register nutzt Server Action)
  contacts/ + [id]        Kontakt-Liste + Detail
  properties/ + [id]      Objekt-Liste + Detail
  pipeline/ + [id]        Deal-Board (Kanban + Liste) + Deal-Detail
  tasks/                  Aufgaben
  settings/organization|pipeline   Team + Pipeline-Stages
```
Alle "Inhalts"-Routen sind `"use client"` und rendern den Chrome über `<DashboardLayout>` (Sidebar + `<main>`). Globales Layout gibt es bewusst nicht — jede Page importiert `DashboardLayout` selbst, damit Auth-Seiten ohne Sidebar laufen.

### Auth + Multi-Tenancy
- **`middleware.ts`** schützt alle Routen außer `/auth/*`. Ohne Session → Redirect auf `/auth/login`. Eingeloggt + auf `/auth/*` → Redirect auf `/`.
- **Registrierung** (`app/auth/register/actions.ts`, Server Action): legt User via `supabase.auth.signUp` an, dann per Admin-Client (`SUPABASE_SERVICE_ROLE_KEY`) eine `organizations`-Zeile + `organization_members`-Zeile mit Rolle `owner`. Slug wird aus Org-Name + UserID-Prefix gebildet, mit Umlaut-Transliteration.
- **Aktuelle Org ermitteln**: `lib/supabase/org.ts#getMyOrgId` (server) bzw. `lib/hooks/useOrganization.ts` (client). MVP: 1 Org pro User — erste `organization_members`-Zeile wird genommen.
- **Supabase-Clients**:
  - `lib/supabase/client.ts` — Browser (Client Components)
  - `lib/supabase/server.ts` — Server Components / Server Actions (liest cookies)
  - `lib/supabase/admin.ts` — Service Role Key, **nie im Browser** — nur für Flows die RLS umgehen müssen (z. B. Org-Anlage vor erstem Login).

### Datenmodell (Supabase, siehe `supabase/migrations/`)
Kern-Tabellen: `contacts`, `properties`, `search_profiles`, `deals`, `tasks`, `activities`, `notes`, `property_images`, `pipeline_stages`, `organizations`, `organization_members`, plus Task-Erweiterungen `task_checklist_items`, `task_comments`, `task_attachments`.

**RLS-Konvention — wichtig beim Erstellen neuer Tabellen:**
- Die meisten Tabellen sind **user-owned** (`user_id = auth.uid()`). Policies nutzen `(SELECT auth.uid())` statt `auth.uid()` für Performance (siehe `20260413000000_security_performance_fixes.sql`).
- **Tasks und Task-Unterobjekte sind org-scoped** via Helper `my_organization_ids()` (SECURITY DEFINER). Neue team-weite Entities sollten diesem Muster folgen — user-owned ist legacy.
- `updated_at` wird per Trigger `update_updated_at()` gesetzt (search_path-safe).
- `pipeline_stages` werden per Trigger `on_auth_user_created_pipeline` für jeden neuen User mit 6 Default-Stages gesät (Qualifizierung, Besichtigung, Verhandlung, Notariat, Abschluss, Verloren). `deals.stage` wurde durch FK `deals.stage_id → pipeline_stages.id` ersetzt.
- `storage.buckets`: `task-attachments` (private), Property-Images (siehe eigene Migration).

Migrations sind **timestamp-prefixed** (`YYYYMMDDHHmmss_beschreibung.sql`) und weitgehend **idempotent** (DO-Blöcke mit EXISTS-Checks, `IF NOT EXISTS`) — so weit möglich nach diesem Muster fortschreiben.

### TypeScript-Typen
`lib/types.ts` ist die zentrale Quelle der Wahrheit für Domain-Typen + Label-Maps (`*_LABELS`, `*_COLORS`). Neue Entities/Enums **immer hier** ergänzen und aus Pages/Komponenten importieren statt lokal neu zu definieren. Enum-Werte müssen 1:1 zu den DB-Enums passen. `labelsToOptions<T>()` erzeugt daraus `<Select>`-Optionen.

### Komponenten-Layout
- `components/ui/*` — shadcn-Primitives (nicht manuell editieren, `npx shadcn add …`). Alias: `@/components/ui`.
- `components/*` (Top-Level) — App-Komponenten: `Sidebar`, `DashboardLayout`, `TaskSheet`, `BulkActionBar`, `ConfirmDialog`, `DatePicker`, `SearchSelect`, `AppSelect`, `SelectionCheckbox`, `OnboardingOverlay`.
- `hooks/` — UI-Hooks ohne Daten (`useSelection`, `usePagination` mit localStorage-Persistenz unter `immocrm.pageSize.<key>`).
- `lib/hooks/` — Daten-Hooks (Supabase): `useOrganization`, `useOverdueTaskCount`.
- `lib/` — reine Utilities: `types.ts`, `utils.ts` (`cn()`), `ui-tokens.ts` (Inline-Styles + Activity-Farben + `fmtDate`/`fmtDateTime`), `property-helpers.ts` (Formatter für EUR/Area/Adresse), `csv-export.ts`, `image-utils.ts`, `recurrence.ts` (Task-Wiederholungen), `supabase/*`.

### Tests (Playwright)
Projekt-Kette in `playwright.config.ts`: `smoke` (no-auth) → `setup` (Login, speichert Storage-State nach `tests/e2e/.auth/`) → `seed` (legt min. 2 Kontakte/Objekte/Deals an, idempotent) → `authenticated`. `fullyParallel: false`, `workers: 1` — Tests teilen sich einen Account und sind reihenfolgeabhängig. Bei fehlenden E2E-Credentials werden Auth-Tests geskipped; Smoke-Tests laufen immer.

## Design-System

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

### Kern-Farben
- Primärfarbe (Accent): `#C2692A` (Terrakotta)
- Hintergrund: `#F5F3EF`
- Sidebar-Hintergrund: `#18120E` (dunkel)
- Zusätzliche Tokens (blu/grn/amb/pur, Badge-Farben) werden als CSS-Variablen in `globals.css` definiert und in `lib/types.ts`/`lib/ui-tokens.ts` über `var(--…)` konsumiert.

### Abstands-Prinzipien
- Body-Wrap-Padding: 26px oben/unten, 30px links/rechts
- Card-Padding: 22px 24px
- Grid-Gaps: 16–18px zwischen allen Karten
- Listen-Zeilen (Heute, Feed): mindestens 13px vertical padding
- Sidebar-Nav-Items: padding 9px 12px, gap 2px zwischen Items
- `#F5F3EF` ist aktives Designelement — atmen lassen, nicht füllen

### Schatten-System
- Ruhe-Schatten (alle Karten): `0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)`
- Hover-Schatten: `0 6px 20px rgba(28,24,20,0.09), 0 2px 6px rgba(28,24,20,0.06)` + `translateY(-2px)`
- Kein reiner Border als primäre Karten-Abgrenzung — Schatten übernimmt die Tiefe
- Border-Opacity: `rgba(0,0,0,0.05)` — nahezu unsichtbar

### Farbregeln für `#C2692A` (Terrakotta)
Einsetzen für: CTA-Buttons, aktiver Sidebar-Zustand (inset 3px border), "Heute"-Karte (linker Akzent), KI-Chance-Badges, Sparkline-Highlights, Link-Hover.
Nicht für: Füllfarben großer Flächen, Dekorationselemente ohne Funktion.
Faustregel: Terrakotta ist der einzige Farbpunkt — er muss verdient sein.

## Projekt-Regeln
- **Alle UI-Texte auf Deutsch** (Labels, Buttons, Fehlermeldungen, Placeholder, Kommentare in DE sind üblich).
- **Komponenten in `/components` ablegen**, nicht in `/app`. shadcn-Primitives bleiben in `/components/ui`.
- Eine Aufgabe vollständig fertigstellen bevor die nächste beginnt.
- **Nach jeder funktionierenden Einheit committen** — kleine, in sich abgeschlossene Commits.
- Wenn neue Felder/Tabellen hinzukommen: Migration + `lib/types.ts` + Label-Maps gemeinsam aktualisieren.
