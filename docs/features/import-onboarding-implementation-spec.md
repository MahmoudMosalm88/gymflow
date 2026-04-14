# Import-Led Onboarding Implementation Spec
> Date: April 12, 2026
> Status: Ready for implementation
> Depends on: `docs/features/import-onboarding-plan.md`

---

## Scope
This spec covers the approved v1 boundary only.

### In scope
- onboarding stepper branch for import-led setup
- CSV/XLSX upload
- column mapping
- preview and validation
- additive import of:
  - members
  - one active subscription per row
- duplicate detection and skip mode
- WhatsApp-safe import flags
- post-import go-live checklist

### Out of scope
- historical attendance import
- full payment ledger backfill
- stored card/payment token migration
- PT import
- fuzzy auto-merge
- competitor-specific direct integrations

---

## Product Decisions Locked
1. Spreadsheet import is additive, not destructive.
2. Desktop backup import stays separate and can remain branch-replacing.
3. Duplicate handling v1 is conservative:
   - exact normalized phone
   - exact card code
   - skip/flag only
4. Imported legacy members must not trigger new-member onboarding automations.
5. Imported active subscriptions should still be eligible for future renewal reminders.
6. Payment-method migration is a separate post-import workflow.

---

## UX Structure
## Entry point
After initial account creation, owners should land in onboarding instead of a normal dashboard-first experience when:
- branch has no meaningful live data yet
- onboarding is not marked completed in settings

Recommended route:
- `/dashboard/onboarding`

This route should render a stepper and branch by onboarding mode.

### Mode choice
Step after basic gym setup:
1. `Start fresh`
2. `Import from spreadsheet`
3. `Move from GymFlow desktop backup`

For this spec, only the spreadsheet path is new.

---

## Stepper Screens
## Step 1: Gym setup
Capture and confirm:
- owner name
- organization name
- branch name
- branch timezone
- branch currency
- baseline WhatsApp defaults

Persist via existing settings/branch update path.

### Exit condition
- required setup fields saved

---

## Step 2: Import source
Show:
- spreadsheet import card
- GymFlow desktop backup card
- later support/concierge card

For spreadsheet import:
- allow downloading template
- explain supported data:
  - members
  - phones
  - one active subscription per member

### Exit condition
- source selected

---

## Step 3: Upload
Supported file types:
- `.csv`
- `.xlsx`

UI requirements:
- drag-and-drop
- file picker
- template download
- sample columns visible inline

On upload success:
- create artifact row
- parse file into raw normalized sheet payload
- store raw file-derived structure, not yet imported records

### Exit condition
- artifact uploaded and parseable

---

## Step 4: Column mapping
User maps uploaded columns to GymFlow targets.

### Required targets
- `member_name`
- `phone`
- `gender`

### Optional targets
- `joined_at`
- `date_of_birth`
- `notes`
- `card_code`
- `subscription_start`
- `subscription_end`
- `plan_months`
- `sessions_per_month`
- `amount_paid`

### UX behavior
- auto-suggest mappings by header similarity
- allow “not provided” for optional fields
- if `gender` is not available, allow owner to choose:
  - default all missing rows to `male`
  - default all missing rows to `female`

Reason:
- current `members.gender` is required in schema
- do not block imports because the previous system omitted it

### Exit condition
- all required targets mapped or assigned defaults

---

## Step 5: Preview and validation
This is the decision screen.

Show:
- total rows
- valid rows
- warning rows
- invalid rows
- duplicate rows
- estimated members to create
- estimated subscriptions to create

### Warning examples
- phone normalized from local to E.164
- missing join date
- missing card code
- amount paid provided but not imported into financial reports

### Invalid examples
- missing name
- invalid phone after normalization
- invalid gender and no default selected
- subscription end before start
- plan months not numeric

### Duplicate examples
- phone already exists in branch
- card code already exists in branch

