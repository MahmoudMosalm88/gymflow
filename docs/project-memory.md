# GymFlow — Project Memory (Source of Truth)

> Single living document. Combines git history, session logs, and all docs into one timeline.
> Any new task should start here. Last updated: **April 6, 2026**.

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
- **Cloud Run**: `gymflow-web-app`, `europe-west1`, URL: `https://gymflow-web-app-102836518373.europe-west1.run.app`, `minScale=0` after April 1 cost cut
- **Custom domain**: `https://gymflowsystem.com`
- **Cloud SQL**: `gymflow-pg` (PostgreSQL 15), `europe-west1-d`, tier `db-g1-small` after April 1 cost cut
- **Artifact Registry**: `europe-west1-docker.pkg.dev/gymflow-saas-260215-251/gymflow/gymflow-web`
- **Cloud Build trigger**: `gymflow-saas-main-autodeploy` — watches `saas-web/**` on `main` branch
- **Storage buckets**: backups (30-day lifecycle), imports, photos
- **WhatsApp VM**: `gymflow-whatsapp-worker`, `europe-west1-b`, machine type `e2-micro` after April 1 cost cut
- **Cloud Run runtime service account**: `gymflow-web-sa@gymflow-saas-260215-251.iam.gserviceaccount.com`
  - Roles from Terraform: `roles/cloudsql.client`, `roles/storage.objectAdmin`, `roles/secretmanager.secretAccessor`
- **Firebase Admin service account used for token verification**: `gymflow-firebase-admin@gymflow-saas-260215-251.iam.gserviceaccount.com`
  - Used for Firebase Admin auth/session verification

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
| 12 | Running `next build` while a local `next dev` server is serving can invalidate dev chunks and make `_next/static/*` return 404/500 | Restart `next dev` after local builds before trusting browser tests |
| 13 | Browser-direct member photo upload to Firebase Storage is fragile and failed with CORS in real usage | Upload member photos through server route, not browser-to-Firebase |
| 14 | Local photo upload e2e against GCS needs Application Default Credentials | Production uses Cloud Run runtime service account; local requires `gcloud auth application-default login` or equivalent |

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

### 2026-02-19 (WhatsApp automation) — Language-safe templates

#### Problem
- Arabic branches could still fall back to legacy single-template keys and accidentally send English WhatsApp messages.

#### Fixes shipped in code
- Added centralized language-aware template helpers in:
  - `saas-web/lib/whatsapp-automation.ts`
  - language defaults for EN/AR, key helper (`whatsapp_template_<type>_<lang>`), and language normalization.
- Welcome queue generation now uses system language in:
  - `saas-web/app/api/members/route.ts`
  - selection order is language key first, and Arabic mode no longer falls back to legacy English key.
- Renewal scheduler now uses system language in:
  - `saas-web/worker/whatsapp-vm/src/index.ts`
  - Arabic mode uses Arabic key/default only (no EN legacy fallback).
- Settings WhatsApp template editor now works per current dashboard language in:
  - `saas-web/app/dashboard/settings/page.tsx`
  - reads/saves `*_en` or `*_ar` keys based on active language.
  - legacy keys are only updated from EN mode for old-client compatibility.
- Dashboard language toggle now syncs backend `system_language` in:
  - `saas-web/app/dashboard/layout.tsx`
  - keeps frontend language and backend automation language aligned.

#### Validation
- `cd saas-web && npm run typecheck` ✅
- `cd saas-web && npm run build` ✅
- `cd saas-web/worker/whatsapp-vm && npx tsc src/index.ts --module nodenext --moduleResolution nodenext --target es2022 --outDir dist` ✅

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

---

### 2026-02-19 — Firebase Auth Deep Dive + Profile Phone OTP Hardening

**Goal**: eliminate recurring Firebase auth failures in local testing and enforce OTP verification when adding/changing phone from Profile.

**Scope completed**:
- Added mandatory OTP verification gate before saving a changed phone number in profile.
- Audited Firebase project/auth settings through CLI and direct Identity Toolkit admin API calls.
- Reworked local Firebase client persistence for stable auth state during dev.
- Validated flow with Playwright and isolated remaining failures to account-level conflicts instead of captcha credential errors.

**Code changes**:
- `saas-web/app/dashboard/profile/page.tsx`
  - Added profile phone OTP workflow (`Send code` -> `Verify code`) before save.
  - Blocked save when phone is changed and not yet verified.
  - Added E.164 validation and clearer OTP status/error messaging.
  - Replaced profile verification internals with `PhoneAuthProvider.verifyPhoneNumber(...)` + `linkWithCredential(...)`.
  - Added recaptcha lifecycle hardening:
    - dedicated hidden container
    - reset/clear behavior on retry and known auth failures
    - fresh verifier per send attempt
  - Added explicit handling for phone-already-linked conflicts:
    - `auth/account-exists-with-different-credential`
    - `auth/credential-already-in-use`
    - `auth/phone-number-already-exists`
  - Added action hint in UI when number belongs to another account.

- `saas-web/lib/firebase-client.ts`
  - Localhost persistence changed from `inMemoryPersistence` to `browserSessionPersistence`.
  - Rationale: avoid IndexedDB instability while preserving Firebase `currentUser` across local redirects/navigation.

- `saas-web/app/(auth)/login/page.tsx`
  - Removed localhost test-mode app verification toggle (`appVerificationDisabledForTesting` now false for real numbers).

**Firebase/GCP config actions executed**:
- Verified project and credentials for `gymflow-saas-260215-251`.
- Verified enabled services include:
  - `identitytoolkit.googleapis.com`
  - `securetoken.googleapis.com`
  - `recaptchaenterprise.googleapis.com`
