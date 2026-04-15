# Unused Code Cleanup

## Scope

This pass focused on repo-wide dead code removal with strict verification. I treated `knip` as a lead generator, then manually checked import graphs and framework conventions before deleting anything.

## What `knip` Found

`knip` produced many findings, but most of the file-level hits in `app/`, `saas-web/app/`, `saas-web/public/`, and `saas-web/remotion/` are convention-driven or generated-entry artifacts rather than true dead code. I did not remove those without direct import/path verification.

The high-confidence removals were:

- Standalone source files with no importers anywhere in the repo.
- Checked-in build outputs that are not referenced by source, scripts, or runtime configuration.
- One internal Electron helper export that only existed for manual check-in passthrough and had no external callers.

## Confirmed Removals

- Removed `saas-web/lib/auth-observability.ts`.
- Removed `saas-web/components/language-provider.tsx`.
- Removed `saas-web/components/dashboard/MemberPtWorkspace.tsx`.
- Removed `saas-web/components/dashboard/Modal.tsx`.
- Removed `saas-web/components/dashboard/pt/utils.ts`.
- Removed `saas-web/components/ui/command.tsx`.
- Removed checked-in worker bundle `saas-web/worker/whatsapp-vm/dist/index.js`.
- Removed stale root build artifacts `index.js` and `index-CMT8ezEE.js`.
- Removed the unused `manualCheckIn` export from `src/main/services/attendance.ts` and made its result type local to that module.

## Assessment

The repo has two different kinds of “unused” code:

1. True dead code, where nothing in the workspace imports the file or export.
2. Convention-driven files that `knip` cannot reliably classify in this stack, especially Next.js App Router pages, `public/` assets, and generated bundles used indirectly by build tooling.

The cleanup opportunity is real, but it needs a narrow deletion policy. Aggressive auto-removal based on `knip` alone would break valid entrypoints and static assets.

## Recommendations

- Keep using `knip` as a discovery tool, but require manual proof before deleting files in `app/`, `public/`, `remotion/`, or route directories.
- Add a project-specific `knip` configuration so framework-convention paths are excluded or modeled explicitly; that will reduce false positives on future audits.
- Continue pruning unused exports inside active modules only after verifying there are no direct importers and no dynamic access pattern.
