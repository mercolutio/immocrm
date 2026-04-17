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

**Leitbild: „Stripe/Linear-Frische für Makler".**
Flat SaaS mit warmer Terrakotta-Note. Tiefe entsteht primär durch **Border + Tint**, nicht durch schwere Shadows. Vollständige Token-Definition + Kommentar-Header in `app/globals.css` (`:root`) — das ist die Quelle der Wahrheit, nicht Inline-Styles.

### Design-Tokens (CSS-Variablen in `app/globals.css`)
Immer über `var(--…)` konsumieren, **niemals Hex-Werte inline** (außer in der `:root`-Definition selbst):

```
Surfaces       --bg (#F5F3EF)  --card (#FFF)  --surface-subtle (#FAF8F5)  --bg2 (#F0EBE4)
Text           --t1 (#18120E primary)  --t2 (#3D2E26 body)  --label (#4A3F35)
               --t3 (#8C7B70 meta)  --placeholder (#A09080)
Borders        --border-strong (#E0D8D0 inputs/btn)  --border (#E8E2DA cards)
               --border-subtle (#F0EBE4 row divider)
Accent         --accent (#C2692A)  --accent-hover (#A8581F)
               --accent-soft (#F0EBE4)  --accent-light (#E88B50 sidebar active)
Sidebar        --sb-bg (#18120E)  --sb-active-bg (rgba accent 0.18)  --sb-active-txt (#E88B50)
Badges         --badge-{green|blue|orange|brown|gray|accent}[-bg]   (Tailwind-Palette)
Legacy-Semantik --red / --grn / --blu / --pur / --amb (+ *-bg)    — Activity-Icons, Alerts
Motion         --ease-out cubic-bezier(.4,0,.2,1)  --dur-in 110ms  --dur-out 220ms
Elevation      --shadow-1 (subtle)  --shadow-2 (cards ruhe)  --shadow-3 (lift hover)
Hover-Tints    --hover-tint-light  --hover-tint-row  --hover-accent-tint
Focus          --focus-ring  (accent 0.18 ring — nur Form-Felder mit `.contact-detail`-Kontext)
```
Legacy-Aliases (`--input-bg`, `--input-border`, `--thead-bg`, `--row-divider`, `--border-md`) existieren noch für ~1000 Altreferenzen — **in neuem Code die neuen Tokens nutzen**.

### Typografie
Zwei Fonts, die in `app/layout.tsx` via `next/font/google` geladen und als `--font-dm-sans` / `--font-playfair` exposed werden. Helfer-Variablen: `--font-body`, `--font-display`.

**Playfair Display** — nur für Titel/Werte, kleiner dosiert als früher:
- Page-Title (`.page-title`, `.hdr-title`): 26 / 500, letter-spacing -0.5px
- KPI-Value (`.kpi-val`, `.stat-value`): 22 / 500, letter-spacing -0.3px
- Card-/Detail-Title (`.detail-title`): 16 / 500
- KI-Berater-Name (`.ki-name`): 15 / 400
- Pipeline-Zahlen (`.pipe-n`): 15 / 400

**DM Sans** — alles andere:
- Card-Title (`.card-title`): 13 / 600 (nicht mehr Playfair!)
- Body-Primary: 13 / 500 `--t1`
- Body: 13 / 400 `--t2`
- Form-Label: 13 / 500 `--label`
- Meta / Zeitstempel: 12 / 400 `--t3`
- Table-Head / Section-Head: **11 / 600 UPPERCASE, letter-spacing 0.06em**
- KPI-Label: 11 / 500 UPPERCASE, letter-spacing 0.04em

> Wichtige Korrektur ggü. früheren Specs: KPIs sind **22px** (nicht 46), Card-Titles sind **DM Sans 13/600** (nicht Playfair 16). Die Typskala ist deutlich flacher geworden.

### Spacing / Radius / Größen-Konstanten
- Page-Padding: `28px 36px 0` (top/sides), Content-Padding `16px 36px 36px`
- Card-Padding: `22px 24px` · Card-Radius: **20px** (Dashboard `.card`) oder **12px** (Tabellen-Wraps, Panels)
- Button-Radius: 8px · Badge-Radius: 20px (Pill)
- Input-Höhe: **37px** · Button-Höhe: 36px (primary/secondary) / 34px (ghost)
- Icon-Button: 37×37 (mit Border) bzw. 28×28 (`.h-icon-btn`, ghost circle)
- Table-Row ≈ 60px (16px padding + 32px Avatar)
- Grid-Gaps: 13–18px je nach Dichte
- Sidebar: 220px breit, collapsed 52px · Items padding 8px 10px, radius 7px

### Interaktions-System (zentraler Punkt — bitte einhalten)
**Asymmetrisches Timing**: `--dur-in: 110ms` (hover-on), `--dur-out: 220ms` (hover-off). Alle Transitions definieren die längere Out-Dauer und setzen im `:hover` die kürzere Dauer. Easing: `--ease-out` immer.

