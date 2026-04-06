# GymFlow Reports Optimization Roadmap
> Date: April 5, 2026
> Status: Ready for implementation
> Basis: `docs/research/gymowner-reddit-insights.md`, `docs/features/advanced-reports-research.md`, current GymFlow reports implementation in `saas-web/app/dashboard/reports/page.tsx` and `saas-web/app/api/reports/[report]/route.ts`

---

## Goal
Turn GymFlow reports from basic retrospective stats into an owner decision system that helps answer:

1. How much money is at risk right now?
2. Which members are likely to churn before they cancel?
3. Is GymFlow's WhatsApp automation actually saving revenue?
4. Which plans, staff actions, and member behaviors are helping or hurting the business?
5. Which retention workflows are working, and which are leaking money?

This roadmap is intentionally focused on **owner value**, not report count.

---

## Locked Definitions
These definitions must stay consistent across dashboard KPIs, reports, and future automations.

### Active Member
For reports v1, an `active member` means:
- has a subscription whose `end_date` is in the future
- and that subscription is currently treated as active by GymFlow

Do not redefine active member as:
- checked in within the last 30 days
- recently engaged
- not at risk

Those are separate engagement concepts and belong in retention reports, not the active-member base count.

### Revenue Saved by WhatsApp Attribution Window
For reports v1, count revenue as `saved by WhatsApp` only when:
- the member received a relevant automation message
- and the member renewed or recovered payment within `14 days` of that message

This 14-day rule is the default attribution window everywhere in reports unless a later spec explicitly changes it.

### Branch Context Rule
All reports must:
- default to the current branch context
- support an optional org-wide view for owners who manage multiple branches

When org-wide is selected:
- totals aggregate across branches
- branch comparison views should remain available where useful

### Mobile Visibility Rule
The following must be mobile-visible from the start:
- Revenue At Risk
- Revenue Saved by WhatsApp
- At-Risk Members Count
- ARPM
- Retention Rate

Large tables and dense breakdowns can stay desktop-first, but the headline KPIs and top-priority action lists must be usable on phone screens.

---

## What GymFlow Has Today
Current reports are useful but still basic:
- overview stat cards
- daily attendance stats
- hourly distribution heatmap
- top members
- denial reasons and denied entries
- expiring subscriptions
- ended subscriptions
- income views on a separate page

Main gap:
- GymFlow mostly shows **what happened**
- owners need reports that show **what is at risk**, **why it is happening**, **what to do next**, and **whether GymFlow's automations are actually preventing churn**

---

## Product Direction
GymFlow reports should be reorganized around 6 business questions:

1. `Retention`
2. `Revenue`
3. `Attendance`
4. `Automation Performance`
5. `Operations`
6. `PT / Staff` later

The reports page should stop feeling like a chart gallery and start feeling like an operating cockpit.

---

## Critical Product Gaps Adjacent To Reporting
These are not just report needs. They are product workflows that the reports must measure.

### 1. Post-Expiry Re-engagement Sequence
Reddit repeatedly validated that a structured recovery sequence can recover a meaningful share of involuntary churn.

Minimum workflow to support and then report on:
- Day 0: expiry or failed payment notice
- Day 3: reminder
- Day 7: personal-style follow-up
- Day 14: final hold / expiration follow-up

This needs:
- automation workflow support
- reporting on sent → responded → renewed → recovered revenue

### 2. First 72 Hours / Early Onboarding Retention Flow
The first 2 to 4 weeks are a critical retention window. GymFlow should eventually support and measure:
- welcome message
- first successful visit recognition
- no-return alert if no second/third visit
- 14-day low-engagement follow-up

This needs:
- onboarding automation support
- onboarding cohort reporting

### 3. Referral / Guest Invite Funnel
GymFlow already has the guest invite data model. This should become a reportable growth engine, not a hidden future idea.

