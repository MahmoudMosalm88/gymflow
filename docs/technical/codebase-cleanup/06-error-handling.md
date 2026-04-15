# 06 Error Handling Cleanup

## Scope

I reviewed the repo for unnecessary `try/catch`, no-op `.catch(() => {})`, and fallback-only error handling that hides failures without a concrete recovery path.

The main conclusion is that most exception handling in this repo is justified because it protects real boundaries:

- untrusted browser/storage state,
- external APIs and Firebase/electron bridges,
- offline-first recovery paths,
- cleanup code that can fail independently of the user action.

The cleanup work should therefore stay narrow: remove silent no-ops, log background failures, and keep boundary handling where it is protecting malformed input or genuine recovery.

## Findings

1. Silent catches were concentrated in background UI fetches and cache warmers.
   - These blocks did not change state, did not show an error, and only hid failures.
   - Examples included dashboard/report widgets, member list cache warming, and PT panels.

2. Several Electron cleanup paths swallowed real failures.
   - `src/main/services/whatsapp.ts` ignored reconnect and cleanup failures.
   - `src/main/ipc/handlers.ts` suppressed OTP/owner cleanup errors after a failed WhatsApp send.
   - Those failures matter because they affect state consistency, not just UX noise.

3. A few top-level UI persistence helpers were using silent fallback-only behavior.
   - Reports pinning was swallowing localStorage issues.
   - The dashboard cache reads were quietly falling back to stale or empty state without any signal.
   - Those are tolerable recoveries, but not as silent no-ops.

4. Some error handling remains necessary and should not be removed.
   - JSON parsing from localStorage or DB settings is handling malformed persisted data.
   - Firebase and API client logic is handling network/auth boundaries.
   - Offline cache reads are a real recovery path and should remain guarded.

## Recommendations

- Remove empty catches and replace them with explicit logging or surfaced UI errors.
- Keep `try/catch` only when the code is handling:
  - malformed persisted state,
  - browser/runtime capability differences,
  - external services,
  - offline fallback with a real alternate path.
- Avoid "success by silence" in background work. If a background load fails, log it at minimum.
- Prefer letting cleanup failures fail loudly when they affect data integrity.

## Implemented

I made the high-confidence cleanup changes directly in code:

- `src/main/services/whatsapp.ts`
  - Removed silent cleanup swallowing.
  - Added explicit logging for auto-reconnect failures.

- `src/main/ipc/handlers.ts`
  - Removed silent OTP/owner cleanup swallowing.
  - Kept restore recovery explicit and logged the database reinitialization failure path.

- `src/main/index.ts`
  - Replaced a silent zoom-level promise swallow with explicit warning logging.

- Dashboard and PT UI surfaces
  - Converted no-op catches in fetch flows to explicit `console.error` logging.
  - Left the fallback behavior intact where the fallback was real and intentional.

## Deferred

I did not remove these classes of handlers because they are justified boundary/recovery code:

- JSON parsing from persisted storage,
- API response normalization,
- Firebase auth rehydration,
- offline cache reads that intentionally keep the app usable when the network is down.

Those areas should be revisited only if a stronger shared helper or typed boundary can replace them without changing behavior.
