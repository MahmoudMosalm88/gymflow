# GymFlow Improvement Map

> Autoresearch: 2 rounds, 8 total agents, 2026-03-19

## Findings

### P0: Core operational reliability
- WhatsApp automation is still the biggest repeated pain cluster: connection state, queue processing, reminder delivery, and owner visibility into sent or failed messages remain support-heavy. — `docs/project-memory.md:303`, `docs/project-memory.md:306`, `docs/project-memory.md:446`, `docs/project-memory.md:615`, `saas-web/worker/whatsapp-vm/src/index.ts:487`
- Auth and phone verification remain a hard blocker area: Firebase email auth, Google sign-in, OTP, and profile phone verification all needed repeated stabilization. — `docs/project-memory.md:336`, `docs/project-memory.md:522`, `docs/project-memory.md:552`, `docs/project-memory.md:553`
- Revenue and reporting need one canonical payment-event model everywhere; prior fixes proved the older mixed model was structurally wrong. — `saas-web/lib/income-events.ts:1`, `saas-web/app/api/income/monthly/route.ts:1`, `docs/project-memory.md:667`
- Deployment verification needs direct runtime checks, not just CI green status, because build success can be confused with live SaaS runtime state. — `.github/workflows/deploy.yml:1`, `saas-web/cloudbuild.yaml:1`, `saas-web/cloudbuild.trigger.yaml:1`, `docs/lessons-learned.md:36`

### P1: Front-desk product quality and operational trust
- Dashboard freshness is still a trust risk. The product has repeated history of stale snapshots, removed endpoints, and UI/runtime mismatches. — `docs/project-memory.md:376`, `docs/project-memory.md:401`, `docs/project-memory.md:451`
- PWA/offline is still baseline, not fully reception-grade. Offline bundle caching, queue sync, token-expiry resilience, alerting, and soak monitoring are still documented as planned or in-progress. — `docs/migration-to-PWA.md:185`, `docs/migration-to-PWA.md:275`, `docs/migration-to-PWA.md:286`, `docs/project-memory.md:447`
- Mobile/front-desk UX still needs clearer scan status, stronger offline and error states, and better action density for phone/tablet use. — `saas-web/components/dashboard/SyncStatus.tsx:44`, `saas-web/components/dashboard/InstallPrompt.tsx:23`, `saas-web/components/dashboard/Sidebar.tsx:138`, `docs/project-memory.md:451`
- Performance issues are still likely from repeated polling, extra startup fetches, and broad list loading on web and desktop. — `saas-web/app/dashboard/layout.tsx:17`, `saas-web/app/dashboard/page.tsx:78`, `saas-web/app/dashboard/settings/page.tsx:331`, `saas-web/app/dashboard/subscriptions/page.tsx:139`, `src/main/ipc/handlers.ts:888`
- Backup, restore, import, and recovery need stronger self-serve workflows and reconciliation tools. — `docs/project-memory.md:569`, `docs/project-memory.md:586`, `src/renderer/src/pages/ImportWizard.tsx:15`, `saas-web/app/api/migration/execute/route.ts:1`
- Observability is still too reactive and route-by-route. Multi-tenant auth works, but structured tracing, better diagnostics, and stronger central runtime visibility are still missing. — `saas-web/lib/auth.ts:1`, `docs/lessons-learned.md:40`, `docs/project-memory.md:479`

### P1: Owner/admin visibility and support reduction
- Owner-facing status communication is narrow. The notifications system exists, but only a small set of event types are wired, and admin broadcasts are API-only rather than a polished in-product surface. — `saas-web/app/api/members/route.ts:216`, `saas-web/app/api/whatsapp/connect/route.ts:24`, `saas-web/app/api/whatsapp/disconnect/route.ts:24`, `saas-web/app/api/admin/notifications/broadcast/route.ts:57`
- WhatsApp delivery analytics are still missing. Owners cannot easily see reminder/welcome delivery effectiveness without support. — `docs/future_reports.md:21`, `docs/project-memory.md:452`

