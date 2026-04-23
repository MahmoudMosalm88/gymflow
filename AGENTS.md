# Repository Guidelines

## Project Structure & Module Organization
This repository is centered on a root-level Next.js SaaS app:
- `app/`: active Next.js 14 SaaS app (App Router, API routes, PostgreSQL/Firebase integrations).

Supporting folders:
- `docs/`: project memory, audits, deployment notes.
- `assets/`: shared static assets.
- `worker/whatsapp-vm/`: WhatsApp automation worker.

## Build, Test, and Development Commands
Run commands from the repo root unless a section explicitly says otherwise.

SaaS app (repo root):
- `npm run dev` — run Next.js locally.
- `npm run build` / `npm run start` — production build/start.
- `npm run typecheck` — strict TS check.
- `npm run test` — Vitest unit + integration suites.
- `npm run test:smoke` — Playwright local smoke suite.
- `npm run test:smoke:prod` — Playwright production smoke suite.
- `npm run db:migrate` — database migrations.

Worker (`worker/whatsapp-vm/`):
- `npm run dev` — run worker via `tsx`.
- `npm run typecheck` — worker TS validation.

## Coding Style & Naming Conventions
- Language: TypeScript-first (`.ts/.tsx`).
- Indentation: 2 spaces; keep imports grouped and paths alias-based where configured (`@/...`).
- React components: `PascalCase`; hooks/util files: `kebab-case` or descriptive lowercase.
- API route files follow Next convention: `app/api/<domain>/<action>/route.ts`.
- Run lint/typecheck before pushing.

## Testing Guidelines
- Minimum expectation: changed logic should have regression coverage or a reproducible manual test note in PR.
- For critical flows (auth/scanner/import), validate locally with:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test`
  - `npm run test:smoke`
- Authenticated smoke checks rely on `E2E_EMAIL` + `E2E_PASSWORD`. Without them, public smoke still needs to pass.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `fix(...)`, `feat(...)`, `docs:`, `chore(...)`.
  - Example: `fix(scanner): map activity feed status correctly`.
- Keep commits scoped to one concern.
- PRs should include:
  - concise problem/solution summary,
  - impacted paths,
  - verification steps (commands run),
  - screenshots/video for UI changes,
  - deployment/config notes when relevant.

## Deployment Workflow
- Do not run manual production deployments from local terminal.
- Deployment must happen through the configured CI/CD trigger on push to `main`.
- Before pushing, confirm build health locally from the repo root with `npm run build`.
- CI now uses stable required-check job names: `app-quality`, `worker-typecheck`, `smoke-local`, and post-deploy `prod-smoke`.
- If a live issue is urgent, push the fix first, then verify trigger/build/revision status.

## Communication Rule
- Always communicate in plain English.
- Keep updates short, direct, and action-focused.
- When reporting errors, include the exact error text and the next step.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` files and cloud secret managers.
- Treat generated artifacts as build outputs unless explicitly required.
