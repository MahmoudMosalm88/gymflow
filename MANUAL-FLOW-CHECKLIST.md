# GymFlow Manual Flow Checklist

Use this checklist after each fix set to validate the app end‑to‑end.

## 1) Launch + Onboarding
- Open app
- Verify light theme only (no dark mode toggle)
- WhatsApp step:
  - If connected: QR shows and status is Connected
  - If not connected: warning appears and you can continue
- Create owner account → verify → settings → enter app

## 2) Members + Serial + QR
- Add new member
  - Serial auto‑generated (GF‑000001 style)
  - Save member succeeds
- Open member detail
  - Serial shown
  - QR code displays and copies serial

## 3) Attendance
- Scan member QR/serial
  - Access allowed
  - Cooldown ignores second scan
- Expired subscription
  - Access denied

## 4) Subscriptions + Quotas
- Create subscription
- Renew subscription
  - Old quota ended, new quota created

## 5) Import
- Import file with existing member
  - Updates member instead of duplicating
- EU date format parses (e.g. 25/12/2025)

## 6) Reports
- Open Reports page
  - No crashes with empty data

## 7) Settings + Backup
- Save settings and reload language
- Backup DB (check backup file exists)
- If photos exist, confirm sidecar folder `<backup>.photos` created
- Restore DB (app loads successfully)
