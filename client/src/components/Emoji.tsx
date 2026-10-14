import type { ReactNode } from 'react';

// Marks color emoji so they keep their colors under the Samsung Internet light
// mode workaround (see SamsungLightBackground.tsx and the `data-samsung` rules
// in global.css), which draws all other text with a shadow; on an emoji that
// trick would leave a black silhouette. Elsewhere `.emoji` is a plain span.

export function Emoji({ children }: { children: ReactNode }) {
  return <span className="emoji">{children}</span>;
}

// One emoji: a pictograph plus any variation selector, skin tone, or
// zero-width-joined parts (👩‍💻, ☀️, 👍🏽).
const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*)/gu;

/** Splits plain text so each emoji is wrapped in <Emoji>. For text we don't
 *  write ourselves: lesson content, Trak's replies. */
export function withEmoji(text: string): ReactNode[] {
  const parts = text.split(EMOJI_RE);
  return parts
    .map((part, i) => (i % 2 === 1 ? <Emoji key={i}>{part}</Emoji> : part))
    .filter((part) => part !== '');
}
