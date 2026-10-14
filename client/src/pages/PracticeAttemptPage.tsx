import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authApi, practiceAssignmentsApi } from '../api/endpoints';
import type { PracticeAssignmentView, PracticeAttemptView } from '../api/types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Markdown from '../components/Markdown';
import TutorChat from '../components/TutorChat';
import CodeEditor, { type CodeEditorHandle } from '../components/CodeEditor';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import PushToGithubModal from '../components/PushToGithubModal';
import { parseErrors, type ExecutionConsoleData } from '../utils/errorParsing';

// One long-form practice assignment. The learner edits a single solution file;
// provided files are shown read-only. Work autosaves. "Run & check" runs every
// test (hidden ones report pass/fail only) plus a code check per required
// concept; the assignment completes when all of them pass.

const SOLUTION_FILE: Record<string, string> = { python: 'solution.py', typescript: 'solution.ts', cpp: 'solution.cpp' };
const AUTOSAVE_MS = 1500;

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

function List({ items }: { items: string[] }) {
  return (
    <ul className="practice-list">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export default function PracticeAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempt, setAttempt] = useState<PracticeAttemptView | null>(null);
  const [assignment, setAssignment] = useState<PracticeAssignmentView | null>(null);
  const [code, setCode] = useState('');
  const [openFile, setOpenFile] = useState<string>('__solution');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [running, setRunning] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const editorRef = useRef<CodeEditorHandle>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef('');

  useEffect(() => {
    if (!attemptId) return;
    practiceAssignmentsApi
      .attempt(attemptId)
      .then(({ attempt: a, assignment: s }) => {
        setAttempt(a);
        setAssignment(s);
        setCode(a.code);
        lastSaved.current = a.code;
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this assignment.'));
  }, [attemptId]);

  const save = useCallback(
    async (value: string) => {
      if (!attemptId || value === lastSaved.current) return;
      setSaveState('saving');
      try {
        await practiceAssignmentsApi.saveCode(attemptId, value);
        lastSaved.current = value;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    [attemptId]
  );

  function onEdit(value: string) {
    setCode(value);
    if (attempt?.status === 'abandoned') return;
    setSaveState('unsaved');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void save(value), AUTOSAVE_MS);
  }

  // Save on the way out, too.
  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  async function run() {
    if (!attemptId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setRunning(true);
    setError(null);
    try {
      const { attempt: updated } = await practiceAssignmentsApi.run(attemptId, code);
      setAttempt(updated);
      lastSaved.current = code;
      setSaveState('saved');
      setConsoleVisible(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Run failed.');
    } finally {
      setRunning(false);
    }
  }

  async function lifecycle(action: 'abandon' | 'reopen' | 'replay') {
    if (!attemptId) return;
    if (action === 'abandon' && !window.confirm('Put this assignment down? Your code is saved and you can continue it later.')) return;
    try {
      const { attempt: updated } = await practiceAssignmentsApi[action](attemptId);
      if (action === 'abandon') navigate('/practice');
      else if (updated.id !== attemptId) navigate(`/practice/attempt/${updated.id}`);
      else setAttempt(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function startPush() {
    if (user?.githubPortfolioConnected) {
      setPushOpen(true);
      return;
    }
    setConnecting(true);
    try {
      const { url } = await authApi.linkProvider('github', { returnTo: `/practice/attempt/${attemptId}?push=1` });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect GitHub');
      setConnecting(false);
    }
  }

  // Back from connecting GitHub.
  useEffect(() => {
    if (searchParams.get('push') !== '1' || !user) return;
    setSearchParams({}, { replace: true });
    if (user.githubPortfolioConnected) setPushOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  if (error && !assignment) return <div className="error-banner">{error}</div>;
  if (!attempt || !assignment) {
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );
  }

  const run_ = attempt.lastRun;
  const fixture = assignment.fixtures.find((f) => f.path === openFile);
  const solutionName = SOLUTION_FILE[assignment.language] ?? 'solution';

  const errorPanelData = run_
    ? parseErrors({
        compileError: run_.compileError,
        stderr: run_.stderr,
        // Hidden tests have no input/output to show, so only visible ones feed the error panel.
        testResults: run_.tests.filter((t) => t.visible).map((t) => ({ passed: t.passed, actualOutput: t.actualOutput ?? '', expectedOutput: t.expectedOutput ?? '' })),
        language: assignment.language,
      })
    : [];

  const consoleOutput: ExecutionConsoleData | null =
    consoleVisible && run_
      ? {
          ranAt: run_.ranAt,
          compileError: run_.compileError,
          stderr: run_.stderr,
          testBlocks: run_.tests.map((t) => ({
            label: t.visible ? t.name : `${t.name} (hidden)`,
            input: t.visible ? t.input : undefined,
            actualOutput: t.visible ? t.actualOutput ?? '' : t.passed ? 'passed' : 'failed',
            expectedOutput: t.visible ? t.expectedOutput ?? '' : '(hidden)',
            passed: t.passed,
          })),
        }
      : null;

  const evidenceFor = (conceptId?: string) => run_?.evidence.find((e) => e.conceptId === conceptId);

  return (
    <div className="flex-col" style={{ flex: 1, minHeight: 400, gap: 12 }}>
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Link to="/practice" className="text-dim" style={{ fontSize: 13 }}>
          ← Back to practice
        </Link>
        <span className="text-faint" style={{ fontSize: 12 }}>
          {attempt.status === 'abandoned' ? 'Put down' : saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : saveState === 'error' ? "Couldn't save. Your next run will save it." : 'All changes saved'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 400 }}>
        <WorkspaceShell
          layoutId="practice-workspace"
          chatPanel={<TutorChat contextType="practiceAttempt" contextId={attempt.id} code={code} resumeSessionId={attempt.tutorSessionId ?? undefined} />}
          editorPanel={
            <>
              {attempt.status === 'completed' && (
                <div className="practice-complete">
                  <strong>Assignment complete.</strong> Every test and concept check passed.
                  <div className="flex gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                    {attempt.github ? (
                      <a className="btn btn-sm" href={attempt.github.url} target="_blank" rel="noreferrer">
                        View on GitHub →
                      </a>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={startPush} disabled={connecting}>
                        {connecting ? <span className="spinner" /> : user?.githubPortfolioConnected ? 'Push to GitHub' : 'Connect GitHub & push'}
                      </button>
                    )}
                    <Link className="btn btn-sm" to="/practice">
                      Next assignment
                    </Link>
                    <button className="btn btn-sm" onClick={() => lifecycle('replay')}>
                      Practice this again
                    </button>
                  </div>
                </div>
              )}
              {attempt.status === 'abandoned' && (
                <div className="practice-status">
                  You put this assignment down.{' '}
                  <button className="btn btn-sm btn-primary" onClick={() => lifecycle('reopen')}>
                    Continue it
                  </button>
                </div>
              )}
              {attempt.replay && <div className="badge badge-neutral">Practicing again (doesn't count as new practice)</div>}

              <div className="card practice-brief">
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="badge badge-neutral">{assignment.language}</span>
                  <span className="badge badge-neutral">{assignment.scopeLabel}</span>
                  <span className="badge badge-accent">{assignment.mode === 'stretch' ? 'Stretch out' : 'Practice the basics'}</span>
                  {assignment.concepts.map((c) => (
                    <span key={c.id} className="badge badge-warning">
                      {c.name}
                    </span>
                  ))}
                </div>
                <h2 style={{ marginTop: 0 }}>{assignment.title}</h2>
                <p>{assignment.scenario}</p>
                <p>
                  <strong>Goal:</strong> {assignment.goal}
                </p>
                <h4>Requirements</h4>
                <List items={assignment.requirements} />
                {assignment.deliverables.length > 0 && (
                  <>
                    <h4>Deliverables</h4>
                    <List items={assignment.deliverables} />
                  </>
                )}
                <h4>Input</h4>
                <p>{assignment.inputSpec}</p>
                <h4>Output</h4>
                <p>{assignment.outputSpec}</p>
                {assignment.constraints.length > 0 && (
                  <>
                    <h4>Constraints</h4>
                    <List items={assignment.constraints} />
                  </>
                )}
                {assignment.samples && (
                  <>
                    <h4>Example</h4>
                    <Markdown content={assignment.samples} />
                  </>
                )}
                {assignment.foundation.length > 0 && (
                  <p className="text-faint" style={{ fontSize: 12 }}>
                    Builds on: {assignment.foundation.map((f) => f.name).join(', ')}
                  </p>
                )}

                <h4>Checklist</h4>
                <ul className="practice-checklist">
                  {assignment.rubric.map((r) => {
                    const state =
                      r.kind === 'test'
                        ? run_
                          ? run_.allTestsPassed
                            ? 'pass'
                            : 'fail'
                          : 'todo'
                        : r.kind === 'concept'
                          ? evidenceFor(r.conceptId)
                            ? evidenceFor(r.conceptId)!.passed
                              ? 'pass'
                              : 'fail'
                            : 'todo'
                          : 'review';
                    return (
                      <li key={r.id} className={`check-${state}`}>
                        <span className="check-mark">{state === 'pass' ? '✓' : state === 'fail' ? '✗' : state === 'review' ? '◇' : '○'}</span>
                        {r.description}
                        {r.kind === 'review' && <span className="text-faint"> (not auto-checked, ask Trak to review)</span>}
                        {r.kind === 'test' && run_ && (
                          <span className="text-faint">
                            {' '}
                            ({run_.passedCount}/{run_.totalCount})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-faint" style={{ fontSize: 12 }}>
                  {assignment.visibleTests.length} visible test{assignment.visibleTests.length === 1 ? '' : 's'} and {assignment.hiddenTestCount} hidden. Concept checks
                  look at your code for the concept; they don't judge style.
                </p>
              </div>

              <div className="file-tabs">
                <button className={openFile === '__solution' ? 'active' : ''} onClick={() => setOpenFile('__solution')}>
                  {solutionName}
                </button>
                {assignment.fixtures.map((f) => (
                  <button key={f.path} className={openFile === f.path ? 'active' : ''} onClick={() => setOpenFile(f.path)}>
                    {f.path} <span className="text-faint">(read-only)</span>
                  </button>
                ))}
              </div>
              <div style={{ height: 440, overflow: 'hidden' }}>
                {fixture ? (
                  <pre className="fixture-view">{fixture.content}</pre>
                ) : (
                  <CodeEditor ref={editorRef} value={code} onChange={onEdit} language={assignment.language} readOnly={attempt.status === 'abandoned'} />
                )}
              </div>

              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={run} disabled={running || attempt.status === 'abandoned'}>
                  {running ? <span className="spinner" /> : 'Run & check'}
                </button>
                {attempt.status === 'in_progress' && (
                  <button className="btn" onClick={() => lifecycle('abandon')}>
                    Put it down for now
                  </button>
                )}
              </div>
              {error && <div className="error-banner">{error}</div>}

              {run_ && (
                <div className="card practice-results">
                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <span className={`badge badge-${run_.completedThisRun ? 'success' : run_.allTestsPassed ? 'warning' : 'danger'}`}>
                      {run_.compileError ? 'Error' : `${run_.passedCount}/${run_.totalCount} tests passing`}
                    </span>
                    {run_.allTestsPassed && !run_.completedThisRun && <span className="text-dim">Tests pass, but a concept check isn't met yet.</span>}
                  </div>
                  <ul className="practice-checklist">
                    {run_.tests.map((t, i) => (
                      <li key={i} className={t.passed ? 'check-pass' : 'check-fail'}>
                        <span className="check-mark">{t.passed ? '✓' : '✗'}</span>
                        {t.name}
                        {!t.visible && <span className="text-faint"> (hidden)</span>}
                        {t.fileChecks?.filter((c) => !c.passed).map((c) => (
                          <span key={c.path} className="text-faint">
                            {' '}
                            · {c.path} doesn't match
                          </span>
                        ))}
                      </li>
                    ))}
                    {run_.evidence.map((e) => (
                      <li key={e.conceptId} className={e.passed ? 'check-pass' : 'check-fail'}>
                        <span className="check-mark">{e.passed ? '✓' : '✗'}</span>
                        {e.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          }
          errorPanelData={errorPanelData}
          onJumpToLine={(line) => {
            setOpenFile('__solution');
            editorRef.current?.scrollToLine(line);
          }}
          consoleOutput={consoleOutput}
          onCloseConsole={() => setConsoleVisible(false)}
        />
      </div>
      {pushOpen && (
        <PushToGithubModal
          topic={assignment.title}
          language={assignment.language}
          push={(body) => practiceAssignmentsApi.pushToGithub(attempt.id, body)}
          onClose={() => setPushOpen(false)}
          onPushed={(res) =>
            setAttempt((prev) => (prev ? { ...prev, github: { url: res.githubRepoUrl, commitUrl: res.commitUrl, repoName: res.repoName } } : prev))
          }
        />
      )}
    </div>
  );
}
