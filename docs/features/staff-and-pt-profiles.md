# Feature Spec: Staff Profiles & Personal Trainer Management

> Status: Researched and re-scoped
> Priority: High — directly unlocks premium gyms and PT-heavy operators
> Date: April 2026
> Research log: `docs/features/staff-and-pt-profiles-research-log.md`
> Raw findings: `memory/staff-pt-feature-round1.md`, `memory/staff-pt-feature-round2.md`

---

## Why This Matters

PT is not a side feature for premium gyms. It is a core revenue stream, a retention tool, and a daily operational workflow.

The original direction was right, but the old scope mixed too many systems together:
- staff auth and permissions
- trainer profiles
- PT packages and sessions
- scheduling
- payroll
- public trainer pages
- WhatsApp automation

Research says that is the wrong build order.

The better approach is:
1. get staff access right
2. get trainer workflows right
3. get package/session truth right
4. then layer scheduling, payroll, and automation

---

## Research-Backed Product Decisions

These are the decisions this spec now locks in.

### 1. Staff access is preset-first, not blank-slate

The owner should not build permissions from scratch.

Default pattern:
- pick a role preset
- assign branch/location scope
- apply a few bounded overrides only if needed

Reason:
- this reduces over-access
- this matches the safest admin UX patterns in mature systems
- it is much easier to support and audit

### 2. Trainer home is schedule-first

The trainer dashboard should open on:
- `Today`
- not `earnings`
- not `all clients`
- not `settings`

The trainer's first screen should answer:
- who am I training today?
- what needs action now?
- which clients are about to run out of sessions?

### 3. PT packages belong to the client, not the trainer

Unused sessions are a client-owned entitlement.

That means:
- trainer assignment can change
- session history must remain intact
- package balance must survive trainer reassignment
- payroll history must not be corrupted when a trainer leaves

This is a critical design rule.

### 4. Package sale and session execution are separate workflows

Best pattern:
- package setup/sale is an admin or front-desk workflow
- session logging/completion is a trainer workflow

Do not merge them into one overloaded form.

### 5. MENA trainer matching needs more than gender

Gender is important, but it is not enough.

Trainer selection and assignment should support:
- gender
- language
- specialty / goal fit
- branch or area
- availability window
- beginner-friendly support signals

### 6. Scheduling MVP should stay small

Do not build a universal scheduling engine first.

Scheduling MVP should support:
- trainer availability
- simple weekly recurring slots
- time-off / exceptions
- staff-booked or trainer-booked sessions
- one-to-one appointments
- conflict prevention
- cancellation and no-show rules
- reminder hooks

Do not put these in MVP:
- AI scheduling
- cross-branch optimizer
- assistant coach complexity
- payroll-first scheduling logic
- public booking marketplace behavior

### 7. Staff and trainer activation should be WhatsApp-first

For GymFlow, the activation channel should be WhatsApp before email.

Reason:
- gym owners already collect phone numbers
- staff and trainers are highly mobile-first
- WhatsApp is already part of GymFlow's operational stack
- sending an invite by WhatsApp removes one adoption step

Locked flow:
1. owner adds staff or trainer with phone number
2. GymFlow generates a single-use invite link
3. GymFlow sends that link automatically over WhatsApp
4. user opens the link in the browser
5. user accepts the invite and creates/signs into their account
6. only after login do we prompt PWA install

Do not force PWA install before login.
That adds friction and lowers activation success.

---

## What We're Building

This feature is now split into 5 layers.

1. **Staff Foundation**
- staff users
- invites
- restricted roles
- route and nav guards

2. **Trainer Foundation**
- trainer profiles
- member-to-trainer assignment
- trainer-scoped client access

3. **PT Core Engine**
- PT packages
- PT sessions
- completion / no-show / cancellation
- reliable remaining-session math

4. **PT Operations Layer**
- trainer schedule
- trainer home dashboard
- package alerts
- owner PT oversight

5. **Automation and Payroll Layer**
- WhatsApp nudges
- trainer earnings tracking
- owner payroll summaries

Public trainer pages are later phase, not core MVP.

---

## Roles & Navigation

### Role presets

```
Owner
Manager
Staff
Trainer
```

### Permission model

Role decides the default surface.
Scope decides where it applies.
Overrides adjust edge cases.

This means permission setup is 3-step, not one flat matrix.

1. Role preset
2. Branch/location scope
3. Optional overrides

### Default navigation by role

| Surface | Owner | Manager | Staff | Trainer |
|---|---|---|---|---|
| Dashboard | Full | Full ops | Ops only | Trainer home |
| Members | All | All | All | Assigned only |
| Subscriptions | Yes | Yes | Yes | No |
| Income | Yes | Optional | No | Own earnings later only |
| Reports | Yes | Optional subset | No | No |
| WhatsApp | Yes | Optional | No | No |
| Team | Yes | Optional | No | No |
| PT | Yes | Yes | Limited | Yes |
| Settings | Yes | Limited | No | No |