Reference:
- `docs/features/guest-invite-tracking.md`
- ready data points include `inviter_member_id`, `converted_member_id`, and `converted_at`

This needs:
- invite count by member
- invite-to-visit conversion
- invite-to-paid conversion
- revenue generated from referrals

These three workflows are central because the reports alone are not enough. GymFlow needs to both **do** the retention work and **prove** that it worked.

---

## Priority Order

### Phase 1: Highest-Value Reports And KPIs
Build these first because they map directly to the strongest owner pain from Reddit and to GymFlow's best differentiators.

1. Revenue At Risk
2. Revenue Saved by WhatsApp Automation
3. Revenue by Plan Type
4. Retention Rate + Churn Rate
5. At-Risk Members
6. Failed Payments / Payment Recovery
7. ARPM on main dashboard

### Phase 2: Strong Supporting Reports
1. Cohort Retention
2. Ghost Members
3. Attendance Decline Alerts
4. Expected Revenue Next 30 Days
5. Renewal Revenue vs New Revenue
6. Cash vs Digital Revenue Split
7. Guest Invite → Referral Conversion Funnel
8. WhatsApp Message Performance by automation type

### Phase 3: Advanced Operational Reports
1. Staff performance scorecard
2. Trainer / PT scorecards
3. Weekly WhatsApp report digest
4. Revenue trend by season / period
5. Onboarding funnel performance

---

## Dashboard KPI Changes
Some metrics should not wait for a deep reports page.

### Add to Main Dashboard Early
1. `Revenue At Risk`
2. `Revenue Saved by WhatsApp`
3. `At-Risk Members Count`
4. `ARPM`
5. `Net Member Growth`

Reason:
These are the fastest “owner sees value in 10 seconds” metrics.

---

## Phase 1 Report Specs

### 1. Revenue At Risk
**Why this matters**
This is the single strongest validated pain point from the Reddit research. Owners do not know how much money they are about to lose from expiring memberships.

**What this report should show**
- total EGP value of subscriptions expiring in the next `7 / 14 / 30` days
- member count in that pool
- count and EGP value with no renewal yet
- count and EGP value already reminded by WhatsApp
- count and EGP value already renewed
- optional split by plan type

**Main screen elements**
- headline KPI card: `Revenue At Risk`
- trend card: compared to previous period
- table of expiring members with:
  - member name
  - phone
  - plan
  - expiry date
  - days left
  - amount at risk
  - reminder status
  - renewal status

**Recommended action layer**
- quick filter: `Not reminded yet`
- quick filter: `High value first`
- quick action later: `Send WhatsApp reminder`

**Data GymFlow already has**
- subscriptions
- end dates
- price paid
- member identity
- message queue / WhatsApp automation records

**Data gaps**
- a clean way to connect a renewal reminder event to a future renewal outcome window

---

### 2. Revenue Saved by WhatsApp Automation
**Why this matters**
This is GymFlow's strongest proof-of-value report. It should be built early because it helps justify GymFlow's fee every month.

**What this report should show**
- members who received renewal reminders
- how many renewed after the reminder
- EGP revenue retained
- payment recovery count and value
- reminder effectiveness by timing
- performance per automation type

**Main KPIs**
- `Revenue Saved This Month`
- `Renewals Influenced by WhatsApp`
- `Failed Payments Recovered`
- `Reminder-to-Renewal Conversion Rate`

**Breakdowns**
- by reminder timing: `7 days`, `3 days`, `1 day`
- by automation type:
  - renewal reminder
  - failed payment recovery
  - post-expiry recovery
  - welcome/onboarding later
- by plan type
- by branch

**Main table**
- automation type
- messages sent
- members reached
- renewals after message
- conversion rate
- revenue retained

**What counts as “saved” in v1**
Recommended simple rule:
- member received a relevant automation message
- member renewed or recovered payment within a defined attribution window
- count that value as influenced/saved

