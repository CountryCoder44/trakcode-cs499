import Anthropic from '@anthropic-ai/sdk';
import { TutorContext } from '../tutorContext.service';

/**
 * Prefixes each line with its 1-based number so Trak's "the error is on line
 * 23" lines up exactly with what CodeEditor's gutter shows the learner —
 * same 1-based convention CodeMirror uses by default.
 */
function numberLines(code: string): string {
  return code
    .split('\n')
    .map((line, i) => `${i + 1}| ${line}`)
    .join('\n');
}

/**
 * curriculumItem-only opening-turn guidance, branched on how many of the 5
 * required questions this learner has already passed unaided this lesson
 * attempt (context.unaidedPassCount) — the signal for "which round is this,"
 * no separate phase/round field needed. Only ever reached via `initiate`
 * (round 0) or a `beginNextRound` retrigger (every round after).
 */
function curriculumItemOpeningGuidance(context: TutorContext): string[] {
  const passes = context.unaidedPassCount ?? 0;

  if (passes === 0) {
    return [
      'This is the very first message of this lesson attempt — you are speaking first, before the learner has said anything. Keep it short (this is an opener, not a lecture):',
      '- Give a brief, friendly intro to the concept this lesson covers, calibrated to what you already know about this learner (see below) — do not re-explain something they\'ve already shown familiarity with.',
      '- Invite questions or a request to elaborate on anything so far.',
      '- Explicitly ask whether they\'d like to get started, or if they have any more questions first.',
      "- Do not attach or mention a specific practice question yet — that happens automatically once they signal they're ready.",
    ];
  }

  if (passes < 5) {
    const nextRound = passes + 1;
    const remainingAfterNext = 5 - nextRound;
    return [
      `This is a check-in between questions — the learner has passed ${passes} of the 5 required questions so far, and is about to start question ${nextRound} of 5. You are speaking first. Keep it short:`,
      '- Briefly acknowledge the pass — no need to re-explain the concept, you already covered it earlier in this same conversation.',
      '- Ask if anything is on their mind before the next question, or if they\'re ready to go.',
      remainingAfterNext > 0
        ? `- IMPORTANT: this is NOT the last question — ${remainingAfterNext} more will follow after it. Do not say or imply the lesson is complete, congratulate them on finishing, or suggest they're done for now.`
        : "- IMPORTANT: this IS the last of the 5 required questions, but they haven't started it yet — do not congratulate them on finishing or say the lesson is complete until AFTER they actually pass this one. Frame it as \"last one, let's finish strong\" at most, not as already done.",
      '- Do not attach or mention a specific practice question yet — that happens automatically once they signal they\'re ready.',
    ];
  }

  return [
    "This lesson is already complete (5/5) and the learner has opted into a bonus question. You are speaking first. Keep it short:",
    '- Briefly acknowledge they\'re here for extra practice — this one is optional, not required.',
    '- Ask if they\'d like to go ahead with a bonus question, or if they\'re done for now.',
    '- Do not attach or mention a specific practice question yet — that happens automatically once they signal they want one.',
  ];
}

/**
 * Builds Trak's system prompt, split into three tiers by how often each
 * part's bytes actually change, so the call can use real prompt caching —
 * previously zero `cache_control` existed anywhere in the codebase, meaning
 * every single Trak reply re-sent and paid full price for this whole prompt
 * from scratch (see the token-usage investigation in CLAUDE.md). Two cache
 * breakpoints:
 *   - STABLE: persona/policy + the problem/lesson content itself. Byte-
 *     identical for every message in one session (title/content never
 *     change mid-session) — this tier should hit on almost every turn.
 *   - SEMI-STABLE: memory + curriculum progress. Changes only on the rare
 *     exchange that actually updates them (extractMemoryUpdate mostly
 *     returns hasUpdate:false) — still a real win turn-to-turn.
 *   - VOLATILE (uncached tail): session signal changes every single call
 *     (message count, elapsed time), live editor code changes as the
 *     learner types, and the opening/transitioning/stricter blocks are
 *     specific to this one turn. Putting these after both breakpoints is
 *     what makes the breakpoints usable — see shared/prompt-caching.md
 *     "Placement patterns": stable content must physically precede volatile
 *     content, or a breakpoint just writes a fresh, never-reread entry.
 */
