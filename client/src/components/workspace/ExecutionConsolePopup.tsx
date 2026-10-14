import { useEffect } from 'react';
import type { ExecutionConsoleData } from '../../utils/errorParsing';

// Transient overlay shown fresh on every Run — "full raw execution output as
// a console" per the dockable-layout plan, distinct in character from the
// persistent bottom ErrorPanel. Dismissible via backdrop click, Escape, or
// the close button; re-opens fresh each run since the parent always passes a
// new object (see `ranAt`).
interface ExecutionConsolePopupProps {
  data: ExecutionConsoleData;
  onClose: () => void;
}

export default function ExecutionConsolePopup({ data, onClose }: ExecutionConsolePopupProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const hasAnyOutput = data.compileError || data.stdout !== undefined || data.testBlocks?.length || data.stderr;

  return (
    <div className="console-popup-backdrop" onClick={onClose}>
      <div className="console-popup" onClick={(e) => e.stopPropagation()}>
        <div className="console-popup-header">
          <strong>Console</strong>
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="console-popup-body">
          {data.compileError && (
            <div className="console-block">
              <div className="console-block-label">Compile error</div>
              {data.compileError}
            </div>
          )}

          {data.stdout !== undefined && (
            <div className="console-block">
              <div className="console-block-label">stdout</div>
              {data.stdout || '(no output)'}
            </div>
          )}

          {data.testBlocks?.map((block, i) => (
            <div className="console-block" key={i}>
              <div className="console-block-label">
                {block.label} {block.passed ? '✓ passed' : '✗ failed'}
              </div>
              {block.input && <div>{`> stdin: ${block.input}`}</div>}
              <div>{`stdout: ${block.actualOutput || '(no output)'}`}</div>
              {!block.passed && <div>{`expected: ${block.expectedOutput}`}</div>}
            </div>
          ))}

          {data.stderr && (
            <div className="console-block">
              <div className="console-block-label">stderr</div>
              {data.stderr}
            </div>
          )}

          {!hasAnyOutput && <div className="text-faint">No output.</div>}
        </div>
      </div>
    </div>
  );
}
