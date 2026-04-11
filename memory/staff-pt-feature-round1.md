# Staff & PT Feature Research — Round 1

Date: 2026-04-03  
Method: `autoresearch` round 1  
Focus: broad product and UX patterns for staff roles, trainer workflows, PT packages, dashboards, scheduling scope, complaints, MENA requirements, and nudges

## Gap List

[x] Gap 1: What UX patterns do leading gym/PT systems use for staff invite/onboarding and role-restricted navigation?  
[x] Gap 2: What UX patterns work best for PT package creation, assignment, and session logging on mobile?  
[x] Gap 3: How do competitors present trainer dashboards, remaining sessions, expiry warnings, and no-show flows?  
[x] Gap 4: How do gym tools model payroll/commission UX without creating ambiguity?  
[x] Gap 5: What scheduling depth is MVP vs overbuild for PT tools?  
[x] Gap 6: What user complaints exist about PT/session/staff flows and missed UX expectations?  
[x] Gap 7: What MENA-specific or women-only gym flows matter for trainer assignment or staff UX?  
[x] Gap 8: What notification nudges and thresholds are common and user-safe for PT package usage, expiry, and no-shows?

## Findings

### Staff roles and restricted navigation
- The strongest pattern is `invite by email first, assign role before first login, then hard-restrict navigation by role and location`.
- Good systems use role presets first, not blank-slate permission screens.
- Useful references:
  - GymMaster: invite + staff permissions + trainer enablement
  - TeamUp: admin vs limited permissions, scoped sections, resend pending invites
  - Trainerize: admin/manager/shared trainer/trainer role split
  - WellnessLiving: staff roles plus client-scope restrictions

### PT package and mobile workflow
- Best pattern: separate `package sale/setup` from `live session execution`.
- Package setup is web-first.
- Session logging is mobile-first and starts from:
  - today’s agenda
  - client card
  - calendar
- Strong product examples:
  - My PT Hub
  - ABC Trainerize
  - Everfit

### Trainer dashboard pattern
- Competitors usually fragment trainer information across:
  - schedule views
  - member cards
  - app home
  - policy settings
- Very few give trainers one clear renewal/no-show cockpit.
- That creates an opening for GymFlow.

### Payroll and commission UX
- Clear systems separate:
  - pay setup
  - earnings logic
  - payout reporting
- Good systems make the formula explicit:
  - flat
  - percentage
  - per check-in/session
- Good systems also state clearly that they track payroll but do not process money.

### Scheduling scope
- PT scheduling MVP is not a full workforce optimizer.
- Reliable MVP includes:
  - coach availability
  - recurring slots
  - exceptions / time off
  - client/staff booking
  - duration / buffers
  - conflict prevention
  - cancellation rules
  - package-credit deduction
  - reminders
- Overbuild starts when payroll logic, AI scheduling, and deep rule engines arrive before the basics are solid.

### User complaints
- Complaints cluster around:
  - rigid scheduling that does not fit PT operations
  - unclear remaining-session tracking
  - broken mobile/staff experiences
  - cancellations/no-shows corrupting package counts
  - clients showing up to appointments that were not actually booked

### MENA-specific flows
- Women-only support is operational, not cosmetic.
- Gender-aware assignment matters.
- Regional trainer matching should also consider:
  - language
  - location
  - specialty
  - beginner support
  - seasonal schedule changes such as Ramadan

### Notification defaults
- Safest common patterns:
  - 24-hour cancellation/no-show cutoff
  - one-session deduction on no-show or late cancel if configured
  - low-balance nudge at last 25% or last 1-3 sessions
  - expiry nudges at 7 days for short packs, 30 + 7 days for longer-running packages

## Sources

- https://help.gymmaster.com/021478-Setting-up-a-new-staff-user
- https://www.gymmaster.com/user-manual/manual_staffmembers_add_staff_details_permissions/
- https://support.goteamup.com/adding-staff-members
- https://support.goteamup.com/en/articles/9327561-edit-staff-member-permissions
- https://help.trainerize.com/hc/en-us/articles/208689076-How-To-Manage-Trainers-On-Your-Account
- https://help.trainerize.com/hc/en-us/articles/360000695586-Trainer-Manager-and-Staff-Permissions
- https://support.mypthub.net/hc/en-us/articles/360027230594-Create-a-package
- https://help.trainerize.com/hc/en-us/articles/4404677510164-How-to-Sell-Personal-Training-Packages-and-Track-Sessions
- https://help.everfit.io/en/articles/5666223-how-to-set-up-a-package
- https://www.gymmaster.com/blog/gymmaster-staff-app/
- https://help.pushpress.com/en/articles/11030113-member-management-in-the-staff-app-by-pushpress
- https://help.wodify.com/hc/en-us/articles/9966132457623-Navigate-and-Use-Coach-View
- https://help.pushpress.com/en/articles/1176389-managing-payroll-in-pushpress-core
- https://help.wodify.com/hc/en-us/articles/36972204368919-Set-Up-Process-Payroll
- https://www.mindbodyonline.com/business/education/blog/booking-scheduling-software-personal-training
- https://help.pike13.com/hc/en-us/articles/360042194212-How-do-I-set-up-semi-private-appointments
- https://www.reddit.com/r/personaltraining/comments/1n27f4j/flexible_scheduling_software_needed/
- https://www.capterra.com/p/40229/MINDBODY/reviews/
- https://gymnation.com/sa/gyms-in-riyadh/
- https://nuyu-ksa.com/ar/personal-training/
- https://gymnation.com/media/4bibrjib/uae-ksa-health-fitness-report-2025-eng.pdf
- https://docs.gymdesk.com/en/help/docs/booking-settings
- https://help.wellnessliving.com/en/articles/11201306-set-up-multiple-service-reminder-notifications