**Important note**
Use cautious wording in the UI:
- `Revenue Saved by WhatsApp`
- helper text: `Based on members who renewed or recovered payment after GymFlow reminders`

**Data GymFlow already has**
- message queue
- automation types
- renewals
- timestamps

**Data gaps**
- attribution rule needs to be implemented clearly and consistently

---

### 3. Revenue by Plan Type
**Why this matters**
Owners need to know which pricing structures are carrying the business.

**What this report should show**
- revenue by plan type
- active members by plan type
- renewals by plan type
- churn by plan type later
- average revenue per active member per plan later

**Main presentation**
- bar chart or table
- columns:
  - plan name
  - active members
  - total revenue
  - renewal count
  - average value

**Data GymFlow already has**
- subscriptions
- plan_months
- price_paid

**Data gaps**
- if plan labels are not explicit and only months exist, introduce a stable display grouping strategy

---

### 4. Retention Rate + Churn Rate
**Why this matters**
Owners talk about churn constantly, but most tools only show active count.

**What this report should show**
- retention rate for current month
- churn rate for current month
- comparison to previous month
- count of members lost
- EGP value lost from those members

**Recommended v1 definitions**
- `Retention Rate`: percentage of members active at start of period who are still active at end
- `Churn Rate`: percentage of members active at start of period who are no longer active at end

**Breakdowns later**
- by plan type
- by member tenure
- by gender if useful for women-only / segmented gyms
- by branch

**Data GymFlow already has**
- members
- subscriptions
- start/end dates

**Data gaps**
- formal period-based retention calculation endpoints

---

### 5. At-Risk Members
**Why this matters**
Owners repeatedly asked for a reliable report showing who has been missing sessions or quietly drifting away.

**What this report should show**
Members flagged by behavior, not just expiry.

**Risk signals for v1**
- no check-in for `X` days while still active
- attendance dropped sharply compared to previous period
- active subscription but very weak attendance in first 30 days
- failed payment / pending renewal friction
- low remaining sessions with no follow-up activity

**What each row should show**
- member name
- last visit date
- attendance trend
- subscription end date
- sessions remaining if applicable
- risk score: `low / medium / high`
- plain-English risk reason
- suggested next step

**Plain-English reason examples**
- `Has not checked in for 18 days`
- `Attendance dropped from 3 visits/week to 0 this week`
- `Subscription is active, but the member has not visited in 3 weeks`
- `Payment failed and membership may lapse`

**Recommended action layer**
- filter by risk level
- filter by reason
- filter by plan
- later quick action: `Send personal WhatsApp`

**Data GymFlow already has**
- attendance logs
- subscription status
- quotas / sessions
- member identity

**Data gaps**
- risk-scoring logic must be added in API/report layer

---

### 6. Failed Payments / Payment Recovery
**Why this matters**
Involuntary churn is a major hidden leak. Owners need a list, a value, and a recovery status.

**What this report should show**
- failed payment member list
- EGP value at risk
- age of failed payment
- recovery status
- whether a reminder was sent
- whether payment later succeeded

**Main KPIs**
- `Failed Payment Value`
- `Recovered Value`
- `Recovery Rate`
- `Oldest Unresolved Failed Payment`

**Useful filters**
- unresolved only
- high value first
- oldest first
- by plan type

**Data GymFlow already has**
- payments
- subscriptions
- WhatsApp messaging foundation

**Data gaps**
- if failed card payments are not fully modeled yet, this may need phased introduction based on available payment methods

---

### 7. ARPM
**Why this matters**
Average Revenue Per Member is a core health KPI and should not be buried deep in reports.

**What it should show**
- current ARPM
- previous period ARPM
- trend direction

**Formula**
- total revenue for the selected period ÷ active members for the selected period

**Placement**
- dashboard stat card
- revenue section secondary KPI

---

## Phase 2 Report Specs

### 8. Cohort Retention
**Why this matters**
This is more important than a late-stage nice-to-have. It tells the owner whether retention is actually improving over time.

