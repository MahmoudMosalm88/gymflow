# GymFlow SaaS Web

This repo root now hosts the active GymFlow SaaS app. On April 24, 2026, the old GitHub Pages landing site was retired and removed from this repo.

## What is implemented

- Next.js app-router project scaffold (`app/*`)
- API surface mapped to your locked contract:
  - `/api/auth/*`
  - `/api/members`
  - `/api/subscriptions`
  - `/api/attendance/check`
  - `/api/reports/*`
  - `/api/settings`
  - `/api/backup/*`
  - `/api/migration/*`
  - `/api/whatsapp/*`
- PostgreSQL multi-tenant schema in `/db/schema.sql`
- Firebase Admin auth integration hooks
- Transactional desktop import executor:
  - `POST /api/migration/execute`
  - imports uploaded artifact payload into the selected branch in one transaction
  - maps desktop IDs to SaaS UUID/serial IDs with migration report (`inserted/skipped/errors`)
  - creates pre-import snapshot backup before replay
- Transactional backup restore executor:
  - `POST /api/backup/restore`
  - restores from `archive` payload or saved `artifactId`
  - creates pre-restore snapshot backup
  - applies restore in one transaction (rollback-safe on failure)
- Backup artifact persistence (`backups` + `backup_artifacts` tables)
- GCP deployment assets:
  - `Dockerfile`
  - `cloudbuild.yaml`
  - Terraform baseline under `/infra/gcp/terraform`
- WhatsApp VM worker skeleton under `/worker/whatsapp-vm`

## Locked architecture mapping

- Hosting: Cloud Run (`web-app`)
- Data: Cloud SQL PostgreSQL
- Auth: Firebase Authentication (owner accounts)
- Object storage: Cloud Storage (photos/backups/imports)
- Scheduled jobs: Cloud Scheduler
- WhatsApp: VM worker (`whatsapp-web.js`) for session stability

## Local bootstrap

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Install deps:

```bash
npm install
```

3. Apply schema:

```bash
npm run db:migrate
```

4. Start app:

```bash
npm run dev
```

5. Audit Firebase configuration (recommended before local QA / production deploy):

```bash
npm run firebase:audit
```

This command validates:
- required Firebase web env keys,
- recommended Firebase web keys for stable phone/popup auth,
- Firebase Admin bootstrap (service-account or ADC),
- a live Admin SDK API call (`listUsers(1)`).

## Release safety baseline

The repo now has an enforced local/CI safety stack:

- `npm run typecheck`
- `npm run build`
- `npm run test` for Vitest unit + integration coverage
- `npm run test:smoke` for local Playwright smoke
- `npm run typecheck --prefix worker/whatsapp-vm`

GitHub Actions workflows:

- `.github/workflows/ci.yml`
  - `app-quality`
  - `worker-typecheck`
  - `smoke-local`
- `.github/workflows/post-deploy-smoke.yml`
  - `prod-smoke`

Production smoke now waits for `/api/health` to report the pushed `RELEASE_ID` before running browser checks.

## Feature shipping workflow

The default shipping path is now:

1. branch from latest `main`
2. implement one feature or fix only
3. run:
   - `npm run typecheck`
   - `npm run build`
   - `npm run test`
   - `npm run test:smoke`
   - `npm run typecheck --prefix worker/whatsapp-vm`
4. push the branch
5. open a PR into `main`
6. wait for required checks:
   - `app-quality`
   - `worker-typecheck`
   - `smoke-local`
7. merge the PR
8. confirm post-merge:
   - GitHub `CI`
   - GitHub `Post Deploy Smoke`
   - `/api/health` shows the merged commit as `releaseId`

Direct pushes to protected `main` are no longer the normal workflow.

Full playbook: [docs/release-workflow.md](/Users/mahmoudsfiles/projects/GymFlow/gymflow/docs/release-workflow.md:1)

### Smoke credentials

Authenticated smoke coverage is optional and activates only when these secrets/env vars exist:

- `E2E_EMAIL`
- `E2E_PASSWORD`

Without them, public smoke still runs and validates:

- homepage shell
- login page
- `/api/health`

## Important gaps before production cutover

- Full frontend feature parity screens are not yet migrated.
- Desktop backup parser for raw `.db + photos` binary packages is not yet implemented in the web upload flow (current executor expects parsed artifact payload JSON).
- Real WhatsApp send flow still needs VM runtime integration (currently dry-run ready).
- Firebase client-side auth flow UI is still minimal.
- Cloud Build migration execution is still not safely blocking in the active trigger path; the repo now surfaces that gap explicitly instead of treating it as covered.

The active web runtime, Docker build, and Cloud Build configuration now all run from the repo root.
