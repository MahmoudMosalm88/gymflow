# Strong Types Assessment

Scope: remove avoidable `any` / `unknown` usage, replace it with domain types where the runtime shape is already known, and leave `unknown` only at trust boundaries where narrowing is required.

## What I Found

The weak typing in this repo was not evenly distributed. It clustered in a few places:

- The Electron IPC bridge was leaking untyped results into the renderer, which forced casts in multiple UI files.
- The settings store had no shared value contract, so main-process, preload, and renderer code all described the same data differently.
- Several React Hook Form screens were using Zod schemas without aligning the form input/output generics, which caused resolver inference to fall back to weak typing.
- The reports screen in `saas-web/app/dashboard/reports/page.tsx` was the largest remaining `any` hotspot. It is not a single bug; it is a set of endpoint-specific DTOs that were never modeled.
- A smaller set of `unknown` usages were intentional and correct, mostly in JSON parsing, network responses, DB reads, and event payloads. Those should stay as `unknown` until narrowed.

## High-Confidence Fixes Applied

- `src/types/bcryptjs.d.ts` now exposes the real `bcryptjs` sync signatures instead of `any[]`.
- `src/main/database/repositories/settingsRepository.ts` now exports a typed setting value surface and validates known keys instead of treating stored values as opaque `unknown`.
- `src/main/database/repositories/memberRepository.ts` uses a concrete parameter array for SQL updates.
- `src/main/database/repositories/subscriptionRepository.ts` exports `SubscriptionWithMember` for the joined report query.
- `src/main/ipc/handlers.ts` now uses typed payloads for member creation, subscription creation/renewal, guest passes, settings updates, and import execution.
- `src/preload/index.ts` now exposes a typed `API` object instead of `any`, which removed a large amount of renderer-side casting.
- Renderer screens that consumed WhatsApp status, QR generation, and settings updates were updated to the actual API shapes.
- SaaS form components now use explicit Zod input/output generics, which removes the resolver type fallbacks without weakening validation.
- `saas-web/components/dashboard/DataTable.tsx` is now generic and renders typed rows instead of `unknown`.

## Critical Assessment

The repo is in better shape after these changes, but the remaining weak typing is not all equal.

Good candidates for further cleanup are places where the data shape is already stable and known, such as the reports screen and a few dashboard pages that still use `any` for fetched rows. Those should be converted to endpoint-specific DTOs or shared read models.

Bad candidates for aggressive cleanup are deserialization and persistence boundaries. Examples include API client response unwrapping, offline cache reads, and worker message payloads. Those should keep `unknown` until a narrow type guard or parser has proven the shape.

The main risk now is not runtime behavior; it is type drift between API surfaces. The strongest mitigation is to keep exporting shared domain DTOs from the source of truth module and use those types across main, preload, and renderer.

## Recommendations

1. Replace the remaining `any` in `saas-web/app/dashboard/reports/page.tsx` with endpoint-specific interfaces and local helpers.
2. Export shared DTOs for report endpoints from `saas-web/lib/*` or the route handlers, then consume those types in the page instead of re-declaring ad hoc shapes.
3. Keep `unknown` in JSON parse and event boundaries, but narrow it immediately with guards or parsers.
4. Prefer one typed setting contract per call site:
   - full settings payload for app settings,
   - onboarding subset for onboarding completion,
   - dynamic key/value record only where the code genuinely stores arbitrary keys.
5. Add type-level regression coverage for the bridge and the dashboard forms if more refactors are planned.

## Verification

- `npm run typecheck` at repo root
- `npm run typecheck` in `saas-web/`

Both compilers passed after the changes above.
