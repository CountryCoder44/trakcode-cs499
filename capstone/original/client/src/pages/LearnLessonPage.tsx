import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { learnApi, practiceApi } from '../api/endpoints';
import type { CurriculumItemDetail, LearnerState, Problem, Stack, SubmissionResult, CurriculumAdvance } from '../api/types';
import { ApiError } from '../api/client';
import Markdown from '../components/Markdown';
import TutorChat from '../components/TutorChat';
import CodeEditor, { type CodeEditorHandle } from '../components/CodeEditor';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import { parseErrors, type ExecutionConsoleData } from '../utils/errorParsing';
import { STACK_TO_LANGUAGE } from '../utils/stack';

// Learn Mode redesign: a lesson is no longer static content + a starter-code
// editor + a manually-gated "Mark complete" button. Completing a lesson now
// means passing 5 distinct AI-served questions on the lesson's topic without
// Trak revealing a solution for any of them — see the Learn Mode redesign
// plan. Calibration (a full-bleed chat with Trak, no editor visible) recurs
// before every question, not just once; once the learner signals readiness,
// the chat shrinks into today's normal split workspace with a real,
// topic-matched problem attached.
type Phase = 'loading' | 'choosing' | 'start-over-choosing' | 'calibrating' | 'practicing' | 'complete-choice';