- Verified Auth settings:
  - phone provider enabled
  - authorized domains include `localhost` and `127.0.0.1`
- Inspected API key restrictions for active web key.
- Rotated recaptcha enterprise key once during investigation, then removed explicit `recaptchaKeys` binding to return to Firebase-managed default behavior.

**Playwright verification results**:
- Auth page phone send-code flow succeeded (recaptcha visible, OTP sent).
- Profile page send-code flow succeeded after persistence + recaptcha fixes.
- A failing verification case reproduced as account conflict (`auth/account-exists-with-different-credential`) rather than captcha credential failure.

**Important outcome**:
- The persistent `Invalid phone verification credential` failure path in profile send flow was addressed and no longer reproduced in Playwright for new local account/session.
- Remaining verify failures are now clearly surfaced as data/account conflicts when the phone is already attached elsewhere.

---

### 2026-02-23 — Deployment Stability Hardening + WhatsApp Member Action Fix

**Goal**: reduce user-visible slowdowns during deploys, and fix broken WhatsApp send action from member profile menu.

**Scope completed**:
- Implemented safer Cloud Run rollout logic in build configs (canary-like traffic shifting with rollback guard).
- Removed dashboard auto-triggered card-code backfill maintenance call.
- Added manual admin backfill action in Settings.
- Fixed member profile WhatsApp menu flow to queue QR/check-in code and welcome message directly (no redirect to Settings).
- Applied live Cloud Run scaling update to keep more warm capacity.

**Code/config changes**:
- `saas-web/cloudbuild.yaml`
  - deploy window guard (UTC 00:00-06:00)
  - deploy with `--no-traffic`
  - smoke checks (`/api/health`, `/login`)
  - staged traffic shift `10% -> 50% -> 100%`
  - rollback to previous revision if canary checks fail
  - enforce `--min-instances=2` on deploy
- `saas-web/cloudbuild.trigger.yaml`
  - same rollout hardening and guard logic as above
- `saas-web/app/dashboard/page.tsx`
  - removed automatic `/api/migration/backfill-card-codes` call from normal dashboard load
- `saas-web/app/dashboard/settings/page.tsx`
  - added manual “Run Backfill Now” action (Arabic + English) with success/error feedback
- `saas-web/app/api/whatsapp/send/route.ts`
  - member-aware payload generation for `welcome` and `qr_code` send types
  - language-aware message defaults + template rendering
- `saas-web/app/dashboard/members/[id]/page.tsx`
  - member actions menu now exposes direct send actions:
    - send check-in code
    - send welcome message
  - added inline success/error feedback

**Live infra action executed**:
- Ran:
  - `gcloud run services update gymflow-web-app --region=europe-west1 --min-instances=2`
- Verified live service annotation:
  - `autoscaling.knative.dev/minScale: '2'`

**Validation performed**:
- `cd saas-web && npm run build` ✅
- Playwright verification (authenticated session) ✅:
  - member menu no longer redirects to settings
  - both send actions call `POST /api/whatsapp/send`
  - both return `202 Accepted`

**Commits pushed**:
- `cdde381` — `fix(whatsapp): send member QR/welcome from profile actions`
- `161cab7` — `fix(core): stabilize auth, income, dashboard, worker and db performance`

### 2026-02-23 (Late) — WhatsApp Automation Recovery + Reminder Window Fix + QR Image Rollout

**Goal**: fix missing auto-welcome/reminder sends, switch QR sends from text-only code to real QR image, and clean deleted test profiles from subscriptions view.

**What was verified and fixed**:
- Root causes found in production:
  - Mixed settings value shapes (`string` vs `{ raw: ... }`) caused fragile template/boolean parsing.
  - Reminder scheduler excluded records inside last 24 hours (`>= now + minOffset`), so `1-day` reminders could be skipped.
  - Some phone inputs like `+010...` timed out at send time.
  - Legacy worker period had `DRY RUN` sends that marked rows as sent but did not deliver.
- Fixed parsing in API paths:
  - `saas-web/lib/whatsapp-automation.ts`
    - added `parseTextSetting(...)`
    - hardened `parseBooleanSetting(...)` for wrapped objects
  - `saas-web/app/api/members/route.ts`
  - `saas-web/app/api/whatsapp/send/route.ts`
- Worker hardening and behavior fixes:
  - `saas-web/worker/whatsapp-vm/src/index.ts`
    - queue priority: `welcome`/`qr_code` ahead of `renewal`
    - throttle and jitter kept for anti-ban pacing
    - normalized phone send target (handles common local `01...` forms)
    - `qr_code` now sends **image QR** (+ caption), not just text digits
    - enriched send logs with `jid` and `waMessageId`
    - reminder window fixed to include `> now` through max reminder horizon
- Subscriptions cleanup and API guard:
  - `saas-web/app/api/subscriptions/route.ts` now excludes deleted members via join (`m.deleted_at IS NULL`).
  - Live data cleanup executed for user profile `201208377611`: removed subscription rows tied to deleted members (10 rows).

**Live verification highlights**:
- For profile `201208377611`, 4 members shown as `1 day left` were correctly queued and sent with `reminder_days=1` after fix.
- Re-queued and delivered 3 user-reported missing welcome messages with confirmed `waMessageId`:
  - عمر محمد ابراهيم
  - سامح عبدالوهاب قرقر
  - عمر هيثم سرور
- Bulk QR rollout queued for all active subscribers on this profile:
  - active subscribers found: 92
  - queued QR image sends: 92 (processed gradually by throttle).

**Commit pushed**:
- `4becfaf` — `fix(whatsapp): restore automated sends and qr image delivery`

