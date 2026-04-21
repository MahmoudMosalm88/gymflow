# Research: Premium SaaS Demo Videos with Remotion

> Compiled April 2026 — autonomous research across 60+ sources

---

## 1. Remotion Best Practices

### Transitions for Product Demos

| Transition | Best For | Notes |
|---|---|---|
| `fade()` | Feature-to-feature cuts, chapter breaks | Most universally "premium" |
| `slide({direction: 'from-right'})` | Sequential UI flows (step 1 > step 2) | Implies progress |
| `slide({direction: 'from-bottom'})` | Modal-like reveals | Native mobile feel |
| `wipe()` | Before/after reveals | Dramatic |
| `flip()` | Card reveals | Use sparingly |

**Transition duration sweet spots:**
- Fade: 12-18 frames at 30fps (0.4-0.6s)
- Slide/wipe: 18-25 frames (0.6-0.83s)
- With springTiming: let it self-calculate (~23 frames)

### Spring Configs That Feel Premium

```tsx
// Smooth, zero bounce — best for screenshot reveals, panel slides (USE 90% OF THE TIME)
const PREMIUM = { damping: 200 };

// Snappy, minimal bounce — best for buttons, badges, UI chips
const SNAPPY = { damping: 20, stiffness: 200 };

// Heavy, deliberate — best for large hero sections, product screenshots
const HEAVY = { damping: 15, stiffness: 80, mass: 2 };
```

For premium/enterprise SaaS: use `{ damping: 200 }` (smooth) for 90% of animations. Reserve snappy for interactive UI elements.

### Scene Duration Guidelines (at 30fps)

| Scene Type | Frames | Seconds |
|---|---|---|
| Quick feature callout | 60-90 | 2-3s |
| Feature demo with UI | 120-180 | 4-6s |
| Complex workflow demo | 180-270 | 6-9s |
| Intro / hero hook | 90-120 | 3-4s |
| Outro / CTA | 60-90 | 2-3s |

**Total video length targets:**
- Landing page hero (autoplay, looping): 60-75 seconds
- Full product demo with narration: 90-120 seconds
- Feature spotlight: 15-30 seconds

### Composition Architecture

```
<TransitionSeries>                         <- top-level scene sequencer
  <Scene durationInFrames={5 * fps}>
    <Background />
    <Sequence from={15} layout="none">     <- screenshot slides in after 0.5s
      <ProductScreenshot />
    </Sequence>
    <Sequence from={30} layout="none">     <- label appears after 1s
      <FeatureLabel />
    </Sequence>
  </Scene>
  <Transition presentation={fade()} timing={springTiming({config: {damping: 200}})} />
  <Scene>...</Scene>
</TransitionSeries>
```

**Critical rules:**
- Always use `<Img>` from Remotion, never `<img>` (blocks rendering until loaded)
- Use `premountFor` on heavy components to prevent blank first frames
- Write timing in seconds (`2 * fps`), not magic frame numbers
- Budget 15-20% of each scene for entrance animation
- FORBIDDEN: CSS `transition:`, CSS `@keyframes`, Tailwind animation classes

### Performance Tips
- GPU-heavy CSS to avoid: large `box-shadow` blur, `filter: blur()`, `backdrop-filter`, WebGL
- PNG for transparency, JPEG for full-bleed (faster to render)
- Use `--concurrency` flag and `npx remotion benchmark` for optimal rendering
- `useMemo` for computations that don't depend on frame

---

## 2. Cursor Animation & Spotlight Techniques

### Cursor Movement Physics

Three spring profiles (from Screen Studio reverse-engineering):
- **Default/natural follow** — tension: 170, friction: 20
- **Snappy/near-click** — tension: 700, friction: 30 (activated within 160ms of click)
- **Drag** — tension: 136, friction: 26

### Making Cursor Movement Look Natural
1. **Bezier curve paths** — never straight lines. Use quadratic/cubic Bezier with off-axis control points
2. **Bell-curve speed profile** — accelerate out, peak in middle, decelerate in
3. **Micro-jitter** — 1-3px random variance every few frames (hand tremor simulation)
4. **Approach overshoot** — briefly pass target by 1-3px and spring back
5. **Pause before click** — 0.1-0.3s dwell time after arrival, before click
6. **Velocity-based rotation** — 2-5 degree tilt toward direction of travel
7. **Timing randomization** — vary duration +/-10-15%

