# Shared Types Assessment

Scope: consolidate type definitions only where the repo has a real shared domain contract. The goal is to eliminate drift between route payloads, DB read models, and reusable UI data shapes without forcing unrelated features into a single global type bucket.

## What I Found

The codebase had a clear pattern of duplicated types at the boundary between data access and UI:

- API routes were re-declaring response DTOs that were already implied by sibling components.
- Several dashboard features were using the same DB read model shape in route handlers and in multiple components, but each file described that shape independently.
- A few component-local “summary” types were exact duplicates of library types and were already drifting by placement rather than by meaning.
- Some types looked similar but were not good sharing candidates because they were really local view models, page-specific query rows, or form input shapes.

The important distinction is this: a type should be shared only when it represents the same contract across modules. If a shape is only used to make one screen render, it should stay local.

## High-Confidence Consolidations Applied

- `saas-web/lib/imports.ts` now owns the spreadsheet import contract:
  - `SpreadsheetImportArtifactPayload`
  - `ImportMapping`
  - `ImportUploadResponse`
  - `ImportPreviewIssue`
  - `ImportPreviewRowResult`
  - `ImportPreviewSummary`
  - `ImportPreviewResponse`
  - `ImportExecuteResponse`
- `saas-web/lib/migration-contracts.ts` now owns the desktop migration API contract:
  - `DesktopImportUploadResponse`
  - `DesktopImportValidationResponse`
  - `DesktopImportExecuteResponse`
  - `DesktopImportJobStatusResponse`
- `saas-web/lib/notifications.ts` now owns notification list/unread-count payloads:
  - `NotificationListItem`
  - `NotificationListResponse`
  - `NotificationUnreadCountResponse`
- `saas-web/lib/trainers.ts` now owns trainer roster/detail read models:
  - `TrainerProfileRow`
  - `TrainerRosterStatRow`
  - `TrainerDetailStatsRow`
  - `TrainerClientRow`
  - `MemberTrainerAssignmentRow`
- `saas-web/lib/pt.ts` now exposes PT read models for package/session views:
  - `PtPackageViewRow`
  - `PtSessionViewRow`
  - `TrainerAvailabilitySlot`
- `saas-web/lib/pt-performance.ts` now owns the PT performance result model:
  - `TrainerPerformance`
  - `PerformanceResult`
- `saas-web/lib/entities.ts` now centralizes tiny entity reference shapes used in several places:
  - `EntityRef`
  - `EntityRefWithPhone`
- `saas-web/lib/guest-invites.ts` now serves as the single source of truth for the guest invite summary, and `MemberGuestInvitesCard` no longer redefines it locally.
- `saas-web/components/dashboard/reports/chart-types.ts` now holds shared chart style props used by more than one report chart.

## Critical Assessment

The repo did not need a monolithic `types.ts`. That would have made the code look more centralized without actually reducing risk. Most of the value came from moving contract types to the module that owns the contract:

- route handlers now export the same response shape they return,
- UI consumers import those shapes instead of reconstructing them,
- query row types live next to the domain logic that builds them.

That is the right boundary. It keeps the shared types close to the source of truth and avoids over-sharing local form models or one-off page data.

The remaining local types are mostly acceptable:

- page-level query rows in reports and dashboard pages,
- form-only types such as submit payloads and draft state,
- component props that do not cross module boundaries.

Those should stay local unless another module genuinely consumes them.

## Recommendations

1. Keep exporting DTOs and read models from the module that owns the data contract.
2. Prefer `lib/*` shared types for cross-route and cross-component data, not ad hoc re-declarations in UI files.
3. Do not promote page-only report row types or form state shapes into shared modules unless a second consumer appears.
4. Treat duplicated local summary types as a smell first, but only merge them when the structure is actually shared.
5. If future cleanup work touches the Electron app or marketing app, only add shared types when those apps consume the same domain object in the same shape.

## Verification

- `npm run typecheck` in `saas-web/`

The typecheck passes after the shared-type consolidations.
