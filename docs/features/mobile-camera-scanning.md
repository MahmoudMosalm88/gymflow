# Feature Spec: Mobile Camera QR Scanning

> Status: Implemented in code on 2026-04-03
> Priority: High — previously listed as a gap in competitive analysis
> Date: April 2026

---

## The Problem

Today, GymFlow check-in only works with a **physical barcode scanner gun** plugged into a computer. The `GlobalScanner` component listens for fast keystrokes + Enter — that's how USB scanner guns work.

This means:
- A gym owner **cannot** use their phone camera to scan a member's QR code
- A front-desk tablet **cannot** act as a scanner without a USB gun attached
- The landing page claims camera scanning but it doesn't exist yet
- Competitors (Wellyx, GymMaster, PerfectGym) all have camera-based scanning

---

## What We're Building

A phone/tablet camera scanner built into the GymFlow dashboard that lets reception staff scan a member's QR code by pointing the device camera at it. Same check-in flow, new input method.

**Not building**: Hardware door locks, turnstiles, NFC, Bluetooth. Those are future. This is camera-only.

---

## How It Works Today (Before)

```
Physical barcode gun → types code fast → Enter key
    ↓
GlobalScanner.tsx (detects keystroke pattern: 4+ chars in <500ms)
    ↓
POST /api/attendance/check { scannedValue, method: "scan" }
    ↓
Backend: member lookup → cooldown → subscription → freeze → quota
    ↓
Response: { success, member, sessionsRemaining } or { success: false, reason }
    ↓
ScanContext (global state) → Dashboard hero zone → Toast → Audio beep
```

## How It Will Work (After)

```
Phone/tablet camera → reads QR code via camera API
    ↓
Same POST /api/attendance/check { scannedValue, method: "camera" }
    ↓
(everything else is identical)
```

The camera scanner is just a **new input method** feeding into the existing check-in pipeline. No backend changes needed.

---

## UX Flow

### 1. Dashboard Scanner Section (Current)

Right now the dashboard has:
- A text input field ("Scan QR or enter ID")
- A "Scan" button to submit
- The GlobalScanner keystroke listener running in background

### 2. After This Feature

The dashboard scanner section gets a **camera toggle button** next to the existing input:

```
┌─────────────────────────────────────────────┐
│  [📷]  [ Scan QR or enter ID _______ ] [→]  │
│                                               │
│  (tap 📷 to open camera)                      │
└─────────────────────────────────────────────┘
```

When the camera button is tapped:

```
┌─────────────────────────────────────────────┐
│                                               │
│         ┌───────────────────┐                │
│         │                   │                │
│         │   CAMERA FEED     │                │
│         │                   │                │
│         │   ┌─────────┐    │                │
│         │   │ QR ZONE │    │                │
│         │   └─────────┘    │                │
│         │                   │                │
│         └───────────────────┘                │
│                                               │
│  [🔦 Torch]              [✕ Close]           │
│                                               │
└─────────────────────────────────────────────┘
```

On successful scan:

```
┌─────────────────────────────────────────────┐
│                                               │
│  ✅  AHMED HASSAN                             │
│      12 sessions remaining                    │
│      [member photo]                           │
│                                               │
│  (auto-closes after 3 seconds,                │
│   ready for next scan)                        │
│                                               │
└─────────────────────────────────────────────┘
```

On denied scan:

```
┌─────────────────────────────────────────────┐
│                                               │
│  ✗  DENIED                                   │
│     No active subscription                    │
│                                               │
│  (stays for 3 seconds, then back to camera)  │
│                                               │
└─────────────────────────────────────────────┘
```

### 3. Kiosk Route (Stretch Goal)

A dedicated `/dashboard/kiosk` page that is:
- Full-screen camera only (no sidebar, no nav)
- Designed for a mounted tablet at reception
- Lockable with iOS Guided Access or Android Screen Pinning
- Shows member name + photo + sessions on scan, then auto-resets
- Big, readable type for across-the-counter visibility

---

## Architecture Decisions

### Library: `@yudiel/react-qr-scanner`

**Why this one over alternatives:**

| Library | Last Update | Bundle | iOS Safari | Maintained | Verdict |
|---------|------------|--------|------------|------------|---------|
| html5-qrcode | Apr 2023 | 460KB | Broken on iOS 26+ | Dead (400+ open issues) | Avoid |
| @zxing/browser | May 2024 | 1.5MB | Fragile | Maintenance only | Avoid |
| react-qr-reader | Jul 2023 | 4.4MB | Unknown | Dead (stuck on beta) | Avoid |
| **@yudiel/react-qr-scanner** | **Jan 2026** | **184KB** | **Works via WASM polyfill** | **Active (48 releases)** | **Use this** |
| react-zxing | Feb 2025 | 39KB + 1.5MB deps | Fragile | Semi-active | Backup option |

