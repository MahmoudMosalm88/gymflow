# WhatsApp Automation Source of Truth
> Date: April 12, 2026
> Status: Source of truth for GymFlow WhatsApp automation scope and product rules
> Supersedes:
> - `docs/whatsapp-automation-briefing.md`
> - `docs/features/post-expiry-reengagement-sequence.md`
> - `docs/features/early-onboarding-retention-sequence.md`

---

## Why this exists
GymFlow now has enough WhatsApp automation ideas and partial implementations that a single source of truth is required.

This document defines:
- the product philosophy
- which automations are in scope now
- which are parked
- who controls them
- what the safety rules are
- how they must connect to reporting

This is the cornerstone doc moving forward.

---

## Product Philosophy
GymFlow uses WhatsApp automation to create a better member experience.

That improves value for the direct customer:
- the gym owner

Automation is not meant to feel robotic or spammy.
It should help the gym:
- reduce lost renewals
- improve early retention
- reinforce good member habits
- reduce manual front-desk follow-up work

GymFlow’s job is:
- make automations work reliably
- make them measurable
- make them safe to control

GymFlow’s job is not:
- centrally manage each gym’s messaging strategy
- decide the final activation mix for each owner

The gym owner controls which automations are enabled.

---

## Core Product Decisions

### 1. Owner-controlled automation mix
GymFlow will make a strong set of automations available.
The gym owner decides which automations to enable.

This is part of the sales value:
- more useful automations
- more operational leverage
- more retention value

Control model:
- per automation toggle
- per branch activation
- GymFlow-owned timing for multi-step automations
- owner-selected reminder days for renewal reminders

### 2. Frequency control is still GymFlow’s responsibility
Even though owners choose the automation mix, GymFlow must help prevent bad messaging behavior.

GymFlow must:
- warn owners when a meaningful number of members are receiving too many messages too frequently
- make automation overlap visible
- avoid unsafe hidden automation behavior

Warning model:
- advisory only
- no auto-throttling
- shown primarily in the WhatsApp control center
- includes counts, affected members, and top causes

GymFlow should not silently decide the owner’s final messaging strategy.

### 3. Automation ownership
GymFlow maintains:
- reliability
- scheduling correctness
- deduplication
- stop rules
- reporting truth

Owners manage:
- enable/disable decisions
- template choices
- branch-level activation

Owners do not manage:
- sequence timing
- attribution rules
- deduplication rules
- safety precedence

### 4. Reporting linkage is required
Automations should not be treated as standalone message features.
They must feed owner-facing reports where relevant.

### 5. Outbound-only for now
GymFlow remains outbound-only for now.

Do not expand scope yet into:
- reply parsing
- conversation automation
- AI handling of member replies

That can come later once a few real users are live on the expanded automation system.

### 6. Cash-first reality
Do not prioritize payment-failure automations while GymFlow remains effectively cash-first.

Payment-related automation is parked for now.

### 7. PT lane is separate
PT reminders and PT package warnings are a separate product lane.
They are not the focus of this document.

---

## Live Safety Rule
Allowed live automations right now:
- welcome message
- renewal reminders
- manual sends
- broadcast campaigns
- QR code sends
- post-expiry recovery sequence
- early onboarding follow-up steps after welcome
- habit-break nudges
- streak messages
- freeze-ending reminders

Blocked in production until explicitly approved:
- weekly digest
- milestone celebrations
- birthday messages

This must remain true unless explicitly changed in this document and implemented safely.

---

## Automation Scope for Now
The current set of ideas plus already-built flows is enough for this stage.

GymFlow does not need more automation categories right now.
The priority is to make the current set:
- coherent
- safe
- owner-controllable
- measurable

---

## In-Scope Automation Catalog

### A. Core Operational Automations
These are the baseline automation layer.

#### 1. Welcome message
Purpose:
- confirm successful registration
- reduce uncertainty
- create a strong first impression

Product position:
- conceptually this is onboarding step 1
- operationally it is also a baseline live automation today

Status:
- live

Control:
- owner-controlled

Reports:
- WhatsApp Performance
- onboarding funnel support later

#### 2. Renewal reminders
Owner-selected reminder days:
- the branch chooses reminder days from the supported options
- default branch setup is `7,3,1` unless the owner changes it

Purpose:
- reduce involuntary churn
- recover expiring revenue early

Status:
- live

Control:
- owner-controlled

Reports:
- Revenue at Risk
- Recovered Revenue by WhatsApp
- WhatsApp Message Performance

#### 3. QR code send
Purpose:
- make access and check-in smoother

Status:
- live

Control:
- owner/staff triggered

Reports:
- WhatsApp Performance only

#### 4. Broadcast campaigns
Purpose:
- manual promotional or operational messaging

Status:
- live

Control:
- owner/staff triggered

Reports:
- campaign history
- WhatsApp queue health
- WhatsApp Performance where useful

---

### B. Retention Recovery Automations

