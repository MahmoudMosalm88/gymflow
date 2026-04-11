# Firebase Config Audit — 2026-02-18

## Scope
- Audited SaaS Firebase auth stack in `saas-web/` for local reliability and production robustness.
- Covered: env validation, Firebase Admin bootstrap, client auth initialization, token lifecycle, auth routes, and runtime diagnostics.

## Findings

1. Critical (external IAM): Firebase Admin API call fails with `403 USER_PROJECT_DENIED`.
   - Error requires `serviceusage.services.use` on project `gymflow-saas-260215-251`.
   - Suggested role: `roles/serviceusage.serviceUsageConsumer` for the runtime caller identity.

2. High (fixed): client token lifecycle was brittle.
   - Dashboard API calls used a stored `session_token` without proactive refresh.
   - Risk: stale ID token causing 401 loops during normal usage.

3. Medium (fixed): Firebase Admin initialization had weak diagnostics/fallback.
   - Invalid JSON or malformed private key could fail without clear root cause.
   - No explicit diagnostics surface for credential source/error state.

4. Medium (fixed): Firebase web config validation was too permissive.
   - Missing required keys failed late and opaquely.
   - No explicit recommended-key diagnostics for phone/popup auth stability.

## Changes Executed

- Added strict Firebase web diagnostics in `saas-web/lib/env.ts`.
- Rebuilt Firebase Admin bootstrap in `saas-web/lib/firebase-admin.ts`:
  - normalized private key parsing,
  - service-account JSON/fields validation,
  - Application Default Credentials fallback,
  - exported diagnostics.
- Hardened Firebase client initialization in `saas-web/lib/firebase-client.ts`:
  - persistence fallback to in-memory when local persistence is blocked,
  - reset failed init promise for retry.
- Improved auth route diagnostics:
  - `saas-web/app/api/auth/firebase-config/route.ts`
  - `saas-web/app/api/auth/login/route.ts`
  - `saas-web/app/api/auth/register/route.ts`
  - `saas-web/app/api/auth/forgot-password/route.ts`
- Added 401/expired-token handling improvement in `saas-web/lib/http.ts`.
- Hardened session token behavior in `saas-web/lib/api-client.ts`:
  - attempts Firebase current-user token refresh,
  - retries once on 401 with forced refresh before logout.
- Updated login flow in `saas-web/app/(auth)/login/page.tsx`:
  - email login/register now signs in with Firebase client SDK and sends `idToken` to server,
  - avoids static token-only session path.
- Added runnable audit command:
  - script: `saas-web/scripts/firebase-audit.ts`
  - npm script: `npm run firebase:audit`
  - docs: `saas-web/README.md`

## Validation Run

- `npm run typecheck` (saas-web): passed.
- `npm run firebase:audit` (saas-web):
  - Web config checks: passed.
  - Admin initialization: passed (`service_account_fields`).
  - Admin live call: failed with IAM permission error (`serviceusage.services.use` missing).

## Remaining Action (Required)

- In GCP project `gymflow-saas-260215-251`, grant `roles/serviceusage.serviceUsageConsumer` to the identity used by Firebase Admin runtime calls (service account or local caller identity).

