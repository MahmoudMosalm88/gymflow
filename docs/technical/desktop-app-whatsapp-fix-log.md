# Desktop App Work Log + WhatsApp Fix Attempts (Including Failed)

Date: February 17, 2026  
Scope: Desktop app local readiness work and WhatsApp onboarding/connect failure investigation (no version bump).

## What was reported

- Onboarding -> **Connect WhatsApp** failed.
- Initial error: Chrome executable not found.
- After partial fixes: connection timed out.
- Later behavior: loading state, then no visible progress.

## Suspected root causes

1. Chrome binary mismatch:
   - Desktop app runtime needed a specific Chrome-for-Testing executable.
   - Existing logic could pick an incompatible binary for the running app architecture.

2. Blocking connect behavior:
   - Connect flow could wait too long and return timeout instead of quickly returning a pending state while QR/auth events continue.

3. Stale lock/process issue:
   - Old headless Chrome processes kept session locks in:
   - `~/Library/Application Support/gymflow/wwebjs_auth/session`
   - This caused `"browser is already running"` failures and silent retries.

## Attempt history and outcomes (failed/partial)

1. Attempt: Chrome executable resolution improvements
   - Added Puppeteer cache scanning.
   - Added architecture-aware preference order for macOS (`x64` vs `arm64`).
   - Added runtime logging for resolved Chrome path.
   - Evidence:
     - `2026-02-17T18:57:36Z` still failed with `Protocol error (Target.setAutoAttach): Target closed`.
     - `2026-02-17T19:08:18Z` still failed with `Protocol error (Runtime.callFunctionOn): Target closed`.
   - Outcome: **Failed to fully resolve**.

2. Attempt: connect lifecycle changes (non-blocking + probe)
   - Added non-blocking connect behavior with early `pendingScan` return.
   - Added short probe window for QR/ready signal instead of waiting for long timeout.
   - Kept status/QR events as the primary UX signal path.
   - Evidence:
     - Timeout issue reduced, but hard failures remained (`Target closed`).
   - Outcome: **Partial only** (did not fix core crash/closure behavior).

3. Attempt: stale lock/process cleanup
   - Detect lock artifacts before connect.
   - Kill stale session Chrome processes tied to WhatsApp session.
   - Remove stale lock files (`Singleton*`, `DevToolsActivePort`, `RunningChromeVersion`).
   - Retry connect after cleanup.
   - Evidence:
     - `2026-02-17T18:26:09Z` resolved one class of error (`browser is already running`) in some retries.
     - But repeated failures persisted after cleanup:
       - `2026-02-17T18:57:40Z` `Target.setAutoAttach: Target closed`
       - `2026-02-17T19:15:46Z` `Runtime.callFunctionOn: Target closed`
   - Outcome: **Partial only**.

4. Attempt: UI status/QR sync hardening (renderer polling fallback)
   - Added periodic `whatsapp.getStatus()` sync to reduce missed event updates.
   - Intended to address UI symptom where QR/connect state looked stale.
   - Evidence:
     - User still reported both flows failing.
     - Main-process error signature still present (`Runtime.callFunctionOn): Target closed`).
   - Outcome: **Failed to fully resolve**.

## Files touched

- `index.js`
- `out/main/index.js`
- Packaged runtime updated by repacking:
  - `dist/mac/GymFlow.app/Contents/Resources/app.asar`

## Verification performed

- Confirmed patched code exists in extracted packaged runtime (`app.asar`).
- Confirmed app relaunch and running main/renderer processes.
- Confirmed stale WhatsApp Chrome session processes were cleared before retest.
- Confirmed Chrome path resolves to installed Chrome-for-Testing x64 binary in logs.

## February 17 follow-up patch (latest attempt, still unresolved)

- Added race-condition guard in `WhatsAppService.connect()`:
  - stale lock cleanup is now skipped while an active browser/init is already in flight.
  - this prevents killing a live WhatsApp Chromium session during repeated connect attempts.
