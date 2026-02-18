# GymFlow SaaS Web (GCP-Only Baseline)

This folder is an isolated SaaS migration workspace for GymFlow, separate from the existing desktop runtime.

## What is implemented in this baseline

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

## Important gaps before production cutover

- Full frontend feature parity screens are not yet migrated.
- Desktop backup parser for raw `.db + photos` binary packages is not yet implemented in the web upload flow (current executor expects parsed artifact payload JSON).
- Real WhatsApp send flow still needs VM runtime integration (currently dry-run ready).
- Firebase client-side auth flow UI is still minimal.

This baseline is structured to let us deliver each phase cleanly with isolated, testable increments.