### User actions
- download invalid rows CSV
- go back to mapping
- proceed with duplicate mode:
  - `skip duplicates`
  - `import only new rows`

### Exit condition
- preview confirmed

---

## Step 6: Import execution
Run additive import job.

Behavior:
- create new members
- create active subscription cycles where provided
- mark imported records as legacy-imported
- do not trigger onboarding/welcome automations
- store row-level results

### Exit condition
- job completed or failed

---

## Step 7: Go-live checklist
Show:
- imported members count
- skipped duplicates
- failed rows
- warning rows
- imported subscriptions ending soon

Checklist:
- review warning rows
- review active plans
- connect WhatsApp
- review reminder settings
- test member search/check-in
- verify one reminder on a safe test member

Final CTA:
- `Start using GymFlow live`

### Exit condition
- owner marks onboarding complete

---

## Data Model
## Reuse existing tables
Keep using:
- `import_artifacts`
- `migration_jobs`

Do not create a parallel import subsystem if the current tables can hold the workflow.

## Extend `import_artifacts`
Current table is too desktop-focused.

Add:
- `kind text not null`
  - `desktop_archive`
  - `spreadsheet`
- `file_format text`
  - `csv`
  - `xlsx`
  - `sqlite_db`
- `mapping jsonb`
- `preview_summary jsonb`

Update `status` to support:
- `uploaded`
- `parsed`
- `mapped`
- `validated`
- `invalid`
- `imported`
- `failed`

---

## Extend `migration_jobs`
Add type:
- `spreadsheet_import`

Current enum:
- `desktop_import`
- `backup_restore`

Target enum:
- `desktop_import`
- `backup_restore`
- `spreadsheet_import`

---

## New table: `import_row_results`
This is needed for row-level preview, downloadable error reports, and later reconciliation.

Recommended shape:
- `id uuid primary key`
- `artifact_id uuid not null references import_artifacts(id) on delete cascade`
- `organization_id uuid not null`
- `branch_id uuid not null`
- `row_number integer not null`
- `raw_row jsonb not null`
- `normalized_row jsonb`
- `status text not null`
  - `valid`
  - `warning`
  - `invalid`
  - `duplicate`
  - `imported`
  - `skipped`
  - `failed`
