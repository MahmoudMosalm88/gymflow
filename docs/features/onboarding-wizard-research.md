# Onboarding Wizard — Final Research Findings

**Date**: 2026-04-14
**Research gaps covered**: 5/5

---

## Gap 1: Best UX pattern for non-tech SMB owners ✅ FILLED

### Winner: Conversational step-by-step (one question at a time, full screen)

| Pattern | Completion rate |
|---|---|
| Traditional single-page form | 21.5% |
| Conversational one-at-a-time | 47.3% |
| In-app traditional | 22% |
| In-app conversational | 85% |

Source: Typeform 2024 (2.6M forms), SurveySparrow 2025

### Why it wins for non-tech users
- Eliminates "form dread" — feels like conversation, not bureaucracy
- Removes decision paralysis: >4 simultaneous choices drops completion up to 60% (Carnegie Mellon)
- Mobile-native by default: no scrolling, no pinching
- Each completed step = small win → builds confidence for low-literacy users
- "TurboTax meets GPS" — the framework OnRamp uses for non-tech clients (liquor stores, pharmacists, parking staff): one task at a time, zero jargon, instant visual confirmation

### Key data points
- Each field beyond 3–4 fields reduces completion by 3–7% (Nielsen Norman Group)
- 38% of users drop off after the first screen
- Just Eat: one-question-per-page = 2 million extra orders per year
- BrokerNotes: 11% → 46% conversion switching to multi-step
- Endowed progress effect: showing "Step 2 of 5" nearly doubles completion (19% → 34%)

---

## Gap 2: How leading SaaS onboards non-tech SMB owners ✅ FILLED

### Shopify
- Dashboard checklist — NOT a blocking wizard. User lands in real dashboard immediately.
- Checklist items are collapsed accordions with 1-line labels + one CTA button each
- Import is never the gate — it's a checklist item, not the first action
- Copy: extremely short (1 line per item)

### Fresha (salon/spa — closest analog to GymFlow)
- 8-step workspace creation wizard at signup (one task per step)
- Video Academy: 9 lessons, 12 minutes total — includes dedicated lessons for "Import client list" and "Import product stock"
- Users can be up and running in under 15 minutes
- Copy: warm, encouraging, conversational ("Let's get started!")

### Square
- 8 linear steps documented in help article + mirrored in app
- Import uses pre-formatted template — no column guessing required
- Heavy reliance on help documentation as onboarding mechanism

### Universal patterns across all
1. None present "import vs start fresh" as a binary equal choice — import is assumed or primary
2. Checklists outperform full wizards for complex setups (66% of leading SaaS use checklists)
3. Data import is always optional/secondary, never the gate
4. 5–9 steps for initial setup; step count matters less than time-to-first-value
5. "Aha moment" comes fast — under 60 seconds for activation

### MENA market gap
**No major fitness SaaS has a localized self-serve onboarding for Arabic-speaking gym owners.** Wellyx, Mindbody, Glofox all use demo-first or human-mediated onboarding. This is an open opportunity.

---

## Gap 3: Optimal steps and copy for low-literacy onboarding ✅ FILLED

### Optimal step count
- **3–4 steps is the sweet spot**
- 5 screens: completion drops to 35–40%
- Each step beyond 5 costs 10–15% of remaining users
- Mobile-first markets (MENA): 3–5 steps max; each step beyond 5 costs 20–30%
- Endowed progress framing matters more than raw count: "2 of 10 complete" at launch jumped completion from 40% → 91%

### Optimal copy
- **6th-grade reading level for primary screens** (Harry Potter early books = Grade 5.3, Flesch Ease ~72 — good target)
- 8th-grade max for supporting screens
- One proposition per screen — never stack multiple asks
- Lead with the most important point on every screen (many users read only the first line)
- Active voice: "Add your first member" not "Members can be added"
- Low-literacy users "plow" text word-by-word — they miss sidebars, secondary elements, navigation
- 12% improvement in checklist completion from rewriting copy from grade 10-12 → grade 6-7

### Mobile (critical for MENA)
- Saudi Arabia smartphone penetration: 97%. UAE: similar.
- 60% of Arabic speakers prefer browsing in Arabic; in Saudi/Egypt that rises to 97%
- Desktop completion: 55.5% → Mobile: 47.5% for traditional forms. Step-by-step eliminates this gap.
- Mobile bounce on forms: 67.4% vs 32% desktop — solved by one-screen-at-a-time
- Thumb zone: primary CTAs must be bottom-center
- Minimum 44–48px tap targets
- Single-column layouts only (no side-by-side fields)
- Sticky bottom CTA buttons

