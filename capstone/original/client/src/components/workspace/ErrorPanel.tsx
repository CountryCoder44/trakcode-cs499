import type { StructuredError } from '../../utils/errorParsing';

// Persistent bottom panel — "structured, highlighted errors" per the
// dockable-layout plan. Always mounted (never unmounts on empty state), so
// it reads as a permanent fixture of the workspace, not something that pops
// in and out.
interface ErrorPanelProps {
  errors: StructuredError[];
  onJumpToLine: (line: number) => void;
}

const SEVERITY_LABEL: Record<StructuredError['severity'], string> = {
  compile: 'Compile error',
  runtime: 'Runtime error',
  'test-failure': 'Test failed',
};

const SEVERITY_BADGE_CLASS: Record<StructuredError['severity'], string> = {
  compile: 'badge-danger',
  runtime: 'badge-danger',
  'test-failure': 'badge-accent',
};

export default function ErrorPanel({ errors, onJumpToLine }: ErrorPanelProps) {
  return (
    <div className="error-panel">
      <div className="error-panel-header">Problems{errors.length > 0 ? ` (${errors.length})` : ''}</div>
      <div className="error-panel-body">
        {errors.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 12px' }}>
            Run your code to see errors here
          </div>
        ) : (
          errors.map((err) => (
            <div key={err.id} className="error-row">
              <span className={`badge ${SEVERITY_BADGE_CLASS[err.severity]}`}>{SEVERITY_LABEL[err.severity]}</span>
              <div className="error-row-message">
                {err.message}
                {err.detail && err.detail !== err.message && <div className="error-row-detail">{err.detail}</div>}
              </div>
              {err.line !== null && (
                <button className="btn btn-sm" onClick={() => onJumpToLine(err.line as number)}>
                  Line {err.line}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
