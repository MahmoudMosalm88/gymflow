# Release Workflow

Last updated: April 24, 2026

## Default rule

Do not push directly to protected `main`.

Every feature, fix, or meaningful doc change should ship through:

1. branch from latest `main`
2. implement one concern only
3. run local verification
4. push branch
5. open PR to `main`
6. wait for required checks
7. merge PR
8. verify post-merge CI and production smoke

## Local verification

Run from the repo root:

```bash
npm run typecheck
npm run build
npm run test
npm run test:smoke
npm run typecheck --prefix worker/whatsapp-vm
```

Authenticated smoke coverage is optional and depends on:

- `E2E_EMAIL`
- `E2E_PASSWORD`

Without those, public smoke still validates homepage, login, and `/api/health`.

## Required GitHub checks

`main` requires:

- `app-quality`
- `worker-typecheck`
- `smoke-local`

Post-merge, GitHub also runs:

- `CI`
- `Post Deploy Smoke`

## Production verification

After merge:

1. verify the merged `main` CI run passes
2. verify `Post Deploy Smoke` passes
3. verify `/api/health` returns the merged commit SHA as `releaseId`

Example:

```bash
curl -sS https://gymflowsystem.com/api/health
```

## AI-agent prompt template

Use this as the default instruction when asking an agent to ship work:

```text
Use the protected workflow for this repo.
Create a short-lived branch from main.
Implement the requested change.
Run:
- npm run typecheck
- npm run build
- npm run test
- npm run test:smoke
- npm run typecheck --prefix worker/whatsapp-vm
Push the branch.
Open a PR into main.
Wait for required checks:
- app-quality
- worker-typecheck
- smoke-local
Merge only after they pass.
Then verify post-merge CI, Post Deploy Smoke, and /api/health releaseId.
Do not push directly to main.
```

## Hotfix rule

Even urgent fixes should use branch + PR.

The difference for a hotfix is scope, not process:

- keep the change narrow
- verify the smallest safe surface
- merge fast
- confirm post-merge production status immediately
