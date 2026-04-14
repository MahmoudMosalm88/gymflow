# Import-Led Onboarding Plan
> Date: April 12, 2026
> Status: Ready for implementation planning
> Related:
> - `docs/features/whatsapp-automation-source-of-truth.md`
> - `docs/features/reports-optimization-roadmap.md`
> - `docs/project-memory.md`

---

## Why This Matters
If a gym owner is moving from another system, onboarding is not just:
- create account
- add first branch
- start using the dashboard

For most real gyms, onboarding means:
- bring members over
- preserve active subscriptions
- avoid duplicate/dirty data
- know what will happen to WhatsApp automations
- know when it is safe to start using GymFlow live

If this migration step is weak, activation breaks.

The import experience should make the owner feel:
- "I know what data will come in"
- "I know what will not come in"
- "I can preview before I commit"
- "I can go live without breaking members, reminders, or revenue tracking"

---

## Current State In GymFlow
Current web import behavior is much narrower than the onboarding need:

- `/dashboard/import` just redirects to settings
- web import APIs are built around **desktop DB migration**
- current flow is:
  1. upload desktop `.db`
  2. validate counts
  3. replace branch from archive

That is useful for:
- GymFlow desktop -> GymFlow web migration

It is not enough for:
- CSV migration from other gym software
- spreadsheet-based onboarding
- gradual migration with preview and reconciliation

External benchmark signal:
- competitors commonly position migration as a switching workflow, not a generic admin upload
- at least some vendors support concierge migration from exported Excel/CSV/PDF/text files
- source: Fitli migration help

---

## Product Goal
Build an onboarding import flow that lets a gym owner move into GymFlow with confidence.

That means supporting:
1. first-time gym setup
2. migration from spreadsheet/other software
3. preview before commit
4. clear go-live readiness

The owner should finish onboarding knowing:
- members imported correctly
- active plans look correct
- balances are understandable
- WhatsApp won’t blast the wrong people
- front desk can start using GymFlow safely

---

## Core Product Principle
Import is not a single upload button.

It is a guided migration workflow with 4 layers:
1. business setup
2. data import
3. validation and reconciliation
4. go-live activation

This should be part of onboarding, not hidden as an isolated admin tool.

---

## Jobs To Be Done
### Owner jobs
- bring active members into GymFlow fast
- avoid retyping data
- preserve active subscription state
- know who failed import and why
- understand what still needs manual cleanup
- go live without breaking WhatsApp or attendance

### Front desk jobs
- search imported members immediately
- see correct names, phones, plans, expiry dates
- avoid duplicate members

### GymFlow jobs
- keep imported data clean enough for:
  - check-ins
  - reminders
  - reports
  - onboarding automations later

---

## Recommended User Flow
## Phase 1: Account + gym setup
Owner finishes:
- owner name
- organization name
- branch name
- branch country/timezone
- primary WhatsApp policy defaults

Then show:
- `How are you moving into GymFlow?`

Choices:
1. `Starting fresh`
2. `Import from spreadsheet`
3. `Move from GymFlow desktop backup`
4. later: `Migrate from another gym software`

For now, the main operational path should be:
- `Import from spreadsheet`
- `Move from GymFlow desktop backup`

---

## Phase 2: Import source choice
### Option A: Spreadsheet import
This should be the main path for most migrations.

Supported first:
- CSV
- XLSX

Import templates:
1. members only
2. members + active subscription
3. members + active subscription + balance

### Option B: GymFlow desktop backup
Keep the current archive-based import path, but surface it inside onboarding instead of hiding it behind backend APIs.

### Option C: Concierge migration later
Offer a support-assisted fallback where the owner can upload a raw export and request GymFlow help.

This should not block self-serve import MVP, but it should exist as a productized fallback path because the market already conditions owners to expect migration help.

---

## Phase 3: Mapping and normalization
For spreadsheet import, the system must support column mapping.

Required import targets:
- member name
- phone
- gender

Recommended import targets:
- join date
- date of birth
- notes
- current plan months
- current subscription start
- current subscription end
- total amount paid
- remaining sessions if applicable later
- card code if available

The owner should map columns through a UI instead of being forced into one exact template only.

Normalization rules:
- phone normalization to E.164 where possible
- Arabic digit normalization
- trim spaces
- collapse duplicate whitespace
- normalize common date formats

Validation should classify rows as:
- valid
- valid with warning
- invalid

---

## Phase 4: Preview before import
This is the most important step.

The preview must show:
- total rows
- valid rows
- warning rows
- invalid rows
- duplicates detected
- rows missing required data

The preview must also show business impact:
- members to create
- active subscriptions to create
- rows that will need manual follow-up

This screen should answer:
- "What will happen if I import now?"

Not just:
- "How many rows were parsed?"

---

## Phase 5: Reconciliation choices
Before committing, the owner should choose how GymFlow handles duplicates.

Required duplicate modes:
1. `Skip duplicates`
2. `Create only new members`
3. later: `Merge into existing members`

Duplicate matching heuristics:
- primary: exact normalized phone
- secondary: exact card code
- later: name + phone similarity warning only

Do not auto-merge on fuzzy name matching in v1.

That is too risky.

---

## Phase 6: Import commit
When the owner confirms:
- create members
- create active subscriptions if supplied
- store raw artifact
- store validation report
- store import job result

Important rule:
- import must be additive by default for spreadsheet imports
- not branch-replacing

The current desktop-backup path can stay destructive/replace-branch if explicitly labeled.
But spreadsheet onboarding import must not wipe the branch.