---

## Lessons Learned

1. **Do not trust DB `sent` status alone**.
   - During historical dry-run mode, rows were marked `sent` without real delivery.
   - Always correlate with worker logs and, when possible, `waMessageId`.

2. **Date-window math must match product language**.
   - “1 day left” in UI can include <24h when using ceil logic.
   - Scheduler windows must be aligned with that rule, or users see report/reminder mismatch.

3. **Phone normalization must happen server-side before send**.
   - Frontend validation is not enough; imported/manual data can still be malformed.

4. **Deleted member hygiene must be enforced at query level**.
   - Relying only on UI cleanup allows stale records to leak into lists.
   - API joins with `deleted_at IS NULL` prevent repeated regressions.

5. **Queue priority matters for UX**.
   - Welcome/QR messages should not wait behind renewal backlog.
   - Prioritization significantly improves perceived reliability.


## Research References
- Added repo-based autoresearch improvement map: `docs/autoresearch-gymflow-improvements.md` and log `docs/autoresearch-gymflow-improvements-research-log.md`.

---

### 2026-03-19 — Execution Roadmap + Autoresearch Consolidation

**Goal**: turn the improvement research into an execution order that can be acted on instead of a loose findings list.

**What was documented**:
- Added `docs/autoresearch-gymflow-improvements.md` as the saturated improvement map.
- Added `docs/autoresearch-gymflow-improvements-research-log.md` as the research loop ledger.
- Added `docs/execution-roadmap-2026-03-19.md` to rank work in both dependency order and impact order.

**Key outcome**:
- WhatsApp automation was confirmed as the highest-impact execution area.
- The first chosen slice was worker-side queue serialization per tenant to stop overlapping send loops.

---

### 2026-03-31 — SaaS WhatsApp Control Center + Broadcast System

**Goal**: finish the missing owner-facing WhatsApp management surfaces for the SaaS app and harden queue operations.

**What shipped in code**:
- Expanded `Settings > WhatsApp` into a control center with:
  - connection state
  - QR/connect visibility
  - queue health counters
  - latest queue items
  - retry controls for failed rows
  - localized template editing
  - broadcast composer with advanced filters
  - audience preview with estimated send time
  - campaign history
- Added SaaS WhatsApp APIs:
  - `saas-web/app/api/whatsapp/status/route.ts`
  - `saas-web/app/api/whatsapp/queue/route.ts`
  - `saas-web/app/api/whatsapp/queue/retry/route.ts`
  - `saas-web/app/api/whatsapp/broadcast/preview/route.ts`
  - `saas-web/app/api/whatsapp/broadcast/route.ts`
  - `saas-web/app/api/whatsapp/campaigns/route.ts`
- Added shared backend ops layer:
  - `saas-web/lib/whatsapp-ops.ts`
- Extended validation:
  - `saas-web/lib/validation.ts`
- Extended DB schema:
  - `whatsapp_campaigns`
  - `message_queue.campaign_id`
  - `message_queue.last_attempt_at`
  - `message_queue.provider_message_id`
- Hardened worker:
  - single in-flight queue processor per tenant
  - queue run / success / error timestamps persisted in status
  - campaign status updates based on queue progress
  - retry metadata support

**Bugs found and fixed during local e2e pass**:
- Existing databases did not receive new queue columns because the first schema version only added them inside `CREATE TABLE IF NOT EXISTS`.
- Fixed with additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements in `saas-web/db/schema.sql`.
- Dry-run worker could not drain queued broadcasts unless a real WhatsApp runtime existed.
- Fixed worker dry-run to create queued-tenant runtimes without requiring QR scan.

**What was verified locally**:
- `cd saas-web && npm run typecheck` ✅
- `cd saas-web && npm run build` ✅
- worker TS check ✅
- Playwright local verification on WhatsApp Settings passed:
  - login
  - queue refresh
  - campaign history refresh
  - broadcast preview
  - broadcast queueing
  - connect / cancel-disconnect
  - template save
- Dry-run queue proof:
  - queued broadcast moved `pending -> sent`
  - campaign moved `queued -> completed`

**Commit pushed**:
- `aa796f9` — `feat(whatsapp): add queue health and broadcast controls`

---

### 2026-04-01 — Production Cost Reduction Pass

**Goal**: cut recurring GCP spend hard while keeping the app online and WhatsApp automation still available for a small pilot.

**Baseline before changes**:
- GymFlow monthly run rate was tracking around `~$105 to $111/month`.
- Main cost drivers:
  - Cloud SQL
  - Cloud Run warm instances
  - WhatsApp VM

**Billing facts gathered**:
- March 23 to April 1 GymFlow spend:
  - Cloud SQL: `$15.76`
  - Cloud Run: `$8.17`
  - Compute Engine: `$8.15`
- WhatsApp VM 7-day measured usage:
  - CPU avg `1.43%`, max `2.39%`
  - current RAM fit on the smaller machine after restart
- Cloud SQL 7-day measured usage before downsizing:
  - CPU avg `10.1%`, max `11.4%`
  - memory avg `45.0%`, max `59.8%`
  - backend connections max `2`

**Live infra changes applied**:
- Cloud Run:
  - `minScale: 1 -> 0`
  - live revision became `gymflow-web-app-00099-q47`
- Cloud SQL:
  - `db-custom-1-3840 -> db-g1-small`
  - verified back to `RUNNABLE`
- WhatsApp VM:
  - `e2-medium -> e2-micro`
  - worker and `cloud-sql-proxy` verified back up

**Operational tradeoffs accepted**:
- app cold starts can be slower after idle
- reports/income/admin-heavy pages can be slower due to smaller DB
- WhatsApp automation kept online, but with much less VM headroom

