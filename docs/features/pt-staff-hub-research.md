# PT & Staff Hub — Research Report

**Date:** April 8, 2026
**Purpose:** Inform the design and build of a comprehensive PT & Staff management hub for GymFlow, targeting Egyptian gyms.

---

## Executive Summary

GymFlow's current PT page is a session viewer — it shows today's sessions and low-balance clients. A proper PT & Staff hub needs to be the **command center for managing people** (trainers + staff), their work (sessions, schedules, client assignments), their performance (revenue, utilization, retention), and their access (roles, permissions). This research covers what the industry does, what Egyptian gyms specifically need, and the highest-leverage features to build.

**Top 3 highest-leverage problems to solve:**
1. **Per-trainer performance visibility** — owners currently have zero insight into which trainer generates the most revenue, retains the most clients, or has the highest no-show rate
2. **Automated commission calculations** — gym owners spend 4+ hours/month reconciling trainer pay in spreadsheets; trainers distrust the numbers
3. **Session verification + no-show alerting** — revenue leakage from untracked sessions and unpenalized no-shows costs the average gym 15-30% of PT revenue

---

## 1. What Competitors Offer

### Feature Matrix (Glofox, Mindbody, PushPress, GymMaster)

| Feature | Glofox | Mindbody | PushPress | GymMaster |
|---|---|---|---|---|
| Trainer bio/photo (public) | Yes | Yes (rich) | Limited | Limited |
| 1:1 session scheduling | Yes | Yes | Yes | Yes |
| Client self-booking | Yes | Yes | Yes | Yes |
| Trainer availability mgmt | Yes | Yes | Yes | Yes (Rosters) |
| Session credit gating | Yes | Yes | Yes | Yes |
| No-show fee automation | Yes | Yes | Yes | Via billing |
| Commission tracking | Basic | Full (per item + per trainer) | Basic (payroll) | Per service |
| Payroll report | Basic | Full + ADP integration | Daily report | Commission report |
| Workout delivery | Trainerize integration | Basic | Train app (full) | Basic portal |
| Mobile app for trainers | Business app | Business + Booker | Staff App (best) | Web only |
| Marketplace discovery | No (intentional) | Yes (3M+ users) | No | No |

### Key Takeaway
No Arabic-first gym software does PT session + trainer commission management well. This is GymFlow's opportunity.

---

## 2. Staff Management — Industry Standard

### Role Hierarchy (4 roles minimum, used by 95% of platforms)

| Role | Access |
|---|---|
| **Owner** | Everything including billing, delete account |
| **Manager** | Everything except billing; manages staff and settings |
| **Reception** | Check-ins, bookings, payments, POS; no settings or financials |
| **Trainer** | Own schedule, own clients only; no settings, no other trainers' data |

### Permission Areas

| Area | Owner | Manager | Reception | Trainer |
|---|---|---|---|---|
| Member profiles (view) | All | All | All | Own clients |
| Financial reports | Yes | Restricted | No | No |
| Billing / payments | Yes | Yes | Process only | No |
| Settings | Yes | Some | No | No |
| Staff management | Yes | Some | No | No |
| Class scheduling | Yes | Yes | View | Own only |
| Payroll data | Yes | Some | No | No |

### Critical Insight
**Revenue visibility is the #1 reason permissions exist.** Gym Insight built their role system specifically because front desk staff could see daily revenue and incorrectly assumed the owner was wealthy. GymFlow needs revenue-hiding as a core permission toggle.

---

## 3. Egyptian / MENA Market Specifics

### PT Pricing in Egypt (2026)

| Tier | Per Session | 10-Session Package |
|---|---|---|
| Budget / independent | EGP 250-400 | EGP 2,000-3,500 |
| Mid-range | EGP 400-700 | EGP 3,500-5,750 |
| Premium / boutique | EGP 700-1,200 | EGP 5,750-9,500 |
| Online / group | EGP 100-250 | EGP 600-1,200 |

### Package Structures (Most Common)
- **5 sessions** — entry/trial (1 month validity)
- **10 sessions** — most popular (2 month validity)
- **12 sessions** — used by chains (2-3 month validity)
- **20 sessions** — bulk discount (3 month validity)
- **Monthly unlimited** — capped at 20 sessions/month

### Revenue Split Models