Why:
- spreadsheet onboarding is usually a first live-data load
- owners expect “bring data in,” not “replace my branch”
- destructive replacement is only defensible for GymFlow desktop backup migration where the archive is authoritative

---

## Phase 7: Post-import reconciliation
After import, show a completion screen with:
- imported successfully
- skipped duplicates
- failed rows
- warning rows requiring attention

Then give next actions:
1. review members with warnings
2. review imported subscriptions ending soon
3. connect WhatsApp
4. send first operational test message
5. print/test QR codes
6. start go-live checklist

This is where onboarding and operations should meet.

---

## Data Scope For V1
## Must support in v1
- members
- phones
- notes
- card code if present
- one active subscription per row
- subscription start date
- subscription end date
- plan duration / plan months
- amount paid

## Should support in v1 if low-risk
- member join date
- date of birth
- gender
- branch notes

## Do not support in v1
- historical attendance import
- historical payment ledger reconstruction
- frozen plan history
- PT data
- referral history
- multi-package PT import
- complex family billing

The v1 goal is:
- operational go-live

Not:
- perfect historical analytics parity

---

## Subscription Import Rules
This matters because imported subscriptions affect:
- reminders
- reports
- revenue-at-risk later
- onboarding exclusions

Rules:
1. imported active subscriptions should create a proper subscription cycle row
2. imported legacy members must be marked in a way that excludes them from new-member onboarding automations
3. imported subscriptions should not trigger welcome/onboarding flows by accident
4. renewal reminders should work from the imported end date going forward

Recommended metadata:
- `source = import_csv | import_desktop`
- `import_job_id`
- optional `is_legacy_import = true`

Important non-goal:
- do not attempt full historical payment-ledger reconstruction in v1
- import current commercial truth, not perfect historical analytics parity

---

## Payment Migration Rule
Stored payment methods and recurring billing credentials are a separate migration problem.

Do not treat these as part of the same spreadsheet import flow.

For v1:
- import members
- import active subscription state
- import known paid amount / outstanding balance if available
- do not promise card token migration

Post-import, the owner should choose one of:
1. manually collect payment methods again
2. provider-assisted migration later
3. disable recurring billing until collection is complete

This needs its own UX track after member import, not hidden inside row mapping.

---

## WhatsApp Safety Rules
Import onboarding can create dangerous automation mistakes if not controlled.

For imported members:
- do not auto-send welcome/onboarding sequences
- do not backfill lifecycle automations
- do allow future renewal reminders once the imported subscription is active and eligible

Owner must see an explicit toggle:
- `Do not send any messages to imported members during setup`

Default in onboarding should be:
- ON

This is the safest behavior.

This rule is not optional. Imported legacy members must not enter the new-member onboarding sequence by mistake.

---

## UX Design Recommendation
The onboarding/import flow should feel like a guided checklist, not a technical migration console.

Recommended stepper:
1. Gym setup
2. Choose import source
3. Upload file
4. Map columns
5. Preview and fix issues
6. Import
7. Go-live checklist

Key UI principles:
- show progress clearly
- show what GymFlow understood from the file
- explain warnings in plain English
- never hide destructive behavior
- always allow downloading failed rows/errors

---

## Go-Live Checklist
After import, the owner should not be left alone.

Show a final checklist:
- [ ] Members imported correctly
- [ ] Active plans reviewed
- [ ] Duplicate rows resolved
- [ ] WhatsApp connected
- [ ] Reminder days reviewed
- [ ] Front desk tested search and check-in
- [ ] One test member reminder verified

This is the real activation moment.

Recommended final CTA:
- `Start using GymFlow live`

Do not end the onboarding with just:
- `Import complete`

---

## Implementation Phases
## Phase A: spreadsheet import MVP
- add onboarding source choice
- add CSV/XLSX upload
- add mapping UI
- add validation UI
- additive import for members + active subscriptions
- duplicate skip mode
- post-import summary
- WhatsApp-safe import flags

## Phase B: reconciliation and trust
- downloadable error report
- warnings queue
- duplicate review screen
- imported-member health panel

## Phase C: migration acceleration
- competitor-specific templates
  - Mindbody export
  - PushPress export
  - Wellyx export
  - generic Excel
- import assistant copy/help
- concierge migration mode later

---

## Technical Notes
Current import APIs are centered on archive replacement:
- `POST /api/migration/upload`
- `POST /api/migration/validate`
- `POST /api/migration/execute`

Recommended new API family for spreadsheet onboarding:
- `POST /api/imports/upload`
- `POST /api/imports/preview`
- `POST /api/imports/execute`
- `POST /api/imports/resolve-duplicates` later

Keep desktop migration separate from spreadsheet onboarding.

Do not overload both flows into one endpoint family.

---

## Success Criteria
- [ ] Owner can import a spreadsheet of members without manual DB support
- [ ] Owner sees exactly which rows will succeed, fail, or duplicate before commit
- [ ] Import does not accidentally trigger onboarding or welcome automations
- [ ] Imported active subscriptions can participate in future renewal reminders
- [ ] Spreadsheet import is additive, not destructive
- [ ] Post-import checklist gets the owner to first successful live day

---

## Recommendation
The next step should not be “build a better import page.”

The next step should be:
- design a dedicated `Import-led onboarding` flow
- ship spreadsheet import MVP first
- keep desktop DB migration as a separate advanced path

That is the version that will actually help gym owners move to GymFlow with less support overhead.

## Research Sources
- Fitli migration/import help:
  - https://support.fitli.com/how-to-import-data-from-other-services-such-as-mindbody-zen-planner-etc/
- PushPress migration guidance:
  - https://help.pushpress.com/en/articles/9864391-core-migration-export-member-list-from-previous-software-platform
