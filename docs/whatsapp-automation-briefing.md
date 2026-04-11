# WhatsApp Automation — Briefing

Research date: 2026-04-07

---

## Reports fed by WhatsApp automation

| Report tab | What it shows | Automation feeding it |
|---|---|---|
| **WhatsApp Performance** | Message volume, delivery rate, open rate, revenue attributed to messages | All automation types log to `message_queue` |
| **Post-Expiry Performance** | Win-back rate — % of expired members who renewed within 14 days of a message | 4-step win-back sequence (days 1, 3, 7, 14 post-expiry) |
| **Onboarding Performance** | % of new members who hit 2×/week visit frequency in their first 90 days | 3-stage onboarding sequence (day 1, day 7, day 30) |

---

## All automations — built status

| Automation | Trigger | Built? |
|---|---|---|
| Renewal reminder — 14 days before expiry | Scheduler | ✅ |
| Renewal reminder — 7 days before expiry | Scheduler | ✅ |
| Renewal reminder — 3 days before expiry | Scheduler | ✅ |
| Post-expiry win-back — day 1 | Scheduler | ✅ |
| Post-expiry win-back — day 3 | Scheduler | ✅ |
| Post-expiry win-back — day 7 | Scheduler | ✅ |
| Post-expiry win-back — day 14 | Scheduler | ✅ |
| Onboarding welcome — day 1 | New subscription created | ✅ |
| Onboarding follow-up — day 7 | Scheduler | ✅ |
| Onboarding follow-up — day 30 | Scheduler | ✅ |
| Welcome message on member creation | Event | ✅ |
| QR scan notification | QR scan event | ✅ |
| PT session reminder | Scheduler (24h before session) | ✅ |
| PT package expiry warning | Scheduler | ✅ |
| Weekly digest | Scheduler (Sunday) | ✅ |
| Broadcast campaigns | Manual trigger from UI | ✅ |
| **PT Low Balance alert** | Scheduler | ❌ Setting key exists, no scheduler code |

---

## How attribution works

When a subscription is renewed, the DB stores `renewed_from_subscription_id` on the new row.
If that renewal was created **within 14 days** of a WhatsApp message being sent to that member, it counts as WhatsApp-attributed revenue.

Attribution window constant: `WHATSAPP_ATTRIBUTION_WINDOW_DAYS = 14`

---

## Key tables & files

| Item | Location |
|---|---|
| All queued/sent messages | `message_queue` DB table |
| Campaign broadcasts | `whatsapp_campaigns` DB table |
| Automation settings | `settings` DB table (key-value) |
| Worker (all scheduler logic) | `saas-web/worker/whatsapp-vm/src/index.ts` (~1,563 lines) |
| Report API | `saas-web/app/api/reports/[report]/route.ts` |

---

## Only gap

**PT Low Balance alert** — the settings UI already has a field (`pt_low_balance_threshold_sessions`) where the owner can set the warning threshold, but no scheduler code exists yet to check session counts and fire the message.
