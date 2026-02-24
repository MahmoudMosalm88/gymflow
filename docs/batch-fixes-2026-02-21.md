# Batch Fix Report — 2026-02-21

This file documents only the latest local batch of work requested by the user.

## Scope Requested
- Today's check-in is not recording.
- Recent activity is not showing data.
- Deactivate subscription is not working.
- Subscription edit should be allowed and reflected in income.
- Add guest pass.
- Replace low session tab with ended subscriptions list.
- Add periodic backups with user-chosen window.
- Verify with UI/UX audit and E2E audit.

## Fixes Implemented

### 1) Check-ins and Recent Activity
- Added `todayCheckIns` in overview API response so dashboard card receives the correct key.
- Changed recent-activity "today" filtering to explicit Unix day boundaries to avoid day-window mismatch.

Files:
- `saas-web/app/api/reports/[report]/route.ts`
- `saas-web/app/api/attendance/today/route.ts`

### 2) Subscription Deactivate + Edit Flow
- Kept/deployed ID coercion in patch validation (`id` now coerced to number).
- Added full edit dialog in subscriptions page (start date, months, price, sessions/month).
- Extended subscription PATCH to update `start_date`, `plan_months`, `end_date`, `price_paid`, `sessions_per_month`, `is_active`.
- Verified deactivation works from row actions.

Files:
- `saas-web/lib/validation.ts`
- `saas-web/app/api/subscriptions/route.ts`
- `saas-web/app/dashboard/subscriptions/page.tsx`

### 3) Income Reflection
- Verified subscription edit changes (price update) are reflected in Income totals and recent payments.

### 4) Guest Pass Feature
- Added Guest Pass API: list/create/mark-used.
- Added new dashboard page for guest passes.
- Added dashboard quick action button to open Guest Passes page.

Files:
- `saas-web/app/api/guest-passes/route.ts` (new)
- `saas-web/app/dashboard/guest-passes/page.tsx` (new)
- `saas-web/app/dashboard/page.tsx`

### 5) Replace Low Sessions with Ended Subscriptions
- Added new reports endpoint: `ended-subscriptions`.
- Replaced the reports tab from Low Sessions to Ended Subs.

Files:
- `saas-web/app/api/reports/[report]/route.ts`
- `saas-web/app/dashboard/reports/page.tsx`

### 6) Periodic Backups (User Window)
- Added auto-run backup API with schedule checks:
  - enabled flag
  - interval in hours
  - UTC window start/end
  - due-time check using last successful scheduled backup
- Added UI controls in Settings > Backup to save schedule.

Files:
- `saas-web/app/api/backup/auto-run/route.ts` (new)
- `saas-web/app/dashboard/settings/page.tsx`

## Additional Reliability Fixes Found During E2E
- Fixed member creation server error when gender is omitted by adding default gender in member schema.
- Removed noisy 404 behavior in card-code backfill route when no import artifact exists (now returns success with `noArtifact: true`).

Files:
- `saas-web/lib/validation.ts`
- `saas-web/app/api/migration/backfill-card-codes/route.ts`

## Verification Performed
- Local build: `npm run build` in `saas-web` passed.
- Playwright E2E checks passed for:
  - register/login to dashboard
  - add member
  - create/edit/deactivate subscription
  - income reflects updated subscription price
  - dashboard activity feed updates after scan
  - reports ended-subscriptions tab shows data
  - guest pass create/list flow
  - backup schedule save flow

## Local Runtime Status
- Local dev server restarted and running:
  - URL: `http://localhost:3000`

## Commit Status
- Changes are local in working tree.
- Not committed/pushed in this step.