#### 5. Post-expiry recovery sequence
Locked sequence:
- Day 0
- Day 3
- Day 7
- Day 14

Purpose:
- recover lost revenue from members who expire without renewing

Use only when:
- the member naturally expired without renewal

Imported-member rule:
- imported members may qualify only if the imported cycle was genuinely active recently
- stale historical imports must not enter recovery by default

Do not use when:
- membership was manually ended
- member is blocked
- member is merged/invalid
- member is do-not-contact

Stop immediately if:
- member renews
- member is no longer eligible
- owner/staff stops the sequence

Status:
- live
- default off until the branch enables it

Control:
- owner-controlled

Reports:
- Recovered Revenue by WhatsApp
- Post-Expiry Performance
- WhatsApp Message Performance
- Revenue at Risk

Attribution rule:
- renewal within 14 days of relevant message

---

### C. Early Retention Automations

#### 6. Early onboarding retention sequence
Locked sequence:
- Day 0 welcome
- first successful visit recognition
- day 7 no-return follow-up
- day 14 low-engagement follow-up

Purpose:
- improve early habit formation
- reduce silent early churn

Use only for:
- real new joins or members that clearly qualify as genuinely new from recent imported behavior
- valid WhatsApp-capable phone
- non-test/non-deleted/non-merged members

Do not use for:
- imported legacy members that only look “new” because of migration timing
- blocked/do-not-contact members

Stop later steps if:
- member becomes ineligible
- branch disables the automation
- member already met the engagement target for that step

Status:
- live
- default off until the branch enables it

Control:
- owner-controlled

Reports:
- Onboarding Performance
- Cohort Retention
- At-Risk Members
- new-members-at-risk dashboard support later

Attribution:
- do not count as direct revenue saved in v1

---

### D. Next Strong Automation Ideas
These are the highest-value next additions after the above set is properly productized.

#### 7. Habit-break nudge
Purpose:
- catch behavior change before churn becomes visible in revenue

Trigger concept:
- member had a repeat attendance habit
- then stops showing up for a few days

Why it matters:
- this is behavior-aware, not calendar-only
- high retention value if executed carefully

Status:
- live
- default off until the branch enables it

Control:
- owner-controlled

Reports:
- dedicated Habit-Break report
- At-Risk Members
- attendance decline support

#### 8. Streak encouragement
Purpose:
- reinforce consistency
- celebrate habit milestones

Milestone examples:
- 3
- 7
- 14
- 21
- 30
- 50
- 100

Status:
- live
- default off until the branch enables it

Control:
- owner-controlled

Reports:
- dedicated Streak Performance report
- retention correlation later

Important tone rule:
- supportive, never childish or guilt-heavy

#### 9. Freeze-ending reminder
Purpose:
- bring frozen members back smoothly

Status:
- live
- default off until the branch enables it

Control:
- owner-controlled

Reports:
- reactivation support later

### E. Owner Ops Automations

#### 10. Weekly digest
Purpose:
- give the owner a regular operational summary without needing to open reports first

Status:
- blocked in production today
- always on once released and WhatsApp is connected

Control:
- system-owned exception
- not part of the per-automation owner toggle model

Reports:
- owner ops summary support
- WhatsApp Message Performance where useful

---

## Parked / Out of Scope for Now

### 1. Payment-failure retry automation
Parked until GymFlow has stronger real digital payment behavior.

Reason:
- current product is still effectively cash-first

### 2. Birthday messages
Low leverage relative to other work.
Park for now.

### 3. PT session reminders and PT package warnings
Separate lane.
Out of focus in this document.

### 4. PT low-balance alerts
Separate lane.
Out of focus here.

### 5. Two-way reply automation
Out of scope for now.

That includes:
- parsing member replies
- automatic response branching
- reply-based automation actions

---

## Control Model

## Owner control principle
Every member-facing non-baseline automation should be explicitly controllable by the gym owner.

At minimum, owners must be able to:
- enable or disable each automation type
- edit the message template per step
- edit templates per language
- understand what triggers it
- understand what stops it
- see how many members are currently affected

The control center should be organized by automation groups:
- Operational
- Recovery
- Onboarding
- Behavior
- Owner Ops

All in-scope automations should be visible in the UI.
Blocked ones should remain visible but locked.
Blocked ones should be read-only until released.

### Baseline automations
These remain part of the core WhatsApp layer:
- welcome
- renewal reminders
- broadcasts/manual sends
- QR sends

### Expanded automations
These must be owner-controlled with explicit toggles:
- post-expiry
- onboarding
- habit-break
- streaks
- freeze-ending reminders

### Exception
Weekly digest is the one owner-facing exception:
- blocked today
- always on after release when WhatsApp is connected
- no owner toggle
- release is controlled by GymFlow at the worker/runtime layer, not per-branch settings

### Runtime release gates
Operational rollout is controlled in the worker environment:
- `WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED`
  - opens the first-wave lifecycle lane
  - owner toggles alone do not send anything until this is on
