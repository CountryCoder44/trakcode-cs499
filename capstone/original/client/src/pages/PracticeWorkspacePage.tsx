import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { practiceApi, portfolioApi } from '../api/endpoints';
import type { Problem, SubmissionResult } from '../api/types';
import { ApiError } from '../api/client';
import Markdown from '../components/Markdown';
import TutorChat from '../components/TutorChat';
import CodeEditor, { type CodeEditorHandle } from '../components/CodeEditor';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import { parseErrors, type ExecutionConsoleData } from '../utils/errorParsing';
import { STACK_TO_LANGUAGE } from '../utils/stack';

export default function PracticeWorkspacePage() {
  const { problemId } = useParams<{ problemId: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushedUrl, setPushedUrl] = useState<string | null>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  useEffect(() => {
    if (!problemId) return;
    practiceApi
      .getProblem(problemId)
      .then((res) => {
        setProblem(res.problem);
        setCode(res.problem.starterCode);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problem'));
  }, [problemId]);

  async function handleSubmit() {
    if (!problem) return;
    setSubmitting(true);
    setError(null);
    try {
      const { submission } = await practiceApi.submit({
        problemId: problem.id,
        code,
        language: STACK_TO_LANGUAGE[problem.stack],
      });
      setResult(submission);
      setConsoleVisible(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePush() {
    if (!result) return;
    setPushing(true);
    setError(null);
    try {
      const { githubRepoUrl } = await portfolioApi.push(result.id);
      setPushedUrl(githubRepoUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Push to GitHub failed');
    } finally {
      setPushing(false);
    }
  }

  if (error && !problem) return <div className="error-banner">{error}</div>;
  if (!problem) {
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );
  }

  const errorPanelData = result
    ? parseErrors({
        compileError: result.compileError,
        stderr: result.stderr,
        testResults: result.testResults,
        language: STACK_TO_LANGUAGE[problem.stack],
      })
    : [];

  const consoleOutput: ExecutionConsoleData | null =
    consoleVisible && result
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
      <Link to="/practice" className="text-dim" style={{ fontSize: 13 }}>
        ← Back to practice modes
      </Link>

      <div style={{ flex: 1, minHeight: 400 }}>
        <WorkspaceShell
          layoutId="practice-workspace"
          chatPanel={<TutorChat contextType="problem" contextId={problem.id} code={code} />}
          editorPanel={
            <>
              <div className="card">
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {problem.stack}
                  </span>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {problem.difficulty}
                  </span>
                  <span className="badge badge-accent">{problem.topic}</span>
                </div>
                <Markdown content={problem.prompt} />
              </div>

              <div style={{ height: 420 }}>
                <CodeEditor
                  ref={editorRef}
                  value={code}
                  onChange={setCode}
                  language={STACK_TO_LANGUAGE[problem.stack]}
                />
              </div>

              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <span className="spinner" /> : 'Run & Submit'}
              </button>

              {error && <div className="error-banner">{error}</div>}

              {result && (
                <div className="flex items-center gap-2">
                  <span className={`badge badge-${result.result === 'pass' ? 'success' : 'danger'}`}>
                    {result.result === 'pass' ? 'All tests passed' : result.result === 'fail' ? 'Tests failed' : 'Error'}
                  </span>
                  <span className="text-faint" style={{ fontSize: 12 }}>
                    {result.executionTimeMs}ms
                  </span>
                  {result.result === 'pass' && problem.type === 'deep_dive' && (
                    <>
                      {pushedUrl ? (
                        <a href={pushedUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                          View on GitHub →
                        </a>
                      ) : (
                        <button className="btn btn-sm btn-primary" onClick={handlePush} disabled={pushing}>
                          {pushing ? <span className="spinner" /> : 'Push to GitHub'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          }
          errorPanelData={errorPanelData}
          onJumpToLine={(line) => editorRef.current?.scrollToLine(line)}
          consoleOutput={consoleOutput}
          onCloseConsole={() => setConsoleVisible(false)}
        />
      </div>
    </div>
  );
}
