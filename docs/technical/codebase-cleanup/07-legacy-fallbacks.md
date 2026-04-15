# Legacy / Fallback Cleanup

## Scope

This pass focused on deprecated, legacy, compatibility, and fallback code paths across the repo, with the goal of collapsing them into singular active flows where that could be done safely.

I treated three categories differently:

- Code that is only there to serve removed API shapes or stale call sites.
- Code that still protects live migration state or persisted data.
- Code that is a real runtime recovery path, not a legacy compatibility layer.

## Research Summary

I reviewed the codebase with repo-wide text search and import/call-site checks, then verified the active report and WhatsApp paths in the SaaS app.

The important result was that the reports API still contained four explicit compatibility branches for removed report IDs, but no code in the workspace still requested those IDs.

## Findings

1. `saas-web/app/api/reports/[report]/route.ts` still served legacy report IDs that are not used anywhere else in the repo.
   - The removed IDs were `member-attendance-trends`, `detailed-revenue-breakdown`, `outstanding-payments-debtors`, and `peak-hours-capacity-utilization`.
   - The current dashboard report page only calls the newer report IDs, so these branches were pure compatibility baggage.
   - This was the cleanest high-confidence removal in the repo because there was no remaining internal caller to preserve.

2. WhatsApp template storage still has a legacy/new dual-shape.
   - The dashboard settings page writes both `whatsapp_template_welcome` and the language-specific keys.
   - The send and member onboarding routes still read the old raw key as a fallback.
   - I did not remove that path because it still bridges live persisted settings and the repo does not yet have a one-time migration that fully eliminates the old shape.

3. The attendance QR backfill path is legacy-looking, but it still overlaps with active import/migration behavior.
   - The check-in route can backfill card codes from `import_artifacts`.
   - There is also a manual backfill endpoint in the migration area.
   - I left that alone because it is still a real recovery path for imported data, not just dead compatibility code.

## Confirmed Removals

- Removed the four stale report compatibility branches from `saas-web/app/api/reports/[report]/route.ts`.

## Recommendations

- Remove compatibility branches only when a workspace-wide search proves there are no remaining call sites.
- Prefer a single storage format for WhatsApp templates only after adding a migration that rewrites old settings, otherwise the fallback is still serving real persisted state.
- Keep migration backfills only where they are still tied to active import or recovery workflows; otherwise delete them instead of leaving hidden repair logic in request handlers.
- Re-run this lane after the remaining cleanup passes, because once the other agents finish, some currently-live fallback paths may become safe to collapse.
