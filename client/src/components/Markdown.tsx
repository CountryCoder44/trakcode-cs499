import { Fragment, type ReactNode } from 'react';
import { withEmoji } from './Emoji';

// Minimal, dependency-free markdown renderer for lesson/problem content:
// headers, paragraphs, and inline `code`/**bold**. Builds React elements
// directly (no dangerouslySetInnerHTML) so there's no HTML-injection surface
// even though this content currently only comes from our own seed data / AI
// generation, not arbitrary user input.
// Inline markdown only (`code`, **bold**, _italic_, ==highlight==) — for
// one-line contexts like MC options, check questions, and grader feedback,
// where the block-level <div>/<p> wrapper of <Markdown> would be wrong.
// Each style has its own marker character, so they nest in any order
// (the Learn editor writes them that way). Italic and highlight need a
// non-space right inside the markers, so prose like "use == to compare" is
// left alone, and _italic_ must not touch a letter or digit, so snake_case
// names stay plain. *italic* (single asterisks) still renders for older text.
const INLINE_RE =
  /(`[^`]+`|\*\*[^*]+\*\*|==[^=\s](?:[^=]*[^=\s])?==|(?<![A-Za-z0-9_])_[^_\s](?:[^_]*[^_\s])?_(?![A-Za-z0-9_])|\*[^*\s](?:[^*]*[^*\s])?\*)/g;

export function renderInline(text: string): ReactNode[] {
  // split() with a capture group alternates plain text (even indexes) and
  // matched markup (odd indexes); only the matches are formatted.
  return text.split(INLINE_RE).map((part, i) => {
    if (!part) return null;
    if (i % 2 === 0) return <Fragment key={i}>{withEmoji(part)}</Fragment>;
    if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{renderInline(part.slice(2, -2))}</strong>;
    }
    if (part.length > 4 && part.startsWith('==') && part.endsWith('==')) {
      return <mark key={i}>{renderInline(part.slice(2, -2))}</mark>;
    }
    if (
      part.length > 2 &&
      ((part.startsWith('_') && part.endsWith('_')) ||
        (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')))
    ) {
      return <em key={i}>{renderInline(part.slice(1, -1))}</em>;
    }
    return <Fragment key={i}>{withEmoji(part)}</Fragment>;
  });
}

export default function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const h1 = trimmed.match(/^#\s+(.*)$/);
        if (h1) return <h2 key={i}>{renderInline(h1[1])}</h2>;

        const h2 = trimmed.match(/^##\s+(.*)$/);
        if (h2) return <h3 key={i}>{renderInline(h2[1])}</h3>;

        if (trimmed.startsWith('```')) {
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <pre key={i} className="code-editor" style={{ minHeight: 'auto', whiteSpace: 'pre-wrap' }}>
              {code}
            </pre>
          );
        }

        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
