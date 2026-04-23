# Release Safety Hardening Design

Date: 2026-04-24
Repo: `/Users/mahmoudsfiles/projects/GymFlow/gymflow`
Owner: Mahmoud
Status: Approved in conversation, pending final spec review before implementation

## Goal

Reduce release regressions in GymFlow by adding enforceable test gates, production smoke checks, and release-process guardrails around the active SaaS app at repo root.

This design is intentionally pragmatic:

- add fast merge-time protection first
- add production runtime verification second
- avoid bundling staging/environment provisioning into the first pass
- keep the rollout focused on the current SaaS app and WhatsApp worker

## Current State

The repo currently has these relevant conditions:

- active SaaS app at repo root
- no checked-in GitHub Actions CI workflow
- `@playwright/test` already installed but no real browser test suite
- no unit test runner configured
- no staging environment
- production deploy happens from `main` through Cloud Build / Cloud Run
- worker lives in `worker/whatsapp-vm`

This means build and deploy can succeed even when key flows regress, and there is no enforced merge gate that exercises the app in a realistic way.

## Scope

This hardening pass includes:

- repository-level CI workflows
- unit and light integration test setup
- local Playwright smoke coverage for golden flows
- post-deploy production smoke checks
- package scripts and test structure
- documentation updates for the release/testing workflow
- branch protection and required check setup where platform access allows
- initial extraction/testing of fragile shared business-rule logic where needed to make tests practical

This hardening pass does not include:

- creating a dedicated staging environment
- full end-to-end coverage of all screens and endpoints
- full observability replatforming
- broad refactors unrelated to testability/release safety
- automatic rollback orchestration

## Safety Architecture

Release protection will be layered.

### Layer 1: PR gate

Every PR must pass:

- `npm ci`
- `npm run typecheck`
- `npm run build`
- worker install + typecheck in `worker/whatsapp-vm`
- unit tests
- light integration tests
- local Playwright smoke tests against a locally started app

This layer is optimized for speed and determinism. It is the main merge blocker.

### Layer 2: Post-deploy production smoke

After deploy from `main`, a separate workflow will run a smaller production smoke pack against the live app.

This layer exists because:

- build success does not prove runtime correctness
- auth, environment wiring, asset serving, and route wiring can break only after deploy
- GymFlow currently deploys straight to production

The production smoke pack is intentionally smaller than the local smoke pack and must remain low-flake.

### Layer 3: Process guardrails

- `main` is protected and no longer treated as a casual dev branch
- required checks gate merges
- regression tests become part of the bug-fix process
- fragile business rules move into shared pure functions and are tested once

## Test Strategy

Tests are divided into three buckets.

### 1. Unit tests

Purpose:

- validate pure business rules
- run very fast
- catch logic drift early

Initial targets:

- subscription date math
- subscription status rules
- check-in allow/deny rules
- phone normalization
- rate-limit helper behavior
- import/restore validation helpers
- WhatsApp delivery/status mapping

Rule:

- if a bug comes from shared logic, add or update a unit test first

### 2. Integration tests

Purpose:

- validate narrow cross-boundary contracts without spinning up the whole app
- protect route/helper behavior where mocks are sufficient

Initial targets:

- auth/session helper behavior
- selected API handlers with mocked dependencies
- import preview validation path
- backup/restore contract checks

Rule:

- integration tests stay narrow and deterministic
- they are not a substitute for end-to-end browser coverage

### 3. Playwright smoke tests

Purpose:

- protect the highest-value product flows
- validate the app as a user experiences it

Two modes:

- local smoke in CI before merge
- production smoke after deploy

Initial golden flows:

- landing/homepage shell loads
- login page loads
- health endpoint responds
- authenticated dashboard shell loads
- member add/edit shell flow
- subscription create/renew/freeze path
- attendance/check-in path
- import preview path
- backup export path
- WhatsApp status/queue page load
- one report page load and sanity assertion

Design rules:

- keep smoke tests short and stable
- avoid trying to cover all branches in E2E
- every escaped production bug adds either a smoke, integration, or unit regression depending on failure type

## Tooling

### Unit and integration runner

Use `Vitest`.

Reasons:

- fits the TypeScript/Next codebase well
- fast startup and execution
- simpler for shared logic and light route-level mocking than adding Jest here

### Browser runner

Use `Playwright`.

Reasons:

- already installed in the repo
- good fit for both local and production smoke packs
- strong support for deterministic smoke checks and auth/session flows

### Directory structure

Add:

- `tests/unit/`
- `tests/integration/`
- `tests/smoke/`
- `tests/fixtures/` when shared test data becomes necessary

### Package scripts

Add these scripts at repo root:

