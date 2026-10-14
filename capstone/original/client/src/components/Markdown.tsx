import type { ReactNode } from 'react';

// Minimal, dependency-free markdown renderer for lesson/problem content:
// headers, paragraphs, and inline `code`/**bold**. Builds React elements
// directly (no dangerouslySetInnerHTML) so there's no HTML-injection surface
// even though this content currently only comes from our own seed data / AI
// generation, not arbitrary user input.
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
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