**Expected new monthly run rate**:
- approximately `~$40 to $48/month`
- expected reduction:
  - `~$61 to $71/month`
  - about `58% to 65%` lower than the previous shape

**Important operational note**:
- WhatsApp VM public IP changed after resize/restart:
  - old: `104.155.38.75`
  - new: `34.78.91.250`

---

## Lessons Learned

6. **Billing export is the only trustworthy source for cost arguments**.
   - Estimating from service lists is useful, but final calls should use exported cost rows and measured utilization.

7. **For this pilot stage, Cloud SQL and Cloud Run were oversized**.
   - Real traffic and connection counts were low enough to justify aggressive downsizing.

8. **WhatsApp VM resizing is viable, but public IP can change on restart**.
   - Any manual allowlists or scripts tied to the old IP must be updated if they existed.

9. **Cost cuts have visible UX tradeoffs**.
   - Reports and first-load paths are the first surfaces likely to feel slower after aggressive infra downsizing.

---

### 2026-04-02 — Desktop v1.0.9 Health Check + WhatsApp Connect Recovery

**Goal**: make the desktop build safe to send to users by clearing the remaining WhatsApp onboarding/connect regressions.

**What was fixed in the desktop app**:
- Investigated the recurring WhatsApp onboarding failure where Chrome could not be found and connection attempts either closed or timed out.
- Reworked the desktop runtime so WhatsApp connect no longer depends on the broken Chromium/Puppeteer path that was causing the onboarding crash shape.
- Added stale-session cleanup around WhatsApp connect:
  - detects stale session lock files
  - kills stale background Chrome processes bound to the old session
  - removes stale lock artifacts before retry
- Repacked and relaunched the local `.app` repeatedly while validating the fixes.

**What was verified**:
- onboarding no longer throws the previous Chrome-not-found error during connect
- stale session/lock conditions no longer leave the UI in a dead loading state
- app was relaunched locally after each fix pass for user validation

**Documentation note**:
- the older standalone WhatsApp fix log file referenced earlier in project history is no longer present under `docs/`; this `project-memory.md` entry is the current source of truth for that April 2 desktop stabilization pass.

---

### 2026-04-02 — SaaS Dashboard Camera QR Scanning Shipped

**Goal**: add camera-based QR scanning to the SaaS dashboard without breaking the existing scanner and offline flows.

**What shipped**:
- Added a camera scan button to the dashboard scanner bar.
- Added a dedicated fullscreen camera scanner flow in:
  - `saas-web/components/dashboard/CameraScanner.tsx`
- Camera scans are logged as a separate attendance method: `camera`.
- Extended online and offline check-in flows so camera scans work with:
  - success/denial feedback
  - member photo in scan results
  - offline queue + later sync
- Added Arabic and English UI copy for the new scanner path.

**Important technical fixes during rollout**:
- Camera was initially blocked by app headers; fixed by allowing camera in response headers/CSP.
- Scanner WASM originally depended on a CDN path that conflicted with CSP; fixed by self-hosting the WASM asset under `saas-web/public/vendor/`.
- Laptop camera fallback was corrected so the scanner does not hard-require a rear/mobile camera.

**Files involved**:
- `saas-web/app/dashboard/page.tsx`
- `saas-web/components/dashboard/CameraScanner.tsx`
- `saas-web/lib/check-in/client.ts`
- `saas-web/lib/check-in/feedback.ts`
- `saas-web/lib/scan-context.tsx`
- `saas-web/lib/validation.ts`
- `saas-web/app/api/attendance/check/route.ts`
- `saas-web/app/api/members/offline-bundle/route.ts`
- `saas-web/lib/i18n.ts`
- `saas-web/next.config.mjs`
- `saas-web/public/vendor/zxing_reader.wasm`

**Verification**:
- `cd saas-web && npm run build` ✅
- local browser validation completed
- camera scan flow confirmed working in the user’s local Chrome after header + WASM fixes

**Deployment troubleshooting found immediately after release**:
- Cloud Build runs for `09f519d` and `7f61cae` both failed before deploy.
- Exact cause:
  - `saas-web/components/dashboard/CameraScanner.tsx`
  - `Type error: Parameter 'path' implicitly has an 'any' type.`
- Fix:
  - typed the `prepareZXingModule().overrides.locateFile` params explicitly:
    - `(path: string, prefix: string)`
- Result:
  - `602d7a4` — `fix(scanner): type zxing locateFile params`
  - this unblocked the Docker build path used by the Cloud Build trigger `gymflow-saas-main-autodeploy`

**Commit pushed**:
- `09f519d` — `feat(scanner): add camera qr scanning to dashboard`
- `602d7a4` — `fix(scanner): type zxing locateFile params`

---

### 2026-04-02 — SaaS Member Photo Upload Fix

**Goal**: fix live member photo upload for real users after reports that upload spinner appears but the image never shows.

**Original user-visible bug**:
- user picks a photo
- avatar shows uploading spinner
- upload appears to finish, but the member profile picture does not update

**What was reproduced**:
- Browser-based upload to Firebase Storage failed with CORS in the real member flow.
- Exact browser-side failure shape during local reproduction:
  - file picker opens
  - spinner appears
  - upload request fails before a durable photo URL is available

**Root causes**:
1. Browser-direct Firebase Storage upload was the wrong architecture for this app and failed on CORS.
2. The original preview flow was fragile even when upload succeeded:
   - reused remote path
   - no guaranteed cache bust
   - remote image could fail before UI swap completed
3. Production storage IAM is tied to the Cloud Run runtime service account, not the Firebase admin auth identity.

