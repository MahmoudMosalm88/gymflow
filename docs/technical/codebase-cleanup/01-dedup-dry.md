# Dedup / DRY Assessment

## Scope

This pass focused on high-confidence consolidation only:

- Repeated primitive coercion helpers across `saas-web/lib` and `saas-web/app/api`.
- Copy-pasted WhatsApp automation helpers between the SaaS app and the worker.
- Duplicate timestamp / numeric parsing in revenue, backup, subscription, and member flows.

I did not attempt to collapse intentionally repeated UI composition, route-specific SQL, or domain-specific date logic where the semantics differ.

## Findings

### 1. Primitive coercion was duplicated in too many places

I found near-identical helpers for:

- `toMillis`, `toIso`
- `toUnixSeconds`
- `toInteger`, `toNullableNumber`
- `toBoolean`
- `toNullablePositiveInt`
- local numeric fallbacks in reports and backup routes

These helpers were copied across:

- `saas-web/lib/offline/cache.ts`
- `saas-web/lib/archive-engine.ts`
- `saas-web/lib/desktop-db-to-archive.ts`
- `saas-web/app/api/income/payments/route.ts`
- `saas-web/app/api/income/recent/route.ts`
- `saas-web/app/api/backup/auto-run/route.ts`
- `saas-web/app/api/subscriptions/route.ts`
- `saas-web/app/api/members/[id]/route.ts`
- `saas-web/app/api/members/[id]/photo/route.ts`
- `saas-web/app/api/members/offline-bundle/route.ts`
- `saas-web/app/api/reports/[report]/route.ts`
- `saas-web/app/dashboard/reports/page.tsx`

The problem was not just duplication. Some helpers had subtly different behavior, which makes future maintenance error-prone.

### 2. WhatsApp automation logic was duplicated between app and worker

The worker reimplemented:

- `normalizeSystemLanguage`
- `parseBooleanSetting`
- `getTemplateKey`
- `getBehaviorTemplateKey`
- message template rendering

Those are exact shared concerns and belong in the shared automation module, not in the worker copy.

### 3. Some repeated code should stay local

I intentionally did not centralize a few patterns because the semantics are different enough to justify local ownership:

- `parseDateInput` in form-driven member/subscription code.
- Route-specific query param parsing such as `days`, `limit`, and `threshold`.
- Archive-specific date recovery logic where the input can be a string, number, or `Date` and the fallback behavior is domain-specific.

That boundary matters. DRY is only useful when it reduces complexity; otherwise it creates shared abstraction debt.

## Recommendations

### Implemented

- Add one shared coercion module for the primitive parsers that repeatedly appeared with the same behavior.
- Import that shared module in routes and libraries instead of redefining local one-off variants.
- Reuse the shared WhatsApp automation helpers in the worker instead of duplicating them.

### Remaining guidance

- Prefer shared helpers only for pure, stable behavior.
- Keep business-rule parsing local when the fallback semantics differ by flow.
- Do not add more generic utility layers unless two or more call sites already prove the shape.

## Changes Applied

- Added `saas-web/lib/coerce.ts` for shared primitive parsing.
- Consolidated repeated coercion in revenue, backup, subscription, member, and report flows.
- Updated the worker to use shared WhatsApp automation helpers from `saas-web/lib/whatsapp-automation.ts`.
- Reused shared coercion in `saas-web/lib/offline/cache.ts`, `saas-web/lib/archive-engine.ts`, and `saas-web/lib/desktop-db-to-archive.ts`.

## Verification

- `npx tsc --noEmit -p saas-web/worker/whatsapp-vm/tsconfig.json` passed.
- `npm run typecheck` in `saas-web/` exposed an unrelated existing error in `app/api/migration/upload/route.ts`:
  `Type 'Record<string, unknown>' is missing the following properties from type 'DesktopImportUploadResponse': id, file_name, status, created_at`.

