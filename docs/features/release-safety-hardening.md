# Release Safety Hardening

> Autoresearch: 2 rounds, 6 total agents, 2026-04-24

## Findings

### Repo-specific first-wave test targets
- First-wave unit coverage should prioritize `lib/imports.ts`, `lib/whatsapp-automation.ts`, `lib/subscription-dates.ts`, `lib/billing-cycle.ts`, `lib/check-in/rules.ts`, and `lib/rate-limit.ts` because they contain shared, fragile logic behind critical flows. — `lib/imports.ts`, `lib/whatsapp-automation.ts`, `lib/subscription-dates.ts`, `lib/billing-cycle.ts`, `lib/check-in/rules.ts`, `lib/rate-limit.ts`
- First-wave light integration coverage should prioritize auth login, attendance check, offline bundle, imports upload/preview/execute, member creation, subscription renew/freeze, backup export/restore, and WhatsApp status/broadcast/queue recovery. — `app/api/auth/login/route.ts`, `app/api/attendance/check/route.ts`, `app/api/members/offline-bundle/route.ts`, `app/api/imports/*.ts`, `app/api/members/route.ts`, `app/api/subscriptions/renew/route.ts`, `app/api/subscriptions/[id]/freeze/route.ts`, `app/api/backup/*.ts`, `app/api/whatsapp/*.ts`
- Some code should be lightly refactored before broad test coverage is practical: attendance logic should move out of `app/api/attendance/check/route.ts`, member creation side effects out of `app/api/members/route.ts`, `lib/archive-engine.ts` should be split by table concern, and `lib/whatsapp-ops.ts` should be split by responsibility. — `app/api/attendance/check/route.ts`, `app/api/members/route.ts`, `lib/archive-engine.ts`, `lib/whatsapp-ops.ts`

### Official testing guidance
- Next.js App Router officially supports Vitest, but async Server Components should stay under E2E rather than unit tests. Shared logic and light server-side tests should use Vitest’s `node` environment, while DOM-facing tests use `jsdom`. — `https://nextjs.org/docs/app/guides/testing/vitest`, `https://vitest.dev/guide/environment`, `https://vitest.dev/config/`
- Route handlers are built on standard `Request`/`Response` APIs, so low-coupling tests should exercise exported handlers directly with standard requests where possible instead of over-binding to Next internals. — `https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers`, `https://nextjs.org/docs/app/api-reference/functions/next-request`
- Official Playwright CI guidance for a Next.js app is production-like: build first, then start the app, use `webServer` plus `baseURL`, install browsers with `npx playwright install --with-deps`, upload `playwright-report/` artifacts, and do not rely on browser-binary caching. — `https://playwright.dev/docs/ci`, `https://playwright.dev/docs/test-webserver`, `https://nextjs.org/docs/pages/guides/testing/playwright`

### GitHub enforcement guidance
- Required checks are matched by reported job/check name, not workflow filename, so job names must be stable and globally unique before rulesets/branch protection are finalized. — `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches`, `https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks`
- Workflow-level skips on required checks can leave checks permanently pending. Stable merge gates should avoid brittle path-filter behavior, and if merge queue is later enabled, required-check workflows must also listen to `merge_group`. — `https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows`, `https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs`
- GitHub rulesets are the stronger long-term governance model because multiple rulesets can layer, while only one branch-protection rule applies at a time. — `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets`

### Cloud Run / deploy guidance
- For the current Cloud Build -> Cloud Run path, push-plus-poll post-deploy smoke is more appropriate than GitHub `deployment_status`, because `deployment_status` only fires when GitHub Deployments and deployment statuses are explicitly created. — `https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status`, `https://docs.github.com/en/rest/deployments/deployments#about-deployments`
- Stronger official future rollout patterns are Cloud Run revisions with no-traffic validation and/or Cloud Deploy verify. — `https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration`, `https://cloud.google.com/deploy/docs/verify-deployment`
- Google Cloud’s stronger migration direction is to treat migrations as run-to-completion admin work and prefer Cloud Run Jobs when practical, rather than hiding migration behavior in service deploy side effects. — `https://cloud.google.com/run/docs/create-jobs`, `https://cloud.google.com/blog/topics/developers-practitioners/running-database-migrations-cloud-run-jobs`

## Surprises
- The official Playwright deployed-environment pattern is event-driven on GitHub `deployment_status`, but that does not fit this repo’s current Cloud Build path without adding GitHub Deployments integration.
- GitHub required-check matching is more brittle than it looks because it is name-based and workflow-level skips can strand required checks in `Pending`.
- The best official Google Cloud release-verification story is Cloud Deploy verify, not a special Cloud Build feature.

## Sources
- `lib/imports.ts`
- `lib/whatsapp-automation.ts`
- `lib/subscription-dates.ts`
- `lib/billing-cycle.ts`
- `lib/check-in/rules.ts`
- `lib/rate-limit.ts`
- `lib/archive-engine.ts`
- `lib/whatsapp-ops.ts`
- `app/api/auth/login/route.ts`
- `app/api/attendance/check/route.ts`
- `app/api/members/offline-bundle/route.ts`
- `app/api/imports/upload/route.ts`
- `app/api/imports/preview/route.ts`
- `app/api/imports/execute/route.ts`
- `app/api/members/route.ts`
- `app/api/subscriptions/renew/route.ts`
- `app/api/subscriptions/[id]/freeze/route.ts`
- `app/api/backup/export/route.ts`
- `app/api/backup/restore/route.ts`
- `app/api/backup/restore-db/route.ts`
- `app/api/whatsapp/broadcast/route.ts`
- `app/api/whatsapp/status/route.ts`
- `app/api/whatsapp/queue/retry/route.ts`
- `https://nextjs.org/docs/app/guides/testing/vitest`
- `https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers`
- `https://nextjs.org/docs/pages/guides/testing/playwright`
- `https://vitest.dev/guide/environment`
- `https://vitest.dev/config/`
- `https://playwright.dev/docs/ci`
- `https://playwright.dev/docs/test-webserver`
- `https://playwright.dev/docs/test-configuration`
- `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches`
- `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets`
- `https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks`
- `https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status`
- `https://docs.github.com/en/rest/deployments/deployments#about-deployments`
- `https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration`
- `https://cloud.google.com/deploy/docs/verify-deployment`
- `https://cloud.google.com/run/docs/create-jobs`
- `https://cloud.google.com/blog/topics/developers-practitioners/running-database-migrations-cloud-run-jobs`