**Fix implemented**:
- Replaced browser-direct upload with a server-side member photo upload route:
  - `saas-web/app/api/members/[id]/photo/route.ts`
- Added same-origin image proxy route so the app can render private bucket photos safely:
  - `saas-web/app/api/member-photos/route.ts`
- Updated member avatar UI:
  - instant local preview
  - safe swap to saved remote image only after it is loadable
  - cache-busted preview URL
  - graceful fallback on image render failure
- Added authenticated `FormData` upload support in:
  - `saas-web/lib/api-client.ts`

**Infra alignment learned during fix**:
- Photos bucket naming from Terraform is `${project_id}-gymflow-photos`.
- Cloud Run runtime service account owns storage object permissions.
- Firebase admin identity is still used for auth verification, but should not be treated as the photo upload runtime identity.

**Files involved**:
- `saas-web/components/dashboard/MemberAvatar.tsx`
- `saas-web/lib/api-client.ts`
- `saas-web/app/api/members/[id]/photo/route.ts`
- `saas-web/app/api/member-photos/route.ts`

**Verification**:
- original browser CORS-based failure was reproduced locally
- code path was moved off the failing browser-to-Firebase path
- `cd saas-web && npm run build` ✅
- full local storage e2e is still limited by missing local ADC (`gcloud auth application-default`) on this machine, but production deployment path now matches the Cloud Run IAM model defined in Terraform

**Commit pushed**:
- `7f61cae` — `fix(members): move photo upload to server route`

**Operational note**:
- after running local `next build`, restart `next dev` before browser testing; stale `.next` chunks caused false 404/500 errors during this fix session

---

### 2026-04-02 — Income Day Payments Sheet Scroll Fix

**Goal**: fix the income day-payments sheet so longer payment lists stay usable instead of overflowing the viewport.

**What changed**:
- made the day payments sheet body scroll cleanly when many rows are present
- kept the header/actions visible while allowing the payments list itself to absorb the overflow

**Why this mattered**:
- busy days could generate enough payments to make the sheet awkward to use
- users could not comfortably inspect all rows on smaller screens or shorter laptop viewports

**Verification**:
- change was shipped on `main`
- the fix is UI-only and low risk

**Commit pushed**:
- `60dfece` — `fix(income): make day payments sheet scroll`

---

### 2026-04-03 — New Requested Shipping Backlog Added

**New items added to shipping to-do list**:
- guest invite tracking:
  - track which member invited each guest pass
  - show invite usage and remaining invite balance
- new income report by plan type:
  - revenue split by plan bucket / duration
- full PT profiles:
  - PT profiles
  - PT session tracking
  - WhatsApp nudges for PT sessions similar to subscription warnings

**Planning note**:
- PT profiles were explicitly kept as the last item in this group because they require a separate research/design pass before implementation.

**Docs updated**:
- `docs/business/execution-roadmap-2026-03-19.md`
- `docs/features/future_reports.md`

---

### 2026-04-03 — PT / Staff Feature Autoresearch Pass

**Goal**: pressure-test and improve the PT/staff feature spec with current competitor and UX research before any implementation starts.

**What changed after research**:
- the old PT/staff doc was re-scoped from one large feature into phased layers
- the spec now locks these UX decisions:
  - permission setup is preset-first, not blank-slate
  - trainer home is schedule-first (`Today`)
  - PT packages are client-owned entitlements, not trainer-owned balances
  - package sale and session execution are separate flows
  - MENA trainer matching needs language, specialty, location, and availability in addition to gender
  - trainer reassignment and no-show policy need first-class design before build

**Research loop status**:
- rounds: `2`
- agents: `8`
- gaps filled: `12 / 12`
- unfillable gaps: `0`

**Artifacts saved**:
- `docs/features/staff-and-pt-profiles.md`
- `docs/features/staff-and-pt-profiles-research-log.md`
- `memory/staff-pt-feature-round1.md`
- `memory/staff-pt-feature-round2.md`
- `memory/staff-pt-feature-knowledge.md`

**Most important conclusion**:
- the feature is worth building, but only in phases
- staff auth + trainer assignment + PT package/session truth must land before scheduling, payroll, WhatsApp nudges, or public trainer pages

**Activation flow locked after follow-up clarification**:
- staff and trainer invites should be sent automatically over WhatsApp
- owner enters phone number at invite time
- invite opens in browser for activation/login first
- PWA install prompt should appear only after successful login, not before

---

### 2026-04-03 — Guest Invite Tracking MVP

**Goal**: let gym owners track which member invited each guest, how many invites were used in the current cycle, and how many invites remain.

**What shipped**:
- guest passes can now be linked to an inviting member
- each invite is tied to the inviter's active subscription cycle
- branch-level setting `guest_invites_per_cycle` controls per-cycle allowance
- member page now shows a guest invite summary card:
  - allowance
  - used
  - remaining
  - current cycle end date
  - recent invited guests
- guest pass rows now support:
  - inviter display
  - voiding mistaken passes
  - conversion tracking when a guest becomes a member

**Data model changes**:
- `guest_passes.inviter_member_id`
- `guest_passes.inviter_subscription_id`
- `guest_passes.voided_at`
- `guest_passes.converted_member_id`
- `guest_passes.converted_at`

**Branch setting added**:
- `guest_invites_per_cycle`
- defaulted in code to `1` when no branch value exists yet

**Key implementation notes**:
- invite balance is not stored on the member row
- remaining balance is derived from the active cycle + non-voided guest passes
- unused expired passes still count as used
- only `voided` passes return balance
- guest conversion now links the created member back to the source guest pass

