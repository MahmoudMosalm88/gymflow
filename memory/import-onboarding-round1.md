# Import Onboarding Research — Round 1
> Date: April 12, 2026
> Goal: broad scan of migration/import patterns in gym software onboarding

## Gaps Asked
1. How do gym software products frame migration during onboarding?
2. What import sources and formats are typically supported?
3. What data do they care about most during migration?
4. Is migration self-serve or concierge-led?
5. What patterns should GymFlow copy or avoid?

## Findings
### 1. Migration is usually positioned as part of switching, not generic setup
- Competitors frame import as “moving from another software” or “migration assistance,” not just file upload.
- Import is typically attached to activation and switching workflows.

### 2. Concierge support is common
- Fitli explicitly says they can work from Excel, spreadsheet, PDF, text, or CSV and help businesses migrate from Mindbody/Zen Planner and others.
- That suggests the market expectation is not “perfect self-serve importer only.”
- It is “I can get my business moved without retyping everything.”

### 3. The critical data is not just member contact rows
- Fitli’s migration guidance explicitly calls out:
  - customer list
  - visits remaining
  - balances
  - expiration dates
- This is the key insight: owners care about active commercial state, not just names and phones.

### 4. Existing GymFlow web import is narrower
- Current GymFlow web flow is desktop-backup oriented:
  - upload `.db`
  - validate counts
  - replace branch
- That is suitable for GymFlow desktop -> web migration, not broader onboarding.

## Implications For GymFlow
1. Import must become part of onboarding, not just settings/admin tooling.
2. Spreadsheet import should be the main path, not an afterthought.
3. “Members only” import is not enough for switching gyms.
4. GymFlow should support a support-led / concierge fallback even if self-serve is the default.

## Sources
- Fitli migration/import help:
  - https://support.fitli.com/how-to-import-data-from-other-services-such-as-mindbody-zen-planner-etc/
