import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

// Samsung Internet light mode workaround.
//
// Samsung Internet's dark mode force-darkens every page and ignores both
// `color-scheme` and `prefers-color-scheme` (Samsung confirms sites can't opt
// out, and it doesn't even report dark mode to the page). Tested on a real
// device (2026-10-11, /samsung-test/), it leaves <canvas> pixels alone, and
// text drawn as a shadow behind a transparent glyph keeps its color. So when
// index.html marks the browser as Samsung (`data-samsung`) and the light theme
// is on:
//   - a fixed canvas paints the page background (off-white, glows, 46px grid);
//   - every panel, button, title bar and footer (FILL_SELECTORS) gets its own
//     canvas child as its fill. It has to live INSIDE the element: one shared
//     canvas behind the page can't keep up with scrolling on Samsung, and
//     would sit under the page content rather than under a fixed title bar;
//   - global.css makes the CSS fills transparent and draws text with
//     `text-shadow: 0 0 0 currentColor` over a transparent fill;
//   - color emoji (<Emoji>, Trak's avatar) and the code editor draw normally.
// In the dark theme only the background canvas runs (Samsung dims the CSS grid
// until it disappears); dark panels look fine as they are. Other browsers never
// run any of this.

// Elements that get a canvas fill: white unless listed in SPECIAL_FILLS.
const FILL_SELECTORS = [
  '.topnav',
  '.topnav-open .nav-collapse',
  '.public-footer',
  '.card',
  '.btn',
  '.theme-toggle',
  '.nav-toggle',
  '.tabs',
  '.table',
  '.tree-item',
  '.seq-question',
  '.chat-panel',
  '.chat-bubble',
  '.ask-trak-panel',
  '.error-panel',
  '.console-popup',
  '.update-toast',
  '.heatmap-tooltip',
  '.connect-banner',
  '.welcome-banner',
  '.trial-cta',
  '.billing-founder-note',
  '.billing-success',
  '.info-draft-note',
  '.error-banner',
  '.trial-limits',
  '.practice-status',
  '.practice-warning',
  '.trak-pack',
].join(',');

// Colors from the light theme (--accent, --accent-dim).
const SPECIAL_FILLS: [selector: string, color: string][] = [
  ['.btn-primary', '#4f46e5'],
  ['.chat-bubble.user', '#eceafd'],
];
const WHITE = '#ffffff';

// The page background (mirrors body in global.css): --bg, --bg-glow-1/2, --bg-grid.
const LIGHT_BG = { base: '#f6f7fb', clear: 'rgba(246,247,251,0)', glow1: 'rgba(79,70,229,0.07)', glow2: 'rgba(14,165,233,0.05)', grid: 'rgba(18,20,28,0.07)' };
const DARK_BG = { base: '#0b0e14', clear: 'rgba(11,14,20,0)', glow1: 'rgba(99,102,241,0.12)', glow2: 'rgba(56,189,248,0.07)', grid: 'rgba(255,255,255,0.065)' };

const isSamsung = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-samsung');

/** A 1x1 canvas in one color. Stretched over its parent by CSS, it renders as a solid fill. */
function makeFill(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.className = 'samsung-fill';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
  }
  canvas.dataset.color = color;
  return canvas;
}

function fillFor(el: Element): string {
  return SPECIAL_FILLS.find(([selector]) => el.matches(selector))?.[1] ?? WHITE;
}

function attach(el: HTMLElement) {
  const color = fillFor(el);
  const existing = Array.from(el.children).find((c) => c.classList.contains('samsung-fill')) as
    | HTMLCanvasElement
    | undefined;
  if (existing && existing.dataset.color === color) return;
  existing?.remove();
  // The fill is positioned against its element; a static element needs to become a containing block.
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
    el.dataset.samsungPos = '1';
  }
  el.setAttribute('data-sfill', '');
  // Appended last: React leaves foreign nodes alone and inserts its own before or after them freely.
  el.appendChild(makeFill(color));
}

function attachAll(root: ParentNode) {
  if (root instanceof HTMLElement && root.matches(FILL_SELECTORS)) attach(root);
  root.querySelectorAll<HTMLElement>(FILL_SELECTORS).forEach(attach);
}

function detachAll() {
  document.querySelectorAll('canvas.samsung-fill').forEach((c) => c.remove());
  document.querySelectorAll<HTMLElement>('[data-sfill]').forEach((el) => {
    el.removeAttribute('data-sfill');
    if (el.dataset.samsungPos) {
      el.style.position = '';
      delete el.dataset.samsungPos;
    }
  });
}

export default function SamsungLightBackground() {
  const { theme } = useTheme();
  const ref = useRef<HTMLCanvasElement>(null);
  const samsung = isSamsung();
  // Background canvas in both themes (Samsung dims the CSS grid until it vanishes);
  // panel fills and text tricks only in light.
  const active = samsung && theme === 'light';
  const palette = theme === 'light' ? LIGHT_BG : DARK_BG;

  // The page background: off-white, two glows and the grid (mirrors body in global.css).
  useEffect(() => {
    if (!samsung) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, w, h);
      const glow = (cx: number, cy: number, rx: number, ry: number, color: string, stop: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, color);
        g.addColorStop(stop, palette.clear);
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      };
      glow(w * 0.08, -h * 0.12, 1100, 700, palette.glow1, 0.6);
      glow(w * 1.04, -h * 0.04, 900, 650, palette.glow2, 0.55);
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0.5; x < w; x += 46) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0.5; y < h; y += 46) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [samsung, palette]);

  // Panel fills: attach to what's on the page now, and to whatever React adds later.
  useEffect(() => {
    if (!active) return;
    attachAll(document);
    let queued = false;
    const observer = new MutationObserver(() => {
      // Batch: one pass per frame however many nodes changed.
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        attachAll(document);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      detachAll();
    };
  }, [active]);

  if (!samsung) return null;
  return <canvas ref={ref} className="samsung-light-bg" aria-hidden="true" />;
}
