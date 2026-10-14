import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { practiceApi } from '../api/endpoints';
import type { Problem, ProblemType, Stack, SubmissionResult } from '../api/types';
import { ApiError } from '../api/client';
import Markdown from '../components/Markdown';
import TutorChat from '../components/TutorChat';
import CodeEditor, { type CodeEditorHandle } from '../components/CodeEditor';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import { parseErrors, type ExecutionConsoleData } from '../utils/errorParsing';
import { STACK_TO_LANGUAGE } from '../utils/stack';

// Slots into the shared dockable shell with default sizes only — Flash
// Card's own bespoke panel arrangement is a follow-up the user will design
// separately later, per direction. Not over-invested in here.
export default function FlashCardSessionPage() {
  const [params] = useSearchParams();
  const stack = (params.get('stack') as Stack) ?? 'python';
  const type = (params.get('type') as Extract<ProblemType, 'flash_bug' | 'flash_fill'>) ?? 'flash_bug';

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const editorRef = useRef<CodeEditorHandle>(null);
  // Guards the mount-time load specifically — StrictMode's dev double-invoke
  // fired this effect twice in near-simultaneous succession, which raced two
  // real /flash-card/request calls against the backend's read-then-write
  // "has this user seen this problem" check and surfaced as a raw 500
  // (E11000 on userProblemHistory's unique index — fixed server-side too,
  // but no reason to also burn a duplicate bank-serve/generation here).
  // Same idiom as TutorChat's initiatedRef. Deliberately NOT reused for the
  // explicit loadNext() calls below (Next/Skip) — those are real, intentional
  // repeat requests, not accidental double-fires.
  const initialLoadRef = useRef(false);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setConsoleVisible(false);
    try {
      const { problem } = await practiceApi.requestFlashCard({ stack, type });
      setProblem(problem);
      setCode(problem.starterCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load a flash card');
    } finally {
      setLoading(false);
    }
  }, [stack, type]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadNext();
  }, [loadNext]);

  async function handleCheck() {
    if (!problem) return;
    setLoading(true);
    setError(null);
    try {
      const { submission } = await practiceApi.submit({ problemId: problem.id, code, language: STACK_TO_LANGUAGE[stack] });
      setResult(submission);
      setConsoleVisible(true);
      if (submission.result === 'pass') setSolvedCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Check failed');
    } finally {
      setLoading(false);
    }
  }

  const errorPanelData = result
    ? parseErrors({
        compileError: result.compileError,
        stderr: result.stderr,
        testResults: result.testResults,
        language: STACK_TO_LANGUAGE[stack],
      })
    : [];

  const consoleOutput: ExecutionConsoleData | null =
    consoleVisible && result && problem
      ? {
          ranAt: result.submittedAt,
          compileError: result.compileError,
          stderr: result.stderr,
          testBlocks: result.testResults.map((t, i) => ({
            label: `Test ${i + 1}`,
            input: problem.testCases[i]?.input,
            actualOutput: t.actualOutput,
            expectedOutput: t.expectedOutput,
            passed: t.passed,
          })),
        }
      : null;

  return (
    <div className="flex-col" style={{ flex: 1, minHeight: 400, gap: 12 }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 22 }}>🐭</span>
          <strong>Trak</strong>
          <span className="text-faint" style={{ fontSize: 13 }}>
            — flash cards, {stack}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success">{solvedCount} solved</span>
          <Link to="/practice" className="btn btn-sm">
            Exit
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!problem || loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 400 }}>
          <WorkspaceShell
            layoutId="flash-card"
            chatPanel={<TutorChat contextType="problem" contextId={problem.id} code={code} />}
            editorPanel={
              <>
                <div className="card">
                  <Markdown content={problem.prompt} />
                </div>

                <div style={{ height: 320, overflow: 'hidden' }}>
                  <CodeEditor ref={editorRef} value={code} onChange={setCode} language={STACK_TO_LANGUAGE[stack]} />
                </div>

                {result && (
                  <div
                    className="badge"
                    style={{
                      display: 'block',
                      background: result.result === 'pass' ? 'var(--success-dim)' : 'var(--danger-dim)',
                      color: result.result === 'pass' ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {result.result === 'pass'
                      ? '✓ Nailed it!'
                      : `✗ ${result.testResults.filter((t) => !t.passed).length} test(s) still failing`}
                  </div>
                )}

                <div className="flex gap-3">
                  <button className="btn btn-primary" onClick={handleCheck} disabled={loading}>
                    Check
                  </button>
                  <button className="btn" onClick={loadNext} disabled={loading}>
                    {result?.result === 'pass' ? 'Next →' : 'Skip →'}
                  </button>
                </div>
              </>
            }
            errorPanelData={errorPanelData}
            onJumpToLine={(line) => editorRef.current?.scrollToLine(line)}
            consoleOutput={consoleOutput}
            onCloseConsole={() => setConsoleVisible(false)}
          />
        </div>
      )}
    </div>
  );
}
