# Staff & PT Feature Research — Round 2

Date: 2026-04-03  
Method: `autoresearch` round 2  
Focus: permission UX hardening, trainer-home IA, reassignment when trainers leave, and MENA trainer-matching filters

## Gap List

[x] Gap A: What permission-management UX patterns reduce accidental over-access or misconfiguration?  
[x] Gap B: What information architecture is most common for trainer/staff mobile home screens?  
[x] Gap C: What should happen when a trainer leaves or a client must transfer unused sessions to another trainer?  
[x] Gap D: Which trainer-selection filters matter most in MENA and multilingual contexts beyond gender?

## Findings

### Permission-management UX
- Start with role presets, not fully custom permissions.
- Scope is separate from role:
  - role
  - location/branch scope
  - optional bounded overrides
- Good permission UX also includes:
  - invite review before send
  - pending invite state
  - edit/cancel invite
  - simulation / “what changes if I save this?”
  - tightly controlled impersonation/mimic for support
  - audit trail

### Trainer/staff mobile home IA
- Most products are schedule-first, not earnings-first.
- Strongest pattern:
  - `today agenda` or `calendar / my day`
  - then session details, client status, and alerts inside the day flow
- Counterexample:
  - TrainHeroic uses a work-queue/activity feed pattern for coaching
- Best takeaway for GymFlow:
  - trainer home should open to today’s sessions
  - alerts and low-session warnings should be layered into that view, not replace it

### Trainer leaves / reassignment
- Unused PT sessions are typically treated as client-owned entitlement, not locked forever to one trainer.
- When a trainer leaves:
  - future bookings should be reassigned
  - history must stay intact
  - reports and payroll history must not be corrupted
  - reassignment should stay inside the same business/account
- Cross-business portability is usually weak.
- Client-facing expectation is usually:
  - substitute another trainer first
  - refund rules are handled separately by business policy

### MENA trainer matching filters
- The strongest matching filters beyond gender are:
  - language
  - specialty / goal fit
  - branch / area / training format
  - shift availability
- Beginner-friendliness matters, but it shows best as badges and onboarding signals:
  - all levels
  - complete beginners
  - assessment included
  - form/technique support

## Sources

- https://docs.cloud.google.com/iam/docs/choose-predefined-roles
- https://squareup.com/help/us/en/article/5822-employee-permissions
- https://help.shopify.com/en/manual/your-account/users/invite-users
- https://docs.github.com/en/organizations/managing-membership-in-your-organization/inviting-users-to-join-your-organization
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://support.vagaro.com/hc/en-us/articles/204347700-Set-Calendar-Configuration-Settings
- https://support.glofox.com/hc/en-us/articles/46421658646292-An-Overview-of-Glofox-Pro
- https://apps.apple.com/us/app/zen-planner-staff-app/id1122645605
- https://help.zenoti.com/en/myzen/manage-appointments.html
- https://support.vagaro.com/hc/en-us/articles/204981784-Delete-an-Employee-and-Reassign-Their-Calendar
- https://help.zenoti.com/en/employee-and-payroll/employee-related-manager-tasks/manage-employee-details/terminate-an-employee.html
- https://help.trainerize.com/hc/en-us/articles/208689076-How-To-Manage-Trainers-On-Your-Account
- https://help.wellnessliving.com/en/articles/10041099-appointment-settings
- https://369mmafit.com/en/trainers
- https://369mmafit.com/en/female-personal-trainer
- https://uae.fitnessfirstme.com/MyFitnessFirst
- https://thequikfit.com/
- https://www.heytrainer.ae/