### Click Effects
- **Ripple ring**: concentric circle expands and fades (0.3-0.5s)
- **Cursor scale pulse**: scale up to 1.2-1.4x on mousedown, snap back on mouseup
- **Click sound**: subtle haptic-style click (~50ms transient)

### Spotlight/Vignette
- Dark semi-transparent overlay (black at 60-80% opacity) with transparent cutout
- Cutout edge: Gaussian feather 20-40px
- Spotlight padding: 20-30px larger than the highlighted element
- Can follow cursor with slight spring lag
- Duration: 1-3 seconds to highlight, then fade out

### Zoom Choreography
- **Zoom in on click/type, zoom out on pause** — the core pattern
- UI button/text highlights: 150-200% zoom
- Dramatic reveals: 300%+ zoom
- Ken Burns subtle drift: 100-110% (5-10% over several seconds)
- **Zoom in easing**: ease-out-cubic (fast start, soft landing)
- **Zoom out easing**: overdamped spring (soft, slow pull back)
- Begin zoom 0.2-0.3s BEFORE cursor reaches target

### Callout Annotations
- Text callout with arrow/tail: 2-6 words max, pill/speech-bubble shape
- Appear: spring scale 0.7->1.0 (~0.25s)
- Hold: 2-5 seconds
- Disappear: quick fade (0.15-0.2s) — always shorter than appear
- Never obscure the highlighted element
- Consistent spatial positioning throughout video

### Per-Feature Hold Times
| Action Type | Hold Duration |
|---|---|
| Click/interaction result | 1.5-2.5s |
| Form fill / typing | 1-2s |
| Dashboard/data visualization | 2-4s |
| Feature name callout | 2-3s |
| Success confirmation | 1-1.5s |

---

## 3. VC-Quality Production Standards

### Pacing & Rhythm
- Variable rhythm: fast during problem (1.5-2s scenes), slow for solution reveal (3-5s scenes)
- 0.5-1s visual pause after important actions before cutting
- Never cut mid-animation — let transitions resolve
- Cut on movement (switch scenes as cursor clicks)

### Typography in Motion
- **Spring in** (tension ~180, friction ~14): slight overshoot then settle. Best for headlines.
- **Stagger timing**: 60-120ms cascade between multiple text elements
- **Text entry**: 400-600ms. **Text exit**: 200-300ms (exits faster than entries)
- Font choices: Inter, Sohne, Geist, DM Sans, Plus Jakarta Sans
- Weight contrast: Bold/Black (700-900) headline + Light/Regular (300-400) subhead
- Hero text: 64-96px at 1080p. Labels: 24-32px. Max 8-10 words per overlay.
- Left-align almost always (centered = PowerPoint)