**What it should show**
- members grouped by join month
- percentage still active after `30 / 60 / 90 / 180` days or by month buckets
- comparison between cohorts

**Why it matters in practice**
This tells the owner whether changes to onboarding, staff behavior, community, or automation actually improved retention.

---

### 9. Ghost Members
Definition:
- members with active subscriptions who have not checked in for a worrying period

Why:
- they are often the highest churn risk because they are paying but disengaged

---

### 10. Attendance Decline Alerts
Definition:
- members whose visit frequency is materially lower than their recent baseline

Why:
- leading indicator for churn

---

### 11. Expected Revenue Next 30 Days
Definition:
- likely cash coming from currently active subscriptions and expected renewals

Why:
- owners need near-future cash visibility, not just historical totals

---

### 12. Renewal Revenue vs New Revenue
Definition:
- how much of this month’s revenue came from keeping members versus acquiring new ones

Why:
- helps owners understand whether they are growing or just replacing churn

---

### 13. Cash vs Digital Revenue Split
Definition:
- total income broken down by payment method

Why:
- especially important in Egypt and MENA for reconciliation and owner trust

---

### 14. Guest Invite → Referral Conversion Funnel
**Why this matters**
Referrals are repeatedly validated as the best leads. GymFlow already has the data foundation for this.

**What this report should show**
- invites sent by member
- invites used
- guest visits created
- guest-to-member conversions
- revenue generated from converted referrals
- top inviters

**Main views**
- top referring members
- invite-to-paid conversion rate
- referral-generated revenue
- branch-wide referral funnel

**Data GymFlow already has**
- guest invite tracking foundation
- inviter member linkage
- guest conversion linkage

**Data gaps**
- reporting joins and a clean definition for referral-attributed revenue

---

### 15. WhatsApp Message Performance
**Why this matters**
This should not stay as a vague future idea. Owners will talk about this if it is clear and convincing.

**What this report should show**
By automation type:
- messages sent
- members reached
- response or outcome proxy
- renewals after message
- recovered payment value
- revenue retained

**Automation types to track**
- renewal reminders
- failed payment recovery
- post-expiry recovery
- onboarding sequence later

---

## Phase 3 Report Specs

### 16. Staff Performance Scorecard
For owner/manager only.

Suggested metrics:
- renewals handled
- payment follow-ups completed
- check-ins processed
- conversion-related activity later

### 17. Trainer / PT Scorecards
Only after PT feature is live.

Suggested metrics:
- PT revenue per trainer
- session completion rate
- client adherence
- package renewal rate
- clients at risk by trainer

Dependency bridge from `docs/features/staff-and-pt-profiles.md`:
- `member_trainer_assignments.trainer_id` unlocks assigned-client and retention-by-trainer views
- `pt_packages.assigned_trainer_id`, `price_paid`, `valid_from`, `valid_until`, `status` unlock PT package revenue, active PT load, and PT renewal opportunities
- `pt_sessions.trainer_id`, `status`, `scheduled_at`, `completed_at` unlock completion rate, no-show rate, and adherence reporting
- `pt_earnings.trainer_id`, `payout_amount`, `created_at` unlock trainer earnings and margin visibility
- PT WhatsApp nudges must be live before GymFlow can report `PT revenue saved by WhatsApp`

### 18. Weekly WhatsApp Digest
A short owner digest delivered by WhatsApp with:
- retention rate
- revenue at risk
- top 3 at-risk members or segments
- failed payment total
- revenue saved by WhatsApp

This should be concise and action-oriented.

### 19. Onboarding Funnel Performance
This is where the “First 72 Hours” flow becomes measurable.

Suggested measures:
- new members who checked in within first 3 days
- members who completed 3 visits in first 14 days
- no-return rate after first visit
- retention by onboarding cohort

---

