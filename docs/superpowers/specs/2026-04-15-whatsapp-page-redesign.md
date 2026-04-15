# WhatsApp Automations Page — Redesign Spec

**Date:** 2026-04-15
**Status:** Approved
**Audience:** Gym owners (non-technical)

---

## Problem

The current WhatsApp automations page renders 8+ full-width Cards stacked vertically in the Templates tab. Every section is fully expanded at all times, forcing gym owners to scroll through content irrelevant to their current task. The page feels overwhelming and does not have a clear primary action.

---

## Solution

Replace the Templates tab's long card stack with a **compact 2-column automation grid**. Each automation is represented as a small card showing name, description, on/off status, and a toggle. Editing a template opens a **slide-over panel** (shadcn `Sheet`) containing the existing split-pane editor. Queue and Broadcast tabs are unchanged.

---

## Design System Constraints

All implementation must follow the existing design system:

| Token | Value | Usage |
|---|---|---|
| `bg-background` | `#141414` dark charcoal | page background |
| `bg-card` | `#1e1e1e` | card surfaces |
| `border-border` | `#2a2a2a` | all borders |
| `bg-input` | `#3a3a3a` | inputs |
| `text-foreground` | `#e8e4df` warm off-white | primary text |
| `text-muted-foreground` | `#8a8578` warm gray | secondary text |
| `text-primary` / `bg-primary` | `#e63946` deep red | active states, CTAs |
| `text-success` | `hsl(var(--success))` — defined in globals.css | enabled status |
| `text-warning` | `hsl(var(--warning))` — defined in globals.css | partial status |
| `--radius: 0rem` | **zero** | **no border radius anywhere** |
| `font-heading` | IBM Plex Sans heading | headings only |
| `font-sans` | IBM Plex Sans | body text |

**No hardcoded hex values. No `rounded-*` classes (radius is 0). All colors via design tokens.**

---

## Layout: Templates Tab

### Before
8+ full-width Cards stacked vertically: master toggle → welcome card → renewal card → post-expiry card → onboarding card → behavior card → sequences table → lifecycle collapsible → automation control center.

### After

