# GymFlow — Project Memory (Source of Truth)

> Single living document. Combines git history, session logs, and all docs into one timeline.
> Any new task should start here. Last updated: **February 19, 2026**.

---

## Project at a Glance

GymFlow is a gym membership management system built for Arabic-speaking gym owners (Egypt-first). It started as a desktop-only Electron app and is migrating to a multi-tenant SaaS.

**Owner**: Mahmoud — UX/UI designer, limited coding background. Prefers bold decisions and quick execution. Do not over-explain. Do not stop to ask excessive questions — implement, then show.

### Three apps in one monorepo (`/Users/mahmoudsfiles/projects/GymFlow/gymflow/`)

| App | Path | Stack | Status |
|-----|------|-------|--------|
| **Desktop** | `/src/` | Electron + electron-vite + SQLite (better-sqlite3) + Baileys WhatsApp | Active — v1.0.9 |
| **Landing Page** | `/app/` | Next.js static export → GitHub Pages (`/gymflow` basePath) | Active |
| **SaaS Web** | `/saas-web/` | Next.js 14 App Router + PostgreSQL + Firebase Auth + Cloud Run | Active |

---

## Infrastructure (SaaS)

- **GCP Project**: `gymflow-saas-260215-251`
- **Cloud Run**: `gymflow-web-app`, `europe-west1`, URL: `https://gymflow-web-app-102836518373.europe-west1.run.app`
- **Custom domain**: `https://gymflowsystem.com`
- **Cloud SQL**: `gymflow-pg` (PostgreSQL 15), `europe-west1-d`
- **Artifact Registry**: `europe-west1-docker.pkg.dev/gymflow-saas-260215-251/gymflow/gymflow-web`
- **Cloud Build trigger**: `gymflow-saas-main-autodeploy` — watches `saas-web/**` on `main` branch
- **Storage buckets**: backups (30-day lifecycle), imports, photos
- **Service Account**: `gymflow-firebase-admin@gymflow-saas-260215-251.iam.gserviceaccount.com`
  - Roles: `roles/cloudsql.client` (added Feb 17), `roles/secretmanager.secretAccessor`, `roles/storage.objectAdmin`

### Local Dev (SaaS)
```bash
# 1. Get Firebase admin JSON
gcloud secrets versions access latest --secret="gymflow-firebase-admin-json" --project="gymflow-saas-260215-251" > /tmp/firebase-admin.json

# 2. Start Cloud SQL proxy (binary at /tmp/cloud-sql-proxy, v2.15.2 darwin.arm64)
GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-admin.json /tmp/cloud-sql-proxy "gymflow-saas-260215-251:europe-west1:gymflow-pg" --port=5433

# 3. Start dev server
cd saas-web && npm run dev
```
`.env.local` exists in `saas-web/` — use `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (individual vars), NOT `FIREBASE_SERVICE_ACCOUNT_JSON` (dotenv mangles `\n` in private key).

### Local Dev (Desktop)
```bash
# From repo root
npm run dev
# Runs electron-rebuild for better-sqlite3, then electron-vite dev
# App opens at http://127.0.0.1:5176/
```

---

## Database Schema (Multi-Tenant)

All tables scoped by `organization_id + branch_id`.

```
organizations → branches (one-to-many)
owners → owner_branch_access → branches (many-to-many, role-based)
members, subscriptions, subscription_freezes, quotas
logs (attendance check-in records)
settings (key-value JSONB per branch) ← whatsapp_status lives here
message_queue (async WhatsApp send queue)
backups, backup_artifacts, import_artifacts, migration_jobs
guest_passes
```

---

## Design System (LOCKED — Brutalist)

> Do not deviate. Both apps share these tokens.

### SaaS Web
| Token | Value | Usage |
|-------|-------|-------|
| Accent | `#e63946` | CTAs, active states, logo mark, destructive |
| Dark bg | `#0a0a0a` | Sidebar, auth left panel |
| Content bg | `#ffffff` | Dashboard content area |
| Auth panel bg | `#f4f4f4` | Auth right panel |
| Border (light) | `#d0d0d0` / `2px solid` | Cards, inputs on light bg |
| Border (dark) | `#2a2a2a` / `2px solid` | Dark surfaces |
| Shadow | `6px 6px 0 #1a1a1a` | Form cards — NO blur |
| Radius | `0rem` everywhere | CSS var `--radius: 0rem` cascades to all shadcn |
| Dot grid | `radial-gradient(#1d1d1d 1px, transparent 1px)` at `28px 28px` | Dark left panels |
| Chart colors | chart-1 `356 77% 56%` (red), chart-2–5 grays | All charts |

