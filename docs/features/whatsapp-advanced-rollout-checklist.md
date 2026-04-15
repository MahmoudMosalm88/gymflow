# WhatsApp Advanced Automation Rollout Checklist
> Date: 2026-04-14
> Status: Working rollout checklist
> Owner: GymFlow product + engineering

This doc turns the advanced WhatsApp automation rollout into an execution checklist.

It covers:
- what must be decided before rollout
- what must be built or verified
- how rollout should happen safely
- what we should watch before expanding beyond pilot gyms

---

## Recommended First Rollout Scope

Recommended first wave:
- `post_expiry`
- `onboarding`

Keep blocked for later waves:
- `habit_break`
- `streaks`
- `freeze_ending`
- `weekly_digest`

Why this is the safest first wave:
- `post_expiry` and `onboarding` already have the strongest product framing
- both already connect to existing reporting surfaces
- both are easier to explain to owners than behavior-based nudges
- both are easier to validate against business outcomes
- `weekly_digest` is owner-facing and should be treated as a separate release lane
- behavior automations need tighter eligibility tuning before live rollout

---

## Rollout Checklist

### 1. Decide First-Rollout Scope
- [x] Confirm first-wave automations
  - Proposed: `post_expiry`, `onboarding`
- [x] Confirm second-wave automations stay blocked
  - `habit_break`
  - `streaks`
  - `freeze_ending`
  - `weekly_digest`
- [x] Confirm whether `weekly_digest` remains system-owned with no owner toggle
- [x] Freeze the rollout decision in source-of-truth docs

Decision frozen on 2026-04-15:
- first wave is `post_expiry` + `onboarding`
- second-wave automations remain blocked
- `weekly_digest` is system-owned and has no owner toggle

### 2. Enable Worker Lifecycle Gate
- [ ] Verify worker supports advanced lifecycle automations in current production build
- [ ] Turn on `WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED=true` only after first-wave controls are ready
- [x] Document exact env location and rollback step
- [ ] Confirm the worker can restart cleanly with the flag enabled

Env note:
- first-wave runtime gate: `WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED`
- weekly-digest release lane: `WHATSAPP_WEEKLY_DIGESTS_ENABLED`
- worker location: the WhatsApp worker service environment
- rollback: set the relevant env back to `false` and restart the worker

### 3. Expose Safe Owner Controls
- [x] Add owner-facing toggles for approved first-wave automations
- [x] Keep non-approved automations visible but not activatable
- [x] Ensure saving templates never mutates automation flags
- [x] Make toggle state clearly distinguish:
  - live and enabled
  - live and disabled
  - implemented but rollout-blocked

### 4. Expose Template Editing For Approved Advanced Automations
- [x] Enable editing for post-expiry templates
  - day 0
  - day 3
  - day 7
  - day 14
- [x] Enable editing for onboarding templates
  - first visit
  - no return day 7
  - low engagement day 14
- [x] Keep non-approved advanced templates read-only
- [x] Verify Arabic and English storage paths are correct
- [x] Verify previews match actual runtime placeholders

### 5. Verify Live Branch Schema Compatibility
- [x] Audit all live branches for required relations
  - `settings`
  - `message_queue`
  - `notifications`
- [x] Verify required columns/keys for lifecycle settings exist
- [x] Produce a branch compatibility list
  - compatible
  - needs migration
  - needs manual cleanup
- [x] Confirm core flows fail open if optional WhatsApp tables are absent

Audit snapshot from the current Cloud SQL dataset on 2026-04-15:
- scanned 23 branches
- only `Elite Fitness Club / Downtown Cairo` currently has first-wave setting rows present in the database snapshot
- the real live pilot is `سرحان / جيم سرحان`
  - active/live branch: `614cff5a-78cd-4a95-8f18-3191f61922cf`
  - inactive/duplicate branch record to keep disabled: `83f90ef4-be84-4661-9791-f3d9a29c0757`
