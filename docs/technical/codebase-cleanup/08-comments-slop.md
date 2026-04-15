# Comments and Slop Audit

## Findings

1. The repo had a large amount of comment noise in presentation files: file-header banners, section labels like `Header`/`Hero`/`CTA`, and inline narration that repeated what the JSX already showed. This was most concentrated in `app/components/*`, `saas-web/app/features/*`, `saas-web/app/blog/*`, the duplicate city landing page, and the Remotion demo. Those comments added scan cost without giving a new engineer any extra intent.

2. The preload bridge and Tailwind config still carried stale organizational comments. In the preload file, the `Custom APIs for renderer` and per-section labels were just checklist-style narration around an already typed API surface. In `tailwind.config.js`, most comments were migration leftovers describing legacy color mapping and font aliases that the object keys already expressed.

3. Some comments were intentionally left in place because they explain non-obvious behavior or guardrails rather than restating structure. Examples include reconnect/credential handling in the WhatsApp service, scan cooldown logic in attendance, and accessibility-sensitive labels in a few UI components. Those comments still have value for a new engineer.

## Recommendations

1. Keep comments only when they explain an invariant, a non-obvious edge case, or a behavior that cannot be inferred from the code in front of it.

2. Remove file banners and section dividers from simple component trees. The component name, route, and JSX hierarchy are enough in most landing-page and marketing-page files.

3. Avoid migration narration in production code. If a fallback or legacy path must remain, encode the reason in the implementation or in a nearby test, not in comment prose that will age out.

4. Treat config files the same way as code. If a config entry is already self-descriptive, comment blocks that explain old naming conventions or prior refactors should be deleted.

## Applied Cleanup

- Removed comment noise from `app/components/*`, `app/layout.jsx`, `app/page.jsx`, `tailwind.config.js`, `src/preload/index.ts`, and the Remotion demo preview.
- Removed section/comment banners from `saas-web/app/features/*`, `saas-web/app/blog/*`, and `saas-web/app/gym-management-software/[city]/page.tsx`.
- Kept comments that still add intent, especially where the code handles reconnects, scan cooldowns, accessibility, or other non-obvious behavior.

## Verification

- Scanned the edited files for comment-only lines after the cleanup. The only remaining comments in the touched files are the Tailwind JSDoc header and a necessary `@ts-ignore` in the preload bridge.
- Ran `npm run typecheck` at the repo root and in `saas-web/`. Both fail on existing unrelated type issues in renderer/dashboard code, not on the comment cleanup.