| Model | Gym Takes | Trainer Gets |
|---|---|---|
| Standard | 50% | 50% |
| New trainer | 60-70% | 30-40% |
| Senior/experienced | 40% | 60% |
| Flat fee rental | Fixed monthly fee | All session revenue |

### How Egyptian Gyms Schedule Today
- **WhatsApp is the primary tool** for 95%+ of gyms
- Trainers manage their own calendars in WhatsApp chats
- No-show penalties are informal and unenforced
- Cash is dominant payment method
- Gym owners have zero visibility into trainer schedules or session counts

### Cultural Considerations
- **Women-only gyms** are a major segment — female PTs in high demand
- **Ramadan mode** needed: adjusted hours, PT unavailable during Iftar, Eid promos
- **Prayer time awareness** for conservative clientele
- **Cash-first economy** — session tracking must work without requiring digital payment
- **Heavy discount culture** — package promotions via Instagram/deal sites

### MENA Competitors (Arabic-First)

| Software | Key Feature | Weakness |
|---|---|---|
| NIDGYM | Arabic + French, $170/year | Limited PT features |
| Revive GYM System | Arabic-first, multi-branch | Early stage |
| AlfaSmartGym | AI-powered, biometric access | Not widely adopted |
| Tamarran | Branded mobile app | Limited PT depth |
| Elewix | Multi-location | UAE-focused |

**None have a robust PT session + commission management module.** This is the gap.

### Market Size
- Egypt gym membership market: **$126M (2024) → $349M (2033)**, 12% CAGR
- Egypt online fitness: **$287M (2024) → $2.94B (2033)**, 29% CAGR
- MENA gym management software: **$1.2B (2024) → $3.08B (2033)**, 12.5% CAGR
- Only **1.4% of MENA population** visits gyms (vs 18% in US) — enormous headroom
- PT revenue can account for **up to 52%** of total gym revenue

---

## 4. Pain Points — Ranked

| # | Pain Point | Impact |
|---|---|---|
| 1 | **Trainer turnover** — 30-80% annual turnover; replacement costs $15-30K | Churn cascade |
| 2 | **No-shows** — 15-20% rate; trainers lose 15-30% of income | Revenue loss |
| 3 | **Revenue leakage** — off-books sessions, unreported cash, untracked makeup sessions | Invisible loss |
| 4 | **Commission disputes** — manual spreadsheet calculation, 4+ hrs/month admin time | Trust erosion |
| 5 | **Scheduling conflicts** — WhatsApp silos, double-booking, no buffer enforcement | Client dissatisfaction |
| 6 | **No performance visibility** — owner can't answer "which trainer is my best?" | Bad decisions |
| 7 | **Client-trainer matching** — assignment by availability, not specialty fit | Higher dropout |
| 8 | **Package expiry chaos** — no automated alerts, missed renewal windows | Silent churn |

---

## 5. Key Metrics Gym Owners Need

### Revenue
- Revenue per trainer (RPT) — monthly
- Revenue per session
- Average revenue per client (ARPC)
- Commission earned vs. owed
- PT revenue as % of total gym revenue (benchmark: up to 52%)

### Utilization
- Session utilization rate — booked / available (target: 70-80%)
- Capacity fill rate per trainer
- Empty slot rate (inverse of utilization)

### Retention
- Client retention rate per trainer (healthy: 65-70%)
- Package renewal rate
- Client lifetime value (LTV)
- Churn by trainer

### Attendance
- No-show rate per trainer (industry: 15-20%)
- Late cancel rate
- Session completion rate

### Acquisition
- New clients per trainer per month (benchmark: 1-5)
- Lead conversion rate
- Client acquisition cost

---

## 6. Commission Models

| Model | How It Works | Best For |
|---|---|---|
| **Flat %** | Trainer earns fixed % of each session (30-60%) | Simple, small gyms |
| **Tiered** | % increases at volume thresholds (e.g., 30% < 10 sessions → 50% > 20) | Motivating high performers |
| **Flat fee** | Fixed amount per session regardless of client price | Budget gyms |
| **Hybrid** | Base salary + commission on sessions delivered | Employed trainers |
| **Retention bonus** | Quarterly bonus based on client retention rate | Long-term focus |

---

## 7. Recommended Hub Structure (UI/UX)

### Tab Architecture

