# Import Onboarding Research — Round 2
> Date: April 12, 2026
> Goal: close deeper gaps around duplicate handling, billing cutover, automation safety, and go-live UX

## Gaps Asked
1. What should happen with duplicate members during import?
2. How should recurring payments / stored cards be handled?
3. How should onboarding/import interact with automations?
4. What should the owner see after import to feel safe going live?

## Findings
### 1. Duplicate handling should be conservative in v1
- Industry docs rarely promise automatic fuzzy merges for migration.
- The safe pattern is:
  - detect likely duplicates
  - skip or flag them
  - resolve manually later
- This is especially important in GymFlow because wrong merges would affect:
  - reminders
  - reports
  - attendance history
  - payment attribution

### 2. Payment migration is its own workflow
- Competitor migration guidance emphasizes active customers and balances, but stored payment methods are usually not treated as a normal CSV import.
- Practical implication:
  - imported members/subscriptions can come in first
  - recurring billing credentials often require separate provider-assisted migration or customer re-entry
- GymFlow should not pretend card tokens can be imported in the main spreadsheet flow.

### 3. Automation safety must be explicit
- Imported legacy members should not be treated as new members.
- If they are, onboarding/welcome/lifecycle automations can blast the wrong people.
- This aligns directly with known GymFlow WhatsApp safety lessons already in project memory.

### 4. Post-import confidence matters as much as the upload
- The owner needs a go-live checklist:
  - imported member count
  - failed rows
  - duplicate rows
  - active plans reviewed
  - WhatsApp connected
  - one test reminder verified
- Without this, import feels “technically done” but operationally unsafe.

## Locked Product Recommendations
1. Spreadsheet import must be additive, not branch-replacing.
2. Duplicate handling v1 should be:
   - exact phone match
   - exact card code match
   - skip/flag, not fuzzy auto-merge
3. Payment-method migration must be separated from member/subscription import.
4. Imported records must carry source/import metadata for automation safety and future reporting.
5. Onboarding should end with a go-live checklist, not an “import complete” dead-end screen.

## Sources
- Fitli migration/import help:
  - https://support.fitli.com/how-to-import-data-from-other-services-such-as-mindbody-zen-planner-etc/
- PushPress migration guide:
  - https://help.pushpress.com/en/articles/9864391-core-migration-export-member-list-from-previous-software-platform