### Arabic/RTL
- RTL is not a CSS mirror — navigation direction, button placement, progress bars, icon direction all need rebuilding
- Arabic text expands 20–30% vs English equivalents — affects layout
- Modern Standard Arabic for universal clarity; regional warmth in key emotional moments (welcome, success)
- No published quantitative data on Arabic-specific onboarding completion rates — genuine gap

---

## Gap 4: "Start fresh vs import" choice framing ✅ FILLED

### Key finding: Don't present as a binary equal choice

**Winner pattern**: Import is the primary CTA. "Start manually" is a quiet secondary link below. NOT two equal cards.

Evidence:
- When "Skip" is visually equal to primary action, completion drops dramatically
- When demoted to smaller text below main CTA, completion improved 10%+ (deferral button research, 2025)
- Mozilla Foundation 2018: auto-importing data solved the blank slate problem most effectively
- Smashing Magazine: "Companies paying for software are most likely not starting from scratch. They're running an established business."

### What happens to "start fresh" users
- Significantly more likely to churn within week 1
- 80% of new SaaS users churn in week 1 if they don't reach value quickly
- "Start fresh" users find a blank dashboard — no value to find — disproportionately in this 80%
- Deferred importers largely DO NOT come back without a contextual in-app nudge
- Recommendation: after "start fresh" user adds 2–3 members manually, show nudge to import the rest

### How real products handle it
- **Mailchimp**: never asks "import or start fresh" — assumes you have contacts, asks HOW to bring them in
- **Shopify**: assumes you have products; "Import products" is featured, "Add product" is secondary
- **Pipedrive**: frames import as "keep your leads with you" — retention framing, not setup framing
- **ZenPlanner** (gym software): "Migrate and organize your data" is Step 3 of 4 — presented as required, not optional

### Anxiety-reducing copy
| Fear | Copy |
|---|---|
| "What if it breaks my data?" | "Your original file is never changed. Preview before anything is saved." |
| "This will take forever" | "Takes about 2 minutes. Just upload a spreadsheet." |
| "What format does it need?" | "We accept Excel or CSV — whatever you already have." |
| "What if I mess up the mapping?" | "We'll auto-match your columns. You just confirm." |

---

## Gap 5: Full-screen wizard vs scrolling page ✅ FILLED

### Winner: Full-screen step-by-step — decisively

| Format | Completion |
|---|---|
| Single-page multi-field | 4.5% |
| Multi-step grouped | 13.9% |
| Conversational one-at-a-time | 47.3%–85% |

BrokerNotes A/B: 11% → 46%. Empire Flippers: +51.6% in 47 days.

### Critical caveat
Wins only when content is **genuinely removed** — not just redistributed across more screens. Splitting 15 fields into 5 screens of 3 each can perform WORSE than a clean 8-field single page. The screen count isn't the lever — the total cognitive work is.

### Progressive disclosure
- Nielsen Norman Group 2023: conditional stepwise fields cut "unnecessary early input by 68%"
- Users who see all future steps experience "mild panic" and default to "I'll deal with that later" — which for onboarding means they never return
- Teaching everything upfront: product tours showing 15 features in 3 minutes show NO measurable retention improvement — sometimes negative (Ebbinghaus: 70% of info forgotten within 24 hours without reinforcement)

### Mobile findings
- Per-question dropout: 18% per question (traditional) → 3% per question (conversational)
- Mobile bounce on forms: 67.4% vs 32% desktop — step-by-step eliminates by design
- 84% of users prefer filling forms on desktop with traditional formats — but conversational eliminates the mobile penalty

---

## Summary: How research changes the plan

| Original plan | Research verdict | Change |
|---|---|---|
| Welcome step with 2 equal big buttons | ❌ Binary choice increases drop-off | Remove binary choice. Import is the default. "Start without importing" is small text link at bottom. |
| 5 steps | ⚠️ Borderline | Compress to 4 steps by skipping "Welcome" screen. Upload IS step 1. |
| Option C conversational | ✅ Confirmed | Keep |
| Clean full-screen shell | ✅ Confirmed | Keep |
| Language switch visible | ✅ Confirmed | Keep |
| Step counter from step 2 | ✅ Confirmed | Keep (step 1 shows no counter) |
| Simplified go-live checklist | ✅ Confirmed | Keep (2 items max) |
| "Start fresh" as escape hatch | ✅ Confirmed — but demote it | Small text link, not a card or button |
| Geo-language detection | ✅ Confirmed (97% Arabic speaker preference) | Keep |
