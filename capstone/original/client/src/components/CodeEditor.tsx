import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { useTheme } from '../context/ThemeContext';
import type { ExecutionLanguage } from '../api/types';

// Real gutter with line numbers (basicSetup's default) so Trak can say
// "the error is on line 23" and the learner can actually find it — see the
// dockable-layout plan. Replaces the plain <textarea className="code-editor">
// used everywhere before this.

const LANGUAGE_EXTENSIONS: Record<ExecutionLanguage, Extension> = {
  python: python(),
  javascript: javascript(),
  cpp: cpp(),
};

// Matches the app's existing design tokens (same var()-indirection technique
// .code-editor already used) so this tracks data-theme automatically.
const trakEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
    height: '100%',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--accent)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13.5px',
    lineHeight: '1.6',
  },
  '.cm-content': {
    caretColor: 'var(--editor-text)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--text-faint)',
    border: 'none',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bg-elevated-2)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-elevated-2)',
  },
});

// Imperative "scroll to and highlight line N" — standard CM6 recipe. Used by
// the bottom error panel's "jump to line" buttons and by Trak's chat once it
// references a specific line number.
const setHighlightLine = StateEffect.define<number | null>();

const highlightLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setHighlightLine)) {
        if (effect.value === null) {
          decorations = Decoration.none;
        } else {
          const clamped = Math.max(1, Math.min(effect.value, tr.state.doc.lines));
          const line = tr.state.doc.line(clamped);
          decorations = Decoration.set([Decoration.line({ class: 'cm-highlighted-line' }).range(line.from)]);
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export interface CodeEditorHandle {
  scrollToLine: (oneBasedLine: number) => void;
  clearHighlight: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: ExecutionLanguage;
  readOnly?: boolean;
  className?: string;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, language, readOnly, className },
  ref
) {
  const { theme } = useTheme();
  const innerRef = useRef<ReactCodeMirrorRef>(null);

  const extensions = useMemo(() => [LANGUAGE_EXTENSIONS[language], trakEditorTheme, highlightLineField], [language]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToLine(oneBasedLine) {
        const view = innerRef.current?.view;
        if (!view) return;
        const clamped = Math.max(1, Math.min(oneBasedLine, view.state.doc.lines));
        const line = view.state.doc.line(clamped);
        view.dispatch({
          effects: [setHighlightLine.of(clamped), EditorView.scrollIntoView(line.from, { y: 'center' })],
        });
      },
      clearHighlight() {
        const view = innerRef.current?.view;
        if (!view) return;
        view.dispatch({ effects: setHighlightLine.of(null) });
      },
    }),
    []
  );

  return (
    <CodeMirror
      ref={innerRef}
      className={className}
      value={value}
      onChange={onChange}
      theme={theme}
      extensions={extensions}
      readOnly={readOnly}
      height="100%"
    />
  );
});

export default CodeEditor;
