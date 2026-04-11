# Plan: Migrate GymFlow Web to a PWA with Reliable Offline Check-In

## Context

The Electron desktop app has recurring update and installer issues. The web app is stable, but internet outages block front-desk check-ins.

Primary business need: **scanner check-in must keep working during outages**.

## Goals

1. Allow front desk staff to validate and record check-ins while offline.
2. Sync offline check-ins safely when connectivity returns.
3. Preserve server authority for quota and subscription rules.
4. Add installable PWA shell and offline-read improvements without breaking auth/session flows.

## Non-Goals (for this migration)

- Full offline CRUD for members/subscriptions.
- Replacing all server-side business logic with client logic.
- Multi-device real-time conflict-free state.

## Success Criteria

1. Offline check-in success rate during network loss is greater than 99% on supported browsers.
2. Synced check-ins are idempotent (no duplicates) across retries/reloads.
3. No queue data loss across refresh, browser restart, or re-login.
4. PWA install works on Chromium browsers; iOS has explicit Add-to-Home-Screen guidance.

---

## Key Architecture Decisions

1. **Operation-based idempotency**
Every check-in operation gets a client-generated `operationId` UUID. Server deduplicates by `(organization_id, branch_id, operation_id)`.

2. **Shared rule core**
Extract check-in eligibility logic into shared pure functions so online route and offline engine do not drift.

3. **Server remains source of truth**
Offline engine provides local decisioning for continuity. On sync, server revalidates and can reject stale/invalid operations.

4. **Safe service worker scope**
Service worker handles shell and static asset caching only. API caching and queueing stay in app code (IndexedDB), not in SW fetch interception.

5. **Gradual rollout**
Feature-flagged per branch with pilot rollout before broad enablement.

---

## Data Model Changes

### Server DB (`saas-web/db/schema.sql`)

Add to `logs` table:

- `operation_id uuid NULL`
- `source text NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline_sync'))`
- `client_device_id text NULL`
- `offline_recorded_at bigint NULL`

Add unique index:

- `UNIQUE (organization_id, branch_id, operation_id) WHERE operation_id IS NOT NULL`

Rationale:

- Guarantees idempotency across retries/multiple tabs.
- Preserves audit history for offline-origin events.

### Client IndexedDB (`gymflow-offline`)

Stores:

- `members` (member snapshot with active subscription + current quota fields)
- `settings` (including scan cooldown)
- `api_cache` (read-only cached GET payloads + TTL metadata)
- `checkin_queue` (pending/syncing/synced/failed operations)
- `sync_meta` (last sync time, server time offset, schema version)

`checkin_queue` shape:

