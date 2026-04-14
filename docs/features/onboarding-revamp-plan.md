# Onboarding Revamp — Pre-Research Action Plan

**Date**: 2026-04-13
**File**: `saas-web/components/dashboard/import/ImportOnboardingFlow.tsx` (1075 lines)
**Page**: `saas-web/app/dashboard/onboarding/page.tsx` (thin wrapper)

---

## Audit Score: 13/20 (Acceptable — significant work needed)

| Dimension | Score | Top Issue |
|---|---|---|
| Accessibility | 2/4 | Native `<input type="checkbox">` at L1030; no ARIA on step cards |
| Performance | 3/4 | Good memo + cancel patterns; large monolith but acceptable |
| Responsive | 3/4 | `xl:grid-cols-6` step bar tight on mobile |
| Theming | 3/4 | Stat values use `font-bold` not `font-stat`; h1 missing `font-heading` |
| Anti-Patterns | 2/4 | Nested cards; step grid reads as metrics dashboard not stepper |

## Critique Score: 21/40 (Needs Work)

| Heuristic | Score | Issue |
|---|---|---|
| Visibility of System Status | 2/4 | All step cards show "Active" from start; no current-step highlight |
| Match System / Real World | 2/4 | "Map Columns" jargon; WhatsApp checklist comes after import |
| User Control and Freedom | 2/4 | No confirmation before execute; no re-map without re-upload |
| Consistency and Standards | 2/4 | Native checkbox, wrong stat font, rounded-lg, "Format" English-only |
| Error Prevention | 2/4 | No execute confirmation dialog |
| Recognition Rather Than Recall | 3/4 | Auto-mapping is excellent; template list helps |
| Flexibility and Efficiency | 2/4 | Linear scroll only; no step-jumping; no keyboard shortcuts |
| Aesthetic and Minimalist Design | 2/4 | Safety rules + template shown before upload — premature |
| Error Recovery | 2/4 | Generic toasts; no partial-completion feedback |
| Help and Documentation | 2/4 | No tooltips on "card code" or mapping; no help link |

---

## User Decisions (confirmed)

1. **Scope**: Address ALL issues
2. **Stepper style**: Option B — Numbered circles with step labels below, current step highlighted in accent red `#e63946`
3. **Success moment**: Option B — Prominent success card with subtle animation (fallback to A if B not satisfying)

---

## Pre-Research Action Plan

### Priority Order

| Priority | Skill | What |
|---|---|---|
| P0 | `/harden` | Add execute confirmation dialog (irreversible action gate) |
| P1 | `/arrange` | Replace 6-card step grid with proper horizontal stepper (Option B: numbered circles, line connector, accent red current step) |
| P1 | `/distill` + `/arrange` | Hide safety rules + template columns cards until after upload succeeds |
| P1 | `/delight` | Add success/celebration moment: prominent success card with subtle animation + "X members imported" + clear CTA to dashboard |
| P1 | `/clarify` | "Map Columns" → "Match Your Columns"; fix "card code" label; fix dead-end desktop backup branch |
| P1 | `/typeset` | h1: add `font-heading tracking-tight`; all 8 stat values → `font-stat tracking-wide`; row numbers → `tabular-nums` |
| P1 | `/harden` | Replace native checkbox with shadcn `Checkbox`; add `aria-pressed` to source buttons; add missing "Format" i18n key; `aria-label` on table |
| P2 | `/normalize` | Remove `rounded-lg` from source buttons; consolidate Badge className patterns |
| P2 | `/arrange` | Replace nested mini-cards (preview stats, execution results) with `divide-x` stat rows |
| P3 | `/polish` | Final detail pass |

### Specific Code Locations

| Fix | File | Lines |
|---|---|---|
| h1 typography | ImportOnboardingFlow.tsx | 644 |
| Step progress bar | ImportOnboardingFlow.tsx | 655–678 |
| Source mode buttons `rounded-lg` | ImportOnboardingFlow.tsx | 695 |
| Safety rules card (hide until post-upload) | ImportOnboardingFlow.tsx | 800–810 |
| Template columns card (hide until post-upload) | ImportOnboardingFlow.tsx | 786–798 |
| Nested preview stats cards | ImportOnboardingFlow.tsx | 889–924 |
| Execute button — add confirmation | ImportOnboardingFlow.tsx | 972 |
| Nested execution result cards | ImportOnboardingFlow.tsx | 987–1011 |
| Native checkbox → shadcn Checkbox | ImportOnboardingFlow.tsx | 1030–1040 |
| Stat values font-stat (x8) | ImportOnboardingFlow.tsx | 892, 898, 904, 910, 990, 996, 1002, 1008 |
| Hardcoded "Format" string | ImportOnboardingFlow.tsx | 774 |
| Row number tabular-nums | ImportOnboardingFlow.tsx | 946 |
| Success/go-live celebration | ImportOnboardingFlow.tsx | 1046–1056 |
| `goToDesktopImport` label reuse bug | ImportOnboardingFlow.tsx | 1062–1063 |
| `recoveryHint` visibility | ImportOnboardingFlow.tsx | 730–736 |

### Design Decisions Locked

- Stepper: numbered circles (1–6), thin line connector, circle fills accent red when done, red border when current, muted when upcoming
- Stats: `font-stat` + `tracking-wide` (Bebas Neue) — no `font-bold`
- Success card: full-width, animated entrance, shows member count prominently, includes CTA button to `/dashboard`
- Execute: requires confirmation dialog before running
- Info cards: safety rules + template columns collapse to hidden until `artifact` is set

---

## Research Questions (for /autoresearch)

1. What's the best UX pattern for multi-step wizard progress indicators in SaaS products? (step dots vs numbered circles vs sidebar)
2. How do top gym/fitness SaaS products handle data migration/import onboarding?
3. What confirmation patterns work best before irreversible bulk actions?
4. How should a data import success state be designed to build trust and guide next steps?
5. What microcopy patterns reduce anxiety in high-stakes data migration flows?
