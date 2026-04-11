# Income Page Revamp — Research & Plan

**Date:** April 9, 2026

---

## Current State (Problems)

1. **"Total Revenue" is all-time** — useless, grows forever, no context
2. **"Expected Monthly" is unexplained** — owner doesn't know how it's calculated
3. **No trend visualization** — monthly data exists but trapped in a table
4. **No filters** — can't filter by period, type, or payment method
5. **Tables look like spreadsheets** — thin borders, no shadows, no design system consistency
6. **5 sequential API fallback calls on load** — `fetchWithoutBranch` is a hack
7. **API fetches ALL rows then filters in JS** — breaks at scale
8. **20+ hardcoded bilingual strings** in payments page
9. **Clickable table rows have no keyboard support**
10. **No revenue chart** — the most obvious thing an income page should have

---

## Research Findings (Industry Best Practices)

### Stat Cards (recommended 4)
| Card | Why |
|---|---|
| This Month Revenue (with MoM delta) | The #1 number every owner checks |
| Last Month Revenue | Immediate comparison without mental math |
| PT Revenue This Month | Separates PT as its own revenue stream |
| Expected Revenue | From active subscriptions — shows predictable base |

### Revenue Trend Chart
- Area or bar chart, 6-12 months rolling
- Period tabs: This Month / 3 Months / 6 Months / This Year
- Monochromatic accent color (brand red for GymFlow)
- ChartKit MiniArea already installed

### Monthly Breakdown
- Keep the table but add month-over-month % change column
- Current month highlighted
- Click to drill into MonthCalendarDialog (already built)

### Payment Transaction List
- Add type filter (All / Subscription / PT / Guest)
- Add search
- Pagination stays
- Type badges already exist

### Key UX Patterns
- Period tabs > date picker (simpler, faster)
- Sparklines in stat cards (already supported by StatCard component)
- Failed/outstanding payments surfaced prominently
- Export CSV button near table header

---

## Implementation Plan

### Phase 1: Stat Cards + Revenue Chart
- Replace "Total Revenue" and "Expected Monthly" with 4 meaningful cards:
  - This Month (with delta vs last month)
  - Last Month
  - PT Revenue This Month
  - Expected Monthly (with subtitle explaining calculation)
- Add MiniArea chart showing 6-month revenue trend above the monthly table
- Use data already available from `/api/income/summary` + `/api/income/monthly`

### Phase 2: Visual Consistency + i18n
- Apply design system: `border-2`, `shadow-[6px_6px_0_#000000]` on all cards
- Move all 20+ hardcoded strings to i18n
- Fix clickable table row keyboard accessibility
- Remove `fetchWithoutBranch` hack

### Phase 3: Payments Page Filters
- Add type filter dropdown (All / Subscription / Renewal / PT / Guest)
- Move search + filter into SQL (stop fetching all rows)
- Add period filter tabs

### Phase 4: Polish
- Variable spacing (tight within groups, generous between sections)
- RTL verification
- Loading states per section instead of full-page spinner
