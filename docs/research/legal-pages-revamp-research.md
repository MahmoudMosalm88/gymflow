# Research: SaaS Legal/Policy Page UX Best Practices

> Autoresearch — April 22, 2026. For GymFlow legal center revamp.

---

## 1. Legal Hub Layout Patterns

### Vercel (Recommended Model)
- **Card grid** — 3 columns desktop, 1 mobile. Each card: title, last-updated date, "Read Document" CTA.
- Last-updated dates visible at a glance = trust signal.
- Single CTA per card reduces decision fatigue.
- Decorative grid background adds personality.

### Stripe
- Flat vertical link list. Minimal. Prominent **jurisdiction selector** dropdown.
- Works for strong brands; can feel underdeveloped for smaller products.

### Linear
- Legal docs inside authenticated app shell with sidebar nav.
- Not ideal for prospects reviewing terms before signing up.

**Recommendation for GymFlow:** Card grid (Vercel-style) with last-updated dates. Group into categories if 5+ pages. Keep as standalone marketing page.

---

## 2. Long-Form Legal Typography

| Property | Value | Tailwind |
|----------|-------|----------|
| Body font size (desktop) | 16–18px | `text-base` to `text-lg` |
| Body font size (mobile) | 14–16px min | `text-sm` to `text-base` |
| Line height | 1.5–1.625 | `leading-relaxed` |
| Max content width | 672–768px (45–80 chars) | `max-w-2xl` to `max-w-3xl` |
| Heading hierarchy | h1: `text-2xl`, h2: `text-xl`, h3: `text-lg` | Step-down sizes |
| Paragraph spacing | 1rem–1.5rem | `space-y-4` to `space-y-6` |
| Font family | Sans-serif (Inter, IBM Plex Sans, system-ui) | `font-sans` |
| Bullet lists | `list-disc pl-5 space-y-1.5`, same body size | Match body text size |

---

## 3. Navigation Patterns

### Table of Contents
- **Sticky sidebar** for desktop (left rail preferred over right — right suffers "banner blindness").
- **IntersectionObserver** highlights active section in TOC as user scrolls.
- Smooth scroll + `scroll-padding-top` for sticky header offset.

### Mobile TOC
1. Accordion at top of page (most discoverable)
2. Sticky collapsed "jump to section" bar
3. Inline TOC repositioned from sidebar to body

### Cross-Page Navigation
- Persistent left sidebar listing all policy pages.
- Breadcrumb trail: "Legal > Privacy Policy".
- Footer with related document links.

---

## 4. Bilingual (EN/AR) & RTL

### Language Switcher
- Top-right for LTR, top-left for RTL (at "start" of header in both directions).
- Label in **target language**: button says "العربية" on English page, "English" on Arabic page.
- Don't hide in footer — users need it immediately.

### Locale Switching (Next.js)
- **Server-side via URL segments** (`/en/terms`, `/ar/terms`) is strongly preferred.
- Zero flash of wrong language. Pre-render both locales with `generateStaticParams`.
- Switching = navigating to sibling URL.
- Current implementation (`?lang=ar` query param + `useEffect`) causes flash — should migrate to URL-based.

### RTL Layout
- Set `<html lang="ar" dir="rtl">` at document root.
- Use **CSS Logical Properties** (`padding-inline-start`, `margin-inline-end`).
- Avoid `letter-spacing` on Arabic (breaks connected letterforms).
- Wrap English brand names in `<span dir="ltr">GymFlow</span>` inside Arabic text.

---

## 5. Accessibility (WCAG)

### Required Landmarks
- `<main>` wrapping all primary content
- `<nav aria-label="Table of contents">` for TOC
- `<aside>` for supplementary info
- `aria-label` to distinguish multiple `<nav>` elements

### Language Attributes
- `<html lang="en">` or `<html lang="ar">` — required at AA (3.1.1)
- Inline switches: `<span lang="ar">النص</span>` — required at AA (3.1.2)

### Keyboard & Skip Links
- "Skip to main content" as first focusable element, visible on focus.
- All TOC links and interactive elements keyboard-operable.

### Heading Hierarchy
- One `<h1>` per page. `<h2>` for sections. Never skip levels.

### Color Contrast
- Body text: **4.5:1** minimum (AA). Legal text should target **7:1** (AAA) given critical nature.
- Muted/secondary text must still meet 4.5:1 — gray on white commonly fails.

### Print Stylesheet
- Hide nav, sidebar, skip links.
- Show URLs after links: `a[href]::after { content: " (" attr(href) ")"; }`
- High-contrast black on white. `page-break-after: avoid` on headings.

---

## Sources
- Stripe legal page (stripe.com/legal)
- Vercel legal page (vercel.com/legal)
- NN/G: Table of Contents Design Guide
- CSS-Tricks: Sticky TOC with Active States
- Smashing Magazine: Sticky Menus UX Guidelines
- WCAG 2.1 (w3.org/WAI)
