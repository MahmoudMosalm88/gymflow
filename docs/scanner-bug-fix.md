# Scanner Bug: "Entry Denied" on Desktop QR Codes

**Status**: Fixed + Hardened (Feb 21, 2026)
**Severity**: P0 — scanner completely broken for all members with printed QR codes
**Commits**: `338b296`, `213623b`, `582d1f8`

---

## Symptom

When a gym member scans their printed QR code at the front desk, the system shows:

- **"دخول مرفوض"** (Entry Denied) in a red toast notification
- Reason: "لم يتم العثور على العضو." (Member not found)
- A `%` character sometimes visible in the error

The scanner worked in the old desktop Electron app but failed on the new web app.

---

## Root Cause

The QR codes were printed from the **desktop Electron app**, which encoded the member's local database ID into each QR code:

```javascript
// out/main/index.js — desktop app QR generation
ipcMain.handle("qrcode:generate", async (_event, memberId) => {
  const member = getMemberById(memberId);
  const qrValue = member?.card_code?.trim() || memberId;
  // ↑ Desktop members table has NO card_code column,
  //   so this ALWAYS falls back to memberId
  const dataUrl = await QRCode.toDataURL(qrValue, { ... });
  return { success: true, dataUrl, code: qrValue };
});
```

When the gym owner migrated from the desktop app to the web app, the **migration code generated new UUIDs** for every member, throwing away the old desktop IDs:

```typescript
// saas-web/lib/archive-engine.ts — line 377 (BEFORE fix)
const mappedId =
  memberIdMap.get(sourceId) ||
  (mode === "desktop_import" ? uuidv4() : ensureUuid(raw.id));
//                             ^^^^^^^^
//                             Old ID discarded, new UUID assigned
```

The old `card_code` field was also not populated because the desktop app's members table has no `card_code` column:

```typescript
// line 397 (BEFORE fix)
raw.card_code ? String(raw.card_code) : null,
// ↑ Always null for desktop imports
```

So the printed QR codes contained IDs like `abc123` but the cloud database only knew members by new UUIDs like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. The check-in API's lookup query found no match:

```sql
-- saas-web/app/api/attendance/check/route.ts
AND (id = $3 OR phone = $3 OR COALESCE(card_code, '') = $3)
-- $3 = "abc123" (old desktop ID from QR)
-- id = new UUID (no match)
-- phone = phone number (no match)
-- card_code = NULL (no match)
-- Result: unknown_member → "Entry Denied"
```

---

## The Fix

### 1. Preserve old IDs during import (archive-engine.ts)

When importing from the desktop app, store the old member ID as `card_code` if one isn't already set:

```typescript
// line 397 (AFTER fix)
raw.card_code ? String(raw.card_code) : (mode === "desktop_import" ? sourceId : null),
```

This means the old desktop ID `abc123` gets saved in `card_code`, and the check-in API's `COALESCE(card_code, '') = $3` query matches it.

### 2. Backfill endpoint for already-imported data

New endpoint `POST /api/migration/backfill-card-codes` reads the stored import artifact (the original desktop backup JSON still saved in `import_artifacts.payload`), matches members by phone number, and writes the old desktop ID into `card_code`.

```
saas-web/app/api/migration/backfill-card-codes/route.ts
```

### 3. Auto-run on dashboard load

The dashboard page runs the backfill silently on first load. It calls the endpoint once, then sets `localStorage.card_code_backfill_done = "1"` so it never runs again.

```typescript
// saas-web/app/dashboard/page.tsx
useEffect(() => {
  const key = 'card_code_backfill_done';
  if (localStorage.getItem(key)) return;
  api.post('/api/migration/backfill-card-codes', {})
    .then(() => localStorage.setItem(key, '1'))
    .catch(() => {});
}, []);
```

### 4. Server-side fallback on scan (independent hardening)

After production feedback, the same error still appeared for some gyms.  
Independent investigation found the first fix chain was still fragile because:

- Backfill depends on a dashboard browser session running once (`localStorage` flag).
- Backfill matching by phone can miss members when phone format differs (e.g. `+20...` vs `0...`).
- Some scanners append trailing `%` / control characters to scanned values.

New hardening was added directly in `POST /api/attendance/check`:

- Normalize scanner input:
  - trim whitespace/control characters
  - strip trailing `%`
- Stronger member lookup:
  - match by `id`, `card_code`, raw `phone`, and digit-only phone normalization
- Automatic server-side repair on unknown scan:
  - read latest imported artifact
  - if scanned value matches a legacy desktop ID, backfill `card_code` on server
  - retry lookup once in the same request

This makes old printed desktop QR cards work even if dashboard backfill never ran on that browser.

---

## Files Changed

| File | Change |
|------|--------|
| `saas-web/lib/archive-engine.ts` | Store old desktop ID as `card_code` during import |
| `saas-web/app/api/migration/backfill-card-codes/route.ts` | New endpoint to retroactively fill `card_code` |
| `saas-web/app/dashboard/page.tsx` | Auto-trigger backfill on first dashboard load |
| `saas-web/app/api/attendance/check/route.ts` | Normalize scanner input + server-side legacy QR fallback + stronger phone matching |

---

## Flow Diagram

```
BEFORE FIX:
QR Code ("abc123") → Scanner → API lookup → No match → ❌ Entry Denied

AFTER FIX (initial):
Backfill runs → sets card_code = "abc123" for member matched by phone
QR Code ("abc123") → Scanner → API lookup → card_code match → ✅ Welcome!

AFTER HARDENING (latest):
QR Code ("abc123%") → API normalizes input → unknown? run server-side targeted backfill → retry lookup → ✅ Welcome!
```

---

## How the Check-In Flow Works (Reference)

```
Barcode Scanner (hardware)
  ↓ rapid keystrokes (<500ms)
GlobalScanner.tsx (captures input)
  ↓ POST { scannedValue, method: "scan" }
/api/attendance/check (eligibility checks)
  ├─ Member lookup: id OR phone OR card_code
  ├─ Cooldown check (30s default)
  ├─ Already checked in today?
  ├─ Active subscription?
  ├─ Subscription frozen?
  └─ Quota exceeded?
  ↓
Toast notification (success green / denied red)
+ Audio feedback (800Hz success / 300Hz denied)
+ Dashboard hero zone update
+ Activity feed refresh
```

---

## Lessons Learned

1. **ID migration is destructive** — when generating new UUIDs during import, always preserve the old ID somewhere (like `card_code`) so external references (printed QR codes, cards, etc.) keep working.

2. **Test with real hardware** — this bug was invisible in dev because no one scanned actual printed QR codes during testing. Physical hardware integration needs end-to-end testing with real artifacts.

3. **Desktop → cloud migration needs a compatibility layer** — any data format that exists "in the wild" (printed, on cards, in members' phones) must be supported indefinitely or explicitly migrated.
