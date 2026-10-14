import { useEffect, useRef } from 'react';

// A soft ambient glow that follows the mouse, reusing the same --bg-glow-1
// token as the two fixed corner glows in global.css's body background — so
// it reads as "more of that," not a new decoration. Mounted once at the top
// of the tree (see main.tsx), rendered behind all real content because it's
// the first thing painted (no z-index games needed — see the CSS comment).
//
// Position is pushed straight to the DOM via a ref + CSS custom property on
// every mousemove, bypassing React state/re-renders entirely: this handler
// can fire dozens of times a second, and none of that should ever touch the
// render tree.
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect "reduce motion" and skip entirely on touch/coarse-pointer
    // devices, where there's no real hovering cursor to glow behind.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    function onMove(e: MouseEvent) {
      el!.style.setProperty('--cursor-x', `${e.clientX}px`);
      el!.style.setProperty('--cursor-y', `${e.clientY}px`);
      el!.style.opacity = '1';
    }
    function onLeave() {
      el!.style.opacity = '0';
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}