export function buildSystemPrompt(
  context: TutorContext,
  opts: { isOpeningTurn: boolean; stricter: boolean; transitioning?: boolean }
): Anthropic.TextBlockParam[] {
  const stableLines = [
    "You are Trak, TrakCode's AI coding tutor — a robot mouse mentor. You teach with the Socratic method by default: you guide the learner to find things themselves rather than handing over answers.",
    '',
    'How you talk, by default:',
    '- Give brief, focused, surface-level explanations — conversational and personable, never textbook-like or exhaustive.',
    "- After explaining something, offer to go deeper rather than dumping the full depth unprompted (e.g. \"want me to go further into why that works?\").",
    '- Direct syntax or reference questions ("what\'s the syntax to print a string") get answered outright and immediately — no Socratic runaround for a plain factual lookup.',
    '- Never volunteer a complete, directly-pasteable solution unprompted.',
    "- If the learner seems stuck or frustrated — weigh the session signal below alongside the conversation's actual tone — proactively OFFER to just show them a solution. Don't wait silently for them to ask. But only give the actual solution after you've made that offer and they've clearly agreed — never before.",
  ];

  // Found live: without this, once a normal (non-opening-turn) message came
  // in during calibration and the readiness classifier didn't fire, Trak had
  // NO instruction telling it a real practice question isn't attached yet —
  // curriculumItemOpeningGuidance's equivalent warning only fires on opening
  // turns. Left unguarded, it improvised an entire fake practice exchange
  // inline (its own made-up code snippet, then claimed the learner had run
  // it and "passed" — neither ever happened, no editor was ever on screen).
  // context.kind==='curriculumItem' is an architecturally reliable signal
  // for "still calibrating, no problem attached" — a curriculumItem-context
  // session never spans into practicing; a separate problem-context session
  // begins once a question actually gets attached — so this needs no extra
  // phase field, and applies to every turn, not just opening ones.
  if (context.kind === 'curriculumItem') {
    stableLines.push(
      '',
      'IMPORTANT — capability constraint for this whole conversation: no practice question has been ' +
        "attached yet, and the learner has NO code editor or way to run code in front of them right now " +
        '— this is a text-only discussion. Never ask them to "run" or "try running" anything, never present ' +
        'a code snippet as something to execute right now, and never say or imply that code was run, passed, ' +
        'or graded — none of that is possible yet and none of it has happened. A real, gradable practice ' +
        'question with a real code editor gets attached automatically, in a separate step, once you judge ' +
        'the learner ready — you do not make that happen by talking about a problem yourself. If a code ' +
        'example is useful for illustration, frame it purely as something to read and reason about ("here\'s ' +
        'what that would look like"), never as something to run or submit.'
    );
  }

  stableLines.push(
    '',
    `Context: the learner is working on "${context.title}"${context.stack ? ` (${context.stack})` : ''}.`,
    context.content
  );

  if (context.curriculumOutline) {
    stableLines.push(
      '',
      "The full Learn Mode (Sequential Curriculum) outline — every topic and lesson currently available, by course. If the learner asks where something is covered, or seems like they'd benefit from reviewing a specific topic/lesson in Learn Mode, point them to it by name and number (e.g. \"that's covered in Topic 5, Lesson 5.8\"):",
      context.curriculumOutline
    );
  }

  const { memory } = context;
  const semiStableLines = [
    "What you remember about this learner (accumulated only from what they've volunteered — see the rule below):",
    `Goals: ${memory.goals || '(nothing volunteered yet)'}`,
    `Other context: ${memory.personalNotes || '(nothing volunteered yet)'}`,
    memory.topicSkills.length > 0
      ? `Known topic familiarity: ${memory.topicSkills.map((t) => `${t.topic}${t.stack ? ` (${t.stack})` : ''}: ${t.level}${t.note ? ` — ${t.note}` : ''}`).join('; ')}.`
      : 'Known topic familiarity: none recorded yet.',
    '',
    'IMPORTANT: you must never proactively ask about the learner\'s goals, background, interests, or skill level to fill in the memory above — only note what comes up naturally in the course of conversation. Never turn a reply into an interview.',
    '',
    `Learner's curriculum progress: ${context.progressSummary}`,
  ];

  if (context.completedTopics && context.completedTopics.length > 0) {
    semiStableLines.push(
      '',
      'Topics in this stack this learner has ALREADY completed — safe to assume they know these, and safe to reference by name:',
      ...context.completedTopics.map((t) => `- ${t.title}: ${t.description}`)
    );
  }

  const volatileLines: string[] = [];
  const signal = context.stuckSignal;
  volatileLines.push(
    '',
    `Session signal (a fact to weigh alongside tone — not a trigger by itself): ${signal.messageCount} messages exchanged, ${Math.round(signal.minutesSinceSessionStart)} minute(s) since this chat started, ${signal.hasSucceededSinceSessionStart ? 'the learner HAS succeeded at this since the session started' : 'no success (passing run/completion) yet this session'}.`
  );

  if (opts.isOpeningTurn) {
    if (context.kind === 'problem') {
      // Unchanged, verbatim — Practice Mode / Flash Card must keep behaving
      // exactly as before; curriculumItem gets its own branch below since it
      // now has recurring rounds rather than a single opening message.
      volatileLines.push(
        '',
        'This is the opening message of a new session — you are speaking first, before the learner has said anything. Keep it short (this is an opener, not a lecture). Choose based on what you know:',
        '- If you have no recorded familiarity with this topic for this learner: ask one brief, low-pressure calibration question about how familiar they already are with it.',
        `- If ${memory.daysSinceLastInteraction === null ? 'this is your first-ever interaction with them' : `it's only been ${memory.daysSinceLastInteraction} day(s) since you last talked`}: just continue naturally, no ceremony.`,
        memory.daysSinceLastInteraction !== null && memory.daysSinceLastInteraction >= 7
          ? `- It has been ${memory.daysSinceLastInteraction} days since you last talked — that is a real gap. Greet them briefly and offer a refresher on where they left off before diving in.`
          : ''
      );
    } else if (context.kind === 'curriculumItem') {
      volatileLines.push('', ...curriculumItemOpeningGuidance(context));
      if (memory.daysSinceLastInteraction !== null && memory.daysSinceLastInteraction >= 7) {
        volatileLines.push(
          `- It has also been ${memory.daysSinceLastInteraction} days since you last talked with this learner at all — worth a brief, friendly acknowledgment alongside the above, not a separate message.`
        );
      }
    }
  }

  if (opts.transitioning) {
    volatileLines.push(
      '',
      "The learner's message just now signaled they're ready to move on — acknowledge briefly and let them know a question is on its way. Do not ask again whether they're ready or have more questions; that's already been answered. " +
        "A real question IS being attached right after this reply — so do NOT say goodbye, wish them well, tell them to take a break, or otherwise wrap up as if the session is ending. Keep it to a short, forward-looking acknowledgment (e.g. \"here we go\")."
    );
  }

  // Live/unsaved editor content is the freshest signal — surfaced before any
  // older DB submission below, and clearly distinguished from it so the
  // model doesn't conflate "what's on screen right now" with "what they last
  // submitted for grading". Line numbers are 1-based, matching the editor's
  // own gutter, so "line 23" references resolve to the right place.
  if (context.liveEditorCode) {
    volatileLines.push(
      '',
      "The learner's CURRENT, UNSAVED editor content (prefer this over any older submission below — line numbers shown for reference, do not repeat them verbatim in your reply):",
      '```',
      numberLines(context.liveEditorCode),
      '```'
    );
  }

  if (context.latestSubmissionCode) {
    volatileLines.push(
      '',
      "The learner's most recent code submission:",
      '```',
      context.latestSubmissionCode,
      '```',
      `Result: ${context.latestSubmissionResult}`
    );
  }

  if (opts.stricter) {
    volatileLines.push(
      '',
      'IMPORTANT: Your previous response was rejected by an automated guardrail because it contained a ' +
        'complete, working solution that was NOT legitimately offered-and-agreed-to in the preceding turns. ' +
        'Rewrite your response: either remove the complete solution, or — only if you had already explicitly ' +
        "offered to show it and the learner had already explicitly agreed — keep it."
    );
  }

  // Each non-final block gets a trailing '\n' — system text blocks are
  // concatenated with no implicit separator, so without it the stable
  // tier's last line would run directly into the semi-stable tier's first.
  const blocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: stableLines.filter((l) => l !== '').join('\n') + '\n',
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: semiStableLines.filter((l) => l !== '').join('\n') + '\n',
      cache_control: { type: 'ephemeral' },
    },
  ];
  const volatileText = volatileLines.filter((l) => l !== '').join('\n');
  if (volatileText) {
    blocks.push({ type: 'text', text: volatileText });
  }
  return blocks;
}

/**
 * Marks the newest message with a cache breakpoint so a growing, back-and-
 * forth conversation gets cheaper turn over turn: each later call's array is
 * this session's prior turns plus exactly one new message, with its own
 * breakpoint at ITS new last message — the previous call's breakpoint,
 * still present unchanged earlier in the array, is read as a cache hit for
 * everything through it, and this call writes a new, longer cached prefix.
 * See shared/prompt-caching.md "Multi-turn conversations". `conversation`'s
 * messages are always plain-string content in this codebase (built in
 * tutor.controller.ts) — the array-content case is left uncached rather
 * than guessed at. Returns a new array; never mutates the caller's
 * `conversation`.
 */
export function withCacheBreakpointOnLastMessage(conversation: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (conversation.length === 0) return conversation;
  const lastIndex = conversation.length - 1;
  const last = conversation[lastIndex];
  if (typeof last.content !== 'string') return conversation;

  return [
    ...conversation.slice(0, lastIndex),
    {
      role: last.role,
      content: [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }],
    },
  ];
}
