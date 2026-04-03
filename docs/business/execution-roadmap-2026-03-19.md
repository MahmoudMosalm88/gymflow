# GymFlow Execution Roadmap

Date: 2026-03-19
Basis: `docs/autoresearch-gymflow-improvements.md`

## Dependency Order

1. Security/tenant hardening
Reason: shared-data safety has to be correct before anything else is safe.

2. Auth and OTP
Reason: all dashboard and admin flows depend on access working.

3. Deployment/runtime verification
Reason: you need to know fixes are truly live before trusting later work.

4. Observability
Reason: later fixes are slower and riskier without stronger runtime signals.

5. Revenue/reporting correctness
Reason: dashboard and money surfaces depend on trusted data.

6. Backup/import/recovery
Reason: destructive and recovery paths should be safe before more complexity lands.

7. Dashboard freshness
Reason: freshness depends on correctness of upstream data paths.

8. PWA/offline front desk
Reason: offline depends on auth, settings, attendance, and sync correctness.

9. Mobile/front-desk UX
Reason: UX polish should follow stable operational flows.

10. WhatsApp automation
Reason: depends on stable tenant settings, member data, and runtime behavior.

11. Owner/admin communication
Reason: depends on safe targeting and trusted runtime state.

12. Onboarding
Reason: stitches together auth, setup, and first-use flows.

13. Desktop import UX
Reason: backend import safety should precede UX polish.

14. Performance
Reason: worth tuning after correctness-heavy surfaces stop moving.

15. Scale readiness
Reason: broad later-stage hardening bucket.

16. Retention intelligence
Reason: depends on trustworthy history, messaging, and reporting.

## Impact Order

1. WhatsApp automation
Reason: highest repeated user pain and direct revenue/retention impact.

2. Auth and OTP
Reason: broken auth blocks the product entirely.

3. Revenue and reporting correctness
Reason: money and trust surfaces must stay correct everywhere.

4. Deployment/runtime verification
Reason: a fix is not real until the live runtime is proven to serve it.

5. Dashboard freshness
Reason: stale operational data breaks owner trust day to day.

6. Performance
Reason: slow pages make the product feel unreliable even when technically working.

7. PWA/offline front desk
Reason: this is the operational backbone for reception use on phone/tablet.

8. Security/tenant hardening
Reason: reduces cross-tenant and bad-session incident risk.

9. Backup/import/recovery
Reason: lowers migration and recovery support load.

10. Observability
Reason: faster diagnosis reduces time-to-fix across all later work.

11. Owner/admin communication
Reason: stronger status visibility reduces support dependence.

12. Mobile/front-desk UX
Reason: should improve once data freshness/performance/offline behavior are stable.

13. Onboarding
Reason: should be improved after the core product is stable.

14. Retention intelligence
Reason: valuable, but depends on stable automation and trustworthy data.

15. Desktop import UX
Reason: important, but lower than SaaS operational reliability for current usage.

16. Scale readiness
Reason: broad umbrella category; many parts improve naturally as items above land.

## Current Batch

Top item: WhatsApp automation

Status: first WhatsApp control/ops batch completed and pushed in `aa796f9`.

Completed slices:
1. Serialize queue processing per tenant in `saas-web/worker/whatsapp-vm/src/index.ts`.
2. Add queue visibility in Settings:
   - pending
   - processing
   - sent
   - failed
   - last worker / queue timestamps
   - last error
3. Add retry controls for failed WhatsApp messages.
4. Add owner-facing broadcast controls:
   - advanced filters
   - audience preview
   - campaign queueing
   - campaign history
5. Extend schema and worker metadata:
   - `whatsapp_campaigns`
   - `message_queue.campaign_id`
   - `message_queue.last_attempt_at`
   - `message_queue.provider_message_id`
6. Fix schema compatibility for existing databases with additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
7. Fix dry-run worker behavior so local queue completion can be verified without a real QR-scanned session.

Why this batch mattered:
- The worker intentionally throttles sends, but the queue poll runs every 5s.
- Without an in-flight guard, overlapping queue loops can send concurrently on the same WhatsApp socket.
- Owners also had no reliable queue/campaign visibility, no retry controls, and no self-serve broadcast tooling in the SaaS app.

Verified outcomes:
- Fewer overlapping send races.
- Queue health visible in the SaaS settings UI.
- Broadcast campaigns can be previewed, queued, and tracked.
- Local dry-run e2e proof completed successfully.
- Build and typecheck passed before push.

## Next WhatsApp slices

1. Add production-facing delivery analytics labels that clearly distinguish:
   - sent by GymFlow
   - not guaranteed delivered/read by WhatsApp
2. Add stronger real-send verification on live for:
   - welcome
   - QR
   - reminder
   - broadcast
3. Add safer backlog controls:
   - pause / resume campaigns
   - cancel queued broadcast rows before send
4. Add operator-facing incident visibility:
   - branch backlog age
   - last successful send per branch
   - repeated failure grouping

## Next Ship To-Do

These items were explicitly requested for the next shipping backlog.

1. Guest invite tracking
Reason: gym owners need to know which member brought each guest, how many guest invites were used, and how many are still remaining.

Status: implemented in the SaaS MVP on 2026-04-03

Delivered:
- link each guest pass to an inviting member
- link each invite to the inviting member's active subscription cycle
- branch-level guest invite allowance per cycle
- remaining guest invite balance per member
- member-page guest invite history
- guest-pass conversion tracking
- void flow that restores balance only for mistaken passes

Later phase:
- invite analytics and conversion reporting
- per-plan invite entitlements
- richer guest invite operational tooling
- guest invite reporting surfaces

Spec:
- `docs/features/guest-invite-tracking.md`

Priority: shipped in current batch

2. Income report by plan type
Reason: owners need to understand revenue split by plan shape, not just total income.

Scope:
- add a new income report grouped by plan type / plan duration
- show totals by plan bucket
- make sure renewed cycles are classified correctly under the new cycle-based subscription model
- keep this aligned with the canonical income event model

Priority: high

3. Full PT profiles
Reason: this is a bigger product surface and needs research before implementation.

Scope:
- dedicated PT profiles
- PT-client mapping
- PT session tracking
- PT package/session status
- automatic WhatsApp nudges for PT sessions similar to subscription warnings

Delivery rule:
- keep this as the last item in this group
- do a research/design pass first before implementation

Priority: last in this batch

## Parallel Infra Note

As of 2026-04-01, a separate production cost-cut batch was executed:
- Cloud Run `minScale` reduced to `0`
- Cloud SQL downsized to `db-g1-small`
- WhatsApp VM downsized to `e2-micro`

Implication for roadmap execution:
- WhatsApp remains a top product priority
- but heavier reports/admin work may now feel slower because the app is intentionally running on a leaner infra shape