```ts
{
  operationId: string;          // uuid
  branchId: string;
  source: 'offline';
  scannedValue: string;
  method: 'scan' | 'manual';
  offlineTimestamp: number;     // unix seconds adjusted by server offset
  deviceId: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## API Contract Changes

### `POST /api/attendance/check`

Request adds optional fields:

- `operationId?: string`
- `offlineTimestamp?: number`
- `deviceId?: string`
- `source?: 'online' | 'offline_sync'`

Validation rules:

- If `source === 'offline_sync'`, `operationId` is required.
- `offlineTimestamp` must be bounded by policy (configurable; default 72 hours).
- Duplicate `operationId` returns success with prior result semantics (idempotent replay).

### New endpoint: `GET /api/members/offline-bundle`

Returns only data required for check-in engine:

- Members (id/name/phone/card_code/gender/deleted flag)
- Active subscription window + sessions cap
- Current cycle quota usage
- Settings required offline (scan cooldown)
- `serverNow` for local clock offset
- Optional `version`/`etag` for incremental refresh

Query params:

- `since` (optional incremental sync token)

---

## Implementation Phases

## Phase 0: Foundations and Safety Rails

**Objective:** Put in place primitives that prevent data corruption.

### Tasks

1. Add DB migration for `logs` columns + unique idempotency index.
2. Extend validation schema in `saas-web/lib/validation.ts`.
3. Create shared check-in rule module:
   - `saas-web/lib/check-in/rules.ts` (pure eligibility checks)
   - used by server route and offline engine.
4. Add branch feature flags in settings:
   - `offline_checkin_enabled`
   - `offline_max_age_hours`.
5. Add telemetry hooks for queue size, sync failures, idempotent replays.

### Exit Criteria

- Server accepts/checks `operationId`.
- Duplicate operation replay is deterministic.
- Existing online flow still passes.

---

## Phase 1: Offline Check-In MVP (Highest Priority)

**Objective:** Scanner works offline; queue persists and syncs.

### New files

- `saas-web/lib/offline/db.ts`
- `saas-web/lib/offline/device-id.ts`
- `saas-web/lib/offline/offline-bundle.ts`
- `saas-web/lib/offline/check-in-engine.ts`
- `saas-web/lib/offline/sync-queue.ts`
- `saas-web/lib/offline/sync-manager.ts`
- `saas-web/components/dashboard/SyncStatus.tsx`

### Modified files

- `saas-web/app/dashboard/page.tsx`
- `saas-web/app/dashboard/layout.tsx`
- `saas-web/components/dashboard/Header.tsx`
- `saas-web/app/api/attendance/check/route.ts`
- `saas-web/lib/validation.ts`

### Behavior

1. On dashboard load (online), fetch `/api/members/offline-bundle` and store snapshot.
2. Scanner flow:
   - Try online check-in first.
   - On network failure or offline mode, run local eligibility engine.
   - On local success, enqueue operation and show immediate green success UI.
   - On local failure, show same reason code structure as server.
3. Sync manager:
   - Trigger on `online` event, app resume, and periodic timer.
   - Process queue in FIFO order.
   - Use exponential backoff for retriable failures.
4. Cross-tab coordination:
   - Use `BroadcastChannel` + lock key to ensure one active sync worker per branch.

### Conflict handling

- `quota_exceeded_on_sync`: mark failed, show review item.
- `member_deleted_on_sync`: mark failed.
- `subscription_inactive_on_sync`: mark failed.
- duplicate `operationId`: mark synced (idempotent success).

### Exit Criteria

- Offline check-in works with no internet.
- Queue survives reload/restart.
- Reconnect sync drains queue with no duplicates.

---

## Phase 2: PWA Shell and Installability

**Objective:** Reliable app install and shell loading without breaking auth.

### New files

- `saas-web/public/manifest.json`
- `saas-web/public/sw.js`
- `saas-web/public/icons/icon-192.png`
- `saas-web/public/icons/icon-512.png`
- `saas-web/public/icons/icon-512-maskable.png`
- `saas-web/components/dashboard/InstallPrompt.tsx`

### Modified files

- `saas-web/app/layout.tsx`
- `saas-web/next.config.mjs`
- `saas-web/app/dashboard/layout.tsx`

### Service worker strategy

- Navigations/HTML: `network-first` with offline fallback page.
- Static assets (`/_next/static/*`, fonts, icons): `stale-while-revalidate`.
- API calls: do not cache in service worker.

### Install UX

- Chromium: `beforeinstallprompt` flow with dismiss persistence.
- iOS Safari: explicit Add-to-Home-Screen instructions.

### Exit Criteria

- Install prompt behavior works where supported.
- App starts from home screen in standalone mode.
- No stale-auth shell regressions after deploy.

---

## Phase 3: Offline Read Cache for Non-Critical Views

**Objective:** Dashboard and selected lists remain usable when offline.

### New/Modified files

- `saas-web/lib/offline/cache-manager.ts`
- `saas-web/components/dashboard/OfflineBanner.tsx`
- `saas-web/lib/api-client.ts`
- `saas-web/app/dashboard/layout.tsx`

### Scope

Cache GET responses with TTLs for:

- `/api/reports/overview`
- `/api/members`
- `/api/subscriptions`
- `/api/settings`

Rules:

- Cache key includes branch id and normalized URL.
- Response includes metadata: `fromCache`, `cachedAt`, `stale`.
- UI shows "offline data" banner and last updated timestamp.

### Exit Criteria

- Core read screens render from cache when offline.
- Users can clearly distinguish cached vs live data.

---

## Phase 4: Auth/Sync Resilience

**Objective:** Ensure queue sync remains reliable around token expiry and long outages.

### Tasks

1. Before sync, validate token freshness; attempt silent refresh path first.
2. If refresh fails, pause queue and show "Sign in to resume sync".
3. Keep queue encrypted-at-rest optional (future), but always clear queue/cache on logout.
4. Make `offline_max_age_hours` configurable per branch (default 72h, not fixed 24h).

### Exit Criteria

- Expired sessions do not lose queued events.
- Post-login sync resumes automatically.

---

## Phase 5: Rollout, Observability, and Hardening

**Objective:** Controlled production rollout with measurable risk.

### Rollout

1. Internal branch only.
2. Pilot 3-5 real gyms with unstable internet.
3. Broader rollout by region.

### Metrics

- Offline check-ins created/day
- Queue drain latency
- Sync failure rate by reason code
- Idempotent replay count
- Stale bundle age

### Operational controls

- Branch-level kill switch for offline check-in.
- Admin UI warning when queue has failed items.
- Alerting when failure rate crosses threshold.

### Exit Criteria

- Pilot meets SLA with no major data integrity incidents.
- Team can disable feature quickly per branch if needed.

---

## Verification Strategy

## Automated Tests

1. Unit tests for shared eligibility rules with parity vectors.
2. Unit tests for queue state machine (`pending -> syncing -> synced/failed`).
3. API tests for idempotent `operationId` replay.
4. Integration tests for reconnect sync and conflict outcomes.

## Manual QA Matrix

1. Offline scan success, cooldown reject, duplicate-day reject.
2. Browser refresh while offline with pending queue.
3. Multi-tab behavior (single active sync worker).
4. Token expiry during offline period, then re-login and resume sync.
5. Deploy new SW version while queue exists.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rule drift between client/server | Incorrect local decisions | Shared pure rules module + parity tests |
| Duplicate sync writes | Inflated logs/quota errors | `operationId` + unique index + idempotent route behavior |
| Stale member bundle | Local false positives | Frequent refresh + server revalidation on sync |
| Multiple tabs syncing same queue | Duplicate API load/conflicts | BroadcastChannel lock and per-branch sync leader |
| Token expiry blocks sync | Queue backlog | Pause/resume sync flow with re-auth gate |
| SW serving stale app shell | Auth/session regressions | Network-first HTML and limited SW responsibility |
| Local PII exposure on shared devices | Privacy/security risk | Clear-on-logout, branch policy toggle, minimal cached fields |

---

## Package Changes

- Add `idb` to `saas-web/package.json` dependencies.
- Keep `uuid` (already present) for operation IDs.
- Do not add heavy PWA abstractions until MVP is stable.

---

## Execution Order

```text
Phase 0 Foundations
-> Phase 1 Offline Check-In MVP (ship first)
-> Phase 2 PWA Shell/Install
-> Phase 3 Offline Read Cache
-> Phase 4 Auth/Sync Resilience
-> Phase 5 Rollout/Observability
```

Each phase is deployable, but **Phase 1 is the first production milestone** because it addresses the core outage pain directly.
