# Post-Expiry Re-engagement Sequence
> Date: April 5, 2026
> Status: Ready for implementation
> Related: `docs/features/reports-optimization-roadmap.md`

---

## Goal
Recover revenue from members whose subscription expired or whose renewal payment failed, using a structured WhatsApp sequence that stops automatically once the member renews.

This is not just a messaging feature.
It is a retention workflow that must also produce clean reporting inputs for:
- Revenue Saved by WhatsApp
- Failed Payments / Payment Recovery
- WhatsApp Message Performance

---

## Live Safety Rule
This workflow must remain disabled in production until explicitly approved.

Allowed live automations right now:
- welcome message
- existing renewal reminders

Blocked for now:
- Day 0 post-expiry recovery
- Day 3 post-expiry recovery
- Day 7 post-expiry recovery
- Day 14 post-expiry recovery

---

## Core Business Rule
Use this sequence only for members who:
- were previously active
- and either:
  - naturally expired without renewal
  - or had a renewal/payment failure that puts the membership at risk

Do not use this sequence for:
- manually cancelled members
- banned/blocked members
- duplicate or merged records
- members explicitly marked do-not-contact

---

## Sequence Timing
Locked v1 sequence:
1. Day 0: expiry or payment-failure notice
2. Day 3: reminder
3. Day 7: personal-style follow-up
4. Day 14: final recovery attempt

All messages stop immediately if:
- the member renews
- the payment is recovered
- the owner/staff manually disables the sequence for that member

---

## Trigger Conditions
### Natural expiry trigger
Start the sequence when:
- subscription reaches end date
- and no successful renewal exists for the next cycle

### Failed payment trigger
Start the sequence when:
- a renewal payment attempt fails
- and the member still does not have a successful replacement payment

### Manual end exclusion
Do not auto-start the sequence when:
- owner or staff manually ended the subscription
- membership was intentionally closed for a non-retention reason

---

## Required Data Inputs
- member id
- organization id
- branch id
- subscription id
- subscription end date
- payment status if payment failed
- message template type
- message sent timestamp
- sequence step number
- sequence status
- stop reason if stopped

Recommended statuses:
- `pending`
- `sent`
- `stopped_renewed`
- `stopped_manual`
- `stopped_not_eligible`
- `failed`

---

## Message Types
### Day 0
Purpose:
- tell the member their membership expired or payment failed
- make the next step obvious

### Day 3
Purpose:
- remind without sounding robotic
- restate value and urgency lightly

### Day 7
Purpose:
- feel more human and more recovery-oriented
- encourage direct reply or branch follow-up

### Day 14
Purpose:
- final recovery attempt before the member moves into a colder lapsed state

Copy should be specified separately, but the workflow must support different templates per step.

---

## Stopping Conditions
Stop the sequence immediately if any of these become true:
- member renews
- failed payment becomes recovered
- owner/staff marks the member do-not-contact
- membership is manually ended after sequence start
- member record becomes invalid or merged

Do not continue sending messages after renewal.
That would reduce trust quickly.

---

## Reporting Rules
### Revenue Saved by WhatsApp
For v1, count revenue as influenced only when:
- the member received a relevant post-expiry message
- and renewed within 14 days of that message

### Message performance
Track per step:
- messages sent
- members reached
- renewals within 14 days
- recovered payment value
- revenue influenced

### Recovery funnel
Track:
- entered sequence
- reached step 1
- reached step 2
- reached step 3
- reached step 4
- renewed before completion
- renewed after final step
- never recovered

---

## UX Requirements
### Owner-facing controls
Owner/staff should be able to:
- see which members are currently in the sequence
- see current step and next scheduled message
- stop the sequence manually
- understand why a member stopped receiving messages

### Member list/report integration
The following surfaces should reflect sequence status:
- Revenue At Risk
- Revenue Saved by WhatsApp
- Failed Payments / Payment Recovery
- WhatsApp Message Performance
- At-Risk Members later where useful

---

## Multi-Branch Rule
Default sequence behavior is branch-scoped.
Reporting should default to the current branch and allow org-wide aggregation for owners.

---

## Mobile Requirement
Owners and managers must be able to see:
- how many members are in the sequence
- how much revenue is still recoverable
- which members need manual follow-up

These views must be usable on mobile, not desktop-only.

---

## Success Criteria
- [ ] Expired members enter the sequence only when eligible
- [ ] Manually ended memberships do not enter the sequence by mistake
- [ ] Messages stop automatically once renewal happens
- [ ] Owner can see current sequence step per member
- [ ] Revenue influenced by this sequence uses the locked 14-day attribution rule
- [ ] Reports can break down performance by Day 0 / Day 3 / Day 7 / Day 14
