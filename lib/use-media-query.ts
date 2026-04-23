'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport matches the given media query.
 * Falls back to `false` during SSR so the mobile-first layout renders first.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True on desktop (lg and up) — mirrors Tailwind's lg breakpoint */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
