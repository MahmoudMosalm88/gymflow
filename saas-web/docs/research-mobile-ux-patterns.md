# Mobile UX Patterns Research
## GymFlow Pro — Dark Brutalist Design Reference
**Researched:** 2026-04-19 | **Design context:** 0px border-radius, hard offset shadows, single red accent (#EF4444)

---

## 1. Bottom Navigation Bar

### Best Practice Summary
3–5 tabs is the universal sweet spot — fewer lacks utility, more than 5 crowds thumb reach and hurts tap accuracy. The active indicator lives in the bar itself (not above), centered under/around the icon. Never skip labels on mobile; icon-only nav requires users to memorize meaning.

### Specific Values & Numbers

| Property | iOS | Android (Material 3) |
|---|---|---|
| Bar height | 49pt | 80dp |
| Icon size (regular) | 25×25pt | 24×24dp |
| Icon size (square glyph) | 23×23pt | 24×24dp |
| Icon size (compact bar) | 18×18pt | — |
| Label font | SF, 10pt, Medium | Material You, 12sp |
| Active indicator pill | — | 64dp wide × 32dp tall |
| Inactive icon opacity | 60% | 38% (on-surface) |
| Active icon opacity | 100% | 100% |
| Touch target minimum | 44×44pt | 48×48dp |
| Bar elevation | — | Shadow z=8dp |
| Optimal tab count | 3–5 | 3–5 |
| Min label contrast | 3:1 WCAG AA | 4.5:1 WCAG AA |

**Active indicator placement:** Bottom (under icon+label group) on iOS. Material 3 uses a pill shape centered behind the icon only — label stays outside the pill. Never use a top bar line as the active indicator on a bottom nav; that convention belongs to top tab bars.

**Thumb zones:** The bottom center is the most reachable zone on phones ≤6.1". Far-left and far-right tabs are hardest to reach one-handed. Put the most-used destination at center or center-right.

**Animation:**
- State change: 150ms ease-out (feels immediate, not jarring)
- Avoid fancy cross-fade transitions between tabs — they read as visual noise
- Icon scale on press: 0.9 → 1.0 at 100ms ease-out gives tactile feel

### What Top Apps Do
- **Instagram:** 5 tabs, thin top-line active indicator (unusual but brand-established)
- **Spotify:** 4 tabs, no label on inactive icons (violates best practice but has icon recognition)
- **Gmail:** 5 tabs, filled icon = active, outlined = inactive
- **WhatsApp:** 3 tabs (Chat, Calls, Communities) — minimal and fast
- **Recommendation for GymFlow:** 4 tabs (Dashboard, Members, Schedule, More). Active tab: filled icon + red accent color. Inactive: white at 50% opacity.

### Common Mistakes to Avoid
- More than 5 tabs — forces too-small targets and cognitive overload
- Icon-only without labels (acceptable only if icons have 100% recognition like camera or home)
- Truncating labels — always write short labels that fit on one line
- Using the bottom nav for actions (e.g., a "+" button) — use a FAB instead
- Hiding the nav bar on scroll — users lose spatial orientation

---

## 2. Card-Based List Layouts

### Best Practice Summary
Cards replace data tables on mobile by surfacing only the 3–4 most critical fields upfront, using progressive disclosure (tap to expand) for secondary data. The primary action goes inline (full card tap), secondary destructive actions go behind swipe. Staggered entrance animations (20–50ms between cards) communicate list structure without overwhelming the user.

### Specific Values & Numbers

**Card dimensions:**
- Minimum touch target height: **48px** (regular density); prefer 56px for lists
- Card padding: **16px** all sides (inner content padding)
- Card-to-card gap: **8px** (compressed layout) or **12px** (comfortable)
- Maximum fields shown before collapse: **3–4 fields**
- Text left-aligned; numbers right-aligned

**Row density presets:**
| Density | Row height | Use case |
|---|---|---|
| Condensed | 40px | Power users, dense data |
| Regular | 48px | Default mobile |
| Relaxed | 56px | Primary CTA rows, accessibility |

**Touch targets:**
- iOS HIG: 44×44pt minimum, 48×48pt recommended
- Android Material: 48×48dp minimum, 56×56dp recommended
- Elderly/accessibility mode: 60×60pt
- Inter-target spacing: **8pt minimum** between tappable areas

**Information hierarchy order (top to bottom inside card):**
1. Primary identifier (name, title) — largest text, ~16–17px, full opacity
2. Secondary descriptor (role, status, date) — 13–14px, 60–70% opacity
3. Tertiary metadata (tags, counts) — 12px, 50% opacity
4. Action zone (trailing edge or bottom of card)

**Action placement:**
- Primary action: Entire card tap
- Trailing icon actions (edit, more): Right edge, vertically centered
- Destructive action: Behind left swipe (never default visible)
- No more than 2 inline icon actions — use "..." overflow menu for more

**Staggered animation:**
- Delay between cards entering viewport: **20–50ms per item** (max 25ms for long lists)
- Card entrance: translate Y from +16px to 0, opacity 0 → 1
- Duration per card: **200–250ms ease-out**
- Start animating only when card enters viewport (IntersectionObserver)

### What Top Apps Do
- **Linear:** Cards with 3 fields, left accent color strip for status, swipe-to-archive
- **Notion mobile:** Single-line title + 1 tag visible, tap to expand
- **Stripe Dashboard:** Right-aligned monetary value, left-aligned name, status chip
- **Recommendation for GymFlow:** Member card = Avatar + Name + Membership tier (left) + "Active/Expired" status chip (right) + last check-in date below name

### Common Mistakes to Avoid
- Showing more than 4 fields on the card face (users scan, not read)
- Making the whole card a swipe target AND having inline tap actions (conflict)
- Stagger delays above 50ms per item — tail items feel broken
- Using card border alone (no elevation/shadow) to show selection state — add a 2px accent border + background tint

---

## 3. Swipe Gestures

### Best Practice Summary
Swipe-to-reveal (like iOS Mail) requires a minimum threshold before the action is committed — short swipes show the action, full swipes execute it. Always provide a visible tap alternative for every swipe action (accessibility requirement). RTL locales must mirror all directional swipes.

### Specific Values & Numbers

**Swipe reveal thresholds:**
- **Peek reveal starts:** 20–30px of horizontal movement
- **Action button fully visible:** when card has moved ~72–80px (width of 1 action button at 72dp)
- **Auto-commit threshold:** 40–50% of card width (e.g., on a 375px screen, ~150–180px)
- **Velocity-triggered commit:** >300–500px/s flick speed commits the action regardless of distance
- **Snap-back:** If released below threshold, animate back in 200ms ease-out

**Action button sizing:**
- Single action button width: **72dp / 72px**
- Two action buttons: **72dp each** (144dp total reveal)
- Action button height: matches card height (full-height)

**Gesture recognition angle tolerance:**
- Horizontal swipe recognized if: angle from horizontal is **≤30°**
- Beyond 30° is treated as a scroll gesture, not a swipe

**Haptic feedback timing:**
- When action button fully appears (threshold reached): light haptic
- When action is committed: medium haptic
- When snapping back: no haptic

**RTL handling:**
- Mirror all swipe directions: left swipe = archive becomes right swipe in Arabic/Hebrew/Persian
- CSS: `[dir="rtl"] .swipe-container { transform: scaleX(-1); }` or handle in JS touch events
- Action button order also mirrors (destructive action moves to left side in LTR becomes right side in RTL)

**Snap physics:**
- Resistance factor while dragging past threshold: 0.4× (drag feels heavy to prevent accidental commit)
- Spring-back tension: simulate with `cubic-bezier(0.34, 1.56, 0.64, 1)` at 300ms

### What Top Apps Do
- **iOS Mail:** Left swipe = archive (1 action, 72px) or more (full swipe = immediate delete)
- **Gmail:** Left swipe = archive, right swipe = mark read, both auto-commit at ~50% width
- **Todoist:** Left swipe = complete (with confetti haptic), right swipe = schedule
- **Recommendation for GymFlow:** Right swipe = quick check-in (green, 72px), Left swipe = more options (gray, triggers bottom sheet rather than inline buttons)

### Common Mistakes to Avoid
- Auto-committing on any touch movement without threshold check (causes accidental actions)
- Not providing tap alternatives (accessibility failure — some users can't swipe precisely)
- Revealing destructive actions on right swipe (counter to platform convention — right = positive/archive, left = destructive/delete on iOS)
- Forgetting to handle the case where a swipe starts mid-scroll (prevent conflicts with vertical scroll by checking initial gesture angle first)
- Same swipe direction for conflicting actions (e.g., left swipe = both delete and archive)

---

## 4. Pull-to-Refresh

### Best Practice Summary
Pull-to-refresh requires the user to be at the top of the scroll container (scrollY === 0). The pull threshold before the indicator snaps into committed position is 60–80px. The visual indicator stays visible until new content loads — don't hide it prematurely. For custom implementations, disable native browser pull-to-refresh first.

### Specific Values & Numbers

**Pull distance thresholds:**
- **Trigger zone starts:** 0–40px drag (indicator appears, but not committed)
- **Commit threshold:** **60–80px** pull distance (indicator locks in place, release fires refresh)
- **Elastic resistance:** Apply 0.4–0.5× resistance factor (actual movement = touch delta × 0.45) so pulling feels heavy/rubber-band
- **Max visual pull distance:** 80–100px (clamp content displacement here; additional drag is absorbed)

**Animation timing:**
- Indicator appearance on drag: real-time (no delay, follows finger position)
- Spinner lock-in after commit: immediate on release
- Loading spinner: 1.5s infinite loop, ease-in-out
- Content snap-back on cancel (released before threshold): **300ms ease-in-out**
- Content snap-back after load completes: **400ms ease-out** (slightly slower — content is "settling")
- Minimum display time for spinner: **500ms** (even if data returns instantly — prevents flash)

**CSS for disabling native browser pull-to-refresh:**
```css
body {
  overscroll-behavior-y: contain; /* disables browser pull-to-refresh, keeps glow effects */
}
/* To also kill bounce/glow effects: */
body {
  overscroll-behavior-y: none;
}
```

**Spinner design for dark brutalist:**
- Size: 32–40px diameter
- Stroke: 3px, red accent (#EF4444)
- No fill, no border-radius on container (square container matches 0px border-radius design language)
- Position: Fixed 24px below top safe area, horizontally centered

**Pull distance formula:**
```js
const resistance = 0.45;
const maxPull = 80; // px
const visualPull = Math.min(touchDeltaY * resistance, maxPull);
```

### What Top Apps Do
- **Twitter/X:** 60px commit threshold, spinner stays until timeline updates
- **Instagram:** 80px threshold, platform spinner in brand color
- **Gmail:** ~70px threshold, bouncy spring-back animation
- **iOS Settings:** System spinner, appears at exactly the scroll-edge, no elastic content displacement

### Common Mistakes to Avoid
- Not disabling the browser's native pull-to-refresh (causes double refresh UI)
- Setting threshold too low (<40px) — accidental triggers during normal scrolling
- Hiding the spinner before new content is rendered (disorienting flash)
- Not applying resistance — without it, the UI lurches and feels broken
- Triggering refresh when user is not at scroll position 0 (fires mid-list)
- Showing pull indicator when network is offline without showing an error state

---

## 5. Page Transitions

### Best Practice Summary
Mobile page transitions should be 200–350ms — fast enough to feel snappy, slow enough to orient the user. Use ease-out for entrance, ease-in for exit. Direction matters: forward navigation slides content in from the right, back navigation from the left. Always respect `prefers-reduced-motion` by collapsing animation duration to near-zero.

### Specific Values & Numbers

**Duration by transition type:**
| Transition Type | Duration | Easing |
|---|---|---|
| Simple tab switch (same level) | 150–200ms | ease-out |
| Forward navigation (push) | 250–300ms | ease-out |
| Back navigation (pop) | 200–250ms | ease-in |
| Modal appear | 280–320ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Modal dismiss | 200–250ms | ease-in |
| Drawer open | 280ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Shared element transition | 350–400ms | ease-in-out |
| Toast/snackbar appear | 150ms | ease-out |

**Easing reference:**
```css
/* Spring-like — use for cards, micro-interactions */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* Smooth ease-out — use for modals, page transitions */
cubic-bezier(0.16, 1, 0.3, 1)

/* Material standard — toggles, icons, loading */
cubic-bezier(0.4, 0, 0.2, 1)
```

**CSS View Transitions API (modern approach):**
```css
/* Enable cross-document transitions */
@view-transition {
  navigation: auto;
}

/* Direction-aware forward/back */
@keyframes slide-in-from-right {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

::view-transition-new(root) {
  animation: slide-in-from-right 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Direction awareness:**
```js
// Tag direction on the document element
document.documentElement.classList.toggle('going-back', isGoingBack);
```
```css
.going-back ::view-transition-new(root) {
  animation: slide-in-from-left 250ms ease-out;
}
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  /* Replace slide with instant or fade-only */
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* Or a more graceful fade instead of zero: */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-new(root) {
    animation: fade-in 150ms ease-out !important;
  }
}
```

**Properties to animate (GPU-accelerated only):**
- `transform` — translate, scale, rotate
- `opacity`
- Never animate `top`, `left`, `width`, `height`, `margin` — these cause layout recalculation and drop frames

**Screen transition target:** 60fps throughout (16.7ms per frame budget)

### What Top Apps Do
- **iOS native apps:** 300–350ms slide from right (push), spring physics on pop
- **Android Material 3:** Fade-through (outgoing fades to center, incoming fades in from center), 300ms
- **Linear:** 200ms ease-out slide, feels very snappy
- **Stripe Dashboard:** Cross-fade 200ms, no slide
- **Recommendation for GymFlow:** Slide-from-right for forward nav at 280ms, fade for tab switches at 150ms

### Common Mistakes to Avoid
- Transition duration above 400ms (feels sluggish, users think the app is slow)
- Animating layout properties (`width`, `top`) — causes paint jank
- Using the same transition for both forward and back navigation (loses directionality cue)
- Not handling `prefers-reduced-motion` (accessibility violation, causes motion sickness for vestibular disorder users)
- Chaining multiple transitions (e.g., old page exits AND new page enters simultaneously with complex shared elements) without performance testing

---

## 6. Dark Theme Mobile UI

### Best Practice Summary
Pure black (#000000) on OLED is efficient but creates harsh contrast. Near-black (#111111–#161616) is easier on eyes while still appearing visually "black." Elevation in dark themes is shown through lighter surface colors (not shadows), stepping up in lightness by ~5–8% per elevation level. All text must still meet 4.5:1 contrast ratio even in dark mode.

### Specific Values & Numbers

**Background colors:**
| Role | Hex | Notes |
|---|---|---|
| OLED pure black (max battery) | `#000000` | Turns off OLED pixels entirely; harsh contrast |
| Recommended dark base | `#111111` | Slightly off-black, easier on eyes |
| Material Design 2 baseline | `#121212` | The most widely referenced dark baseline |
| Raised surface (dp1 elevation) | `#1A1A1A` | ~+5% luminance from base |
| Card surface (dp2 elevation) | `#1E1E1E` – `#222222` | ~+8% luminance from base |
| Modal/overlay surface (dp4+) | `#252525` – `#2A2A2A` | ~+12% from base |
| Highest elevation (dialogs) | `#2E2E2E` – `#333333` | |

**Material Design 3 tonal elevation (dark mode):**
| Elevation level | Surface tint overlay opacity |
|---|---|
| Level 0 (base surface) | 0% |
| Level 1 (cards) | 5% of primary color |
| Level 2 (menus) | 8% of primary color |
| Level 3 (dialogs) | 11% of primary color |
| Level 4 (nav bar) | 12% of primary color |
| Level 5 (bottom sheets) | 14% of primary color |

*In Material 3, elevation is conveyed via tonal color (primary color tinted into surface), not white overlays.*

**Text colors on dark backgrounds:**
| Text role | Color | Opacity |
|---|---|---|
| Primary text | `#E5E5E5` or `#FFFFFF` at 87% | High emphasis |
| Secondary text | `#FFFFFF` at 60% opacity | Medium emphasis |
| Disabled/placeholder | `#FFFFFF` at 38% opacity | Low emphasis |
| Off-white alternative to pure white | `#E0E0E0` – `#F0F0F0` | Reduces glare |

**Contrast ratios (WCAG, same requirements as light mode):**
- Normal text (< 18pt / 14pt bold): **4.5:1 minimum** (AA), **7:1** (AAA)
- Large text (≥ 18pt / 14pt bold): **3:1 minimum** (AA)
- UI components and icons: **3:1 minimum**
- Bottom nav inactive icons on dark: `#FFFFFF` at 50–60% on `#111111` = ~3.8:1 (acceptable for inactive, not primary text)

**Accent colors on dark:**
- Saturate accent colors by 10–20% for dark mode (they appear dimmer on dark backgrounds)
- Red accent light mode: `#EF4444` → dark mode variant: `#F87171` (Tailwind red-400, brighter)
- Never use the same saturated accent from light mode — it'll appear dull or harsh on dark

**Status/semantic colors (dark mode variants):**
| Status | Light mode | Dark mode |
|---|---|---|
| Success | `#22C55E` | `#4ADE80` |
| Warning | `#F59E0B` | `#FCD34D` |
| Error/Danger | `#EF4444` | `#F87171` |
| Info | `#3B82F6` | `#60A5FA` |

**Battery savings note:**
- YouTube reports 43% less battery in dark mode on OLED screens
- Pure black elements on OLED draw 0W (pixel literally off)

### What Top Apps Do
- **Spotify:** `#121212` base, `#282828` cards — 2 elevation levels only, very clean
- **YouTube:** `#0F0F0F` base (slightly warmer than pure 121212), pure black top bar
- **Twitter/X:** `#000000` (pure OLED black option) + `#16181C` (dim option) + `#15202B` (lights-out blue-ish)
- **Vercel Dashboard:** `#000000` base, `#111111` card, `#1A1A1A` hover — 3-step system
- **Recommendation for GymFlow:** Base `#111111`, cards `#1A1A1A`, modals `#222222`, active elements with `#EF4444` (or dark-mode red `#F87171`)

### Common Mistakes to Avoid
- Using pure white text on pure black background (excessive contrast causes halation/bloom effect on OLED, especially for people with astigmatism)
- Inverting light-mode colors directly (shadows become highlights, gradients invert wrong)
- Using shadows for elevation in dark mode (they're invisible — use lighter surface colors instead)
- Lowering contrast in dark mode because "it looks fine" — WCAG ratios still apply
- Desaturating accent colors (they become muddy — go slightly lighter/more saturated instead)
- Using same semantic red for errors and for the UI accent (causes confusion in alerts)

---

## 7. PWA Standalone Polish

### Best Practice Summary
PWA standalone mode on iOS requires `viewport-fit=cover` plus `env(safe-area-inset-*)` CSS variables to properly use the area behind the notch and home indicator. iOS Safari has significant PWA limitations compared to Android Chrome. Disable native browser behaviors (pull-to-refresh, tap highlight) that feel foreign in a standalone app context.

### Specific Values & Numbers

**Required HTML meta tags:**
```html
<!-- Enable notch/island usage -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<!-- iOS standalone mode -->
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- Status bar style: black-translucent allows content behind status bar -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- Theme color (Android Chrome) -->
<meta name="theme-color" content="#111111">
```

**Safe area CSS (always use env(), not constant() after iOS 12):**
```css
/* Full safe-area padding on body */
body {
  padding-top: env(safe-area-inset-top);       /* behind notch/Dynamic Island */
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom); /* above home indicator (~34px on iPhone) */
  padding-left: env(safe-area-inset-left);
}

/* Bottom nav with safe area */
.bottom-nav {
  padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
  /* On iPhone with home indicator: adds ~34px + 8px = 42px bottom padding */
}

/* For iOS 11 compatibility (use both constant and env): */
.bottom-nav {
  padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
  padding-bottom: env(safe-area-inset-bottom);      /* iOS 11.2+ */
}
```

**Approximate safe-area-inset-bottom values by device:**
| Device | Home indicator inset |
|---|---|
| iPhone X–16 (Face ID) | ~34px |
| iPhone SE, 8 and older (Home button) | 0px |
| Android (gesture nav) | ~16–24px (varies by OEM) |
| Android (3-button nav) | 0px |

**Critical iOS PWA gotchas:**
- iOS does not support Minimal UI mode — users get a bookmark to Safari, not a true standalone app
- Service Workers require **iOS 11.3+**; Web App Manifest requires **iOS 11.3+**
- Storage limit: **50MB per Service Worker** on iOS; cache is evicted after weeks of inactivity
- iOS WKWebView does not support the native `<input type="file">` camera in all cases
- iOS status bar with `black-translucent` means your content starts at the very top pixel — always add `env(safe-area-inset-top)` padding to the top element

**Disabling native browser behaviors in standalone:**
```css
body {
  /* Disable browser pull-to-refresh */
  overscroll-behavior-y: contain;

  /* Disable text selection (app-like feel) */
  user-select: none;

  /* Disable long-press context menu */
  -webkit-touch-callout: none;

  /* Disable tap highlight flash */
  -webkit-tap-highlight-color: transparent;
}

/* Re-enable text selection for content that needs it */
p, .selectable {
  user-select: text;
}
```

**Scroll behavior:**
```css
/* Enable momentum scrolling on iOS (required for scrollable divs) */
.scrollable {
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}
```

**White gap below bottom nav fix (iOS PWA):**
```css
/* Use dvh (dynamic viewport height) instead of vh */
.full-height {
  height: 100dvh; /* accounts for browser chrome changes */
}

/* Bottom nav must account for home indicator */
.bottom-nav {
  position: fixed;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
}
```

### What Top Apps Do
- **Twitter PWA:** Full black-translucent status bar, safe area insets applied to all edges
- **Starbucks PWA:** Uses `viewport-fit=cover` with precise bottom nav padding
- **Pinterest PWA:** `env(safe-area-inset-bottom)` on bottom bar, `overscroll-behavior: none` on the app shell

### Common Mistakes to Avoid
- Using `100vh` instead of `100dvh` (causes layout shifts on iOS as chrome shows/hides)
- Forgetting `constant()` fallback for iOS 11.0–11.1 (very small user base, but still)
- Using `overscroll-behavior: none` globally (also kills elastic bounce in scrollable lists)
- Not testing on a real iOS device — Safari's Responsive Design Mode in desktop Safari does not simulate safe areas correctly
- Applying `user-select: none` to input fields (breaks the ability to paste text)
- Not setting `theme-color` meta — Android Chrome will use a default color for the browser chrome

---

## 8. Horizontal Stat Scrollers

### Best Practice Summary
Horizontal stat card scrollers should use CSS scroll snap so cards snap cleanly to position rather than leaving content half-visible. Show a "peek" of the next card (16–24px visible beyond the container edge) to signal scrollability. Cards should be 75–85% of viewport width so 1–1.25 cards are visible at a time. Never hide scrollbars on desktop without providing another affordance.

### Specific Values & Numbers

**CSS implementation:**
```css
/* Scroll container */
.stat-scroller {
  display: flex;
  gap: 12px;                          /* space between cards */
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;      /* hard snap, cards always land on position */
  scroll-padding-inline: 16px;        /* aligns snap point with container padding */
  padding-inline: 16px;               /* left/right padding for first/last card */
  padding-block: 8px;                 /* allow card shadow to be visible */
  -webkit-overflow-scrolling: touch;  /* iOS momentum scrolling */

  /* Hide scrollbar (use sparingly — provide alternative affordance) */
  scrollbar-width: none;              /* Firefox */
  -ms-overflow-style: none;           /* IE/Edge legacy */
}
.stat-scroller::-webkit-scrollbar {
  display: none;                      /* Chrome/Safari */
}

/* Individual cards */
.stat-card {
  flex: 0 0 auto;                     /* prevent shrink */
  width: calc(75vw);                  /* 75% of viewport = peek of ~25% */
  /* OR: for larger screens */
  width: min(280px, calc(100vw - 64px)); /* max 280px, minimum peek of 32px each side */
  scroll-snap-align: start;           /* snap to left edge of card */
}
```

**Sizing recommendations:**
| Viewport | Card width | Peek visible | Cards visible |
|---|---|---|---|
| 375px (iPhone SE) | 280px | ~80px (next card) | 1.2 |
| 390px (iPhone 15) | 295px | ~75px | 1.2 |
| 412px (Pixel) | 310px | ~85px | 1.2 |
| 768px (tablet) | 320px (2 per row) | — | 2 |

**Peek pattern — key spec:**
- Peek amount: **16–24px** minimum (enough to see next card exists, not enough to read it)
- Achieved by: `padding-inline: 16px` on container + `width: calc(100% - 32px)` per card
- OR: `width: 85vw` with `padding-left: 16px` on first card only

**Card internal layout for stats:**
```
┌─────────────────────────┐
│ LABEL           12px    │  ← small label, 60% opacity
│                         │
│ 1,247           32px    │  ← big number, accent color or white
│                         │
│ ↑ +12% this week  12px │  ← trend indicator, 70% opacity
└─────────────────────────┘
```

- Card height: **100–120px** (compact stat), **140–160px** (with spark line/chart)
- Primary number font size: **28–36px**
- Label font size: **11–13px**, uppercase, letter-spacing: 0.05em
- Card padding: **16px** all sides

**Scroll indicators (dots):**
```css
.scroll-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 8px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;           /* exception: dots can be round even in brutalist design */
  background: rgba(255,255,255,0.3);
  transition: width 200ms ease-out, background 200ms ease-out;
}
.dot.active {
  width: 16px;                  /* elongated pill for active */
  border-radius: 3px;
  background: #EF4444;          /* red accent */
}
```

**When to use scroll indicators:** Required when 3+ cards exist and the container doesn't show more than 1 card at a time. Optional (but recommended) when 2 cards are visible.

**Brutalist design note:** For 0px border-radius containers: apply `border-radius: 0` to cards and container. The scroll dot indicator is a case where a small radius (3px on active dot) aids readability and does not undermine the brutalist aesthetic.

### What Top Apps Do
- **Apple Health:** 80% width cards, dots indicator, `center` snap alignment
- **Robinhood:** Full-width cards, left-snap, no dots (uses swipe count text instead)
- **Stripe Mobile Dashboard:** ~75vw cards, peek of next card, no scroll indicator (relies on peek)
- **Fitbit:** 72% width cards, colored accent top-border, active dot in brand color

### Common Mistakes to Avoid
- Cards at 100% width with no peek (users don't know there's more content)
- Using `scroll-snap-type: x proximity` instead of `mandatory` (cards land at random positions)
- Forgetting `flex: 0 0 auto` on cards (they'll shrink to fit container)
- Not adding `scroll-padding-inline` equal to the container's padding (first card won't snap flush)
- Making stat numbers so large they're unreadable at 75vw card width — test on smallest target device
- Hiding scrollbar AND providing no dots indicator — horizontal scrollability is completely invisible

---

## Design System Notes for GymFlow Brutalist Dark Theme

These patterns applied specifically to GymFlow's constraints (0px border-radius, hard offset shadows, single red accent #EF4444, dark background):

### Color tokens
```css
:root {
  --bg-base:        #111111;
  --bg-card:        #1A1A1A;
  --bg-elevated:    #222222;
  --bg-modal:       #252525;
  --text-primary:   #E5E5E5;
  --text-secondary: rgba(255, 255, 255, 0.60);
  --text-disabled:  rgba(255, 255, 255, 0.38);
  --accent:         #EF4444;   /* light mode / large elements */
  --accent-dim:     #F87171;   /* dark mode text/icons on dark */
  --success:        #4ADE80;
  --warning:        #FCD34D;
  --error:          #F87171;   /* same as accent-dim — be careful with semantic confusion */
  --border:         rgba(255, 255, 255, 0.08);
}
```

### Hard shadow system (brutalist, 0px border-radius)
```css
/* Level 1 — cards */
box-shadow: 3px 3px 0px 0px rgba(239, 68, 68, 0.40);
/* Level 2 — active cards, CTAs */
box-shadow: 4px 4px 0px 0px #EF4444;
/* Level 3 — modals */
box-shadow: 6px 6px 0px 0px #EF4444;
```

### Touch target enforcement
```css
/* Ensure all interactive elements hit 48px minimum */
.interactive {
  min-height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

*Sources: Material Design 2 & 3 documentation, Nick Babich / UX Planet bottom nav article, NN/Group animation duration research, MDN CSS scroll-snap documentation, CSS-Tricks scroll snapping guide, web.dev PWA app design guide, firt.dev PWA power tips, Chrome Developers overscroll-behavior article, Muzli dark mode design systems guide, Hakuna Matata dark theme best practices, Motion.dev stagger documentation, Parachute Design animation guide, Web Animation Best Practices gist, piccalil.li view transitions article, JetRockets CSS scroll snap article, Sanjay Dey mobile UX 2026 patterns.*
