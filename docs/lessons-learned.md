# GymFlow Lessons Learned

Last updated: 2026-02-23

## 1) Delivery status must be real, not assumed
- `message_queue.status='sent'` is not enough by itself.
- Historical `DRY RUN` periods marked rows as sent without actual delivery.
- Always validate critical sends with worker logs and, when available, `waMessageId`.

## 2) Reports logic and automation logic must match exactly
- We had a mismatch where Reports showed "1 day left" while reminder scheduler skipped that window.
- Cause: scheduler filtered with `>= now + minOffset` so items under 24h were excluded.
- Rule: UI labels and scheduler time windows must use the same day math and boundaries.

## 3) Normalize phone numbers server-side before WhatsApp send
- Frontend validation is not enough due to imports/manual edits/legacy data.
- Examples like `+010...` timed out in sending until normalized.
- Rule: normalize at send edge, not only at form edge.

## 4) Queue priority is a UX decision, not only backend detail
- Renewal backlog can delay welcome and QR messages if all are FIFO by time.
- Prioritizing `welcome` and `qr_code` improved perceived reliability immediately.

## 5) Deleted-entity hygiene must be enforced in APIs
- Soft-deleted members still leaked into subscriptions view until API join filtered `deleted_at IS NULL`.
- Rule: every read endpoint that shows user-facing entities should enforce deletion guards.

## 6) Local cleanup scripts are useful, but code-level fixes must follow
- Data cleanup (DB scripts) gives immediate relief.
- Permanent fix must still go into API/query code and be deployed.

## 7) WhatsApp architecture: Baileys is stable path, browser automation is not
- `whatsapp-web.js` + Electron repeatedly failed (`Target closed`) because of Chromium process conflicts.
- Baileys-based socket model removed that class of failure.

## 8) Deployment safety should reduce user-visible impact
- Staged rollout + smoke checks + rollback rules reduce bad pushes.
- Keeping warm instances (`min instances`) reduces freeze/slow spikes during deploy windows.

## 9) Auth reliability needs environment discipline
- Firebase private key/newline handling and local persistence choices caused repeated auth issues.
- Explicit env validation and better diagnostics reduced “internal-error” style failures.

## 10) Forensics needs tenant/profile-specific tracing
- Multi-tenant debugging fails when using generic terms like “tenant A/B”.
- Use concrete identifiers users understand (profile phone, member names, queue IDs, exact timestamps).

## 11) Bulk messaging must be throttled by design
- High-volume sends should be intentionally paced to lower account risk.
- This increases completion time but protects deliverability and account health.

## 12) Document failed attempts, not just successful fixes
- Repeated incidents were resolved faster when failed fix history was preserved.
- Keep root cause, attempted mitigation, and final verified fix in one place.