### P1: Security and tenant hardening
- Tenant isolation is still enforced mainly in application queries, not at the database policy layer. A future missed tenant filter could become a cross-tenant incident. — `docs/project-memory.md:61`, `docs/project-memory.md:110`, `saas-web/lib/db.ts:26`, `saas-web/lib/db.ts:40`
- Branch scoping currently fails open for multi-branch owners. Missing or invalid branch selection falls back to the first branch instead of rejecting the request. — `saas-web/lib/auth.ts:37`, `saas-web/lib/auth.ts:47`, `saas-web/lib/auth.ts:57`, `saas-web/app/api/auth/login/route.ts:137`
- Offline cache cleanup is incomplete. Member PII is cached locally for offline mode, but logout does not clear IndexedDB offline data. — `saas-web/app/api/members/offline-bundle/route.ts:113`, `saas-web/lib/offline/db.ts:11`, `saas-web/lib/offline/db.ts:95`, `saas-web/lib/use-auth.ts:147`
- Security/config hardening still has scale limits: the auth rate limiter is in-memory per instance and the admin broadcast endpoint depends on a single shared admin key. — `saas-web/lib/rate-limit.ts:1`, `saas-web/app/api/auth/login/route.ts:77`, `saas-web/lib/admin-secret.ts:1`, `saas-web/app/api/admin/notifications/broadcast/route.ts:57`
- Firebase Admin runtime IAM still has a documented unresolved outage path. — `docs/firebase-config-audit-2026-02-18.md:9`, `docs/firebase-config-audit-2026-02-18.md:59`, `docs/firebase-config-audit-2026-02-18.md:63`

### P2: Productization and growth readiness
- Onboarding is still thin. There is little guided setup, checklisting, or first-value activation for new gym owners. — `saas-web/app/dashboard/settings/page.tsx:1`, `docs/project-memory.md:443`, `docs/future_reports.md:7`
- Retention intelligence is underbuilt. Churn-risk, LTV, and message effectiveness reporting remain future work. — `docs/future_reports.md:7`, `docs/future_reports.md:14`, `docs/future_reports.md:21`
- Commercialization and scale readiness are still pilot-shaped: no staging, zero tests, incomplete parity items, and VM/runtime dependencies that still require operator involvement. — `saas-web/README.md:84`, `docs/project-memory.md:443`, `docs/project-memory.md:446`, `docs/project-memory.md:449`
- Desktop migration/import experience is visibly incomplete because the import wizard still says “coming soon.” — `src/renderer/src/pages/ImportWizard.tsx:15`

## Delta Of New Knowledge

### Round 1 added
- The main improvement map across WhatsApp, auth, revenue correctness, deployment/runtime drift, dashboard freshness, backup/import, observability, onboarding, and scale-readiness.

### Round 2 added
- Performance is its own improvement area, with concrete causes in polling and broad list fetches.
- PWA/offline still has specific unresolved front-desk gaps beyond “feature exists”.
- Owner/admin communication is its own product gap, separate from generic notifications.
- Security and tenant hardening added real new knowledge, not just examples: DB-enforced tenant isolation is missing, branch selection can fail open, offline device cache is not cleared on logout, Firebase Admin IAM still has a documented gap, and admin broadcast still relies on a shared secret key.

## Saturation Check
- After round 2 and a repo-wide saturation search, no further top-level improvement categories appeared.
- Round 3 tested four explicit candidate categories and discarded all four:
  - billing/commercial provisioning as a separate top-level category → discarded; belongs under scale readiness
  - test automation/release safety as a separate top-level category → discarded; belongs under scale readiness
  - immutable event-ledger/data-model simplification as a separate top-level category → discarded; belongs under revenue correctness and backup/import/recovery
  - search/discoverability/navigation at scale as a separate top-level category → discarded; belongs under performance and mobile/front-desk UX
- New evidence only deepened the same categories already found.
- Gap list is now empty.
## Sources
- `docs/project-memory.md`
- `docs/lessons-learned.md`
- `docs/migration-to-PWA.md`
- `docs/future_reports.md`
- `docs/firebase-config-audit-2026-02-18.md`
- `saas-web/README.md`
- `saas-web/lib/auth.ts`
- `saas-web/lib/db.ts`
- `saas-web/lib/income-events.ts`
- `saas-web/lib/rate-limit.ts`
- `saas-web/app/dashboard/layout.tsx`
- `saas-web/app/dashboard/page.tsx`
- `saas-web/app/dashboard/settings/page.tsx`
- `saas-web/components/dashboard/SyncStatus.tsx`
- `saas-web/worker/whatsapp-vm/src/index.ts`
- `src/renderer/src/pages/ImportWizard.tsx`