### Permission UX rules

- The invite flow must show a summary before send.
- Pending invites must be editable and cancelable.
- High-risk access should never be silently granted.
- Mimic/impersonation, if added, must be separately permissioned and audited.
- Cross-branch access must be explicit, not implied by role.

---

## User Flows

## 1. Invite a staff member

Owner flow:
1. Open `Settings -> Team`
2. Click `Invite staff`
3. Enter:
   - name
   - phone
   - optional email
   - role preset
   - branch scope
4. Review invite summary
5. Send invite

System behavior:
- creates pending staff record
- generates a single-use invite link with expiry
- sends the invite over WhatsApp automatically
- pending invite can be resent, edited, or canceled

### UX note
Keep the first version simple:
- one preset picker
- one branch selector
- one small advanced section for extra permissions
- a clear delivery state:
  - pending
  - sent
  - opened
  - accepted

## 2. Invite a trainer

Same flow as staff, plus trainer-specific fields:
- gender
- languages
- specialties
- bio
- certifications
- optional payout settings

Do not force the full trainer profile at invite time.
Use staged completion:
- invite first
- complete profile second

## Invite delivery and activation UX

### WhatsApp invite message

The invite message should be short and operational:
- gym name
- invited role
- activation link
- expiry note

Example:
- `You have been added to GymFlow for [Gym Name] as a Trainer. Tap this link to activate your account: [link].`

### Invite acceptance page

The invite page should:
- explain which gym invited the user
- show the invited role
- let the user create or complete login
- detect in-app browsers where possible
- recommend opening in Safari or Chrome if the embedded browser is weak

### PWA install timing

Install prompt should happen after successful activation/login, not before.

Correct order:
1. receive WhatsApp invite
2. open browser link
3. activate account
4. land inside dashboard
5. show install prompt

Wrong order:
1. invite
2. force app install
3. then ask for login

That wrong order should not be built.

## 3. Trainer first login

Trainer should land on `Today`, not a generic dashboard.

First screen should show:
- today’s sessions
- quick actions:
  - start session
  - mark complete
  - mark no-show
  - reschedule
- alerts:
  - low sessions remaining
  - package expiring soon

This is mobile-first.

## 4. Sell a PT package to a member

Front-desk or manager flow from the member page:
1. Open member
2. Open `PT`
3. Click `Add package`
4. Choose:
   - trainer
   - total sessions
   - validity window
   - price
   - optional notes
5. Save package

System behavior:
- package is created against the member
- trainer is assigned to the package
- sessions remaining starts from the package total

### UX rule
This is not a schedule form.
This is a package/entitlement form.

## 5. Mark a session complete

Trainer flow:
1. Open `Today`
2. Tap the session
3. Tap `Complete`
4. Optional note
5. Save

System behavior:
- session record becomes `completed`
- package remaining decrements by 1
- trainer earnings record is generated if payout is enabled
- low-balance and expiry checks run after completion

### UX rule
This must be one tap plus optional note.
Do not bury it inside a large edit form.

## 6. No-show or late cancel

Trainer or manager flow:
1. Open the scheduled session
2. Mark `No-show` or `Late cancel`
3. System applies branch policy:
   - deduct session
   - or do not deduct
4. Member is notified later if nudges are enabled

### UX rule
The policy effect must be visible before confirm.
Example:
- `This will deduct 1 session from the package`
- `This will not deduct from the package`

## 7. Trainer leaves or reassignment is needed

Manager flow:
1. Deactivate trainer
2. System detects:
   - active packages assigned to that trainer
   - future sessions assigned to that trainer
3. Manager is forced through a reassignment flow
4. Manager chooses replacement trainer
5. Future sessions move
6. Historical sessions stay untouched

### Locked rule
- history never moves
- client package stays with the client
- only the current/future trainer assignment changes

---

## Data Model

### `staff_users`

```sql
staff_users
  id
  organization_id
  branch_id
  firebase_uid
  name
  email
  phone
  role                -- manager | staff | trainer
  is_active
  invited_at
  accepted_at
  created_at
```

### `staff_profiles`

Keep trainer-specific and profile-heavy fields out of the core auth row.

```sql
staff_profiles
  staff_user_id
  gender
  languages           -- text[]
  specializations     -- text[]
  photo_path
  bio
  certifications      -- text[]
  beginner_friendly   -- boolean
```

### `staff_permission_overrides`

Use explicit overrides rather than a giant role enum explosion.

```sql
staff_permission_overrides
  id
  staff_user_id
  permission_key
  effect              -- allow | deny
```

### `member_trainer_assignments`

```sql
member_trainer_assignments
  id
  organization_id
  branch_id
  member_id
  trainer_id
  is_primary
  assigned_at
  ended_at
```