## Retention Automation Dependencies
These are not optional forever. Some of the highest-value reports depend on these flows existing.

### A. Post-Expiry Recovery Workflow
This workflow has enough logic and edge cases that it must have its own implementation spec:
- `docs/features/post-expiry-reengagement-sequence.md`

Locked minimum sequence:
1. Day 0 expiry or payment failure message
2. Day 3 follow-up
3. Day 7 follow-up
4. Day 14 final recovery attempt

Reports that depend on it:
- Revenue Saved by WhatsApp
- Failed Payments / Payment Recovery
- WhatsApp Message Performance

### B. First 72 Hours / Early Onboarding Workflow
Recommended minimum sequence:
1. welcome message on join
2. recognition after first check-in
3. no-return warning after missed early visits
4. 14-day check-in for low-engagement members

This workflow now has its own implementation spec:
- `docs/features/early-onboarding-retention-sequence.md`

Reports that depend on it:
- Cohort Retention
- At-Risk Members
- Onboarding Funnel Performance

### C. Referral / Guest Invite Workflow
Reports that depend on it:
- Guest Invite → Referral Conversion Funnel
- referral-attributed revenue views later

---

## Recommended Reports Page Structure

### Section 1: Retention
- Revenue At Risk
- At-Risk Members
- Revenue Saved by WhatsApp
- Retention Rate
- Churn Rate
- Cohort Retention
- Ghost Members

### Section 2: Revenue
- Revenue by Plan Type
- Renewal vs New Revenue
- Failed Payments
- Expected Revenue Next 30 Days
- Cash vs Digital Revenue Split
- ARPM
- Referral Revenue

### Section 3: Attendance
- Daily stats
- Hourly distribution
- Attendance decline alerts
- Top members
- Check-in method breakdown later

### Section 4: Automation Performance
- WhatsApp message performance
- post-expiry recovery performance
- onboarding sequence performance later

### Section 5: Operations
- Expiring subscriptions
- Ended subscriptions
- Denial reasons
- Denied entries

### Section 6: PT / Staff
- Staff scorecards later
- Trainer/PT scorecards later

---

## Implementation Roadmap

### Sprint 1
1. Revenue At Risk
2. Revenue Saved by WhatsApp Automation
3. Revenue by Plan Type
4. ARPM on main dashboard

Reason:
- fastest owner-visible business value
- strongest proof that GymFlow is protecting revenue
- directly tied to owner willingness to keep paying for GymFlow

### Sprint 2
1. Retention Rate + Churn Rate
2. At-Risk Members
3. Cohort Retention
4. WhatsApp Message Performance

Reason:
- turns GymFlow into a retention intelligence tool, not just a reporting screen

### Sprint 3
1. Failed Payments / Payment Recovery
2. Ghost Members
3. Attendance Decline Alerts
4. Guest Invite → Referral Conversion Funnel

Reason:
- captures both revenue leak and best source of new high-quality members

### Sprint 4
1. Expected Revenue Next 30 Days
2. Renewal Revenue vs New Revenue
3. Cash vs Digital split
4. Weekly WhatsApp digest

### Later, after staff/PT features are live
1. Staff scorecards
2. Trainer/PT scorecards
3. Onboarding funnel performance

---

## Data Readiness Summary

### Already available or mostly available
- subscriptions
- end dates
- start dates
- member identity
- attendance logs
- denial reasons
- revenue events
- payment history
- WhatsApp queue/events foundation
- guest invite conversion foundation
- guest invite referral fields from `docs/features/guest-invite-tracking.md`

### Needs new logic, not necessarily new core entities
- retention rate calculations
- churn rate calculations
- attendance decline scoring
- at-risk scoring
- renewal reminder attribution window
- revenue-saved attribution model
- projected next-month revenue model
- cohort retention calculations
- referral-attributed revenue logic

