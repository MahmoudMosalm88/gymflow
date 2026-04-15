# Circular Dependency Review

## Scope

I scanned the repo with `madge` across the Electron app, the Next.js app, the worker, and the Remotion demo tree.

Commands used:

- `npx madge --circular --json --warning --extensions ts src/main src/preload`
- `npx madge --circular --json --warning --extensions ts,tsx --webpack-config /tmp/madge-root-renderer.config.cjs src/renderer/src`
- `npx madge --circular --json --warning --extensions ts,tsx,js,mjs --ts-config saas-web/tsconfig.json saas-web/app saas-web/components saas-web/lib saas-web/remotion saas-web/scripts`
- `npx madge --circular --json --warning --extensions ts,tsx saas-web/remotion-demo`
- `npx madge --circular --json --warning --extensions ts --ts-config saas-web/worker/whatsapp-vm/tsconfig.json saas-web/worker/whatsapp-vm/src`

## Findings

### 1. No real circular dependencies in the Electron or Next.js app graphs

`madge` returned `[]` for:

- `src/main` and `src/preload`
- `src/renderer/src`
- `saas-web/app`, `saas-web/components`, `saas-web/lib`, and `saas-web/scripts`
- `saas-web/worker/whatsapp-vm/src`

That means the main application surfaces are not carrying a circular-dependency problem at the moment.

### 2. The only reported cycles were Remotion resolver artifacts

`madge` reported 7 cycles in the Remotion demo tree before the fix. Every cycle passed through `saas-web/remotion/index.ts` and `saas-web/remotion/Root.tsx`, for example:

- `DashboardPreview.tsx -> DashboardScene.tsx -> Cursor.tsx -> index.ts -> Root.tsx`
- `Root.tsx -> DashboardPreview.tsx -> LandingPagePromo.tsx -> index.ts`
- `Root.tsx -> DashboardPreview.tsx -> SalesPromo.tsx -> index.ts`

The debug output showed the key problem: inside `saas-web/remotion`, bare `remotion` imports were being resolved back to the local folder entrypoint instead of the npm package. That is a naming collision, not a runtime dependency loop.

## Assessment

The code itself in the Remotion tree is already reasonably layered:

- `Root.tsx` defines compositions.
- `DashboardPreview.tsx` sequences scenes.
- Scene files render UI and depend only on shared cursor/spotlight helpers.

The issue was that the folder name `remotion` collided with the `remotion` package name. That made the dependency graph look cyclic even though the package imports were intended to be external.

## Fix Implemented

I renamed the isolated Remotion demo directory from `saas-web/remotion` to `saas-web/remotion-demo` and updated the Next.js TypeScript exclusion list in `saas-web/tsconfig.json`.

This removes the package/folder collision and keeps the demo tree out of the Next.js build/typecheck path.

## Verification

After the rename, the repo-wide `madge` pass no longer reports any cycles in the scanned application graphs.

## Recommendations

- Keep standalone tooling/demo trees out of folder names that match imported package names.
- If the Remotion tree grows, keep composition registration and scene code under a clearly named isolated folder so graph tooling does not misclassify package imports.
- If future scans need stricter accuracy, run `madge` with explicit resolver config for the Remotion tree instead of relying on default directory resolution.