### `pt_packages`

Packages are client-owned entitlements.

```sql
pt_packages
  id
  organization_id
  branch_id
  member_id
  assigned_trainer_id
  total_sessions
  sessions_used
  price_paid
  valid_from
  valid_until
  status              -- active | exhausted | expired | cancelled
  created_at
```

### `pt_sessions`

```sql
pt_sessions
  id
  organization_id
  branch_id
  package_id
  member_id
  trainer_id
  scheduled_at
  completed_at
  status              -- scheduled | completed | no_show | late_cancel | cancelled
  deducts_session     -- boolean snapshot of the applied rule
  notes
  created_at
```

### `pt_earnings`

Keep money logic separate from session rows.

```sql
pt_earnings
  id
  organization_id
  branch_id
  trainer_id
  pt_session_id
  model               -- flat | percentage
  base_amount
  payout_amount
  created_at
```

### `trainer_availability` (later phase)

Do not make availability a phase-1 blocker.

---

## PT UX Defaults

### Trainer home

Default sections in order:
1. Today’s sessions
2. Action-needed alerts
3. Low-session clients
4. Upcoming sessions
5. Earnings snapshot later

### Member PT card

The member page should show:
- assigned trainer
- sessions remaining
- expiry date
- last session
- next session if scheduled
- quick actions:
  - add package
  - log session
  - reassign trainer

### Trainer selection filters

Required filters for MENA-aware assignment:
- gender
- language
- specialty
- branch / location
- availability window

Recommended display badges:
- beginner-friendly
- women-only suitable
- rehab / post-injury
- weight loss
- strength
- boxing / martial arts
- prenatal / postnatal if supported

---

## Notifications and Nudges

Not phase 1.
But the default policy should already be designed now.

### Recommended defaults

- Session reminder: 24 hours before
- Optional same-day reminder: a few hours before
- Low-balance nudge: last 25% or last 1-3 sessions
- Expiry warning: 7 days before for short packages
- No-show rule: 24-hour cutoff by default

### WhatsApp scope later

Phase-later WhatsApp events:
- session reminder
- low sessions remaining
- package expired
- no-show follow-up
- trainer reassignment notice if needed

Keep quiet hours and opt-out handling in the design from the start.

---

## Implementation Phases

### Phase 1: Staff foundation
- `staff_users`
- `staff_invites`
- invite flow
- WhatsApp invite send
- role presets
- branch scope
- restricted nav and route guards
- team management page
- invite acceptance page
- resend / cancel invite actions

### Phase 2: Trainer foundation
- trainer profile fields
- trainer assignment to members
- trainer-scoped client list
- member page PT card

### Phase 3: PT core engine
- `pt_packages`
- `pt_sessions`
- add package
- complete session
- no-show / cancellation
- reliable remaining-session math
- reassignment-safe data model

### Phase 4: Trainer operations UX
- trainer mobile `Today` home
- basic schedule/agenda
- future session list
- low-balance and expiry alerts in UI
- trainer reassignment flow when staff leave

### Phase 5: Earnings and automation
- payout model setup
- `pt_earnings`
- owner payroll summary
- trainer earnings view
- WhatsApp nudges

### Phase 6: Public pages and growth extras
- public trainer profiles
- trainer profile slugs
- marketing-friendly presentation
- advanced filters and discovery

---

## What Is Explicitly Not MVP

Do not treat these as first-batch requirements:
- public trainer pages
- AI scheduling
- assistant coach logic
- advanced payroll export system
- full self-service client booking marketplace
- cross-business trainer/client transfer
- complex multi-trainer package sharing

---

## Success Criteria

### Staff foundation
- [ ] Owner can invite staff by email
- [ ] Pending invites can be reviewed, resent, edited, or canceled
- [ ] Staff navigation is restricted correctly by role and branch

### Trainer foundation
- [ ] Owner can create trainer profiles with language, specialty, and gender data
- [ ] Member can be assigned to a trainer cleanly
- [ ] Trainer sees only assigned clients by default

### PT core engine
- [ ] PT package can be sold from the member page
- [ ] Trainer can complete a session in one tap plus optional note
- [ ] Remaining sessions stay correct across no-show, cancel, and reassignment cases
- [ ] Reassigning a trainer does not corrupt historical records

### Later layers
- [ ] Trainer sees a schedule-first home
- [ ] Low-balance and expiry warnings appear in UI
- [ ] Earnings are tracked from immutable session completion records
- [ ] WhatsApp nudges are triggered from PT package/session events

---

## Bottom Line

This feature should not be built as one giant PT module.

The right sequence is:
1. staff access
2. trainer assignment
3. PT package/session truth
4. trainer operations UX
5. earnings and WhatsApp automation
6. public trainer pages

That is the version that is both sellable and buildable.
