# WhatsApp Behavior Automations Unblock Design

**Date:** 2026-04-22  
**Status:** Approved for implementation  
**Scope:** Unblock owner-controlled behavior automations without enabling weekly digest

## Goal

Unblock these WhatsApp automations as safe owner-controlled lanes:
- `habit_break`
- `streaks`
- `freeze_ending`

Keep this automation blocked:
- `weekly_digest`

The implementation must not regress the live WhatsApp system, must not auto-enable the new lanes for branches, and must preserve the existing rollout model where worker runtime gates and branch flags both matter.

## Product Rules

### Release model
- `habit_break`, `streaks`, and `freeze_ending` become visible, editable, and owner-toggleable in the WhatsApp control center.
- `weekly_digest` remains system-owned and blocked.
- Newly unblocked behavior automations stay `false` by default for all branches after migration/save paths are in place.

### Renewal reminder rule
- Renewal reminder days remain owner-configurable at the branch level.
- Older wording that says renewal timing is hard-locked must be updated to match current product behavior.

### Owner control rule
- Each behavior automation gets its own toggle.
- Each behavior automation gets its own editable template.
- Editing templates must never mutate automation flags.

## UX Design

### Templates tab
- Replace the single read-only “Habit & Streaks” card with three separate automation cards:
  - `Habit break`
  - `Streak encouragement`
  - `Freeze ending`
- Each card follows the same interaction model already used by `post_expiry` and `onboarding`:
  - branch-level toggle
  - status line
  - Edit button
- `weekly_digest` stays visible only in rollout/runtime diagnostics, not as an owner-toggleable card.

### Template editor
- Keep using the existing sheet pattern.
- Behavior automations are no longer read-only.
- The behavior sheet becomes a real editor with:
  - step picker replaced by automation picker only when useful
  - editable textarea
  - live preview
  - shared save/discard behavior

### Status copy
- `habit_break`: one-off behavior nudge, no active sequence table row required
- `streaks`: one-off milestone send, no active sequence table row required
- `freeze_ending`: one-off reminder, no active sequence table row required

## Data And Settings

### Required setting keys
- `whatsapp_habit_break_enabled`
- `whatsapp_streaks_enabled`
- `whatsapp_freeze_ending_enabled`
- `whatsapp_template_habit_break_en`
- `whatsapp_template_habit_break_ar`
- `whatsapp_template_streak_en`
- `whatsapp_template_streak_ar`
- `whatsapp_template_freeze_ending_en`
- `whatsapp_template_freeze_ending_ar`

### Save behavior
- `/api/settings` remains the persistence path.
- Template saves must include the behavior template keys in the same request as the other WhatsApp template values.
- Automation toggles keep using the existing branch setting update path.

## Worker Safety Model

### Scheduling guards
All three newly unblocked behavior automations must require:
- `WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED=true`
- branch-level `whatsapp_automation_enabled=true`
- specific automation flag enabled for the branch
- valid WhatsApp-capable phone
- not deleted
- not `whatsapp_do_not_contact`
- no duplicate pending/recent send for the same automation scope

### Send-time rechecks
Behavior automations must get send-time eligibility rechecks before sending, not only schedule-time checks.

Required behavior:
- `habit_break`
  - stop if the member regained attendance eligibility
  - stop if the member is no longer active/eligible
  - stop if the member is now do-not-contact or deleted
- `streaks`
  - stop if the member is no longer eligible for messaging at send time
  - keep one-off milestone dedupe by member + streak milestone
- `freeze_ending`
  - stop if the freeze is no longer relevant
  - stop if the member is no longer eligible for messaging

### Queue safety
- When a queued behavior message is no longer valid, mark it with an explicit stopped status where possible instead of trying to send it.
- Do not repurpose `weekly_digest` behavior or release logic in this pass.

## Reporting And Warning Model

### Frequency warnings
The newly unblocked automations remain warning-eligible and must continue contributing to warning summaries.

### Sequences visibility
- Do not force one-off behavior automations into the active sequence sheet.
- The active sequences sheet remains focused on multi-step lifecycle sequences unless a new table model is deliberately introduced later.

## Rollout Defaults

### Branch defaults
- Do not enable `habit_break`, `streaks`, or `freeze_ending` for any branch in this pass.
- All branches remain explicitly `false` until manually enabled.

### Weekly digest
- Keep `WHATSAPP_WEEKLY_DIGESTS_ENABLED=false`
- Keep `weekly_digest` blocked in UI copy and rollout metadata

## Validation

### Static
- `saas-web`: `npm run typecheck`
- `saas-web`: `npm run build`
- worker: `npm run typecheck`
- `git diff --check`

### Runtime
- WhatsApp dashboard loads with three behavior cards and no runtime errors
- toggles for the three behavior automations save correctly
- behavior templates save and reload correctly
- weekly digest remains blocked
- no regression in queue, broadcast, post-expiry, onboarding, or status APIs

## Non-Goals
- enabling weekly digest
- auto-enabling any branch for the newly unblocked behavior automations
- changing the active sequence model to include one-off sends
- adding reply parsing or two-way automation
