# Repository Guidelines

## Project Structure & Module Organization
This repository is a monorepo with three active apps:
- `src/` + `resources/`: Electron desktop app (React UI + Electron main/preload).
- `saas-web/`: Next.js 14 SaaS app (App Router, API routes, PostgreSQL/Firebase integrations).
- `app/`: marketing/landing site assets and pages.

Supporting folders:
- `docs/`: project memory, audits, deployment notes.
- `assets/`: shared static assets.
- `saas-web/worker/whatsapp-vm/`: WhatsApp automation worker.

## Build, Test, and Development Commands
Run commands from the matching app root.

Desktop (repo root):
- `npm run dev` — start Electron + Vite dev flow.
- `npm run build` — production desktop build output.
- `npm run test` / `npm run test:run` — Vitest tests.
- `npm run lint` — ESLint for `.ts/.tsx`.
- `npm run typecheck` — TypeScript no-emit check.

SaaS (`saas-web/`):
- `npm run dev` — run Next.js locally.
- `npm run build` / `npm run start` — production build/start.
- `npm run typecheck` — strict TS check.
- `npm run db:migrate` — database migrations.

Worker (`saas-web/worker/whatsapp-vm/`):
- `npm run dev` — run worker via `tsx`.

## Coding Style & Naming Conventions
- Language: TypeScript-first (`.ts/.tsx`).
- Indentation: 2 spaces; keep imports grouped and paths alias-based where configured (`@/...`).
- React components: `PascalCase`; hooks/util files: `kebab-case` or descriptive lowercase.
- API route files follow Next convention: `app/api/<domain>/<action>/route.ts`.
- Run lint/typecheck before pushing.

## Testing Guidelines
- Desktop uses Vitest (`vitest.config.ts`).
- Test files: `*.test.ts` (or colocated equivalents).
- Minimum expectation: changed logic should have regression coverage or a reproducible manual test note in PR.
- For SaaS critical flows (auth/scanner/import), validate locally with `npm run build` + smoke checks.

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
- Before pushing, confirm build health locally (`saas-web`: `npm run build`, desktop: `npm run typecheck` + tests as needed).
- If a live issue is urgent, push the fix first, then verify trigger/build/revision status.

## Communication Rule
- Always communicate in plain English.
- Keep updates short, direct, and action-focused.
- When reporting errors, include the exact error text and the next step.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` files and cloud secret managers.
- Treat generated artifacts (`dist/`, packaged binaries) as build outputs unless explicitly required.