Key advantages:
- **Smallest bundle** (184KB) — critical for a PWA
- **Uses native BarcodeDetector API** on Android Chrome (hardware-accelerated), falls back to `zxing-wasm` polyfill on Safari
- **Built-in features**: torch/flashlight toggle, zoom, audio beep on scan, camera switching, pause/resume, finder overlay
- **Next.js compatible**: documented dynamic import with `ssr: false`
- **Supports QR codes AND barcodes** (Code 128, EAN-13, etc.) — useful if gyms use printed barcode cards too

### Next.js Integration

```tsx
// Must be dynamically imported — uses browser APIs
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);
```

### Method Tracking

The existing `attendanceSchema` accepts a `method` field:
```typescript
method: z.enum(["scan", "manual"]).default("scan")
```

We'll add `"camera"` to this enum so check-in logs distinguish between:
- `scan` — physical barcode gun
- `manual` — typed in by staff
- `camera` — phone/tablet camera

No other backend changes needed.

---

## iOS PWA Camera Gotchas

This is the biggest risk. iOS has a troubled history with camera access in PWAs.

### Known Issues

| Scenario | Status |
|----------|--------|
| Camera in Safari browser tab | Works reliably |
| Camera in PWA standalone mode (home screen) | **Unreliable** — works on some iOS versions, breaks on others |
| Camera permission persistence in PWA | **No** — iOS asks for permission every session |
| Camera without HTTPS | Does not work (except localhost) |

### Mitigations

1. **Detect standalone mode** and show a tip if camera fails:
   ```ts
   const isStandalone = window.matchMedia('(display-mode: standalone)').matches
     || (window.navigator as any).standalone === true;
   ```
   If standalone + camera fails → show message: "Open GymFlow in Safari for best camera support"

2. **Instruct gym staff** to grant blanket camera access: iOS Settings → Safari → Camera → Allow. This eliminates the per-session permission prompt.

3. **Always keep the manual input as fallback.** Camera is an enhancement, not a replacement. The text input + barcode gun path stays.

4. **Set video constraints explicitly** after stream starts (iOS 26 workaround):
   ```ts
   const track = stream.getVideoTracks()[0];
   await track.applyConstraints({
     width: { ideal: 1280 },
     frameRate: { ideal: 30 }
   });
   ```

5. **Add `playsinline` attribute** to video elements (the library does this, but verify).

### Android vs iOS

| Feature | Android (Chrome) | iOS (Safari/WebKit) |
|---------|------------------|---------------------|
| Camera in PWA | Works perfectly | Unreliable in standalone |
| Permission persistence | Yes | No (asked every session) |
| Native BarcodeDetector | Yes (hardware-accelerated) | No (WASM polyfill) |
| Torch/flashlight | Supported | Supported on newer devices |
| Rear camera default | Reliable | Reliable |

---

## Competitive Landscape: How Others Do It

### Two Models Exist

**Model A: "Member shows QR, gym scans it"** (Wellyx, PerfectGym)
- Member opens app/card → QR code displayed
- Gym tablet/reader scans the member's screen
- Faster throughput, more intuitive (like boarding a flight)
- **This is what GymFlow should do**

**Model B: "Gym displays QR, member scans it"** (GymMaster)
- Gym mounts a screen showing a rotating QR code
- Member uses their phone camera to scan it
- No hardware reader needed, but slower and requires member to have camera ready

### What Competitors Include

| Feature | GymMaster | Wellyx | PushPress | PerfectGym | GymFlow (planned) |
|---------|-----------|--------|-----------|------------|-------------------|
| Camera QR scan | Member scans gym code | Gym scans member code | No QR (name search) | Gym scans member code | Gym scans member code |
| Kiosk mode | No | Yes | Yes (iPad only) | Yes | Yes (PWA — any device) |
| Offline fallback | No | Yes (phone data) | No | Yes (emergency code) | Yes (cached member DB) |
| Anti-fraud (GPS/time-limit) | GPS verify + 60s rotation | Time-limited codes | None | 900s code expiry | Cooldown timer (exists) |
| Welcome display | Basic | Basic | Screens App (separate product) | Basic | Built into scanner UI |
| Arabic/RTL at kiosk | No | No | No | No | **Yes — differentiator** |
| PWA (no app store) | No (native app) | No (native app) | No (native app) | No (native app) | **Yes — differentiator** |

### GymFlow Advantages Over All Competitors

