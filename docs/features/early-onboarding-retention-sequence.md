# Early Onboarding Retention Sequence
> Date: April 6, 2026
> Status: Ready for implementation
> Related: `docs/features/reports-optimization-roadmap.md`

---

## Goal
Increase early retention by helping new members build momentum in their first 72 hours and first 14 days.

This is not just messaging.
It is a retention workflow that must also feed:
- Cohort Retention
- Onboarding Funnel Performance
- At-Risk Members
- Revenue Saved by WhatsApp later where attribution is appropriate

---

## Live Safety Rule
This workflow must remain disabled in production until explicitly approved.

Allowed live automations right now:
- welcome message
- existing renewal reminders

Blocked for now:
- first-visit recognition
- no-return follow-up
- low-engagement day-14 follow-up

---

## Core Business Rule
Use this sequence only for real new members who:
- were created recently
- have a valid WhatsApp-capable phone number
- are not marked do-not-contact
- are not deleted, merged, or test records

Do not use this sequence for:
- imported legacy members created long after they originally joined
- duplicate or merged records
- manually blocked members
- members whose branch has not explicitly enabled lifecycle automations later

---

## Sequence Timing
Locked v1 sequence:
1. Day 0: standard welcome message on join
2. First successful visit: encouragement message
3. Day 7 without meaningful return: no-return follow-up
4. Day 14 with low engagement: low-engagement follow-up

Plain-English intent:
- first 72 hours should feel welcomed and recognized
- first week should catch people who disappear after trying once
- first two weeks should catch weak early habit formation

---

## Trigger Conditions
### Step 1: Welcome
Send when:
- member is created
- and the normal welcome automation is allowed

### Step 2: First visit recognition
Send when:
- member has their first successful check-in
- and no first-visit recognition was sent before

### Step 3: Day 7 no-return follow-up
Send when:
- member joined at least 7 days ago
- and total successful visits is 1 or less
- and member has not already received this step

### Step 4: Day 14 low-engagement follow-up
Send when:
- member joined at least 14 days ago
- and total successful visits in first 14 days is under 3
- and member has not already received this step

---

## Stopping Conditions
Stop later onboarding steps if any of these become true:
- member is deleted or merged
- member is marked do-not-contact
- branch disables lifecycle automations
- the member already met the engagement goal for that step

Do not resend the same step twice.

---

## Required Data Inputs
- member id
- organization id
- branch id
- member created timestamp
- first successful visit timestamp
- successful visit count in first 7 days
- successful visit count in first 14 days
- message template type
- sequence kind
- message sent timestamp
- stop reason when applicable

Recommended sequence kinds:
- `onboarding_welcome`
- `onboarding_first_visit`
- `onboarding_no_return_day7`
- `onboarding_low_engagement_day14`

Recommended statuses:
- `pending`
- `sent`
- `stopped_goal_met`
- `stopped_manual`
- `stopped_not_eligible`
- `failed`

---

## Message Types
### Welcome
Purpose:
- confirm the member is in the system
- reduce uncertainty
- set expectation for next action

### First visit recognition
Purpose:
- reward momentum
- make the first check-in feel noticed
- encourage a second visit quickly

### Day 7 no-return follow-up
Purpose:
- catch drop-off early
- prompt a second visit before the habit breaks

### Day 14 low-engagement follow-up
Purpose:
- identify weak early habit formation
- prompt a schedule-setting or staff follow-up action

Copy should be defined separately, but the workflow must support distinct templates per step.

---

## Reporting Rules
### Onboarding funnel
Track:
- joined
- welcome sent
- first visit completed
- first-visit recognition sent
- no-return day-7 follow-up sent
- low-engagement day-14 follow-up sent
- 3 visits completed in first 14 days

### Cohort retention support
This workflow must make it possible to compare:
- cohorts before onboarding improvements
- cohorts after onboarding improvements

### Attribution rule
Do not count onboarding messages as direct revenue saved in v1 unless a later spec defines a clear attribution model.

---

## UX Requirements
Owner/manager should be able to see:
- how many new members are in onboarding right now
- where members are dropping off
- which members need manual follow-up

Useful integration surfaces later:
- dashboard KPI for `new members at risk`
- onboarding funnel report
- member detail timeline

---

## Multi-Branch Rule
Default behavior is branch-scoped.
Reporting should default to the current branch and allow org-wide aggregation for owners.

---

## Mobile Requirement
Owners and managers must be able to see on mobile:
- new members added recently
- who has not returned after first visit
- who is low-engagement at day 14

---

## Success Criteria
- [ ] Welcome stays separate from the new onboarding follow-up steps
- [ ] First-visit recognition sends only once
- [ ] Day-7 follow-up only targets weak early return behavior
- [ ] Day-14 follow-up only targets low engagement
- [ ] Reports can measure onboarding drop-off cleanly
- [ ] Workflow stays disabled in production until explicitly approved
