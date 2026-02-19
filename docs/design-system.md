# GymFlow Design System

Brutalist UI system used across GymFlow SaaS web and desktop apps.

---

## Colors

### Primary Palette

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| **Accent** | `#e63946` | `356 77% 56%` | CTAs, active states, accent borders, logo mark |
| **Dark** | `#0a0a0a` | `0 0% 4%` | Sidebar bg, auth left panel, landing bg |
| **White** | `#ffffff` | `0 0% 100%` | Dashboard content area, form cards |
| **Off-white** | `#f4f4f4` | `0 0% 96%` | Auth right panel bg |

### Neutral Grays

| Token | Hex | Usage |
|-------|-----|-------|
| **Border light** | `#d0d0d0` | Card borders, input borders, separators on light surfaces |
| **Border dark** | `#2a2a2a` | Borders on dark surfaces (sidebar, auth panel) |
| **Text primary** | `#1a1a1a` | Headings and body on light bg |
| **Text secondary** | `#888888` | Inactive tabs, muted labels on light bg |
| **Text on dark** | `#ffffff` | Headings on dark bg |
| **Text muted on dark** | `#bbbbbb` | Feature bullets, descriptions on dark bg |
| **Text faint on dark** | `#555555` | Stat labels, fine print on dark bg |
| **Text faint on dark (alt)** | `#666666` | Subtitles on dark bg |

### Chart Colors (for Recharts / any chart library)

| Token | HSL | Visual |
|-------|-----|--------|
| `chart-1` | `356 77% 56%` | Red (primary) |
| `chart-2` | `0 0% 40%` | Dark gray |
| `chart-3` | `356 60% 38%` | Dark red |
| `chart-4` | `0 0% 68%` | Mid gray |
| `chart-5` | `0 0% 25%` | Charcoal |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Success** | `hsl(142 76% 36%)` | Allowed entries, active subs |
| **Warning** | `hsl(48 96% 63%)` | Warning badges, expiring subs |
| **Info** | `hsl(200 80% 50%)` | Informational elements |
| **Destructive** | Same as accent `#e63946` | Error alerts, denied entries |

---

## Typography

- **Font family**: System sans-serif stack (`font-sans` in Tailwind)
- **Headings**: `font-black` (900 weight), tight leading (`leading-[1.05]`)
- **Body**: Regular weight, `text-sm` (14px) for most UI text
- **Labels**: `text-xs` (12px), `font-bold` for tab labels and stat captions
- **Hero headlines**: Use `clamp(2.2rem, 4vw, 3.4rem)` for responsive scaling
- **Line breaks**: Use explicit `<br />` in hero headlines for intentional rhythm

---

## Spacing & Layout

### Border Radius
```
0rem — everywhere, no exceptions
```
This is set via CSS variable `--radius: 0rem` which cascades to all shadcn/ui components. For non-shadcn elements, never use `rounded-*` classes.

### Borders
- **Cards / form containers**: `2px solid #d0d0d0`
- **Dark surface borders**: `2px solid #2a2a2a`
- **Separators on light bg**: `border-t-2 border-[#d0d0d0]`
- **Active nav item**: `border-l-[4px] border-[#e63946]`

### Shadows
```
Hard offset, no blur, no spread.
```
| Context | Shadow |
|---------|--------|
| Form cards (auth) | `6px 6px 0 #1a1a1a` |
| Landing page cards | `6px 6px 0 #1a1a1a` |
| Hover state | `translate(-2px, -2px)` + `8px 8px 0 #1a1a1a` |
| Active/pressed state | `translate(0, 0)` + `4px 4px 0 #1a1a1a` |

Never use blur (`box-shadow: ... Xpx` for blur) or colored shadows (no red/accent shadows on form cards).

---

## Components

### Buttons

**Primary (CTA)**
```
bg-[#e63946] text-white border-none
font-bold, no radius
```

**Mode tabs (login/register toggle)**
```
Active:   bg-[#1a1a1a] text-white border-[#1a1a1a]
Inactive: bg-white text-[#888888] border-[#d0d0d0]
Hover:    border-[#1a1a1a] text-[#1a1a1a]
```
Adjacent tabs share a border (`border-l-0` on the second tab).

**Auth method selector (email/google/phone)**
```
Active:   border-[#e63946] text-[#e63946] bg-[#e63946]/5
Inactive: border-[#d0d0d0] text-[#888888]
Hover:    border-[#e63946] text-[#e63946]
```

**Language toggle**
```
Container: border-2 border-[#2a2a2a] (on dark bg) or border-[#d0d0d0] (on light bg)
Active:    bg-[#e63946] text-white
Inactive:  bg-transparent text-[#888888]
```

### Cards

**Form card (auth pages)**
```
bg-white
border: 2px solid #d0d0d0 (sides + bottom)
border-top: none (replaced by red accent bar)
box-shadow: 6px 6px 0 #1a1a1a

Red accent bar: h-1 bg-[#e63946] (sits directly above the card)
```

