import { useEffect, useState } from 'react';

// The dockable chat|editor split needs materially more width before
// side-by-side stays usable than the app's existing 720px .grid-2/.grid-3
// breakpoint (global.css) does — a second, wider breakpoint dedicated to the
// workspace shell. Keep this in sync with the matching literal media query
// in global.css (search WORKSPACE_NARROW_BREAKPOINT_PX there).
export const WORKSPACE_NARROW_BREAKPOINT_PX = 900;

// Same resolve-then-subscribe idiom ThemeContext.tsx already uses for
// prefers-color-scheme, generalized to an arbitrary media query.
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