### Cinematic Framing
- Near-black background (#0A0A0A to #1A1A1A), never pure #000
- Always show UI inside browser/device frame — never raw floating screenshot
- 3D perspective tilt (5-15 degrees) on device frame
- Leave 20-30% negative space around UI
- Diffused drop shadow: `0 24px 80px rgba(0,0,0,0.4)`
- Slightly desaturate background, boost saturation on product UI
- Subtle film grain (2-4% opacity noise) prevents gradient banding

### Sound Design
- Genre: ambient electronic with rhythmic pulse, 90-110 BPM
- No lyrics ever
- **Volume levels:**
  - Background music with VO: -18 to -20 dB
  - Music only: -12 to -14 dB
  - UI SFX: -8 to -12 dB
- **Click SFX**: soft haptic sound (~50ms)
- **Transition SFX**: gentle whoosh (200-400ms), starts 2-4 frames BEFORE visual cut
- **Text appearing**: faint high-frequency shimmer (barely audible)
- **Silence as tool**: 0.5-1s drop before key reveals

### The VC Quality Checklist
**Visual:**
- [ ] Near-black background (not pure black)
- [ ] UI in device/browser frame, not raw
- [ ] 3D perspective tilt on device (5-15 degrees)
- [ ] Diffused shadows (never hard)
- [ ] Retina/2x assets
- [ ] Consistent brand accent color
- [ ] Generous negative space
- [ ] Eased camera movements (never linear)

**Motion:**
- [ ] Spring-physics text reveals (overshoot + settle)
- [ ] Staggered text entry (60-120ms cascade)
- [ ] Transitions pre-cued with audio
- [ ] Variable pacing (fast problem, slow solution)

**Audio:**
- [ ] Music at -18 dB (present, not competing)
- [ ] Subtle UI SFX on interactions
- [ ] No lyrics
- [ ] Quiet pre-reveal pause

**Messaging:**
- [ ] Opens with problem, not logo
- [ ] Every feature has associated benefit
- [ ] Specific numbers ("save 3 hours weekly")
- [ ] Single clear CTA at end

**Instant amateur tells:**
- Hard drop shadows, pure black/white backgrounds
- Logo as first frame
- All text appears simultaneously
- Recognizable stock music
- Feature-listing narration (not benefits)
- Static screenshots with no motion

### Opening Hook (First 3 Seconds)
- NEVER open with logo, product name, or loading animation
- Option A: Bold outcome statement ("What if your gym ran itself?")
- Option B: Product already in action (most impressive moment)
- Option C: Curiosity gap ("You're losing 4 hours a week to this.")
- Text by second 1, large (64px+), spring-animated
- Start music at partial volume (-20 dB), build to normal by second 5

### Closing Frame
- Duration: 5-7 seconds
- Music begins gentle fade 2-3s before final card
- Logo at 15-20% frame width, tagline below (24-32px, light weight)
- Single CTA button — action-first language ("Start your free trial")
- Subtle looping background animation (glow pulse, gradient shift)
- A single soft chime as logo appears

---

## 4. Claude/Anthropic Video Style

### Visual Identity
- Warm-neutral palette: dark `#141413`, light `#faf9f5` (parchment tone)
- Orange accent: `#d97757` (terracotta/coral)
- Custom fonts: AnthropicSans, AnthropicSerif, AnthropicMono
- Supporting: Styrene (sans) + Tiempos (serif) — editorial feel
- Aesthetic = literary publisher / research institute, not Silicon Valley
- GSAP-powered animations with `expo.out` easing

### How They Show Product
- Real terminal recordings (Claude Code) — no chrome, no browser wrapper
- VS Code integration for more polished presentation
- Split-screen for computer use demos
- Static screenshots + 1-2 embedded YouTube/GIF for motion
- Minimal text overlays — product interface IS the visual

### Distinctive Traits
- Warm color temperature (vs OpenAI's cool blue, Google's colorful)
- Serif + sans typography mix (editorial credibility)
- Shows limitations openly (documents failures in demos)
- Slower, authentic pacing — real runtime, not sped up
- Tone: professional + approachable + earnest

---

## 5. Linear / Vercel / Stripe / Notion Breakdown

### Linear — Dark Mode SaaS Gold Standard
- Near-black (#08080A), warm gray UI surfaces
- Purple/cyan gradient accents with blur
- Inter / Inter Display typography
- LCH perceptual color space
- Ease-out animations (confident, no bounce)
- Real product screenshots, no device frames, directly on dark background

### Vercel — Radical Minimalism
- Pure black and white, color only as gradient light effects
- Geist Sans/Mono (custom, open-sourced)
- Spring animations (physics-based, slight overshoot)
- GPU-only: transform + opacity exclusively
- Hover: scale-101, active: scale-99
- Real code/terminal, no beautification

### Stripe — Cinema-Grade 3D
- Indigo #635BFF accent, dark slate #0A2540 background
- Sohne typography (premium, institutional)
- CSS 3D cubes, WebGL globe, particle systems
- Custom cubic-bezier curves, everything under 500ms
- Cinematic DOF blur on background layers
- CSS-rendered device frames (under 1KB each)

### Notion — Human-First Warmth
- Primary colors (yellow, blue, red)
- Hand-drawn illustration by Roman Muradov
- Focus on feeling over features
- Animated anthology style: 2D, playful physics
- Real product demos during keynotes with conversational tone

### Common Patterns Across All Four
1. **Real product UI** — no generic mockups
2. **No voiceover for feature demos** — text overlays or let product speak
3. **Speed as craft** — fast cuts, responsive interactions, no lag
4. **Perceptual color spaces** — LCH, CIELAB, APCA
5. **GPU-only animation** — transform + opacity exclusively
6. **Typography as identity** — font choice signals brand values
7. **Short, dense, confident** — 30-90s for landing page demos
8. **No stock footage** — product or custom illustration only

### Dark-Theme Demo Techniques (for GymFlow)
1. Open wide shot (slightly blurred), push in to feature
2. Reveal elements sequentially with staggered fade-up (80-120ms delays)
3. Brand gradient as low-opacity radial glow behind featured element
4. Layered shadows (one tight brand-color, one wide ambient)
5. Background layers at 60-70% opacity + slight blur for Z-depth
6. Subtle film grain (2-4% opacity) over gradients
7. Slow Ken Burns (1.0 to 1.05 over 8-10s) on static screenshots
8. Text overlays: 2-4 words max, fast fade-in (150ms)

### Color Palette Reference

| Element | Linear | Vercel | Stripe | GymFlow |
|---|---|---|---|---|
| Background | #08080A | #000000 | #0A2540 | #0A0A0A |
| Surface | #1A1A1F | #111111 | #1A1F36 | var(--card) |
| Accent | Purple/Cyan | Iridescent | #635BFF | #e63946 |
| Text | #E5E5E5 | #FFFFFF | #FFFFFF | var(--foreground) |
| Muted | #6B7280 | #888888 | #8792A2 | var(--muted-foreground) |

---

## 6. User Story Flow & Narrative Arc

### The Universal Arc: Problem > Solution > Proof > CTA

1. **Introduce the protagonist** — someone exactly like your target user
2. **Agitate the core problem** — show it, don't just mention it
3. **The pivot** — product appears as frustration peaks
4. **Show 2-3 key features** — framed as answers to the problem
5. **Reveal the transformation** — the "after" state
6. **CTA** — decisive, simple, connected to the story

### Hook Strategy (First 5 Seconds)
- Problem statement first, always. Not a logo. Not brand intro.
- Seconds 0-8: Jump straight into core pain point
- Seconds 9-30: Introduce the software as the hero
- Seconds 31-90: Show key features that crush the problem

### Feature Prioritization
- Lead with highest-impact feature EARLY, but frame it within the problem
- Don't save the wow for last — most viewers leave before minute 2
- If a feature doesn't solve the problem from the hook, it doesn't belong

### Emotional Arc
| Phase | Emotional Target |
|---|---|
| Tension (problem) | Overwhelmed, frustrated, "that's me" |
| Relief (solution) | Curiosity, cautious hope |
| Delight (wow feature) | Surprise, excitement |
| Confidence (results) | Trust, desire, "I can do this" |

### Pacing Rhythm
- Fast opening (problem): short cuts, 1.5-2s scenes, urgency
- Slower middle (solution): 3-5s scenes, breathing room
- Faster close (transformation + CTA): earned payoff, quick

### Silent vs. Narrated
- Autoplay hero (above fold): ALWAYS silent, 15-30s loops
- Click-to-play explainer: narrated, 60-90s, highest converting format
- Captions are non-negotiable for either format

### GymFlow-Specific Narrative

**What resonates with gym owners (in order of emotional weight):**
1. Member retention ("50% quit within first year")
2. Operational time drain (manual scheduling, billing, attendance)
3. Revenue visibility (owners don't know actual MRR)
4. Payment collection (chasing late payments)
5. Data-driven decisions (operating on gut feel)

**Suggested arc for GymFlow hero video (60-75s):**

| Timestamp | Beat | Emotion |
|---|---|---|
| 0-5s | Hook: Sunday night admin pain | "That's me" |
| 5-15s | Chaos of manual management | Frustration |
| 15-20s | Pivot: introduce GymFlow | Curiosity |
| 20-50s | Feature 1: payment automation + Feature 2: WhatsApp automation | Delight |
| 50-65s | Dashboard showing revenue up, fewer overdue | Confidence |
| 65-75s | CTA: "See it running in your gym" | Action |

---

## Quick Reference Card

```tsx
// THE GOLDEN TRIO — most product demo animations use these three
import { spring, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

// Premium spring config
const PREMIUM = { damping: 200 };         // zero bounce, clean settle
const SNAPPY  = { damping: 20, stiffness: 200 }; // micro-bounce for chips

// Cursor spring profiles (Screen Studio standard)
const CURSOR_DEFAULT = { tension: 170, friction: 20 };
const CURSOR_CLICK   = { tension: 700, friction: 30 };

// Zoom into region of interest
const zoom = interpolate(frame, [0, 30], [1, 1.12], {
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.quad),
});

// Scene transition
<TransitionSeries.Transition
  presentation={fade()}
  timing={springTiming({ config: PREMIUM })}
/>

// Text stagger reveal
words.map((word, i) => {
  const opacity = spring({ frame: frame - i * 4, fps, config: PREMIUM });
  return <span style={{ opacity }}>{word}</span>;
});
```

---

*Sources: 60+ pages across Remotion docs, Screen Studio reverse-engineering, Linear/Vercel/Stripe/Notion design blogs, Anthropic brand guidelines, SaaS video production guides, motion design references, and UX research.*