- Added process-aware stale detection:
  - before lock cleanup, the service checks for a live session browser process (`pgrep` on macOS/Linux).
  - cleanup is skipped when the session process is alive.
- Increased connect probe window:
  - `connectProbeTimeoutMs` raised from 15s to 30s to reduce premature reconnect attempts.
- Hardened Puppeteer launch args by platform:
  - Linux: keep `--no-zygote` + `--disable-gpu`.
  - Windows: `--disable-gpu` only (no forced `--no-zygote`).
  - macOS: avoids Linux-only `--no-zygote`.
- Ensured patched runtime is repacked into:
  - `dist/mac/GymFlow.app/Contents/Resources/app.asar`

- User-reported result after this latest patch:
  - **Still failing in both flows**.
  - Error still reported: `Protocol error (Runtime.callFunctionOn): Target closed`.
  - Outcome: **Unresolved**.

## Current status

- WhatsApp desktop connect/onboarding issue is **not resolved yet**.
- Observed behavior remains inconsistent:
  - `authenticated` event appeared in logs at least once (`2026-02-17T19:09:35Z`, `2026-02-17T19:17:08Z`),
  - but connect flow still later returns target-closed protocol errors and user-facing flow remains broken.

- No version bump was applied as requested.

## Notes (separate from WhatsApp bug)

- Existing log noise still present and unrelated to WhatsApp connect logic:
  - Auto-updater TLS hostname mismatch for `update-server.run.app`.
  - CSP warnings for remote Google Fonts in packaged renderer.

---

## ✅ RESOLVED — February 17, 2026 (Baileys Migration)

All previous attempts above failed because `whatsapp-web.js` uses Puppeteer/Chromium under the hood, which is fundamentally incompatible with Electron's process model — Chromium inside Electron causes session lock conflicts and `Target closed` crashes that cannot be patched around.

### Root cause (final)
`whatsapp-web.js` launches a headless Chromium browser to drive WhatsApp Web. Inside Electron, two Chromium processes conflict, causing `Protocol error (Runtime.callFunctionOn): Target closed` on every connect attempt.

### Solution
Full replacement with **`@whiskeysockets/baileys`** — a pure WebSocket implementation that connects directly to WhatsApp's servers with no browser at all.

### Files changed
| File | Change |
|---|---|
| `src/main/services/whatsapp.ts` | Full rewrite — Baileys replaces all whatsapp-web.js code, same public interface |
| `src/main/index.ts` | `whatsappService.disconnect()` → `whatsappService.cleanup()` on will-quit (preserves session) |
| `src/renderer/src/pages/Settings.tsx` | Removed `openExternal('https://web.whatsapp.com')` from connect handler; removed inline QR block (kept Dialog overlay) |
| `package.json` | Removed `whatsapp-web.js`; added `@whiskeysockets/baileys`, `pino`, `@hapi/boom` |

### Auth storage
- Old: `<userData>/wwebjs_auth/` (Chromium profile — large, lock-prone)
- New: `<userData>/baileys_auth/` (small JSON credential files — fast, no locks)

### Gotchas encountered
1. **`makeWASocket is not a function`** — Baileys is pure ESM; electron-vite compiles main to CJS. Default import goes through `__importDefault` wrapper which returns the module namespace, not the function. Fix: use named import `import { makeWASocket }` instead of `import makeWASocket`.
2. **Safari opening on Connect** — old Settings.tsx handler had `openExternal('https://web.whatsapp.com')` before calling connect (legacy whatsapp-web.js pattern). Removed.
3. **`sock.end()` type error** — Baileys requires `sock.end(new Error(...))`, not `sock.end(undefined)`.
4. **`sock.ev.removeAllListeners()` type error** — Baileys types require an event name argument; just call `sock.end()` and let the socket clean itself up.

### Verified working
- Settings → WhatsApp → Connect → QR appears inside app (~2s) → scan → status "Connected"
- No browser window opens
- Session persists across app restarts (credentials in `baileys_auth/`)
- Disconnect clears credentials; reconnect shows fresh QR