export default function LearnLessonPage() {
  const { stack, itemId } = useParams<{ stack: Stack; itemId: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<CurriculumItemDetail | null>(null);
  const [learnerState, setLearnerState] = useState<LearnerState | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [resumeSessionId, setResumeSessionId] = useState<string | undefined>(undefined);
  const [triggerNextRound, setTriggerNextRound] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<CodeEditorHandle>(null);
  const loadedRef = useRef(false);
  // Stashed between a passing submit and the learner's explicit "Continue"
  // click — the round transition is deliberately not automatic (see
  // handleContinueAfterPass below), so the result needs to live somewhere
  // that isn't wiped by the next render.
  const pendingAdvanceRef = useRef<CurriculumAdvance | null>(null);

  useEffect(() => {
    if (!itemId || loadedRef.current) return;
    loadedRef.current = true;
    learnApi
      .getItem(itemId)
      .then(({ item: loadedItem, learnerState: ls }) => {
        setItem(loadedItem);
        setLearnerState(ls);
        if (ls.status === 'complete' && ls.phase === 'calibrating') {
          setResumeSessionId(ls.resumeSessionId ?? undefined);
          setPhase('complete-choice');
        } else if (ls.status === 'complete' && ls.phase === 'practicing') {
          enterPracticing(ls);
        } else if (!ls.hasPriorSession) {
          enterFresh(ls);
        } else {
          setPhase('choosing');
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load lesson'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  function enterFresh(ls: LearnerState) {
    if (ls.phase === 'practicing') {
      enterPracticing(ls);
      return;
    }
    setResumeSessionId(undefined);
    setTriggerNextRound(false);
    setPhase('calibrating');
  }

  function enterPracticing(ls: LearnerState) {
    setProblem(ls.currentProblem);
    setCode(ls.currentProblem?.starterCode ?? '');
    setResumeSessionId(ls.resumeSessionId ?? undefined);
    setResult(null);
    setPhase('practicing');
  }

  function handleContinue() {
    if (!learnerState) return;
    if (learnerState.phase === 'practicing') {
      enterPracticing(learnerState);
    } else {
      setResumeSessionId(learnerState.resumeSessionId ?? undefined);
      setTriggerNextRound(false);
      setPhase('calibrating');
    }
  }

  function handleRestartConversation() {
    if (!learnerState) return;
    if (learnerState.phase === 'practicing') {
      setProblem(learnerState.currentProblem);
      setCode(learnerState.currentProblem?.starterCode ?? '');
      setResult(null);
      setResumeSessionId(undefined);
      setPhase('practicing');
    } else {
      setResumeSessionId(undefined);
      setTriggerNextRound(false);
      setPhase('calibrating');
    }
  }

  async function handleFullReset() {
    if (!itemId) return;
    setResetting(true);
    setError(null);
    try {
      await learnApi.resetProgress(itemId);
      setProblem(null);
      setResult(null);
      setResumeSessionId(undefined);
      setTriggerNextRound(false);
      setPhase('calibrating');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset progress');
    } finally {
      setResetting(false);
    }
  }

  function handleReadyForPractice(nextProblem: Problem) {
    setProblem(nextProblem);
    setCode(nextProblem.starterCode);
    setResult(null);
    setConsoleVisible(false);
    setResumeSessionId(undefined);
    setTriggerNextRound(false);
    setPhase('practicing');
  }

  async function handleSubmit() {
    if (!problem) return;
    setSubmitting(true);
    setError(null);
    try {
      const { submission, curriculumAdvance } = await practiceApi.submit({
        problemId: problem.id,
        code,
        language: STACK_TO_LANGUAGE[problem.stack],
      });
      setResult(submission);
      setConsoleVisible(true);
      pendingAdvanceRef.current = curriculumAdvance ?? null;
      if (curriculumAdvance) {
        setLearnerState((prev) =>
          prev
            ? {
                ...prev,
                unaidedPassCount: curriculumAdvance.unaidedPassCount,
                status: curriculumAdvance.lessonJustCompleted ? 'complete' : prev.status,
              }
            : prev
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Every round transition — mandatory or bonus — requires this explicit
  // click rather than auto-swapping the layout the instant grading finishes,
  // so the workspace doesn't change out from under the learner while they're
  // still reading their result.
  function handleContinueAfterPass() {
    const advance = pendingAdvanceRef.current;
    if (!advance) return;
    if (advance.lessonJustCompleted) {
      setResumeSessionId(advance.resumeSessionId);
      setPhase('complete-choice');
      return;
    }
    setResumeSessionId(advance.resumeSessionId);
    setTriggerNextRound(true);
    setResult(null);
    setConsoleVisible(false);
    setPhase('calibrating');
  }

  function handleTryBonusQuestion() {
    setTriggerNextRound(true);
    setPhase('calibrating');
  }

  if (error && !item) return <div className="error-banner">{error}</div>;
  if (!item || phase === 'loading') {
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );
  }

  const language = STACK_TO_LANGUAGE[item.stack];

  const errorPanelData = result
    ? parseErrors({ compileError: result.compileError, stderr: result.stderr, testResults: result.testResults, language })
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
      <Link to={`/learn/${stack}`} className="text-dim" style={{ fontSize: 13 }}>
        ← Back to skill tree
      </Link>

      {error && <div className="error-banner">{error}</div>}

      {(phase === 'choosing' || phase === 'start-over-choosing' || phase === 'complete-choice') && (
        <div className="flex justify-center items-center" style={{ flex: 1, minHeight: 400 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <div className="badge badge-neutral" style={{ marginBottom: 8 }}>
              {item.level}
            </div>
            <h1 style={{ marginTop: 0 }}>{item.title}</h1>

            {phase === 'complete-choice' && (
              <>
                <p>🎉 Lesson complete — you've passed all 5 required questions on this topic.</p>
                <div className="flex gap-3">
                  <button className="btn btn-primary" onClick={handleTryBonusQuestion}>
                    Try a bonus question
                  </button>
                  <button className="btn" onClick={() => navigate(`/learn/${stack}`)}>
                    Back to skill tree
                  </button>
                </div>
              </>
            )}

            {phase === 'choosing' && (
              <>
                <p>You've already started this lesson. Pick up where you left off, or start over?</p>
                <div className="flex gap-3">
                  <button className="btn btn-primary" onClick={handleContinue}>
                    Continue where I left off
                  </button>
                  <button className="btn" onClick={() => setPhase('start-over-choosing')}>
                    Start over
                  </button>
                </div>
              </>
            )}

            {phase === 'start-over-choosing' && (
              <>
                <p>Restart just the conversation (your progress toward the 5 questions is kept), or fully reset this lesson back to 0/5?</p>
                <div className="flex-col gap-2">
                  <button className="btn btn-primary" onClick={handleRestartConversation}>
                    Restart conversation, keep progress
                  </button>
                  <button className="btn btn-danger" onClick={handleFullReset} disabled={resetting}>
                    {resetting ? <span className="spinner" /> : 'Full reset (back to 0/5)'}
                  </button>
                  <button className="btn btn-sm" onClick={() => setPhase('choosing')}>
                    ← Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'calibrating' && (
        <div style={{ flex: 1, minHeight: 400 }}>
          <div className="chat-panel">
            <TutorChat
              contextType="curriculumItem"
              contextId={item.id}
              code=""
              resumeSessionId={resumeSessionId}
              triggerNextRound={triggerNextRound}
              onReadyForPractice={handleReadyForPractice}
            />
          </div>
        </div>
      )}

      {phase === 'practicing' && problem && (
        <div style={{ flex: 1, minHeight: 400 }}>
          <WorkspaceShell
            layoutId="learn-lesson"
            chatPanel={<TutorChat contextType="problem" contextId={problem.id} code={code} resumeSessionId={resumeSessionId} />}
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
                    <span className="badge badge-accent">
                      Question {Math.min(learnerState?.unaidedPassCount ?? 0, 4) + 1} of 5
                    </span>
                  </div>
                  <Markdown content={problem.prompt} />
                </div>

                <div style={{ height: 420 }}>
                  <CodeEditor ref={editorRef} value={code} onChange={setCode} language={STACK_TO_LANGUAGE[problem.stack]} />
                </div>

                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Run & Submit'}
                </button>

                {result && (
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${result.result === 'pass' ? 'success' : 'danger'}`}>
                      {result.result === 'pass' ? 'All tests passed' : result.result === 'fail' ? 'Tests failed' : 'Error'}
                    </span>
                    <span className="text-faint" style={{ fontSize: 12 }}>
                      {result.executionTimeMs}ms
                    </span>
                    {result.result === 'pass' && (
                      <button className="btn btn-sm btn-primary" onClick={handleContinueAfterPass}>
                        Continue →
                      </button>
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
      )}
    </div>
  );
}