- `issues jsonb not null default '[]'::jsonb`
- `matched_member_id uuid null`
- `created_member_id uuid null`
- `created_subscription_id bigint null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- `(artifact_id, row_number)`
- `(organization_id, branch_id, status)`

---

## Member metadata
Imported members need durable metadata so future automations and reports can behave correctly.

Recommended member columns:
- `source text not null default 'manual'`
  - `manual`
  - `import_csv`
  - `import_desktop`
- `import_job_id uuid null`
- `is_legacy_import boolean not null default false`
- `joined_at timestamptz null`

Why:
- onboarding automations should not target legacy imports
- future reports should distinguish imported cohorts from native cohorts
- `joined_at` preserves the real membership start when known

---

## Subscription metadata
Recommended subscription columns:
- `source text not null default 'manual'`
  - `manual`
  - `renewal`
  - `import_csv`
  - `import_desktop`
- `import_job_id uuid null`
- `is_legacy_import boolean not null default false`

Use existing fields:
- `start_date`
- `end_date`
- `plan_months`
- `price_paid`
- `sessions_per_month`

Do not add payment-token or recurring-provider fields here in v1.

---

## API Design
Keep desktop migration APIs as they are.

Add a spreadsheet-specific API family:

### `POST /api/imports/upload`
Input:
- multipart form data
- file
- kind = `spreadsheet`

Output:
- `artifactId`
- `fileFormat`
- `sheetSummary`
- `status = parsed`

### `POST /api/imports/preview`
Input:
- `artifactId`
- `mapping`
- `defaults`
  - `genderDefault`
  - `skipDuplicates`

Output:
- preview summary
- warnings
- invalid rows count
- duplicate rows count
- row issue sample

Side effect:
- populate/update `import_row_results`
- update `import_artifacts.mapping`
- update `import_artifacts.preview_summary`

### `POST /api/imports/execute`
Input:
- `artifactId`
- `duplicateMode`
- `suppressImportedAutomations`

Output:
- `jobId`
- created counts
- skipped counts
- failed counts
- warning counts

Side effect:
- create members/subscriptions
- update `import_row_results`
- create `migration_jobs` row with type `spreadsheet_import`

### `GET /api/imports/[artifactId]/status`
Output:
- artifact summary
- row counts by status
- latest job status

### Later, not v1
- `POST /api/imports/resolve-duplicates`

---

## Validation Rules
## Member row rules
### Required
- name must be non-empty after trim
- phone must normalize to valid E.164
- gender must resolve from:
  - mapped value
  - or owner-selected default

### Optional
- card code
- joined at
- date of birth
- notes

### Duplicate detection
- duplicate if normalized phone already exists in branch
- duplicate if card code already exists in branch
- row marked `duplicate`, not auto-merged

---

## Subscription row rules
Create a subscription only if enough subscription fields are present.

Required for imported active subscription:
- `subscription_start`
- `subscription_end`
- `plan_months`

Optional:
- `sessions_per_month`
- `amount_paid`

Validation:
- end must be after start
- plan months must be positive integer
- sessions per month, if present, must be positive integer
- amount paid, if present, must be numeric and non-negative

If subscription fields are partially present but invalid:
- member can still import
- subscription part becomes warning or invalid depending on severity

This avoids losing the member row because the plan data is messy.

---

## Financial Rules
V1 must not corrupt financial reporting.

### Rule 1
Imported subscription commercial state should exist on the subscription row.

### Rule 2
Do not create normal historical payment events just because `amount_paid` is present in the spreadsheet.

Reason:
- that would distort current-period revenue reports
- import day would look like fake revenue

### Rule 3
If `amount_paid` is imported, treat it as imported context, not current live cash collection.

Recommended v1 behavior:
- store on subscription row only
- expose in member/subscription detail as imported commercial state
- do not include in normal income ledgers until a later explicit financial import model exists

---

## Automation Rules
### Imported members
- no welcome sequence
- no onboarding sequence
- no backfilled lifecycle automations

### Imported active subscriptions
- renewal reminders allowed in the future
- reminder scheduling starts from imported `end_date`

### Branch-level safety
During onboarding import flow, default:
- `suppressImportedAutomations = true`

This should be hard-defaulted on the UI.

---

## Execution Order
## Phase 1
- DB schema changes
- parser for CSV/XLSX
- upload route
- preview route
- row-level validation engine

## Phase 2
- onboarding stepper UI
- mapping UI
- preview UI
- execution route

## Phase 3
- go-live checklist UI
- downloadable invalid rows report
- imported-record metadata integration with automations

## Phase 4
- polish
- better error messages
- safe support tooling

---

## Test Plan
### Upload and parse
- upload valid CSV
- upload valid XLSX
- reject unsupported file
- reject empty file

### Mapping
- auto-map obvious headers
- require user confirmation for missing required targets
- support gender default when source file lacks gender

### Preview
- invalid rows counted correctly
- duplicate rows counted correctly
- mixed member/subscription warnings shown correctly

### Execute
- create members only rows
- create members + active subscriptions rows
- skip duplicates cleanly
- preserve row-level results
- no destructive branch replacement

### Safety
- imported members do not receive onboarding automations
- imported subscriptions still qualify for future renewal reminders
- current-period revenue does not spike from imported `amount_paid`

---

## Success Criteria
- owner can complete onboarding with a spreadsheet and no manual DB intervention
- imported rows are explainable before commit
- import is safe for WhatsApp automations
- import does not break reports by posting fake current-period revenue
- onboarding ends in a clear go-live state, not a dead-end
