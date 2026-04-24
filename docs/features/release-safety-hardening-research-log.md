# Research Log — Release Safety Hardening

## Gap List (Final State)
[x] Gap 1: Which shared business-logic modules are the highest-value first targets for unit tests in this repo? → `lib/imports.ts`, `lib/whatsapp-automation.ts`, `lib/subscription-dates.ts`, `lib/billing-cycle.ts`, `lib/check-in/rules.ts`, `lib/rate-limit.ts`
[x] Gap 2: Which API routes or server-side contracts are the best first targets for light integration tests? → auth login, attendance check, offline bundle, imports upload/preview/execute, member creation, subscription renew/freeze, backup export/restore, WhatsApp status/broadcast/queue retry
[x] Gap 3: Which helpers should be extracted or lightly refactored before tests are practical? → attendance service extraction, member creation side-effect extraction, archive-engine split, whatsapp-ops split, schema-helper centralization, WhatsApp template deduplication
[x] Gap 4: What are the official recommended Playwright patterns for GitHub Actions and local Next.js testing? → build first, use `webServer` + `baseURL`, install browsers with deps, upload report artifacts, avoid browser-binary caching
[x] Gap 5: What are the official recommended Playwright patterns for deployed-environment smoke tests? → use a small tagged suite against a deployed base URL; official event-driven pattern uses `deployment_status`
[x] Gap 6: What are the official recommended Vitest / Next.js patterns for shared logic and route-handler testing? → App Router supports Vitest; use `node` for server/shared logic, `jsdom` for DOM tests, avoid unit-testing async Server Components, test handlers through standard `Request`/`Response` where possible
[x] Gap 7: What are the official GitHub governance patterns that matter for required checks and merge protection? → stable unique job names, rulesets over overlapping branch-protection rules, strict required checks, avoid workflow-level skips for required gates
[x] Gap 8: What are the official Google Cloud rollout and migration patterns relevant here? → Cloud Run revisions and no-traffic validation, Cloud Deploy verify as the stronger managed release verification path, Cloud Run Jobs as the stronger migration model
[x] Gap 9: With this repo’s Cloud Build -> Cloud Run path, can we reliably use GitHub `deployment_status` for post-deploy smoke? → no, not unless the deploy system explicitly creates GitHub Deployments and deployment statuses

## Round 1
Agents: 5 | Filled: 8 / 8 gaps
- Gap 1: FILLED → repo-local first-wave unit targets were identified from current critical-flow modules
- Gap 2: FILLED → first-wave integration targets were identified from current API blast radius
- Gap 3: FILLED → small refactors needed before tests were identified
- Gap 4: FILLED → official Playwright CI pattern for Next.js established
- Gap 5: FILLED → official deployed-environment Playwright pattern established
- Gap 6: FILLED → official Vitest/Next.js route-handler guidance established
- Gap 7: FILLED → official GitHub required-check/ruleset guidance established
- Gap 8: FILLED → official Google Cloud release-verification/migration guidance established

## Round 2
Agents: 1 | Filled: 1 / 1 gaps
- Gap 9: FILLED → GitHub `deployment_status` is not emitted by default for Cloud Build / Cloud Run; it requires GitHub Deployments integration, so current repo should use push-plus-poll or callback-based production smoke

## Delta
- Round 1 hardened the test and CI parts of the spec with official-source guidance and repo-local priorities.
- Round 2 corrected the production-smoke trigger model so the spec no longer assumes GitHub deployment events that this stack does not produce.

## Totals
Rounds: 2
Agents spawned: 6
Gaps filled: 9 / 9
Unfillable: 0
