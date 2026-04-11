# Research Log — Staff Profiles & PT Management

Topic: GymFlow staff, trainer, and PT feature  
Date: 2026-04-03

## Gap List (Final State)

[x] What UX patterns do leading gym/PT systems use for staff invite/onboarding and role-restricted navigation?  
[x] What UX patterns work best for PT package creation, assignment, and session logging on mobile?  
[x] How do competitors present trainer dashboards, remaining sessions, expiry warnings, and no-show flows?  
[x] How do gym tools model payroll/commission UX without creating ambiguity?  
[x] What scheduling depth is MVP vs overbuild for PT tools?  
[x] What user complaints exist about PT/session/staff flows and missed UX expectations?  
[x] What MENA-specific or women-only gym flows matter for trainer assignment or staff UX?  
[x] What notification nudges and thresholds are common and user-safe for PT package usage, expiry, and no-shows?  
[x] What permission-management UX patterns reduce accidental over-access or misconfiguration?  
[x] What information architecture is most common for trainer/staff mobile home screens?  
[x] What should happen when a trainer leaves or a client must transfer unused sessions to another trainer?  
[x] Which trainer-selection filters matter most in MENA and multilingual contexts beyond gender?

## Round 1

Agents: 4  
Filled: 8 / 8 original gaps  
New gaps discovered: 4

- Gap 1: FILLED
  - best pattern is email invite first, role/location scope first, restricted nav by role
- Gap 2: FILLED
  - best pattern is separate package setup from live session execution
- Gap 3: FILLED
  - competitor visibility is fragmented; there is room for a single trainer cockpit
- Gap 4: FILLED
  - payroll UX must clearly separate setup, earnings logic, and payout reporting
- Gap 5: FILLED
  - PT scheduling MVP is a reliable session lifecycle, not full optimization
- Gap 6: FILLED
  - complaints center on rigid scheduling, unclear remaining sessions, weak mobile/staff UX
- Gap 7: FILLED
  - MENA needs gender-aware assignment plus language, specialty, and privacy-aware flows
- Gap 8: FILLED
  - safest defaults are 24-hour no-show rules plus low-balance and expiry nudges

## Round 2

Agents: 4  
Filled: 4 / 4 new gaps  
New gaps discovered: 0

- Gap A: FILLED
  - permission UX should be preset-first, scoped, reviewable, and auditable
- Gap B: FILLED
  - trainer home should be schedule-first (`today agenda`) not earnings-first
- Gap C: FILLED
  - unused sessions should stay client-owned; trainer reassignment should preserve history
- Gap D: FILLED
  - beyond gender, the most important filters are language, specialty, location/format, and availability

## Final Knowledge Delta

The original spec was directionally right on business value, but wrong on scope and UX sequencing.

Most important changes forced by the research:
- make staff permission UX preset-first, not blank-slate
- keep role, location scope, and special overrides separate
- make trainer mobile home default to today’s agenda
- treat PT packages as client-owned entitlements, not trainer-owned balances
- do not put full scheduling, payroll, public trainer pages, and automation into the same MVP
- design reassignment and no-show rules upfront so package counts stay trustworthy
- add MENA filters beyond gender:
  - language
  - specialty
  - branch / location
  - shift availability
  - beginner support signals

## Totals

Rounds: 2  
Agents spawned: 8  
Gaps filled: 12 / 12  
Unfillable: 0
