# Import-First Onboarding Design

Date: 2026-04-27
Status: approved in chat, written for review before implementation

## Summary

GymFlow onboarding should stop presenting setup as three equal choices. For real gym owners switching from another system, importing current members is the default path. The onboarding experience should make spreadsheet import the obvious first action, keep `Start without importing` available without pressure, and move desktop-backup restore completely out of onboarding into Settings.

This redesign keeps the current route, rewrites the onboarding UX around one primary import-first journey, and adds a dedicated go-live checklist after either branch. It also guarantees that owners who skip import understand they can import later from Settings at any time.

## Goals

- Make spreadsheet import the obvious default path for switching gyms.
- Reduce first-run decision fatigue and mobile cognitive load.
- Make import safety and expected outcome immediately understandable.
- Block import when warning rows still need review or fixes.
- Give owners a structured post-import or post-manual checklist before they fully go live.
- Preserve a low-pressure manual setup path and explicitly tell owners they can import later from Settings.

## Non-Goals

- No redesign of trainer/staff live workflows in this pass.
- No backend rewrite of the spreadsheet import engine.
- No changes to desktop-backup restore behavior inside Settings beyond onboarding visibility.
- No permanent “operations hub” concept; onboarding remains first-run focused.

## Product Decision

Recommended and approved approach: `Import-First Guided Onboarding`

The onboarding flow will be structured as:

1. import your gym data
2. review what will be created
3. import only clean rows
4. complete a go-live checklist
5. enter the live product

`Start without importing` remains available, but it becomes a secondary branch inside the same onboarding journey. Desktop-backup restore is removed from onboarding and remains only in Settings.

## Route and Component Boundaries

- Keep the route the same: `/dashboard/import`
- Keep the main implementation centered in `components/dashboard/import/ImportOnboardingFlow.tsx`
- Avoid introducing a second onboarding system
- Reuse existing import APIs where possible
- Keep owner-facing onboarding copy contained in the onboarding component or a local structured config object

## UX Architecture

The onboarding flow should be driven by three internal modes:

- `import`
- `manual_setup`
- `go_live_checklist`

The owner should never feel like they are choosing between equal competing setup philosophies. The UI should communicate:

- importing now is the normal path
- starting manually is acceptable
- import can still be done later from Settings

## Screen-by-Screen Behavior

### 1. Welcome Screen

Purpose:
- set the owner’s expectation that importing current data is the default migration path

Behavior:
- primary CTA: `Import your member list`
- secondary text action: `Start without importing`
- no desktop-backup card or destructive-tool language
- short reassurance copy:
  - if you have an existing list, start by importing it
  - if you want to begin manually, you can still import later from Settings

### 2. Import Path

The import stepper should become:

1. Upload file
2. Match columns
3. Fix issues
4. Import

Rules:
- required mappings must be complete before preview
- invalid rows must be zero before import
- warning rows must also be zero before import
- duplicate rows do not block import, but must be clearly explained as safe skips rather than unresolved problems

The review state should answer three owner questions immediately:

- how many members will be created
- how many subscriptions will be created
- how many rows are blocked versus safely skipped

The import action should stay locked until the sheet is clean enough to import.

### 3. Manual Setup Path

If the owner skips import, they stay inside onboarding and move into a short manual setup branch.

That branch should focus on:

1. add your first member
2. connect WhatsApp in Settings
3. add PT/staff
4. test one check-in

The copy must explicitly state that import is still available later from Settings.

### 4. Go-Live Checklist

Both branches converge into a dedicated first-run checklist screen.

If the owner imported:

1. review imported members
2. connect WhatsApp in Settings
3. add PT/staff
4. test one real check-in
5. review reminder automation

If the owner skipped import:

1. add your first member
2. connect WhatsApp in Settings
3. add PT/staff
4. test one real check-in
5. reminder: import your old member list later from Settings any time

This screen is the final onboarding surface. Do not drop the owner straight into members or dashboard immediately after import.

## Copy Rules

The onboarding copy should be owner-friendly, non-technical, and low pressure.

### Tone

- short
- direct
- operational
- non-technical

Avoid words like:

