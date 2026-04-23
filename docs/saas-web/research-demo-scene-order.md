# Research: Demo Video Scene Order & Feature Grouping

> Compiled April 2026 — focused research on scene sequencing with Reports as hero feature

---

## The Core Finding

**Reports/Analytics goes at the 70-80% mark** — not first, not middle, not very last.

Why:
- Placing the emotional peak too early causes retention drops (viewers feel resolution is complete)
- The Freytag dramatic structure places climax at ~75% through the narrative
- Operational features must come first to build trust in the data
- Every gym software demo observed leads with check-in/members, ends with analytics
- A brief CTA/resolution follows the hero (not the other way around)

---

## Feature Grouping (11 features → 8 scenes)

### The Three Mental Models

| Category | Features | User Question |
|---|---|---|
| **Operational** (daily staff tasks) | QR Scanner, Guest Passes, Notifications | "What happens when members show up?" |
| **People Management** (admin-level) | Members List, Member Detail, Subscriptions, PT Hub | "Who are my members and what are they doing?" |
| **Strategic/Financial** (owner-level) | Dashboard, Reports/Analytics, Income/Revenue, WhatsApp Automation | "How is my business performing?" |

### Natural Groupings

| Group | Features | Why Together | Duration |
|---|---|---|---|
| A — The Welcome | QR Scanner + Dashboard | Action + consequence (scan → stats update) | 10-12s |
| B — Your Members | Members List → Member Detail | Drill-down flow (list → click → profile) | 8-10s |
| C — The Money | Income/Revenue + Subscriptions | Two views of cash flow | 8-10s |
| D — Stay Connected | WhatsApp Automation + Notifications | Communication layer (send → receive) | 6-8s |
| E — Operations Montage | Guest Passes + PT Hub | Quick visual sweep, self-evident features | 5-6s |
| **HERO** | Reports/Analytics | Full dedicated scene, 3x screen time | 14-18s |

---

## Recommended Scene Order (75 seconds)

### Scene 1 — Hook / Problem (0-5s)
- Bold text on dark background: "Running a gym shouldn't feel like a second full-time job."
- OR: 2-second teaser flash of the analytics heatmap glowing, then cut to beginning
- Spring-animated text, large (64px+), by second 1

### Scene 2 — QR Scanner + Dashboard (5-17s) — 12s
- Member scans QR at the gym door (beep, green flash, ACCESS GRANTED)
- Cut to Dashboard: "In Gym Now: 47" counter animates up, revenue stat visible
- Establishes the operational heartbeat — "this is your gym's front line"
- Transition: slide from-right

### Scene 3 — Members + Member Detail (17-27s) — 10s
- Scroll through searchable member list (cursor types "Samer")
- Click into one member → profile opens (subscription status, attendance, badge)
- Natural drill-down: list → detail
- Transition: fade (drill-down feel)

### Scene 4 — Revenue + Subscriptions (27-37s) — 10s
- Revenue chart with collection rate badge (82% collected)
- Quick cut to subscription list with renewal alerts, expiring plans flagged
- "Track every riyal, every renewal"
- Transition: slide from-right

### Scene 5 — WhatsApp Automation + Notifications (37-45s) — 8s
- Automated WhatsApp renewal message being sent (message appears, sent indicator)
- Notifications feed showing alerts firing
- "GymFlow keeps members engaged — automatically"
- Transition: slide from-right

### Scene 6 — Guest Passes + PT Hub Montage (45-51s) — 6s
- Guest pass invite card (2s flash)
- PT Hub session card (2s flash)  
- Quick visual sweep — no narration needed, self-evident
- "From guest passes to personal training — all in one place"
- Transition: fade (brief dark flash between montage items)

### Scene 7 — HERO: Reports & Analytics (51-67s) — 16s
**This is the emotional climax. Different pacing, different energy.**

Structure:
- **0-2s**: Full dashboard overview appears with staggered panel fade-up (80-120ms delays)
- **2-5s**: Progressive zoom to attendance heatmap. Voice shift: "And when you need to see the full picture..."
- **5-8s**: Bar chart grows from bottom, KPI numbers count up from 0 (ease-out deceleration)
- **8-12s**: Zoom into specific heatmap cell → insight callout pulses in: "Thursday 7pm: 34% no-show rate — highest of any class"
- **12-14s**: Pull back to full dashboard view. 1-2 seconds of silence + ambient music swell
- **14-16s**: "Every decision. Already made for you."

Production techniques for this scene:
- Slower pace than everything before (contrast = importance)
- Music swells into the callout reveal
- 1-2 seconds of silence while insight callout is on screen
- Most saturated color in the entire video appears on the key insight
- Camera moves continuously (no hard cuts) — spatial coherence
- Depth-of-field blur on surrounding panels during zoom

### Scene 8 — CTA (67-75s) — 8s
- Logo spring-animates in (center, 15-20% frame width)
- Tagline below: "Your gym. On autopilot."
- CTA button: "Start your free trial"
- Music gentle fade, single soft chime as logo appears
- Subtle looping background animation (glow pulse)