- `WHATSAPP_WEEKLY_DIGESTS_ENABLED`
  - opens the weekly digest release lane
  - this remains system-owned with no branch toggle

Current rollout note:
- the first real customer pilot is Sarhan Gym
- other branches may be prepared or used for QA, but they are not part of the real-user pilot

---

## Frequency / Spam Protection Rules
Owners choose which automations to enable.
GymFlow must still provide safeguards.

### Required product behavior
GymFlow must warn owners when:
- a sizable number of members are receiving many messages within a short window

This is a warning layer, not a forced central override.

Warning counts include all member-facing message classes:
- welcome
- renewal
- post-expiry
- onboarding
- habit-break
- streak
- QR
- one-off manual sends
- broadcasts

Weekly digest is excluded from member-frequency warnings because it is owner-facing.

### Required visibility
Owner should be able to see:
- message volume by automation type
- members receiving high message frequency
- overlapping active automation categories
- top message sources causing the warning

### Product goal
Do not hide the consequences of over-automation.
Make them visible so owners can manage their own strategy.

---

## Reporting Requirements
Automations must feed reports where relevant.

### Required reporting connections

#### Revenue at Risk
fed by:
- renewal reminders
- post-expiry recovery later

#### Recovered Revenue by WhatsApp
fed by:
- renewal reminders
- post-expiry recovery

Locked attribution window:
- 14 days from relevant message

#### WhatsApp Message Performance
fed by:
- all live message types

Must support:
- message volume
- send success/failure
- attributed renewals where applicable

#### Post-Expiry Performance
fed by:
- Day 0 / 3 / 7 / 14 sequence activity

#### Onboarding Performance
fed by:
- welcome
- first-visit recognition
- day-7 no-return
- day-14 low-engagement

#### Cohort Retention
must be able to compare:
- before onboarding improvement
- after onboarding improvement

#### At-Risk Members
should eventually reflect:
- weak onboarding engagement
- habit-break behavior
- attendance decline

These are the minimum required owner-facing automation reports:
- WhatsApp Message Performance
- Post-Expiry Performance
- Onboarding Performance

---

## Data Rules
Automation and reporting truth depend on clean event data.

Required fields vary by automation, but broadly include:
- member id
- organization id
- branch id
- message type
- sequence kind
- sequence step where relevant
- send timestamp
- delivery status
- stop reason where relevant

For revenue-linked automations:
- subscription id
- cycle end date
- renewal linkage

For engagement-linked automations:
- join date
- first visit date
- visit counts in relevant windows
- streak or attendance pattern inputs later
- recent imported attendance evidence where imported-member qualification is allowed

---

## Sequence Status Model
Recommended shared statuses:
- `pending`
- `sent`
- `failed`
- `stopped_manual`
- `stopped_not_eligible`

Automation-specific stopped statuses may include:
- `stopped_renewed`
- `stopped_goal_met`

Do not keep inventing unrelated status names per automation unless necessary.

---

## UX Rules

### WhatsApp control center must support
- per-automation toggles
- per-step template editing
- per-language template editing
- clear trigger explanation
- clear stopping explanation
- visibility into active sequences
- warning summaries with counts, affected members, and top causes
- grouped layout by automation purpose

### Mobile requirement
Owners/managers must be able to understand on mobile:
- what is enabled
- what is sending
- where members are dropping off
- where manual follow-up is needed

---

## Current Source-of-Truth Timing
To avoid drift, the locked timing in this document overrides older doc wording.

### Renewal reminders
- owner-selected reminder days from the supported branch options
- default branch setup is `7,3,1` unless changed by the owner

### Post-expiry recovery
- Day 0
- Day 3
- Day 7
- Day 14

### Early onboarding
- Day 0 welcome
- first successful visit recognition
- Day 7 no-return
- Day 14 low engagement

Older wording such as:
- post-expiry day 1
- onboarding day 30
should be treated as outdated unless deliberately re-approved.

### Manual stop and safety precedence
The following always win over send logic:
- do-not-contact
- deleted/merged/invalid member state
- blocked/ineligible state
- manual stop

Manual stop scope:
- per automation sequence
- not a global silence across all automations

Do-not-contact scope:
- hard block for automations and broadcasts
- one-off manual sends may still happen only via explicit manual override after warning

Manual-end rule:
- applies to recovery flows
- does not permanently silence every future automation if the member later requalifies

---

## What GymFlow Has Enough Of Right Now
The current automation set is enough for this stage.

GymFlow does not need more new categories before it:
- hardens controls
- finalizes owner management
- finalizes reporting linkage
- proves reliability on real gyms

The immediate automation universe for GymFlow is:
- welcome
- renewal reminders
- post-expiry
- onboarding
- habit-break
- streaks
- freeze-ending reminders

That is enough product surface for now.

---

## Success Standard
This automation system is only successful if it is:
- reliable
- owner-controlled
- measurable
- understandable
- not accidentally noisy

The goal is not “send more messages.”
The goal is:
- better member experience
- better owner outcomes
- better product differentiation for GymFlow
