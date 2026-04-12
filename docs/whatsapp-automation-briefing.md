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

## Gaps in built automations

**PT Low Balance alert** — the settings UI already has a field (`pt_low_balance_threshold_sessions`) where the owner can set the warning threshold, but no scheduler code exists yet to check session counts and fire the message.

---

## Future Automation Ideas

- **1. Habit-break nudge**
    - **Goal:** Re-engage habitual gym-goers who suddenly stopped (highest-value retention signal).
    - **Trigger:** Scheduler identifies members with a consistent hour pattern (±1h on 3+ of last 7 days) but zero check-ins in the last 3 days.
    - **Message:** "Hey {name}, we noticed you usually come around {usual_time}. We missed you the last few days — everything OK? Your gym is waiting for you 💪"
    - **Priority:** **High** — Targets the exact moment a habit breaks. Industry data: members who break a 3×/week habit have a 50% cancel probability within 30 days.

- **2. Birthday message**
    - **Trigger:** Scheduler checks for members with birthdays matching today.
    - **Message:** "Happy birthday {name}! 🎂 Come celebrate with a workout today."
    - **Priority:** Medium — Requires schema change to add `date_of_birth` field.

- **3. Milestone celebration**
    - **Trigger:** Event-based after reaching key check-in counts (50, 100, 200).
    - **Message:** "🎉 {name}, you just hit {count} check-ins! You're one of our most dedicated members."
    - **Priority:** Medium — Simple count query on `logs`.

- **4. Freeze ending reminder**
    - **Trigger:** Scheduler checks `subscription_freezes` for end dates occurring tomorrow.
    - **Message:** "{name}, your subscription freeze ends tomorrow. See you back at the gym!"
    - **Priority:** Medium — Data exists; needs scheduler logic.

- **5. Payment failed retry nudge**
    - **Trigger:** Event-based when a payment fails or becomes overdue.
    - **Message:** "{name}, we couldn't process your payment. Please visit the front desk to update your payment method."
    - **Priority:** Low — Most Egyptian gyms use cash; low volume of digital failures.

- **6. Streak encouragement**
    - **Goal:** Celebrate consistency and reinforce habits at key milestones.
    - **Trigger:** Scheduler tracks consecutive visit days (1 rest-day grace/week) at 3, 7, 14, 21, 30, 50, and 100 days.
    - **Message:** (See detailed streak message table below).
    - **Priority:** **High** — 7-day streak users are 3× more likely to stay. Loss aversion makes streak protection a powerful motivator.

---

## Streak Encouragement — Detailed Design

### How streaks work for a gym
- A "streak day" = member checked in at least once that day
- **Rest-day grace**: allow 1 day gap per week without breaking the streak (gyms need rest days). A member visiting Mon/Tue/Thu/Fri has a 4-day streak, not broken by Wed.
- Streak resets only after **2+ consecutive missed days**
- Track via `logs` table: count distinct days with `status = 'success'` in a rolling window

### Milestone messages

- **3 days — Warm encouragement**
    - **EN:** "3 days in a row, {name}! You're building momentum 💪"
    - **AR:** "٣ أيام متتالية يا {name}! بدأت تبني عادة 💪"
- **7 days — Pride + social proof**
    - **EN:** "One full week, {name}! You're more consistent than 80% of gym members 🔥"
    - **AR:** "أسبوع كامل يا {name}! أنت أكثر انتظاماً من ٨٠٪ من أعضاء الصالات 🔥"
- **14 days — Identity reinforcement**
    - **EN:** "14-day streak! This isn't luck anymore, {name} — this is discipline 🏆"
    - **AR:** "١٤ يوم متواصل! هذا مو حظ يا {name} — هذا انضباط 🏆"
- **21 days — Achievement**
    - **EN:** "21 days! Science says it takes 21 days to build a habit. You did it, {name} ✅"
    - **AR:** "٢١ يوم! العلم يقول ٢١ يوم تكفي لبناء عادة. أنت فعلتها يا {name} ✅"
- **30 days — Celebration**
    - **EN:** "A FULL MONTH, {name}! 30 days without missing. You're unstoppable 🚀"
    - **AR:** "شهر كامل يا {name}! ٣٠ يوم بدون انقطاع. ما يوقفك شي 🚀"
- **50 days — Elite status**
    - **EN:** "50-day streak! {name}, you're in the top 1% of our members 👑"
    - **AR:** "٥٠ يوم! يا {name}، أنت من أفضل ١٪ من أعضائنا 👑"
- **100 days — Legend status**
    - **EN:** "100 DAYS. {name}, you're a legend. The gym is better because you're in it 🏅"
    - **AR:** "١٠٠ يوم. يا {name}، أنت أسطورة. الصالة أفضل بوجودك 🏅"

### Streak-break recovery message
When a streak breaks (2+ missed days after an active streak of 7+):
- EN: "Hey {name}, your {streak_count}-day streak paused. No stress — come back today and we start fresh 💪"
- AR: "يا {name}، سلسلة الـ {streak_count} يوم توقفت. لا تقلق — ارجع اليوم ونبدأ من جديد 💪"

### Key research backing
- **Duolingo**: 7-day streak users are 3× more likely to stay engaged long-term. Streak freeze (1 missed day allowed) reduced at-risk user churn significantly.
- **8fit (Braze case study)**: streak messaging drove 40% increase in weekly class views, 17% increase in class completion, 13% conversion uplift from free to paid.
- **Stanford**: gamified fitness apps increase engagement by 30-40% vs non-gamified.
- **Loss aversion (Kahneman & Tversky)**: pain of losing a streak is psychologically stronger than the pleasure of building one — which is why streak protection messages ("don't break it!") are more motivating than start messages.
- **Smashing Magazine (Feb 2026)**: streak messages should feel like encouragement, never pressure. Celebrate the comeback, don't shame the absence.

### Implementation notes
- **Query**: `SELECT member_id, COUNT(DISTINCT DATE(to_timestamp(timestamp) AT TIME ZONE 'Africa/Cairo')) as streak_days FROM logs WHERE status = 'success' AND timestamp >= (now - streak_window) GROUP BY member_id`
- **Grace day logic**: gaps of exactly 1 day don't break the streak (allows rest days)
- **Message type**: `'streak_milestone'` in `message_queue`
- **Deduplication**: only send each milestone once per streak (track in `payload.milestone_sent`)
- **Settings**: owner can enable/disable streak messages, customize milestone thresholds