### Desktop App (separate Tailwind config)
| Token | Value |
|-------|-------|
| Background | `225 20% 7%` (~#111318) |
| Card | `225 16% 11%` |
| Primary | `43 55% 55%` (~#D4A843 gold) |
| Traffic lights | green `#22c55e`, yellow `#eab308`, red `#ef4444` |
| Font | IBM Plex Sans (Latin) + IBM Plex Arabic |
| Radius | `0.75rem` |
| Shadows | Hard offset, dark (e.g. `6px 6px 0 #1a1a1a`) |

---

## Key Architecture Decisions

1. **Auth**: Firebase client-side (email/password, phone OTP, Google OAuth) → ID token → server verifies with Firebase Admin SDK → extracts `organizationId` + `branchId` from custom claims
2. **Multi-tenancy**: All DB queries hard-enforce `WHERE organization_id = $1 AND branch_id = $2`
3. **WhatsApp**: `@whiskeysockets/baileys` (pure WebSocket) — no Puppeteer, no browser. Auth stored in `<userData>/baileys_auth/` (desktop) or filesystem path env var (worker)
4. **Message queue**: `message_queue` table with `FOR UPDATE SKIP LOCKED` — async worker sends messages, marks `sent`/`failed`
5. **Branches**: main (active dev) → master (original, PR target). Push to `main` auto-deploys SaaS via Cloud Build

---

## Critical Gotchas (Accumulated)

| # | Gotcha | Fix |
|---|--------|-----|
| 1 | Next.js API GET routes using `request.headers` break static rendering | Add `export const dynamic = "force-dynamic"` |
| 2 | Cloud SQL proxy URL is URL-encoded: `%2Fcloudsql%2F` | Don't check for plain `/cloudsql/` |
| 3 | Cloud Build trigger with service account requires logging config | Use `options.logging: CLOUD_LOGGING_ONLY` |
| 4 | `.dockerignore` excludes `scripts/` and `db/` | Don't COPY them in Dockerfile runner stage |
| 5 | Health endpoint pings DB → returns 503 during `next build` | OK — just don't set startup probe to health endpoint |
| 6 | `FIREBASE_SERVICE_ACCOUNT_JSON` in dotenv mangles `\n` in private key | Use individual `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` vars |
| 7 | `FIREBASE_PRIVATE_KEY` needs `.replace(/\\n/g, "\n")` in code | Already handled in `saas-web/lib/auth.ts` |
| 8 | `@whiskeysockets/baileys` is pure ESM; Electron main is CJS | Use named import: `import { makeWASocket }` not `import makeWASocket` (default import goes through `__importDefault` wrapper → returns namespace object not function) |
| 9 | `sock.end()` needs an Error argument | `sock.end(new Error('cleanup'))` |
| 10 | `sock.ev.removeAllListeners()` needs event name arg (Baileys types) | Just call `sock.end()` — skip the removeAllListeners call |
| 11 | Settings.tsx had `openExternal('https://web.whatsapp.com')` in connect handler | Removed — was legacy whatsapp-web.js pattern, opens Safari with Baileys |

---

## Timeline

---

### 2026-02-04 — Landing Page Launch

**What happened**: First proper landing page built and deployed to GitHub Pages.

- Built full marketing landing page for GymFlow (`/app/`)
- 10-section layout: Navbar, Hero, Stats, Features, Testimonials, CaseStudy, HowItWorks, FAQ, CTA, Footer
- Design at the time: modern/professional (orange accent, Plus Jakarta Sans) — later replaced with brutalist
- Set up GitHub Actions CI/CD → GitHub Pages (basePath: `/gymflow`)
- **Bugs fixed during setup**: `'use client'` on layout (breaks metadata), Node 20.x + npm cache flags, Pages permissions in workflow

---

### 2026-02-08 — Landing Fixes

- Fixed download links (macOS/Windows/Linux) and OS auto-highlighting

---

### 2026-02-09 — Desktop: WhatsApp Onboarding Bugs + Windows Hotfixes

**Context**: Desktop app v1.0.4 had broken WhatsApp onboarding and Windows-specific crashes.

- **Bug**: WhatsApp onboarding auto-connect on startup was crashing → Added skip button, removed auto-connect
- **Bug**: Windows startup crash (pdf-lib eager-loads Fontkit at import time, too heavy) → Lazy-loaded pdf-lib
- **Bug**: WhatsApp OTP fallback broken on Windows → Hotfixed QR startup flow + OTP fallback path
- **Bug**: Auto-updater pointing at dead server → Switched to GitHub Releases API

---

### 2026-02-10 — Desktop v1.0.5 + v1.0.6

- v1.0.5: Arabic translations added, radio buttons for plan selection, migrating member flow, date format fixes, update UI polish
- v1.0.6: Fixed member form bugs, added minimize-to-tray, auto-launch on startup

---

### 2026-02-11 — Desktop v1.0.7 + v1.0.8

- v1.0.7: Fixed updater retry loop, fixed member delete freeze, improved QR scanner reliability
- v1.0.8: Force-close GymFlow before installer runs (prevents file lock on Windows), updated landing fallback

---

### 2026-02-16 — SaaS Web: Security Hardening + Cloud Infrastructure

**Context**: SaaS web app needed to be hardened and deployed to Cloud Run before going live.

**Security** (see `project-memory.md` in memory folder for full detail):
- Removed dev auth bypass flag
- Added security headers (CSP, X-Frame, XSS-Protection, etc.)
- Rate limiting on login/register/forgot-password
- Validated migration upload with Zod
- Forced `DATABASE_SSL=true` in production with Cloud SQL proxy detection

**UX**:
- Loading spinners, error cards, empty states on dashboard
- `prefers-reduced-motion` support
- 44×44px touch targets on language toggles

**Code quality**:
- Refactored login page: 15+ useState → React Hook Form + Zod
- Split 738-line landing page into 10 components
- Extracted constants, added error.tsx and not-found.tsx

**Deployment/infra**:
- Health endpoint pings DB (returns 503 if unreachable)
- Terraform: Secret Manager, IAM roles, health probes
- `.dockerignore`, SSL validation, Cloud Build migration step
- Cloud Run config cleaned

**Build fix chain** (each fixed a broken deploy):
1. Missing `fail` import in attendance/check/route.ts
2. Missing `'use client'` in not-found.tsx
3. All API GET routes needed `force-dynamic`
4. Removed `COPY scripts/ db/` from Dockerfile runner stage
5. Cloud Build trigger needed `CLOUD_LOGGING_ONLY` logging
6. Cloud SQL proxy URL is URL-encoded (`%2Fcloudsql%2F`)

---

### 2026-02-17 — Brutalist Redesign (SaaS + Landing) + Desktop UI Audit + WhatsApp Failures

#### SaaS Web: Brutalist Design System

Full visual overhaul. See `docs/design-system.md` for complete token spec.

**Files changed**:
- `saas-web/app/globals.css` — full CSS var overhaul: `#e63946` red primary, `--radius: 0rem`, chart vars
- `saas-web/components/dashboard/Sidebar.tsx` — dark brutalist sidebar (`bg-[#0a0a0a]`), GF red mark, red active left border
- `saas-web/components/dashboard/Header.tsx` — white header, `2px border-b`, brutalist lang toggle
- `saas-web/app/(auth)/login/page.tsx` — split layout: dark left panel (dot grid + watermark + headline + stats) + white right panel (red top bar + dark-shadow card)
- `saas-web/app/(auth)/forgot-password/page.tsx` — dark bg, white brutalist card
- `saas-web/app/dashboard/reports/page.tsx` — chart colors via CSS vars, `borderRadius: 0` on tooltips

**Landing page** (`/app/`):
- Restructured to centered layout with sticky nav + footer
- Removed unnecessary "Open dashboard" CTA
- Full premium redesign: 11 conversion-optimised sections

**PWA migration plan**: Written (see `docs/migration-to-PWA.md`) — not yet implemented.

#### Desktop App: UI/UX Audit Session

Full Playwright-based audit run on the Electron app. Multiple phases of fixes:
- Restored missing config files from git (electron.vite.config.ts, tsconfig files, package.json scripts)
- Fixed missing `t` destructuring in App.tsx (was crashing entire app)
- Fixed missing Tailwind tokens (`font-body`, `font-heading`, `bg-traffic-*`)
- Added `animate-slide-up` keyframes to tailwind.config.js
- UI fixes: MemberForm card title, Settings bg, Subscriptions badge, Reports RTL chart labels, Import translations, Dashboard aria-labels, MemberDetail loading spinner, AuthLayout shadow, Login label/input associations

#### Desktop: WhatsApp — Failed Attempts with `whatsapp-web.js`

Multiple attempts to fix WhatsApp connect, all failed. Root cause: Chromium inside Electron = process conflict → `Protocol error (Runtime.callFunctionOn): Target closed`. See `docs/desktop-app-whatsapp-fix-log.md` for full attempt history.

Attempts tried (all partial/failed):
- Chrome binary resolution improvements
- Non-blocking connect lifecycle
- Stale lock/process cleanup
- UI status polling fallback

---

### 2026-02-17 (evening) — Full Dark UI: Desktop App Conversion

Commit `e17aadd`: Desktop app converted to full dark premium palette.
- Background `225 20% 7%`, card `225 16% 11%`, gold primary `#D4A843`
- IBM Plex Sans + IBM Plex Arabic fonts
- Hard-offset shadows (`4px 4px 0 #1a1a1a`), `0.75rem` radius
- Traffic light animations (pulse-green/yellow/red)
- Scrollbar dark styling, RTL support for Arabic

---

### 2026-02-17 (night) → 2026-02-18 — Baileys Migration (WhatsApp RESOLVED)

**Problem**: `whatsapp-web.js` is Puppeteer-based. Chromium inside Electron causes fatal process conflicts. Every connect attempt ended in `Target closed`.

**Solution**: Full rewrite to `@whiskeysockets/baileys` — pure WebSocket, no browser.

#### Desktop App Changes

| File | Change |
|------|--------|
| `src/main/services/whatsapp.ts` | Full rewrite — `makeWASocket` + `useMultiFileAuthState`, same public interface |
| `src/main/index.ts` | `whatsappService.disconnect()` → `whatsappService.cleanup()` on will-quit |
| `src/renderer/src/pages/Settings.tsx` | Removed `openExternal('https://web.whatsapp.com')` from connect handler; removed inline QR block (kept Dialog overlay) |
| `package.json` | Removed `whatsapp-web.js`; added `@whiskeysockets/baileys`, `pino`, `@hapi/boom` |

**Auth storage**: `<userData>/baileys_auth/` (small JSON files, no Chromium profile locks)

**Key design decisions in `whatsapp.ts`**:
- `connect()` = user-initiated → calls `initSocket()`, sets credentials, shows QR
- `disconnect()` = user-initiated logout → `sock.logout()`, clears credentials
- `cleanup()` = app quit → `sock.end(new Error('cleanup'))`, preserves credentials for next launch
- Auto-reconnect on unexpected close (3s delay), unless `intentionalDisconnect = true`
- `connectInFlight` guard prevents double-connect races

#### SaaS Web Worker Changes

| File | Change |
|------|--------|
| `saas-web/worker/whatsapp-vm/package.json` | Replaced `whatsapp-web.js` with `baileys`, `pino`, `qrcode`, `@hapi/boom` |
| `saas-web/worker/whatsapp-vm/src/index.ts` | Full rewrite — two loops: connection manager + queue processor |
| `saas-web/app/api/whatsapp/status/route.ts` | Added `connected: boolean` transformation (raw `{ state }` → `{ connected, state, phone, qrCode }`) |
| `saas-web/app/dashboard/settings/page.tsx` | WhatsAppTab: auto-poll every 3s, error state, QR loading placeholder |

**Worker architecture**:
- **Loop 1** (every 3s): reads `whatsapp_status` from `settings` table → if `state='connecting'` and no socket → `initSocket()` → if `state='disconnected'` and socket open → `sock.logout()`
- **Loop 2** (every 5s): `FOR UPDATE SKIP LOCKED` on `message_queue` → JOIN `members` for phone → `sock.sendMessage(jid, { text })` → mark `sent`/`failed`. Skips if socket not ready.
- QR: `qrcode.toBuffer(qr)` → base64 → write to `settings` table → UI polls and shows it
- Env vars required: `DATABASE_URL`, `ORGANIZATION_ID`, `BRANCH_ID`, `BAILEYS_AUTH_PATH`

#### Bugs Hit During Migration (and fixes)

1. **`makeWASocket is not a function`** — ESM/CJS interop: default import goes through `__importDefault` which wraps namespace in `{ default: namespace }`. Named import `import { makeWASocket }` bypasses this.
2. **Safari opening on Connect** — Settings.tsx had `openExternal('https://web.whatsapp.com')` before calling connect (leftover from whatsapp-web.js era). Removed.
3. **`sock.end(undefined)` type error** — Baileys requires `sock.end(new Error(...))`.
4. **`sock.ev.removeAllListeners()` type error** — Baileys requires event name arg. Removed the call.
5. **QR appearing twice** — Settings tab had both an inline auto-show QR block AND a Dialog overlay. Removed inline block, kept Dialog (triggered by "Show QR" button).

#### Verified Working (Feb 18, 2026)
- Settings → WhatsApp → Connect → QR appears inside app (~2s) ✓
- No browser window opens ✓
- Scan with phone → status shows Connected ✓
- Session persists across restarts ✓

---

### 2026-02-18 (late) → 2026-02-19 — Firebase Auth + PWA Offline Rollout

#### Firebase auth stabilization
- Added Google OAuth client credentials and validated Google sign-in flow end-to-end.
- Fixed local phone auth blocking by enabling Firebase test phone numbers and localhost test-mode path.
- Final local test numbers configured in Firebase Auth:
  - `+16505550100` → `123456`
  - `+16505550101` → `123456`
- Local-only safeguard in `saas-web/app/(auth)/login/page.tsx`:
  - `auth.settings.appVerificationDisabledForTesting = true` on `localhost` / `127.0.0.1`

#### PWA + offline check-in implementation shipped
- Added installable PWA shell:
  - `saas-web/public/manifest.json`
  - `saas-web/public/sw.js`
  - `saas-web/public/offline.html`
  - `saas-web/public/icons/*`
- Added dashboard install + sync UX:
  - `saas-web/components/dashboard/InstallPrompt.tsx`
  - `saas-web/components/dashboard/SyncStatus.tsx`
- Added offline engine and IndexedDB stack:
  - `saas-web/lib/offline/*`
  - `saas-web/lib/check-in/rules.ts`
  - `saas-web/app/api/members/offline-bundle/route.ts`
- Added offline sync/idempotency fields and validation support:
  - `saas-web/app/api/attendance/check/route.ts`
  - `saas-web/lib/validation.ts`
  - `saas-web/db/schema.sql`
  - `saas-web/db/migrations/004_offline_checkin.sql`

#### Health check + fixes (Playwright + build/typecheck)
- Verified in Playwright:
  - service worker registration active on `/login`
  - manifest and icons load correctly
  - offline navigation fallback returns `offline.html`
  - phone login/register with test numbers reaches `/dashboard`
- Fixed issues found during QA:
  - Dashboard showed raw offline reason codes (`unknown_member`) → now mapped to user-facing EN/AR copy in `saas-web/app/dashboard/page.tsx` + `saas-web/lib/i18n.ts`
  - Missing favicon request and PWA meta warning cleanup in `saas-web/app/layout.tsx`
  - Sync manager online listener cleanup to avoid repeated listeners in `saas-web/lib/offline/sync-manager.ts`
- Validation:
  - `npm run typecheck` ✅
  - `npm run build` ✅

---

### 2026-02-19 (live hardening) — Reports + Settings production fixes

#### Root-cause found from live logs
- Some live clients were still requesting removed reports endpoints (stale frontend bundles / cached sessions):
  - `/api/reports/member-attendance-trends`
  - `/api/reports/detailed-revenue-breakdown`
  - `/api/reports/outstanding-payments-debtors`
  - `/api/reports/peak-hours-capacity-utilization`
- This produced `404 Unsupported report` errors in Reports for affected users.

#### Fixes shipped
- Added legacy endpoint compatibility in `saas-web/app/api/reports/[report]/route.ts`:
  - `member-attendance-trends` (date + visits series)
  - `detailed-revenue-breakdown` (source + amount payload)
  - `outstanding-payments-debtors` (renewal-due approximation payload)
  - `peak-hours-capacity-utilization` (hour + visits payload)
- Fixed backup history date rendering bug (`Invalid Date`) by returning epoch seconds from:
  - `saas-web/app/api/backup/history/route.ts`
  - SQL change: `EXTRACT(EPOCH FROM b.created_at)::bigint AS created_at`

#### Deployment + validation
- Commits:
  - `06abb95` — reports legacy compatibility
  - `f65686e` — backup history timestamp fix
- Deployed to Cloud Run service `gymflow-web-app` (region `europe-west1`), revision serving new image tag from `f65686e`.
- Verified live with Playwright:
  - reports buttons in current UI all load without unsupported-report errors
  - legacy reports endpoints now return `200` (for stale clients)
  - backup creation works; history timestamps are now parseable by frontend formatters

---

## Current State (Feb 19, 2026)

### What works
- Desktop app: full dark UI, WhatsApp connect/disconnect/QR via Baileys, member management, QR check-in, attendance, subscriptions, reports, import/export, PDF generation, auto-update
- SaaS web: full brutalist UI, Firebase auth, multi-tenant dashboard, members/subscriptions/attendance/reports, WhatsApp settings UI (polls for QR), backup/restore, Cloud Run deployment
- SaaS web PWA: install prompt, service worker, offline fallback page, offline check-in queue + sync engine (initial production-ready version)
- Landing page: 11-section brutalist dark marketing page → GitHub Pages

### What's NOT done yet
| Item | Notes |
|------|-------|
| WhatsApp web worker | Code written but not deployed/tested end-to-end. Needs `ORGANIZATION_ID` + `BRANCH_ID` env vars when running |
| PWA / offline check-in | Implemented and locally validated. Next: production soak test and monitoring for sync edge-cases. |
| Tests | Zero tests anywhere |
| Staging environment | None — only production Cloud Run |
| DB migrations in Cloud Build trigger | `cloudbuild.yaml` has the step, but trigger uses inline config that doesn't include it |
| Dashboard UX polish | QR scanner prominence, member empty states, subscription status badges |
| WhatsApp message delivery report | Planned in `docs/future_reports.md` |
| Churn prediction / LTV reports | Planned in `docs/future_reports.md` |

---

## File Map (Critical Files)

### Desktop (`/src/`)
```
src/main/services/whatsapp.ts   — Baileys service (connect/disconnect/cleanup/send)
src/main/ipc/handlers.ts        — All IPC handlers (~750 lines)
src/main/database/connection.ts — SQLite init + better-sqlite3
src/renderer/src/pages/         — Login, Dashboard, Members, MemberDetail, Settings, etc.
src/renderer/src/components/    — WhatsAppConnectPanel, AuthLayout, QRCodeDisplay, etc.
src/renderer/src/index.css      — Design tokens, traffic light animations
tailwind.config.js              — Desktop Tailwind: IBM Plex, gold primary, dark tokens
```

### SaaS Web (`/saas-web/`)
```
app/(auth)/login/page.tsx       — Full brutalist login (Firebase, Zod, react-hook-form)
app/dashboard/layout.tsx        — Dashboard shell
app/dashboard/settings/page.tsx — Settings: General, WhatsApp, Backup, Data tabs
app/api/whatsapp/               — connect, disconnect, status, send routes
app/api/attendance/check/       — Check-in route (quota, subscription, cooldown)
components/dashboard/Sidebar.tsx — Brutalist dark sidebar
components/dashboard/Header.tsx — White header + lang toggle
lib/auth.ts                     — Firebase token verify, multi-tenant context
lib/db.ts                       — PostgreSQL pool, Cloud SQL proxy detection
lib/http.ts                     — ok(), fail(), routeError() helpers
lib/tenant.ts                   — upsertSetting() helper
db/schema.sql                   — Full multi-tenant PostgreSQL schema
worker/whatsapp-vm/src/index.ts — Baileys worker (connection manager + queue processor)
Dockerfile                      — Multi-stage: deps → builder → runner (node:20-alpine, port 8080)
```

### Landing (`/app/`)
```
app/page.jsx                    — Composition of 11 components
app/components/                 — Navbar, Hero, Stats, Features, Testimonials, CaseStudy, HowItWorks, Pricing, FAQ, CTA, Footer
app/globals.css + landing.module.css — Full dark brutalist styles
```

### Docs (`/docs/`)
```
docs/project-memory.md          — THIS FILE (source of truth)
docs/design-system.md           — Complete SaaS design token spec
docs/desktop-app-whatsapp-fix-log.md — Full history of WhatsApp attempts + RESOLVED section
docs/migration-to-PWA.md        — PWA offline check-in plan (implemented baseline; use for future iterations)
docs/future_reports.md          — Backlogged report ideas
```