| Tab | Who Sees It | Content |
|---|---|---|
| **Trainers** | Manager/Owner | Trainer directory (cards), profiles, performance, capacity |
| **Sessions** | All | Today's sessions, upcoming, session log with filters |
| **Packages** | Manager/Owner | All PT packages (active, expiring, exhausted), sell new |
| **Performance** | Manager/Owner (all trainers), Trainer (own only) | KPI cards + charts per trainer |
| **Staff** | Manager/Owner | Full staff list, roles, invites, permissions |
| **Settings** | Manager/Owner | Commission rules, session defaults, notification config |

### Trainer Profile Card (Directory View)
- Square avatar (brutalist: hard shadow, no rounded corners)
- Name + role badge (TRAINER in all-caps, Bebas Neue)
- 3 micro-stats: Active Clients | Sessions This Month | Utilization %
- Status dot (green = on shift today)
- Two ghost buttons: "Schedule" | "Clients"
- Hard border `#2a2a2a`, hard shadow `6px 6px 0 #000`

### Trainer Detail Page
- Header: large avatar, name, role badge, specialty tags, CTA buttons
- Stats row: 4-6 KPI cards
- Tabs: Overview | Schedule | Clients | Performance
- Overview: bio, certifications, working hours, contact
- Schedule: embedded calendar with their sessions
- Clients: filterable list of assigned members
- Performance: charts + trend data

### Mobile vs Desktop
| Element | Desktop | Mobile |
|---|---|---|
| Staff directory | 3-column card grid | Single-column list |
| Calendar | Week view (7 columns) | Day view (agenda list) |
| Stats row | 4-6 cards side-by-side | Horizontal scroll strip |
| Permissions | Full matrix table | Grouped accordion |
| Primary CTAs | Text + icon in header | Floating action button |

### Role-Based Views
- **Manager lands on:** Trainer directory with aggregate stats
- **Trainer lands on:** "My Day" — their sessions, their clients, their performance
- Same page component, conditionally filtered by `auth.role`

---

## 8. What Gym Owners Wish Software Did Better

1. Automated commission calculation from session data
2. Per-trainer performance dashboard (revenue, retention, utilization in one view)
3. Session verification before commission triggers
4. Client reassignment flow when a trainer leaves
5. No-show pattern alerts (2+ missed sessions in a row)
6. Trainer capacity at a glance ("who has room for 3 more clients?")
7. Package expiry automation with renewal prompts
8. Transparent trainer-facing dashboard (builds trust, reduces disputes)
9. Buffer time enforcement between sessions
10. Revenue leakage reporting (booked but not completed sessions)

---

## 9. Industry Benchmarks Quick Reference

| Metric | Benchmark |
|---|---|
| Trainer annual turnover | 30-80% |
| Replacement cost per trainer | $15,000-$30,000 |
| PT no-show rate | 15-20% |
| SMS reminder no-show reduction | 38-50% |
| Session utilization target | 70-80%+ |
| Client retention (healthy) | 65-70% |
| New clients per trainer/month | 1-5 |
| Payment collection rate (good) | 97% (most gyms: 85-90%) |
| PT revenue as % of total | Up to 52% |
| Revenue lost to cancellations | 15-30% per trainer |

---

## 10. What GymFlow Already Has vs. What's Missing

### Already Built
- PT sessions CRUD (create, list, update status)
- PT packages CRUD (create, list, track balance)
- Session status workflow (scheduled → completed/no-show/late-cancel/cancelled)
- Package auto-sync (deducts sessions, derives status)
- Trainer availability management (weekly slots + time off)
- Low-balance WhatsApp alert (automated)
- Session booking with conflict detection (trainer + member)
- Trainer filter on PT page
- Book Session modal

### Missing (Priority Order)
1. **Trainer profile cards / directory** — no visual representation of trainers
2. **Staff management page** — no way to invite, manage roles, or set permissions
3. **Per-trainer performance dashboard** — no revenue, utilization, or retention metrics
4. **Commission tracking** — no commission rules, no automated calculation, no reports
5. **Trainer detail page** — no bio, certifications, client list, or schedule view per trainer
6. **Role-based access control UI** — permissions exist in code but no UI to configure them
7. **Session calendar view** — only list view exists, no visual calendar
8. **Client-trainer assignment management** — assignment exists in DB but no UI to view/change
9. **Staff activity log** — no audit trail visible in the UI
10. **Payroll / revenue reports per trainer** — no dedicated reporting