**Kanonische Hover-Klassen** (nicht jedes Mal neu stylen):
- `.h-lift` — Karten: `translateY(-2px)` + `--shadow-3` + stärkere Border
- `.h-soft` — ghost hover: nur Background-Tint (`--hover-tint-light`), kein Lift
- `.h-menu-item` — Dropdown-Items: cream-fill (`--bg`)
- `.h-row` — Table-Rows: `--hover-tint-row` + **inset 3px accent border** links + Padding-Shift
- `.h-link` — Text-Hover auf `--accent`
- `.h-icon-btn` — 28×28 kreisförmiger Icon-Button, `.h-icon-btn.danger` bei destruktiv
- `.h-accordion` — Accordion-Header mit `--hover-accent-tint`

**Kanonische Button/Input-Klassen**: `.btn-primary`, `.btn-secondary`, `.btn-icon`, `.btn-ghost`, `.input-field`. Diese in neuem Code bevorzugen statt Tailwind-Kombinationen oder Inline-Styles.

**Focus**: Standard ist **Border → `--accent`, kein Ring** (flat SaaS). Ausnahme: Detail-Formulare unter `.contact-detail` nutzen zusätzlich `--focus-ring`.

### Shadow-Stufen
- `--shadow-1` — 1px, nur selten (z. B. Unsaved-Card Save-Button ruhe)
- `--shadow-2` — Karten im Ruhezustand (Default)
- `--shadow-3` — Hover-Lift (`translateY(-2px)`)

Tiefe kommt primär aus **Border + Background-Tint**. Schwere Dropshadows vermeiden.

### Badge-System
Einheitliches Format: **6px Dot + Label, padding 3px 10px, radius 20px, 11px/500, gap 5px**. Farben über Badge-Tokens:

| Badge     | Verwendung                                    |
|-----------|-----------------------------------------------|
| green     | Abschluss, Verfügbar, Besichtigung (Stage)    |
| blue      | Qualifizierung                                |
| orange    | Verhandlung, Reserviert                       |
| brown     | Notariat                                      |
| gray      | Verloren, Archiviert, Sold/Rented             |
| accent    | Property-Type (Wohnung, Haus) & generische    |

Alte Semantik-Farben (`--red/grn/blu/pur/amb`) bleiben für **Activity-Icons** (Timeline) und **Alert-Banner** (z. B. `.funnel-alert`). Für neue Badges → Badge-Tokens.

### Layout-Patterns

**List-Page** (Kontakte / Objekte / Pipeline-Liste / Tasks — exakt in dieser Reihenfolge):
```
.page-header (28 36 0, Title + 1-2 Actions rechts)
.stat-strip  (20 36 0, 1fr-Spalten mit Trennlinien — NICHT .kpi-strip, das ist Dashboard-only)
.page-toolbar (Suche max-320 + Filter + .view-toggle)
.page-content (16 36 36) → .list-table-wrap (radius 12) → .table-footer (surface-subtle)
```

**Detail-Page** (`contacts/[id]`, `properties/[id]`, `pipeline/[id]`):
```
.detail-header (Back-Link + / + .detail-title Playfair 16 + .detail-actions rechts)
```

**Dashboard** benutzt eigene Klassen (`.kpi-strip`, `.main-grid` 2fr:1fr, `.bottom-grid` 3×, `.heute-card` mit linkem Accent-Border, `.ki-panel` mit #0A1208-Dark-Surface und `breathe`-Animation).

### Sidebar
- Dark Surface `--sb-bg` mit radialer Accent-Glow am unteren Rand (`::after` gradient)
- Aktiv-State: `--sb-active-bg` + `--sb-active-txt` + 2px Akzentstreifen links (`::before`)
- Collapsed-Mode (52px) mit Floating-Tooltip (JS, nicht CSS `title`) — siehe `components/Sidebar.tsx`
- KI-Entry (`.sb-ki`) mit atmender Dot-Animation (`@keyframes breathe`)

### Farbregel für `#C2692A` (Terrakotta)
Einsetzen für: Primary-CTA, aktive Sidebar-Items, Links/Hover, "Heute"-Card linker Rand, KI-Chance-Chips, Row-Hover-Inset-Border, Sparkline-Highlights, Badge `orange/accent`.
Nicht für: Füllflächen, Dekorationselemente ohne Funktion, mehrere Elemente pro Viewport gleichzeitig.
**Faustregel: Terrakotta ist der einzige Farbpunkt — er muss verdient sein.**

### Animationen
`fadeUp` (List-Enter mit staggered `.anim-0/1/2` und `.kpi:nth-child(n)`), `taskPeekIn/Out` (Side-Sheet Slide, 260/200ms), `borderFlash` (Quick-Add-Success, 900ms), `breathe` (KI-Dot, 2.4s infinite).

## Projekt-Regeln
- **Alle UI-Texte auf Deutsch** (Labels, Buttons, Fehlermeldungen, Placeholder, Kommentare in DE sind üblich).
- **Komponenten in `/components` ablegen**, nicht in `/app`. shadcn-Primitives bleiben in `/components/ui`.
- Eine Aufgabe vollständig fertigstellen bevor die nächste beginnt.
- **Nach jeder funktionierenden Einheit committen** — kleine, in sich abgeschlossene Commits.
- Wenn neue Felder/Tabellen hinzukommen: Migration + `lib/types.ts` + Label-Maps gemeinsam aktualisieren.
