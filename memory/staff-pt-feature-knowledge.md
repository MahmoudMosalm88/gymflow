# Staff & PT Feature Knowledge

> Autoresearch: 2 rounds, 8 agents, 2026-04-03

## Findings

### Staff access and permission UX
- Use role presets first, not blank-slate permissions.
- Keep role, branch scope, and per-permission overrides separate.
- Invite flow should include a review step, pending state, resend/edit/cancel, and auditability.
- Mimic/impersonation is useful for support, but only if separately permissioned and audited.

### Trainer-facing UX
- Trainer mobile home should default to `Today` / agenda, not earnings.
- The first screen should show today’s sessions, quick actions, and action-needed alerts.
- Competitors fragment trainer visibility across schedule, member detail, and policy views; GymFlow can win by combining those into a cleaner trainer cockpit.

### PT package and session model
- PT packages should be client-owned entitlements, not trainer-owned balances.
- Package setup/sale and session execution should be separate workflows.
- Session completion should be one tap plus optional note.
- No-show and late-cancel outcomes must show whether a session will be deducted before confirm.

### Scheduling scope
- Scheduling MVP should cover:
  - trainer availability
  - recurring slots
  - exceptions/time off
  - staff/trainer booking
  - conflict prevention
  - cancellation rules
  - reminders
- Do not start with full optimizer logic, AI scheduling, or marketplace behavior.

### Trainer reassignment
- When a trainer leaves, future sessions should be reassigned.
- Historical sessions, payroll, and reporting must remain untouched.
- Unused sessions usually stay with the client inside the same business/account.

### MENA-specific trainer matching
- Important filters are:
  - gender
  - language
  - specialty
  - branch / location / format
  - availability
- Beginner support is better shown as badges and onboarding signals than a single checkbox.

### Notification defaults
- Safe default no-show/cancel cutoff is 24 hours.
- Low-balance nudge should trigger at the last 25% or last 1-3 sessions.
- Expiry warnings should trigger at 7 days for short packages, and 30 + 7 days for longer-running ones.

### Activation flow
- For GymFlow, staff and trainer activation should be WhatsApp-first, not email-first.
- Owner should add phone number first, GymFlow should send the invite link automatically on WhatsApp, and the user should activate in the browser before seeing a PWA install prompt.
- Do not force PWA install before login.

## Surprises
- The biggest UX weakness in competitors is not “missing advanced features.” It is unclear remaining-session truth and fragmented staff mobile flows.
- The research strongly supports breaking the original feature into phases; the original single-batch spec was too wide.

## Sources
- `docs/features/staff-and-pt-profiles-research-log.md`
- `memory/staff-pt-feature-round1.md`
- `memory/staff-pt-feature-round2.md`