1. **PWA kiosk** — works on any tablet without app store install. No competitor offers this.
2. **Arabic/RTL at the check-in screen** — none of the competitors support Arabic at the kiosk level.
3. **Offline check-in already built** — the offline engine with cached member DB is more secure than PerfectGym's "emergency bypass" approach.
4. **No hardware required** — just a phone or tablet. Wellyx charges $399 for their reader.

---

## Files to Create / Modify

### New Files

| File | Purpose |
|------|---------|
| `components/dashboard/CameraScanner.tsx` | Camera scanner component wrapping `@yudiel/react-qr-scanner` |
| `app/dashboard/kiosk/page.tsx` | Full-screen kiosk mode (stretch goal) |

### Modified Files

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Add camera toggle button next to scanner input, integrate CameraScanner |
| `lib/validation.ts` | Add `"camera"` to method enum: `z.enum(["scan", "manual", "camera"])` |
| `components/dashboard/GlobalScanner.tsx` | No changes — barcode gun path stays untouched |
| `lib/scan-context.tsx` | No changes — camera feeds into same context |
| `app/api/attendance/check/route.ts` | No changes — already method-agnostic |
| `package.json` | Add `@yudiel/react-qr-scanner` dependency |

### Estimated Scope

| Task | Effort |
|------|--------|
| Install library + create CameraScanner component | Small |
| Integrate into dashboard with toggle button | Small |
| Success/denied overlay with member photo + name | Medium |
| Auto-reset after scan (ready for next member) | Small |
| Torch button for low-light | Small (built into library) |
| iOS standalone detection + fallback messaging | Small |
| Add `"camera"` to method enum | Trivial |
| Kiosk route (stretch) | Medium |
| Testing on iOS Safari + Android Chrome + PWA | Medium |
| **Total** | **~1–2 days** |

---

## Implementation Plan

### Phase 1: Camera Scanner on Dashboard (Core)

1. `npm install @yudiel/react-qr-scanner`
2. Create `CameraScanner.tsx`:
   - Dynamic import with `ssr: false`
   - `facingMode: 'environment'` (rear camera)
   - `formats: ['qr_code']` (QR only for speed)
   - Built-in torch toggle
   - Built-in audio beep on scan
   - `onScan` → calls same check-in API as GlobalScanner
   - Result feeds into same `ScanContext`
3. Add camera toggle button to dashboard scanner section
4. Show camera viewfinder when toggled on
5. On scan result: show success/denied overlay for 3 seconds, then auto-reset to camera
6. Add `"camera"` to validation schema method enum

### Phase 2: Polish

7. Member photo displayed on successful scan (already available in the check-in response)
8. Sessions remaining counter
9. iOS standalone mode detection → show Safari tip if camera fails
10. Bilingual overlay text (Arabic + English based on current locale)
11. Haptic feedback on scan (if supported: `navigator.vibrate(200)`)

### Phase 3: Kiosk Mode (Stretch)

12. Create `/dashboard/kiosk` route
13. Full-screen layout: camera viewfinder fills the screen, no sidebar/nav
14. Larger text for across-counter readability
15. Auto-reset loop: scan → result → 3s → back to camera
16. Instructions for locking with iOS Guided Access / Android Screen Pinning
17. Exit kiosk requires password or admin action

---

## Success Criteria

- [x] Gym owner opens GymFlow on phone, taps camera button, scans a member QR code → member is checked in
- [x] Works on Android Chrome (primary — most Egyptian reception tablets are Android)
- [x] Works on iOS Safari browser tab
- [x] Works on iOS PWA standalone mode (or degrades gracefully with clear messaging)
- [x] Existing barcode gun flow is completely untouched
- [x] Manual text input still works as fallback
- [x] Check-in logs show `method: "camera"` for camera scans
- [x] Audio beep on successful scan
- [x] Member name + photo displayed on success
- [x] Denied reason displayed clearly on failure
- [x] Auto-resets to camera after 3 seconds, ready for next scan
- [x] Works in low light with torch button
- [x] Arabic text renders correctly in scan result overlay

---

## What This Unlocks

1. **Zero-hardware check-in** — any phone or tablet becomes a scanner. No USB gun needed.
2. **Mobile-first reception** — gym owners running the business from their phone can scan members on the go.
3. **Landing page claim becomes real** — the marketing copy about camera scanning is currently aspirational.
4. **Competitive parity** — every serious competitor has camera scanning. This closes the gap.
5. **Kiosk mode (phase 3)** — a mounted tablet becomes a self-service check-in station. No app install, just the GymFlow PWA.
6. **Differentiator** — Arabic/RTL kiosk + PWA (no app store) + offline fallback = no competitor offers this combination.

---

*Dependencies: None. The entire check-in backend already works. This is purely a frontend input method addition.*