```
┌─────────────────────────────────────────────────────┐
│  [Templates] [Queue] [Broadcast]    ← tabs unchanged │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Lifecycle Automations          [Switch: ON]      │ │
│  │ Automatically message members at key moments    │ │
│  │                                                  │ │
│  │  ▸ Advanced settings  (collapsible, closed)     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  AUTOMATIONS  (grid-cols-1 on mobile, grid-cols-2 on sm+) │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Welcome     [ON] │  │ Renewal     [ON] │          │
│  │ Sent on start    │  │ 7 days before    │          │
│  │ ● Enabled  Edit→ │  │ ● Enabled  Edit→ │          │
│  └──────────────────┘  └──────────────────┘          │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Post-Expiry [ON] │  │ Onboarding [OFF] │          │
│  │ Re-engage lapsed │  │ First week       │          │
│  │ ⚠ Partial  Edit→ │  │ ○ Off      Edit→ │          │
│  └──────────────────┘  └──────────────────┘          │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Habit &Streaks   │  │ Active Sequences │          │
│  │ Motivate attend  │  │ Members in flow  │          │
│  │ ○ Off      Edit→ │  │ ● 4 active View→ │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Loading State

While page data is loading:
- The master toggle Card **is rendered** (not skeletonized): Switch is `disabled`, subtext replaced by a `<Skeleton className="h-3 w-48" />`.
- Below it: a 2-column grid of 6 skeleton cards (same grid dimensions as the real grid). Each skeleton card has 3 `<Skeleton>` elements: title, description, and status line. No spinner.

### Error State

If the initial data fetch fails, render the master toggle Card in a disabled state and replace the grid with a single full-width muted error message: "Could not load automations. [Retry]" where Retry calls the existing `fetchAutomationsConfig` function — same function used on page mount. No skeleton — just the message.

### Odd Number of Cards

If the automation set results in an odd card count, the last card stays at half-width in its grid column. It does not stretch to fill the row.

---

## Master Toggle Row

A single `Card` at the top of the Templates tab:
- Left: heading "Lifecycle Automations" + subtext "Automatically send messages when members hit key moments"
- Right: `<Switch>` bound to `automationConfig.enabled`
- **While page data is loading:** Switch is `disabled`; show skeleton in place of the subtext
- **On page data error:** Switch is `disabled`; show error copy inline (see Error State above)
- When off: the grid below dims (`opacity-60`) and each individual `<Switch>` receives `disabled={true}` (not just CSS — HTML disabled attribute for keyboard/screen reader correctness). The Edit and View buttons on all cards remain enabled when master is off — gym owners can still view and edit templates even if automations are paused.
- Uses existing `handleToggleEnabled` API call — no new endpoint
- **Advanced Settings collapsible state:** Always resets to collapsed on page load and navigation. Not persisted to localStorage or session.

**Advanced Settings collapsible** (inside the master toggle Card, below the heading row):
- Use shadcn `<Collapsible>` + `<CollapsibleTrigger>` + `<CollapsibleContent>` (Radix-based, available in the project)
- Collapsed by default
- Trigger label: "Advanced settings" chevron icon rotates on open; `<CollapsibleTrigger>` handles `aria-expanded` automatically
- Content: move the inner content of the existing Automation Control Center Card (the grid of controls, branch toggles, delivery window) into `<CollapsibleContent>`. **Strip the outer Card shell and Card heading** — do not nest a Card inside a Card. Preserve the inner grid layout as-is.
- This is the one and only location for the Automation Control Center — it does not appear anywhere else

---

## Automation Card — Standard Variant

Each standard automation card in the grid:

1. **Start border accent** (3px logical property, no other border treatment):
   - Enabled → `border-s-[3px] border-s-success`
   - Partial → `border-s-[3px] border-s-warning`
   - Disabled → `border-s-[3px] border-s-border`
2. **Name** — `text-sm font-semibold text-foreground`
3. **Description** — `text-xs text-muted-foreground` (one line, plain English)
4. **Toggle** — `<Switch>` top-right; `disabled={!automationConfig.enabled}`; toggling calls the existing enable/disable API for that automation. On API failure: revert the switch to its previous value and show an error toast. Use optimistic update (flip switch immediately, revert on error).
5. **Status line** — `text-xs`. Status logic differs by automation type:
   - **Single-message automations** (Welcome, Renewal — one message, no day slots): Status is `Enabled` if `enabled === true` AND the message string is non-empty; `Disabled` if `enabled === false`; `Partial` is not applicable. N is always 1 — display "● Enabled · 1 message".
   - **Multi-day automations** (Post-expiry, Onboarding, Behavior — day-keyed arrays): Status is `Enabled` if `enabled === true` AND all day slots have a non-empty message; `Partial` if `enabled === true` AND at least one day has a message but not all slots do; `Disabled` if `enabled === false`. N = count of days with a non-empty message, M = total day slots.
   - Display: `text-success` "● Enabled · N message(s)" / `text-warning` "⚠ Partial · N of M days set" / `text-muted-foreground` "○ Disabled"
6. **Edit button** — ghost variant, `text-xs`; opens the Template Editor Sheet for this automation. **Remains enabled even when master toggle is off** — gym owners should be able to edit templates while automations are paused.

Grid role: `role="list"` with each card as `role="listitem"` and `aria-label="[Name] automation"`. Do not add `role="article"` — an element cannot hold both `listitem` and `article` roles.

---

## Automation Card — Sequences Status Variant

The **Active Sequences** card is a distinct variant — it shows live status, not an editable template:

1. **Start border accent** — `border-s-[3px] border-s-success` if count > 0, else `border-s-[3px] border-s-border`
2. **Name** — "Active Sequences" (`text-sm font-semibold text-foreground`)
3. **Description** — "Members currently in a sequence" (`text-xs text-muted-foreground`)
4. **No toggle** — this card has no Switch; count is read-only
5. **Status line** — `text-xs text-success` + "● N active sequence(s)" or `text-muted-foreground` + "○ No active sequences". **Data source:** the count is derived from the existing `sequences` state array (already fetched by the page) — `sequences.length`. No new fetch needed.
6. **View button** — ghost variant, `text-xs`; opens the Sequences View Sheet. **Remains enabled even when master toggle is off** (same rule as Edit buttons on standard cards).
7. **When master is off:** the card dims with the rest of the grid (`opacity-60` applied by the parent wrapper) — the View button is still enabled.

This is a separate JSX block from the standard card — not a shared component with extra props.

---

## Slide-Over (Sheet) — Template Editor

Uses shadcn `Sheet` component with `side={lang === 'ar' ? 'left' : 'right'}`.

Width is set via `className` on `SheetContent`. Check the installed `saas-web/components/ui/sheet.tsx` for any default width classes (shadcn versions vary between `w-3/4`, `w-[400px]`, etc.). Override completely with: `className="w-full sm:w-[600px] sm:max-w-[600px]"` — ensuring default width styles are overridden, not just supplemented. **Not** a `size` prop (shadcn Sheet has no size prop).

**Sheet header (`SheetHeader`):**
- `SheetTitle`: "Edit: [Automation Name]"
- `SheetDescription`: plain-English description of the automation

**Sheet body:**
- The **existing split-pane editor layout** moved inside — no layout changes to the editor itself:
  - Left pane: day picker (sub-tabs), message textarea, placeholder hint
  - Right pane: WhatsApp live preview (`WaPreview`/`WaBubble`)
- Scrollable via `overflow-y-auto` on the body container

**Sheet footer (`SheetFooter`):**
- "Discard" ghost button → closes sheet without saving; no dirty-state warning (the sheet can always be closed without confirmation)
- "Save" primary button → calls existing save API; while in flight the button is `disabled` and shows a `<Loader2 className="animate-spin" />` icon in place of text; on success: closes sheet and updates the in-memory automation state directly (optimistic local update — no re-fetch needed); on failure: shows error toast, sheet stays open, button returns to normal

**Dirty state:** No confirmation dialog when closing with unsaved changes. The user is responsible for using the Discard or Save buttons explicitly.

---

## Sequences View (Sheet)

The "View →" button on the Active Sequences card opens a `Sheet` (`side={lang === 'ar' ? 'left' : 'right'}`, `className="w-full sm:w-[700px] sm:max-w-[700px]"` on SheetContent — same override pattern as the Template Editor Sheet).

Content: the existing sequences table moved verbatim from its current inline position. No layout changes to the table itself.

**Loading state inside Sheet:** Sequences are fetched eagerly on page load (existing behavior). By the time the user opens this Sheet, data is already in state. No separate loading state is needed inside the Sheet.

**Empty state inside Sheet:** If `sequences.length === 0`, show the existing empty state copy: "No active sequences. When members enter a lifecycle, their progress will appear here." — centered, `text-muted-foreground`.

---

## i18n Strings

All new strings use inline `lang === 'ar' ? '...' : '...'` ternaries — **this is the existing pattern in `page.tsx`**; there is no separate translations file. All new strings follow the same inline pattern:

| Key / Concept | EN | AR |
|---|---|---|
| Master card heading | "Lifecycle Automations" | "أتمتة دورة الحياة" |
| Master card subtext | "Automatically send messages when members hit key moments" | "إرسال رسائل تلقائية عند المحطات المهمة للأعضاء" |
| Advanced settings trigger | "Advanced settings" | "إعدادات متقدمة" |
| Status: enabled | "Enabled · {n} message(s)" | "مفعّل · {n} رسالة" |
| Status: partial | "Partial · {n} of {m} days set" | "جزئي · {n} من {m} أيام" |
| Status: disabled | "Disabled" | "معطّل" |
| Edit button | "Edit" | "تعديل" |
| Sheet title prefix | "Edit:" | "تعديل:" |
| Discard button | "Discard" | "تجاهل" |
| Save button | "Save" | "حفظ" |
| Active sequences status | "{n} active sequence(s)" | "{n} تسلسل نشط" |
| No sequences | "No active sequences" | "لا توجد تسلسلات نشطة" |
| View button | "View" | "عرض" |
| Skeleton a11y | "Loading automations…" | "جارٍ تحميل الأتمتة…" |

---

## Accessibility

- Grid: `role="list"` with each card as `role="listitem"` + `aria-label="[Name] automation"`
- Sheet: shadcn `Sheet` provides `role="dialog"`, `aria-modal="true"`, and focus trap
- Toggles: `<Switch>` with `aria-label` + `disabled` attribute when master is off
- Status text: not color-only — always paired with a visible text label
- Advanced collapsible: `aria-expanded` + `aria-controls`
- Keyboard: Sheet closeable via Escape key (shadcn default behavior)

---

## RTL

- Grid: standard `grid-cols-2` (works correctly in RTL)
- Card border accent: `border-s-[3px]` (logical start — left in LTR, right in RTL) — **use `border-s-*` throughout, never `border-l-*`**
- Sheet side: `side={lang === 'ar' ? 'left' : 'right'}` on all Sheet instances
- All editor pane text: `text-start`/`text-end`, `ps-`/`pe-`

---

## Files to Change

| File | Change |
|---|---|
| `saas-web/app/dashboard/whatsapp/page.tsx` | Replace Templates tab content; editor split-pane is fully inlined here — no separate component file. No separate i18n file — all strings are inline ternaries in this file. |
| `saas-web/components/ui/sheet.tsx` | Add if not present (shadcn Sheet); install `@radix-ui/react-dialog` if needed |

No new API endpoints. No new data fetching. All existing state management unchanged.