---

## Reports Scene — Deep Dive Techniques

### Chart Animation Specs

| Chart Type | Animation | Duration | Stagger |
|---|---|---|---|
| Bar chart | `scaleY: 0 → 1` from bottom | 0.6-0.7s per bar | 100ms between bars |
| Line chart | SVG `pathLength: 0 → 1` | 1.2-1.5s | Data points pop after line completes |
| Donut/pie | Clockwise sweep from 12 o'clock | 0.8s per segment | 150ms between segments |
| KPI numbers | Count from 0 → final value | 1.5-2s | Ease-out (decelerate at final number) |
| Dashboard panels | Fade-up: `opacity: 0, y: 20 → opacity: 1, y: 0` | 0.5s each | 150ms stagger |

### The Insight Callout Pattern
1. Cursor/camera moves to target data point
2. Highlight ring pulses: `scale: 0.8 → 1.2 → 1.0` (0.4s)
3. Label card slides in: `y: 10 → y: 0, opacity: 0 → 1` (0.3s)
4. Label content: [Data value] + [Why it matters]
5. Hold 3-5 seconds for reading
6. Fade out, camera pulls back

### Progressive Disclosure (3 Layers)
- **Layer 1 — Overview (2-3s)**: Full dashboard visible, voice says "your entire gym at a glance"
- **Layer 2 — Category focus (3-5s)**: Zoom to one section, other sections dim to 20-30% opacity
- **Layer 3 — Drill-down insight (5-8s)**: Zoom to specific data point with callout annotation

### Color for Charts on Dark Background
- Hero metric: single fully saturated accent (brand red #e63946 or bright cyan)
- Chart lines: 70%+ saturation to "glow" against dark surface
- Other panels during zoom: reduce to 20-30% opacity + desaturate to gray
- Gridlines: RGB(60-80) — barely visible
- Max 5 distinct data colors per chart
- Heatmap diverging scale: cold blue (#2E86AB) → neutral → warning red (#E84855)

### Making Numbers Meaningful
1. **Name what it means**: Not "revenue up 23%" but "that's 4,200 SAR recovered from members who would have churned"
2. **Show the delta**: Arrow animated from flat → pointing up, +18% badge
3. **Count-up + hold + voiceover**: Numbers land → 1s silence → voice delivers meaning
4. **Comparative anchoring**: "Before: 47 hours manual reporting. After: 12 minutes."
5. **Connect to human story**: "Ahmed used to chase members by phone. Now the system flags who needs attention."

---

## Narrative Tension Techniques (Building to Reports)

### Technique 1 — Breadcrumb Questions
Each scene before Reports should raise a question only analytics can answer:
- Scanner scene: "You can see who checked in — but which hours are actually profitable?"
- Members scene: "You can see their profile — but who's genuinely at churn risk?"
- Revenue scene: "You can see the revenue — but which trainer drives the most retention?"
- Reports answers ALL of these at once

### Technique 2 — Escalating Sophistication
Start tactile (QR beep = satisfying), progress toward intelligence (analytics = powerful). The product feels like it gets "smarter" as the video progresses.

### Technique 3 — Visual Contrast
Operational screens = transactional (lists, forms, buttons). Reports = dramatic visual shift (heatmaps, flowing charts, color-coded risk). The contrast makes Reports feel like an upgrade.

### Technique 4 — The Register Shift
All previous voiceover: feature-explanation voice ("tap to check in, see all your members")
Reports voiceover: business-outcome voice ("know exactly where your revenue is at risk")

---

## Key Numbers

| Element | Spec |
|---|---|
| Total video length | 70-75 seconds |
| Number of scenes | 8 |
| Hero (Reports) duration | 14-18 seconds (3x any other feature) |
| Dedicated feature scene | 6-12 seconds |
| Montage flash per feature | 1.5-2 seconds |
| Chart animation total | Under 3 seconds |
| Insight callout hold | 3-5 seconds |
| Silence beat after insight | 1-2 seconds |
| CTA closing frame | 5-8 seconds |

---

## What NOT to Do

- Don't open with analytics (no trust in data yet)
- Don't save Reports for the very last frame (CTA needs its own moment)
- Don't show all 11 features as separate scenes (video becomes a checklist)
- Don't hold a complex dashboard static for more than 3s without movement
- Don't use generic data (use realistic gym names, SAR amounts, class times)
- Don't rush the Reports scene (it's the payoff — let it breathe)
- Don't use the same pacing throughout (fast problem → medium features → slow hero → decisive CTA)

---

*Sources: 30+ pages across Supademo, Descript, VideoToBlog, Motionvillee, ADVIDS, Clueso, SigmaComputing, Mixpanel, Grafana, Pugalia directing guide, ForEntrepreneurs, DataWeaver, and gym management software demos.*
