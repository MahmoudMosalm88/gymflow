# GymFlow VPS Infrastructure Migration Plan

> Last updated: April 25, 2026

## Goal

Move the parts of GymFlow that benefit most from VPS control while avoiding the highest operational risk.

Recommended first migration:

- Move the Next.js app to a VPS.
- Move the WhatsApp worker to the same VPS.
- Keep Postgres managed.
- Keep Firebase Auth.
- Keep object storage managed.

This lowers hosting complexity around the long-running worker without making production Postgres a daily operations burden.

## Before / After Cost Table

| Layer | Current GCP Setup | Current Monthly Cost | First VPS Setup | Expected Monthly Cost |
|---|---|---:|---|---:|
| Web app | Cloud Run, `minScale=1` business hours, `0` overnight | `$9-12` | VPS Docker container behind Caddy/Nginx | included in VPS |
| Database | Cloud SQL PostgreSQL `db-f1-micro`, 20 GB SSD | `$11-15` | Keep Cloud SQL at first, or later move to Neon | `$11-15` if Cloud SQL, lower if Neon fits |
| WhatsApp worker | GCP `e2-micro` spot VM | `$2-5` | VPS Docker container or `systemd` service | included in VPS |
| Storage | GCS buckets for photos, imports, backups | `$0-3` | Keep GCS at first | `$0-3` |
| Build/deploy/support services | Artifact Registry, Cloud Build, Scheduler, Workflows, Secrets | `$2-5` | GitHub Actions or local Docker deploy, VPS env/secrets | `$0-3` |
| VPS | Not used | `$0` | 2 vCPU / 4 GB RAM / 60-80 GB SSD | `$6-15` |
| **Total** | Managed GCP lean setup | **`$24-28`** | VPS app + worker, managed DB/storage | **`$17-33`** |

Notes:

- The first VPS setup does not guarantee a huge cost reduction if Cloud SQL is kept.
- The main win is control and a cleaner home for the WhatsApp worker.
- The biggest cost drop only happens if Postgres later moves from Cloud SQL to a cheaper managed Postgres provider or to self-hosted Postgres.
- Self-hosting Postgres is intentionally out of scope for phase one.

## Target Architecture

| Component | Target |
|---|---|
| Next.js app | VPS Docker container |
| WhatsApp worker | VPS Docker container or `systemd` service |
| Database | Managed Postgres, initially current Cloud SQL |
| Auth | Firebase Auth |
| Object storage | Current GCS buckets |
| Reverse proxy | Caddy preferred, Nginx acceptable |
| TLS | Caddy automatic HTTPS or Certbot |
| Process supervision | Docker restart policy or `systemd` |
| Monitoring | Uptime checks, disk alerts, app health, worker backlog |

## Phase 1: Prepare VPS

1. Buy a VPS with at least:
   - `2 vCPU`
   - `4 GB RAM`
   - `60-80 GB SSD`
   - Ubuntu LTS
2. Harden access:
   - SSH key login only
   - disable password SSH login
   - firewall allows only `22`, `80`, and `443`
   - install `fail2ban`
3. Install runtime:
   - Docker
   - Docker Compose
   - Caddy or Nginx
4. Add basic monitoring:
   - uptime check for the public site
   - disk usage alert
   - container restart alert
   - worker queue/backlog alert after the worker is moved

## Phase 2: Keep Database Managed

1. Keep current Cloud SQL for phase one.
2. Confirm the VPS can connect to the database securely.
3. Keep current backups enabled.
4. Run a restore test before production cutover.
5. Do not move Postgres to the VPS in phase one.

Reason: Postgres operations are the highest-risk part of this migration. Backups, restore testing, upgrades, disk growth, and corruption recovery need discipline. Keeping it managed keeps the first move smaller.

## Phase 3: Keep Storage Managed

1. Keep existing GCS buckets:
   - photos
   - imports
   - backups
2. Keep existing app environment variables for object storage.
3. Revisit Cloudflare R2, Backblaze B2, or another S3-compatible provider only if storage cost becomes meaningful.

Reason: storage is not currently a major cost driver.

## Phase 4: Containerize Runtime

1. Use the existing app `Dockerfile`.
2. Create VPS deployment config with:
   - `web`
   - `whatsapp-worker`
   - `caddy` or `nginx`
3. Use restart behavior:
   - Docker: `restart: unless-stopped`
   - or `systemd` service if the worker is run directly
4. Store production secrets on the VPS, not in git.

Minimum expected services:

| Service | Responsibility |
|---|---|
| `web` | Next.js app and API routes |
| `whatsapp-worker` | long-running Baileys session, queue drain, reconnects |
| `proxy` | TLS and routing for `gymflowsystem.com` |

## Phase 5: WhatsApp Worker Migration

1. Copy WhatsApp session/auth data from the current GCP worker VM.
2. Start the worker on the VPS.
3. Verify:
   - QR/status endpoint works
   - session reconnects after restart
   - pending queue drains
   - messages send with current pacing
   - logs are visible
4. Stop the old GCP worker only after the VPS worker is stable.

Important: cron jobs cannot replace the worker. The worker needs a long-lived WhatsApp session and send loop. Cron jobs are useful for scheduled enqueueing, cleanup, and health checks, but not for holding the WhatsApp connection.

## Phase 6: Web App Migration

1. Deploy the app to a temporary hostname, for example:
   - `vps.gymflowsystem.com`
2. Test core flows:
   - login
   - dashboard load
   - members
   - subscriptions
   - payments
   - reports
   - WhatsApp page
   - file uploads/photos
   - backups
3. Confirm `/api/health` works.
4. Confirm the app can reach:
   - managed Postgres
   - Firebase Auth/Admin
   - object storage

## Phase 7: Cutover

1. Lower DNS TTL before cutover.
2. Point `gymflowsystem.com` to the VPS.
3. Keep Cloud Run running for rollback.
4. Watch the system for `24-48` hours:
   - app errors
   - worker logs
   - DB connection count
   - disk usage
   - queue backlog
   - uptime checks

## Phase 8: Decommission Old Runtime

After the VPS has handled real production traffic without issues:

1. Keep Cloud SQL if still using it.
2. Reduce Cloud Run to `minScale=0` or disable it after rollback window.
3. Delete the old GCP WhatsApp worker VM.
4. Keep backups.
5. Update project memory and cost docs with the new live architecture.

## Rollback Plan

1. Keep Cloud Run deployable and reachable during cutover.
2. Keep old worker VM available until the VPS worker is stable.
3. If VPS web fails, point DNS back to Cloud Run.
4. If VPS worker fails, stop it and restart the old GCP worker VM.
5. Do not migrate Postgres in the same cutover window.

## Do Not Do In Phase One

- Do not self-host Postgres.
- Do not replace Firebase Auth.
- Do not replace object storage unless cost becomes meaningful.
- Do not shut down Cloud Run until the VPS has passed real production traffic.
- Do not run the old worker and new worker against the same WhatsApp session at the same time.

## Decision Rule

Use the VPS migration if the goal is more control and a better home for the long-running WhatsApp worker.

Do not move Postgres to the VPS until there is a clear reason and a tested backup/restore workflow.