- `سرحان / جيم سرحان` still had live WhatsApp activity but no first-wave lifecycle setting rows yet, so branch-setting preparation is required before go-live
- most remaining branches are empty/test branches or have no first-wave lifecycle settings yet

Operational reading of that snapshot:
- only real customer pilot branch: `سرحان / جيم سرحان` (`614cff5a-78cd-4a95-8f18-3191f61922cf`)
- keep the second Sarhan branch record disabled as inactive/duplicate
- all other branches are QA/internal only, even if they are prepared with explicit first-wave setting rows

### 6. Validate Eligibility Rules On Real Data
- [ ] Test first-wave automations against live/imported gyms
- [x] Validate onboarding eligibility for imported members in code paths
- [x] Validate post-expiry eligibility for imported historical subscriptions in code paths
- [x] Validate stop rules after renewal or regained eligibility in code paths
- [x] Validate do-not-contact, deleted, and bad-phone exclusions in code paths
- [x] Include Sarhan-style older branches in the test set

Implementation note:
- code paths now enforce imported-member join-date handling, post-expiry stop precedence, manual stop precedence, and fail-open compatibility checks
- Sarhan is the live-gym validation branch for this rollout

### 7. Run Controlled Rollout
- [x] Pick pilot gyms
  - only real pilot: `سرحان / جيم سرحان` (`614cff5a-78cd-4a95-8f18-3191f61922cf`)
  - keep `83f90ef4-be84-4661-9791-f3d9a29c0757` disabled as inactive/duplicate
  - all other branches remain QA/internal only
- [x] Define pilot start date and review cadence
  - Day 0: enable worker lifecycle gate and keep rollout limited to the active Sarhan branch only
  - Day 1: review queue health, failed sends, and message-frequency warnings
  - Day 3: review manual stops, stop reasons, and owner confusion
  - Day 7: review post-expiry recovery, onboarding report truth, and whether phase-2 is justified
- [x] Enable approved automations only for pilot gyms
  - first-wave branch settings were prepared for all 23 branches on 2026-04-15
  - active Sarhan branch is `true` for both:
    - `whatsapp_post_expiry_enabled`
    - `whatsapp_onboarding_enabled`
  - all other branches are explicitly `false`
- [x] Keep second-wave automations blocked during pilot
  - `habit_break`
  - `streaks`
  - `freeze_ending`
  - `weekly_digest`
- [x] Document rollback criteria
  - rollback immediately if any branch shows wrong-member onboarding or wrong-member post-expiry sends
  - rollback if failed WhatsApp sends spike materially above current baseline
  - rollback if queue backlog grows faster than the worker can drain it
  - rollback if owners cannot clearly distinguish blocked automations from first-wave controls
  - rollback if Sarhan-style older-branch validation exposes schema/path incompatibility not covered by fail-open handling

### 8. Monitor Before Widening
- [ ] Watch queue health
  - pending growth
  - failed sends
  - worker heartbeat
  - queue retry patterns
- [ ] Watch message density warnings
- [ ] Watch owner confusion or complaints
- [ ] Validate report truth
  - attributed renewals
  - post-expiry performance
  - onboarding performance
- [ ] Review pilot results before enabling additional branches

---

## Immediate Next Actions

Operational next steps:

1. Test against old/imported branches before pilot rollout
2. Validate Sarhan explicitly before widening beyond the first pilot
3. Turn on `WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED=true` for the worker
4. Keep `WHATSAPP_WEEKLY_DIGESTS_ENABLED=false` until the system-owned digest lane is intentionally opened

---

## Working Notes

Current reality:
- basic WhatsApp operations are already live
- advanced lifecycle automations already exist in worker code
- the main gap is productized rollout control, safe enablement, and real-data validation

Current product rule:
- implemented in worker does not mean approved for rollout
- blocked automations must stay visibly blocked until explicitly approved