**Files involved**:
- `saas-web/lib/guest-invites.ts`
- `saas-web/app/api/members/[id]/guest-invites/route.ts`
- `saas-web/app/api/guest-passes/route.ts`
- `saas-web/app/api/members/route.ts`
- `saas-web/lib/validation.ts`
- `saas-web/app/dashboard/guest-passes/page.tsx`
- `saas-web/components/dashboard/MemberGuestInvitesCard.tsx`
- `saas-web/app/dashboard/members/[id]/page.tsx`
- `saas-web/app/dashboard/members/new/page.tsx`
- `saas-web/db/schema.sql`

**Bugs found and fixed during local e2e verification**:
1. Guest passes page crashed on load because `formatCurrency` was incorrectly called with locale strings (`ar-EG` / `en-US`) instead of a currency code.
2. Guest-pass conversion to member could fail because guest phone numbers prefilled in local Egyptian format (`01...`) did not satisfy the member phone validator. The member create page now normalizes those prefills to `+20...`.

**Verification completed locally**:
- `cd saas-web && npm run db:migrate` ✅
- `cd saas-web && npm run build` ✅
- Playwright local flow on `http://127.0.0.1:3000`:
  - save guest invite allowance
  - search inviter by partial first name
  - create two invited guest passes
  - confirm balance drops as expected
  - void one pass and confirm balance restores
  - convert one guest pass into a member
  - verify member page guest invite card reflects:
    - allowance
    - used
    - remaining
    - recent guest statuses
- direct DB verification confirmed:
  - inviter linkage persisted
  - voided pass stayed unconverted
  - converted pass stored `converted_member_id`

**Later phase documented separately**:
- `docs/features/guest-invite-tracking.md`
- planned next layer:
  - invite analytics
  - guest-to-member conversion reporting
  - per-plan invite entitlements
  - richer guest-invite reporting

### 2026-04-04 — Full Offline Core Ops v1

**Goal**: expand GymFlow from offline check-in only to offline-capable core branch operations for `owner`, `manager`, and `staff`, while keeping `trainer` out of offline write flows.

**What shipped**:
- IndexedDB now stores offline caches for:
  - members
  - subscriptions
  - freezes
  - payments
  - attendance logs
  - typed offline operations
- offline write queue added for:
  - member create
  - member update
  - subscription create
  - subscription renew
  - subscription freeze
- member photo uploads can now queue offline and sync later
- dashboard, members, subscriptions, income, and member profile screens now fall back to cached offline data
- pending offline records show up inline in normal UI with pending sync badges
- sync status UI now reflects:
  - offline/online state
  - pending operation count
  - failed review count
  - stale-cache warnings
- app can reopen offline on a device that already has cached branch state and a stored profile
- logout now clears both IndexedDB offline data and service-worker shell caches

**Conflict policy implemented**:
- member updates can send `base_updated_at`
- member photo uploads can also carry `base_updated_at`
- subscription create can send `expected_active_subscription_id`
- subscription renew can send:
  - `expected_previous_end_date`
  - `expected_previous_is_active`
- subscription freeze can send `expected_subscription_end_date`
- server routes now reject mismatches with `409` and `offline_conflict` details instead of silently overwriting newer data

**Offline shell work**:
- service worker upgraded from a generic offline fallback into a cached dashboard-shell strategy
- cached same-origin HTML navigations are now reused for `/dashboard` routes when offline
- `/_next/static/*` assets are now cached for offline app-shell startup
- dashboard layout warms core offline routes while online
- members list warms visible member detail and edit routes while online

**Files involved**:
- `saas-web/lib/offline/db.ts`
- `saas-web/lib/offline/cache.ts`
- `saas-web/lib/offline/operations.ts`
- `saas-web/lib/offline/read-model.ts`
- `saas-web/lib/offline/actions.ts`
- `saas-web/lib/offline/check-in-engine.ts`
- `saas-web/lib/offline/offline-bundle.ts`
- `saas-web/lib/offline/sync-manager.ts`
- `saas-web/lib/use-auth.ts`
- `saas-web/lib/api-client.ts`
- `saas-web/app/api/members/offline-bundle/route.ts`
- `saas-web/app/api/members/[id]/route.ts`
- `saas-web/app/api/members/[id]/photo/route.ts`
- `saas-web/app/api/subscriptions/route.ts`
- `saas-web/app/api/subscriptions/renew/route.ts`
- `saas-web/app/api/subscriptions/[id]/freeze/route.ts`
- `saas-web/app/dashboard/layout.tsx`
- `saas-web/app/dashboard/page.tsx`
- `saas-web/app/dashboard/members/page.tsx`
- `saas-web/app/dashboard/members/new/page.tsx`
- `saas-web/app/dashboard/members/[id]/page.tsx`
- `saas-web/app/dashboard/members/[id]/edit/page.tsx`
- `saas-web/app/dashboard/subscriptions/page.tsx`
- `saas-web/app/dashboard/income/page.tsx`
- `saas-web/app/dashboard/income/payments/page.tsx`
- `saas-web/components/dashboard/AddMemberModal.tsx`
- `saas-web/components/dashboard/FreezeDialog.tsx`
- `saas-web/components/dashboard/MemberAvatar.tsx`
- `saas-web/components/dashboard/SyncStatus.tsx`
- `saas-web/public/sw.js`

**Verification completed locally**:
- `cd saas-web && npm run typecheck` ✅
- `cd saas-web && rm -rf .next && npm run build` ✅
- Playwright offline smoke using cached shell + seeded IndexedDB confirmed offline open for:
  - `/dashboard`
  - `/dashboard/members`
  - `/dashboard/subscriptions`
  - `/dashboard/members/00010`