- artifact
- migration job
- destructive
- payload

Use owner language instead:

- import your member list
- fix blocked rows
- GymFlow will add new members from this file
- you can import later from Settings

### Required Recovery Message

If the owner skips import, the product must say clearly that this is not irreversible.

That message should appear:

- on the welcome screen
- inside the manual setup branch
- on the manual-setup completion/checklist state

Required meaning:

- You can continue setting up now.
- You can import your member list later from Settings at any time.

### Desktop Backup Copy

Desktop-backup restore is not taught during onboarding. Onboarding copy should only talk about spreadsheet import. Advanced restore remains a Settings concern.

## Interaction and Layout Rules

### Mobile

- same overall product flow as desktop
- fewer competing elements on screen
- stronger primary CTA emphasis
- shorter explanatory paragraphs
- no reliance on large side-by-side card choices

### Desktop

- can retain richer review summaries and wider tables
- still should not present equal-choice setup cards

Mobile cannot feel like a downgraded version of onboarding. It must remain fully understandable and complete.

## State Model

Implementation should use explicit computed state rather than loose UI booleans.

Recommended top-level state:

- `entryMode`: `import` | `manual_setup`
- `importPhase`: `upload` | `mapping` | `fix_issues` | `execute` | `complete`
- `onboardingCompletionMode`: `imported` | `manual`

Execution gating should be computed from preview data:

- `canPreview`
- `hasBlockingInvalidRows`
- `hasBlockingWarningRows`
- `canImport`

Warnings are upgraded from “review and continue” to “fix before import.”

## Technical Changes

### Frontend

- Rewrite the top-of-flow source choice into an import-first welcome screen
- Remove desktop-backup option from onboarding UI
- Convert `Start fresh` into a secondary branch within onboarding
- Replace the current preview/execute framing with a cleaner “fix issues before import” model
- Add a dedicated final checklist screen
- Update copy throughout to reflect import-later recovery

### Backend / Data

No backend rewrite is required by default.

Preferred implementation:
- keep current preview API categories
- treat `warningRows > 0` as blocking in the UI
- preserve duplicate-row handling as safe skip behavior

If current API messaging makes the frontend too awkward, a small response-shape cleanup is acceptable, but backend churn should stay minimal.

## Error Handling

The onboarding flow should make failures actionable:

- upload failure: tell the owner the file could not be uploaded and they should try again
- mapping failure: explain which required fields are still missing
- preview failure: show that preview could not be generated yet
- blocked import: explain that rows with warnings or errors must be fixed first
- manual setup branch: never imply that skipping import disables later import

The owner should always know the next safe action.

## Success Criteria

This redesign is successful if:

- most existing gyms immediately choose import without hesitation
- owners who skip import still understand import is available later
- owners do not feel pressure to make a permanent early choice
- import completion naturally leads into operational go-live steps
- mobile onboarding feels understandable and intentional

## Testing Plan

### Product / UX Validation

- verify import-first welcome screen behavior on desktop and mobile
- verify desktop-backup option is absent from onboarding
- verify `Start without importing` enters the manual setup branch
- verify every manual-setup surface repeats the “import later from Settings” guidance
- verify warning rows block import
- verify duplicate rows do not block import and are explained separately
- verify imported flow lands on checklist instead of dumping to members/dashboard
- verify manual flow lands on checklist with import-later reminder

### Regression / Automated Tests

- component/state tests for import gating when `warningRows > 0`
- smoke coverage for `/dashboard/import`
- if practical, add an integration/UI test that confirms the import execute action remains disabled while warnings exist

## Risks

- The onboarding component is already large; this pass can worsen complexity if changes are layered instead of restructuring clearly.
- Warning-row blocking may surface more user friction at first, but this is intentional to prevent low-confidence imports.
- If copy is not kept tightly owner-focused, the redesign could still feel like “developer setup” instead of “gym setup.”

## Recommended Implementation Order

1. restructure welcome screen and source-choice behavior
2. rework import gating and review framing
3. build the manual setup branch
4. build the shared go-live checklist
5. tighten copy and mobile hierarchy
6. add tests and verify end to end