**Dashboard cards**
```
Uses shadcn Card component — inherits 0 radius from CSS variable.
Border and shadow come from the default shadcn styling.
```

### Inputs

All inputs inherit 0 radius from the CSS variable. Standard shadcn `<Input>` component with:
```
border border-input (maps to #d0d0d0)
bg-transparent
focus ring: ring-[#e63946]
```

### Alerts

Use shadcn `<Alert>` — automatically picks up accent for destructive variant since `--destructive` maps to `#e63946`.

---

## Patterns

### Logo Mark
```html
<span style="background: #e63946; color: #fff; padding: 6px 9px; font-weight: 800; font-size: 0.75rem; line-height: 1;">GF</span>
<span style="font-weight: 700; color: white; font-size: 0.875rem; letter-spacing: -0.01em;">GymFlow</span>
```
The red square with "GF" appears in the sidebar, auth panel, and landing page.

### Dot Grid Texture (dark panels)
```css
background-image: radial-gradient(#1d1d1d 1px, transparent 1px);
background-size: 28px 28px;
```
Used on the login left panel and optionally on landing page dark sections.

### Decorative Watermark
Large low-opacity "GF" text positioned absolute in the bottom-right of dark panels:
```
font-size: 20rem
font-weight: 900
color: #e63946
opacity: 0.045
letter-spacing: -0.04em
position: absolute, -bottom-12 -right-8
pointer-events: none, select-none, aria-hidden
```
Parent must have `overflow: hidden` to clip the overflow.

### Red Rule (accent divider)
A short horizontal red bar used before major headings:
```html
<div style="height: 3px; width: 48px; background: #e63946; margin-bottom: 32px;" />
```

### Stats Row
Bold stat numbers with small labels below, separated by a top border:
```
Container: border-t-2 border-[#1a1a1a] pt-8
Number:    text-2xl font-black text-white
Label:     text-xs text-[#555555] mt-1
```

---

## Page Layouts

### Dashboard
```
┌──────────────────────────────────────────────┐
│ Sidebar (bg-[#0a0a0a])  │  Header (bg-white) │
│ w-64, border-r-2        │  border-b-2        │
│ border-[#2a2a2a]        ├────────────────────│
│                          │                    │
│ GF mark + nav items      │  Content (bg-white)│
│ Active = red left border │  text-[#1a1a1a]    │
│                          │                    │
└──────────────────────────────────────────────┘
```

### Auth (Login / Register)
```
┌────────────────────────┬────────────────────────┐
│ Dark panel (lg:w-1/2)  │ Light panel (lg:w-1/2) │
│ bg-[#0a0a0a]           │ bg-[#f4f4f4]           │
│ dot grid + watermark    │                        │
│                         │ ┌──────────────────┐   │
│ GF mark                 │ │ red accent bar   │   │
│ red rule                │ │ white form card   │   │
│ headline (line breaks)  │ │ shadow: 6px 6px  │   │
│ subtitle                │ │ 0 #1a1a1a        │   │
│ feature bullets         │ │                  │   │
│                         │ │ mode tabs        │   │
│ ─────── stats row ──── │ │ method selector  │   │
│ lang toggle + back link │ │ form fields      │   │
│                         │ └──────────────────┘   │
└────────────────────────┴────────────────────────┘
```
On mobile: stacks vertically (dark panel on top, form below).

### Landing Page
```
bg-[#0a0a0a] full page
Left-aligned content
Red accents for CTAs and section markers
```

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use `#e63946` as the single accent color | Mix in other accent colors (blue, orange, purple) |
| Use `0rem` radius on everything | Use `rounded-md`, `rounded-lg`, or any border radius |
| Use hard offset shadows (`Xpx Xpx 0`) | Use blur shadows (`0 4px 12px rgba(...)`) |
| Use `2px solid` borders | Use `1px` borders or borderless cards |
| Keep dark surfaces hardcoded (`bg-[#0a0a0a]`) | Use CSS variable dark mode (`dark:bg-...`) |
| Use the GF red square mark for branding | Use a full logo image or wordmark alone |
| Break hero headlines with `<br />` | Let long headlines wrap naturally |
| Use `font-black` (900) for headings | Use lighter weights for major headings |
| Keep chart tooltips with `borderRadius: 0` | Use rounded tooltips from chart library defaults |

---

## CSS Variables (globals.css)

These are the source of truth. All shadcn/ui components inherit from them.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --primary: 356 77% 56%;
  --primary-foreground: 0 0% 100%;
  --accent: 356 77% 56%;
  --accent-foreground: 0 0% 100%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 10%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --border: 0 0% 82%;
  --input: 0 0% 82%;
  --ring: 356 77% 56%;
  --destructive: 356 77% 56%;
  --destructive-foreground: 0 0% 100%;
  --chart-1: 356 77% 56%;
  --chart-2: 0 0% 40%;
  --chart-3: 356 60% 38%;
  --chart-4: 0 0% 68%;
  --chart-5: 0 0% 25%;
  --radius: 0rem;
}
```

---

*Last updated: February 17, 2026*