- smoke result confirmed cached UI rendered member and subscription data offline, including pending-sync badges

**Important local build note**:
- after one build pass, Next hit the known stale `.next` issue:
  - `PageNotFoundError: Cannot find module for page: /_document`
- clearing `.next` and rebuilding fixed it
- for local verification after major Next changes, treat `rm -rf .next && npm run build` as the reliable path

## Reports Revamp Implementation

Date: April 5, 2026

The reports revamp roadmap is now implemented for all owner-facing report items that are buildable on the current product scope.

**What shipped**:
- existing Phase 1 and Phase 2 report work was completed and verified in-browser on real branch data:
  - `Revenue At Risk`
  - `Revenue Saved by WhatsApp`
  - `Revenue by Plan Type`
  - `Retention / Churn`
  - `At-Risk Members`
  - `Cohort Retention`
  - `WhatsApp Message Performance`
- remaining roadmap report tabs were added:
  - `Payment Recovery`
  - `Ghost Members`
  - `Attendance Decline`
  - `Expected Revenue`
  - `Renewal vs New Revenue`
  - `Cash vs Digital`
  - `Referral Funnel`
  - `Weekly Digest`
  - `Post-Expiry Recovery Performance`
  - `Early Onboarding Performance`

**Dashboard KPI changes added**:
- main dashboard now shows:
  - `Revenue At Risk`
  - `WhatsApp Saved`
  - `At-Risk Members`
  - `Net Member Growth`
- `ARPM` remained in place

**How the newly added reports work**:
- `Payment Recovery`
  - uses overdue renewal recovery, not true failed card-payment events
  - current model:
    - expired latest subscription
    - no active replacement subscription
    - amount due from latest `price_paid`
    - reminder status from `message_queue`
    - recovered value from later renewal
- `Ghost Members`
  - active members with no successful check-in inside the selected inactivity window
- `Attendance Decline`
  - active members whose current-window attendance is materially lower than the previous same-length window
- `Expected Revenue`
  - forecast built from:
    - current monthly run rate
    - renewal exposure in the next 30 days
    - secured renewals already created
    - recent retention rate used as the forecast multiplier
- `Renewal vs New Revenue`
  - built from `incomeEventsCte`
  - new revenue = `payment_type = 'subscription'`
  - renewal revenue = `payment_type = 'renewal'`
- `Referral Funnel`
  - built from guest invite tracking
  - includes:
    - invites sent
    - invites used
    - converted members
    - referral revenue inferred from the converted member's first subscription after conversion
- `Weekly Digest`
  - report summary and delivery queue logic now exist
  - full outbound scheduling still depends on operational rollout choices
- `Cash vs Digital`
  - now uses real saved `payment_method` data
  - revenue is split across:
    - `cash`
    - `digital`
    - `unknown` for older rows that predate the new field
- `Post-Expiry Recovery Performance`
  - reads post-expiry Day 0 / 3 / 7 / 14 message sequence activity from `message_queue`
  - attributes renewals inside the locked 14-day attribution window
- `Early Onboarding Performance`
  - measures first-visit and early-engagement outcomes for new members
  - ties onboarding sequence sends to the first 14 days of member behavior

**What completed the last reports gap**:
- GymFlow now stores `payment_method` on all three revenue sources:
  - `subscriptions`
  - `payments`
  - `guest_passes`
- UI capture was added to:
  - new member + initial subscription
  - new subscription
  - renewal
  - guest pass sale
  - income payment editing for correcting older rows

**Files changed for the revamp**:
- `saas-web/app/api/reports/[report]/route.ts`
- `saas-web/lib/income-events.ts`
- `saas-web/app/api/subscriptions/route.ts`
- `saas-web/app/api/subscriptions/renew/route.ts`
- `saas-web/app/api/guest-passes/route.ts`
- `saas-web/app/api/payments/route.ts`
- `saas-web/app/api/income/payments/route.ts`
- `saas-web/app/api/income/payments/[id]/route.ts`
- `saas-web/components/dashboard/SubscriptionForm.tsx`
- `saas-web/components/dashboard/AddMemberModal.tsx`
- `saas-web/app/dashboard/subscriptions/page.tsx`
- `saas-web/app/dashboard/members/[id]/page.tsx`
- `saas-web/app/dashboard/guest-passes/page.tsx`
- `saas-web/app/dashboard/income/payments/page.tsx`
- `saas-web/app/dashboard/reports/page.tsx`
- `saas-web/app/dashboard/page.tsx`
- `saas-web/lib/i18n.ts`
- `saas-web/lib/offline/*`
- `saas-web/db/schema.sql`
- local-only QA auth support used during verification:
  - `saas-web/lib/auth.ts`
  - `saas-web/app/api/auth/login/route.ts`
  - `saas-web/app/(auth)/login/page.tsx`

**Verification completed locally**:
- clean build path:
  - `cd saas-web && rm -rf .next && npm run build && npm run typecheck` ✅
- Playwright/browser verification on local production build with real branch data (`Downtown Cairo`) confirmed:
  - all new report tabs render
  - all new report endpoints return `200`
  - dashboard KPI cards render
  - `cash-vs-digital` moved from placeholder behavior to real stored-method aggregation
- verified new report endpoints:
  - `/api/reports/failed-payments`
  - `/api/reports/ghost-members`
  - `/api/reports/attendance-decline`
  - `/api/reports/expected-revenue`
  - `/api/reports/renewal-vs-new`
  - `/api/reports/cash-vs-digital`
  - `/api/reports/referral-funnel`
  - `/api/reports/weekly-digest`
  - `/api/reports/post-expiry-performance`
  - `/api/reports/onboarding-performance`