- `test`
- `test:unit`
- `test:integration`
- `test:smoke`
- `test:smoke:prod`

Optional convenience scripts, only if they clearly improve workflow without adding maintenance overhead:

- `test:ci`
- `test:watch`

## CI and Workflow Design

### `ci.yml`

Runs on:

- pull requests
- pushes to `main`

Responsibilities:

- install dependencies
- run root typecheck
- run root build
- run worker install + typecheck
- run unit tests
- run integration tests
- run local Playwright smoke against a local app instance

This workflow becomes the primary required-check gate for merges.

### `post-deploy-smoke.yml`

Runs on:

- pushes to `main`

Responsibilities:

- wait for the new production revision to be available
- run a small production smoke pack against the live app
- fail loudly if production is unhealthy after deploy

Because there is no staging environment yet, this is the runtime confidence layer for production.

## Branch Protection and Merge Policy

Target branch: `main`

Desired policy:

- require pull requests before merge
- require passing status checks
- require branch to be up to date before merge
- optionally restrict direct pushes except for admins / emergency override

If GitHub CLI/admin access is available, this should be enforced as part of the hardening pass. If not, the repo will still contain the required workflows and documentation, and the policy can be applied immediately after.

## Production Smoke Strategy

Production smoke must not rely on fragile, highly stateful setup. It should start with checks that are both meaningful and operationally safe.

Phase 1 production smoke:

- homepage responds
- login page responds
- health endpoint responds
- key authenticated page responds using a dedicated smoke account if credentials are available
- one report route or dashboard route responds successfully

If a stable smoke account is available, expand to:

- authenticated dashboard load
- WhatsApp status page load
- import preview page load

If a stable smoke account is not yet available, keep initial production smoke limited to public and health endpoints plus any safe authenticated checks that can be supported.

## Shared Business Rule Extraction

A release-safety pass is not just about adding tests. Some current logic will need to move into shared modules to become testable and to avoid drift between UI, API, and worker paths.

Initial extraction targets:

- subscription date/status logic
- phone normalization
- check-in access rules
- WhatsApp delivery/status interpretation

Constraint:

- only extract what is directly needed for the first safety net
- avoid broad, unrelated cleanup

## Migration and Deploy Guardrails

Current state shows deploy can succeed independently from stronger schema/runtime guarantees.

For this pass:

- document the deploy contract clearly
- make post-deploy smoke explicit
- surface migration risk in CI/deploy docs
- tighten repo-side deploy workflow expectations

If Cloud Build / runtime settings allow safe tightening during implementation, prefer failing loudly over silent drift. If full migration blocking cannot be made safe in the same pass, the gap must remain explicitly documented rather than hidden.

## Observability Baseline

This pass should standardize structured logging fields where practical for touched code paths:

- `release_id`
- `request_id`
- `organization_id`
- `branch_id`
- `member_id`
- `queue_id`

Full observability work is out of scope, but touched code should move toward consistent structured logs so failures are easier to trace after deploy.

## Rollout Plan

Recommended order:

1. add test runners, config, and package scripts
2. add initial unit test coverage for the first shared rule targets
3. add initial integration coverage for narrow server-side contracts
4. add local Playwright smoke coverage
5. add `ci.yml`
6. add production post-deploy smoke workflow
7. enforce branch protection / required checks
8. tighten deploy/migration guardrails where safely possible
9. document regression policy and release workflow

This order gets fast merge protection in place before broader governance changes.

## Success Criteria

This hardening pass is successful when:

- PRs cannot merge without passing build/typecheck/test/smoke checks
- the repo contains runnable unit, integration, and smoke test suites
- production deploys are followed by an automated smoke check
- at least the initial golden flows are covered by smoke tests
- at least the first fragile shared rule modules are under unit coverage
- direct release risk is lower without requiring a staging environment first

## Risks and Trade-offs

### Risk: CI becomes too slow

Mitigation:

- keep unit/integration tests fast
- keep smoke suite intentionally small
- reserve broader coverage for future passes

### Risk: smoke tests are flaky

Mitigation:

- favor deterministic flows
- avoid unnecessary visual assertions
- keep production smoke minimal at first

### Risk: no staging environment

Mitigation:

- local pre-merge smoke
- production post-deploy smoke
- plan staging separately after the baseline safety net is in place

### Risk: platform enforcement depends on external access

Mitigation:

- implement all repo-side workflows first
- apply GitHub protections immediately afterward when admin access is available

## Out of Scope Follow-ups

Likely follow-up work after this pass:

- real staging environment
- preview deployments per PR
- broader API integration coverage
- stronger migration automation/rollback policy
- richer production synthetic monitoring
- broader observability/tracing rollout