### Likely future data dependencies
- richer failed payment state tracking if digital payment recovery becomes deeper
- staff action attribution
- PT session lifecycle and package ownership data
- onboarding sequence event tracking
- PT trainer-linked fields defined in `docs/features/staff-and-pt-profiles.md`

---

## UX Rules For These Reports

1. Show money in EGP prominently.
2. Use plain-English labels, not analytics jargon.
3. Every risky list should suggest a next action.
4. Avoid dense BI dashboards.
5. Default to owner questions, not technical metrics.
6. Prefer reliable simple formulas over clever but fragile models.
7. Report accuracy matters more than report count.
8. Put proof-of-value metrics on the dashboard, not deep in tabs.
9. Default all reports to current branch, with an org-wide toggle for owners.
10. Make top KPIs and urgent action lists mobile-usable from day one.
11. Treat large tables, detailed comparisons, and exports as desktop-first.

---

## Plain-English Copy Direction

Examples of good report labels:
- `Revenue At Risk`
- `Members Likely To Churn`
- `Revenue Saved by WhatsApp`
- `Failed Payments To Recover`
- `Renewal Revenue vs New Revenue`
- `Paying But Not Showing Up`
- `Referral Revenue`
- `Messages Sent → Renewals Won`

Avoid labels like:
- `Behavioral Segmentation Matrix`
- `Lifecycle Attrition Model`
- `Predictive Retention Delta`

Gym owners need clarity, not data science branding.

---

## Success Criteria
This roadmap is working if a gym owner can open GymFlow and answer these in under 5 minutes:

1. How much membership revenue is at risk right now?
2. Which members should I follow up with today?
3. Is retention improving or getting worse?
4. Is GymFlow automation helping recover money?
5. Which plans are actually making us money?
6. Are referrals creating real revenue?
7. Are new members sticking after their first weeks?

If the reports do not help answer those questions quickly, they are still too basic.

### Phase 1 Done Signals
- [ ] Owner can see `Revenue At Risk` for current branch without opening a second screen
- [ ] Owner can see `Revenue Saved by WhatsApp` using the locked 14-day attribution window
- [ ] Owner can compare revenue by plan type in plain English
- [ ] Owner can see `ARPM` on the main dashboard on both desktop and mobile

### Phase 2 Done Signals
- [ ] Owner can see current retention rate and churn rate using the locked active-member definition
- [ ] Owner can open `At-Risk Members` and understand why each member is flagged
- [ ] Owner can compare retention by join cohort
- [ ] Owner can see WhatsApp performance by automation type
- [ ] Owner can see guest invite → referral conversion and referral-generated revenue

### Phase 3 Done Signals
- [ ] Owner can see failed payment recovery clearly
- [ ] Owner can spot paying-but-not-showing members
- [ ] Owner can see attendance decline alerts without false complexity
- [ ] Weekly digest surfaces the most important revenue and retention signals clearly

---

## Release Strategy

### Minimum shippable release
Sprint 1 is shippable by itself if these four items are solid:
1. Revenue At Risk
2. Revenue Saved by WhatsApp Automation
3. Revenue by Plan Type
4. ARPM on main dashboard

This is the first release because it already answers the clearest money questions.

### Rollout rule
- ship each sprint independently once its numbers are stable and understandable
- do not wait for the entire roadmap to land before releasing owner-visible value
- if attribution or risk logic is still soft, ship with plain helper text instead of pretending certainty

### Feature-flag guidance
- keep new reports behind a simple internal flag until numbers are verified against real customer data
- remove the flag once branch-level and org-wide totals are trusted
- keep lifecycle automations hard-disabled in production until explicitly approved
- allowed live automations right now are only:
  - welcome
  - existing renewal reminders

### Dependency note
- PT / trainer reports stay blocked until the PT feature data model is live
- post-expiry and onboarding performance reports should ship only when their underlying automations exist
- `docs/features/future_reports.md` should be treated as legacy backlog notes, not the implementation source of truth for reports