- end-to-end cash-vs-digital verification confirmed:
  - authenticated QA login on localhost
  - digital payment creation path
  - report bucket update after creation
  - payment method field visible in revenue entry/edit screens

**Key implementation note**:
- the reports revamp is now much closer to an owner operating cockpit than the earlier basic chart page
- PT/staff scorecards remain deferred because their upstream feature set is still paused

### 2026-04-06 — Chrome Extension Approval + Sign-In Recovery

- The latest Chrome extension version was approved in the Chrome Web Store.
- Current owner report:
  - sign-in is now working correctly again in the approved extension build
- This closes the immediate extension-auth concern for the last submitted version.
- Follow-up implication:
  - future extension auth issues should now be treated as new regressions, not unresolved carry-over from the previously pending store review state

### 2026-04-06 — Subscription Hotfix Cloud Build Failure Lesson

**Context**: A P0 subscription hotfix was pushed for Sarhan Gym after renew/create flows were blocked by false offline-conflict errors across web + phone sessions.

**What failed**:
- Cloud Build `d5faf22c-60f8-4223-88c2-69b7daf02cbf`
- commit under build: `6397443`
- exact Docker/Next build error:
  - `./app/api/subscriptions/renew/route.ts:132:19`
  - `Type error: Property 'payment_method' does not exist on type ...`

**Root cause**:
- `saas-web/app/api/subscriptions/renew/route.ts` was updated to write `payload.payment_method`
- but the committed `subscriptionRenewSchema` in `saas-web/lib/validation.ts` did not include `payment_method`
- that schema fix already existed locally in the dirty workspace, but it was not staged into the hotfix commit
- local verification missed this because the workspace state was richer than the pushed snapshot

**Why this matters**:
- this is the same failure class as earlier clean-snapshot deploy misses:
  - local workspace passes
  - Cloud Build fails on the exact committed repo state
- the lesson is not just “run build locally”
- the real lesson is:
  - verify the **staged snapshot**, not the dirty workspace, when shipping hotfixes inside an already-modified repo

**Fix applied**:
- follow-up commit: `a1b859e` — `fix(validation): allow renewal payment method`
- added `payment_method` to:
  - `subscriptionSchema`
  - `subscriptionPatchSchema`
  - `subscriptionRenewSchema`
- only the needed validation hunk was staged
- unrelated PT/staff validation additions in the same file were deliberately left out

**Verification after fix**:
- `cd saas-web && npm run typecheck` ✅
- GitHub workflow `24033818739` ✅

**Process rule going forward**:
- when a hotfix touches files that already have unrelated local edits:
  1. inspect `git diff --cached`
  2. make sure any new field used in API code also exists in the committed schema/types
  3. prefer staging exact hunks, not whole files, when the file contains unrelated work
  4. treat Cloud Build as validation of the pushed snapshot, not of the current machine state

## 2026-04-06 (WhatsApp P0) — Unintended onboarding encouragement messages sent to Sarhan Gym

**User report**:
- Sarhan Gym said active members received an unexpected WhatsApp “encouraging” message that was neither the normal renewal reminder nor the welcome message.

**What actually happened**:
- Branch:
  - organization `513d429c-34ce-4dfa-8022-8be2f474cc5b`
  - branch `614cff5a-78cd-4a95-8f18-3191f61922cf`
- The live WhatsApp worker sent the new lifecycle automation sequence:
  - `payload.sequence_kind = "onboarding_first_visit"`
- Production queue proof:
  - `39` sent rows in the last `48h` for `onboarding_first_visit`
  - `2` sent rows for `post_expiry`
- Example copy that matched the user report:
  - `بداية ممتازة يا {name}. حافظ على الحماس وحدد تمرينك القادم هذا الأسبوع.`

**Root cause**:
- New lifecycle sequences were live in the WhatsApp worker:
  - onboarding first-visit / day-7 / day-14
  - post-expiry day-0 / day-3 / day-7 / day-14
  - weekly digest
- They were controlled only by the existing global WhatsApp automation switch:
  - `whatsapp_automation_enabled`
- That made them effectively enabled for branches that had normal reminder automation on, even though these sequences were not explicitly rolled out as an owner-facing opt-in.
- The onboarding scheduler also backfilled recent members created in the last `14 days`, so the first live run could send a burst instead of only affecting future members.

**Important production finding**:
- The SaaS web Cloud Run deploy does **not** control the WhatsApp worker runtime.
- The active worker was running on:
  - VM `gymflow-whatsapp-worker-spot`
  - zone `europe-west1-b`
  - service `gymflow-whatsapp-worker.service`
  - runtime file `/opt/gymflow-whatsapp-worker/dist/index.js`

**Immediate live mitigation applied**:
- Patched the worker runtime on the VM directly.
- Added explicit lifecycle flags with default `false`:
  - `whatsapp_post_expiry_enabled`
  - `whatsapp_onboarding_enabled`
  - `whatsapp_weekly_digest_enabled`
- Kept existing welcome/reminder automation behavior unchanged.
- Restarted:
  - `gymflow-whatsapp-worker.service`

**Post-fix verification**:
- Worker restarted cleanly on the VM.
- Production queue check after restart:
  - no new `onboarding_*`
  - no new `post_expiry`
  - no new `weekly_digest`
  created in the next `5 minutes`.

**Process lesson**:
- Any new WhatsApp lifecycle automation must ship behind its own explicit setting, default `off`.
- `whatsapp_automation_enabled` is too broad for new behavioral sequences.
- Web deploy verification is not enough for WhatsApp incidents; the VM worker runtime must be checked separately.
