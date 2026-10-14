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
 * Builds Trak's system prompt, split into three tiers by how often each
 * part's bytes actually change, so the call can use real prompt caching —
 * previously zero `cache_control` existed anywhere in the codebase, meaning
 * every single Trak reply re-sent and paid full price for this whole prompt
 * from scratch. Two cache
 * breakpoints:
 *   - STABLE: persona/policy + the problem/lesson content itself. Byte-
 *     identical for every message in one session (title/content never
 *     change mid-session) — this tier should hit on almost every turn.
 *   - SEMI-STABLE: memory + curriculum progress. Changes only on the rare
 *     exchange that actually updates them (extractMemoryUpdate mostly
 *     returns hasUpdate:false) — still a real win turn-to-turn.
 *   - VOLATILE (uncached tail): session signal changes every single call
 *     (message count, elapsed time), live editor code changes as the
 *     learner types, and the opening/stricter blocks are
 *     specific to this one turn. Putting these after both breakpoints is
 *     what makes the breakpoints usable — see shared/prompt-caching.md
 *     "Placement patterns": stable content must physically precede volatile
 *     content, or a breakpoint just writes a fresh, never-reread entry.
 */
export function buildSystemPrompt(
  context: TutorContext,
  opts: { isOpeningTurn: boolean; stricter: boolean; maxWords?: number }
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

  // seqItem ("Ask Trak" on a Sequential Curriculum lesson item). Without a
  // capability constraint, Trak can invent a fake execution environment (claim
  // code was run or passed). The right constraint differs by item: a concept item genuinely has no editor at all, while a
  // practical/checkpoint has a real one right there on the page (its buffer
  // arrives as context.liveEditorCode below when hasCodeEditor is true) with
  // its own Run/Submit button this chat has no visibility into.
  if (context.kind === 'seqItem') {
    stableLines.push(
      '',
      context.hasCodeEditor
        ? 'IMPORTANT — capability constraint for this whole conversation: the learner DOES have a real code ' +
            "editor for this exercise, with their own Run/Submit button elsewhere on the page — you may see " +
            "their current buffer below (if provided) and reference or lightly adapt it. But you are NOT shown " +
            "the result of any run or submission they make. Never claim their code passed, failed, or was " +
            "graded, or that you ran anything yourself — you have no way of knowing unless they tell you."
        : 'IMPORTANT — capability constraint for this whole conversation: this is a text-only discussion about ' +
            "a reading/concept item — there is no code editor and no way to run code for this item at all. " +
            'Never ask the learner to "run" or "try running" anything, and never say or imply that code was ' +
            'run, passed, or graded. If a code example is useful, frame it purely as something to read and ' +
            'reason about, never as something to execute.'
    );
  }

  // Long-form practice assignments. The two modes deliberately get different
  // amounts of help: Stretch out is about new concepts, so substantial
  // explanation is part of the exercise, not a penalty.
  if (context.kind === 'practiceAttempt') {
    stableLines.push(
      '',
      'This is a long-form practice assignment. The learner has a real code editor with Run (checks visible and hidden tests plus concept checks) elsewhere on the page. You may see their current code below. You are NOT shown live run results except the latest saved result summary; never claim code passed or failed beyond that.',
      context.practiceMode === 'stretch'
        ? 'Mode: Stretch out. The assignment requires concepts beyond the basics that the learner may be meeting for the first time. Help substantially with those: explain the concept plainly, give short focused examples or snippets that show the idea (in a different context than their exact task), point to how it fits this assignment, help them read documentation, and debug with them in depth when asked. Keep each answer focused on what they need right now and leave the overall design and the assembly of the program to them. Never paste a complete solution to the assignment; the normal offer-and-consent rule still applies to that.'
        : 'Mode: Practice the basics. The learner is consolidating skills they have covered. Clarify the problem, remind them of relevant basics, suggest a next step, and help them debug. Prefer graduated hints: a question or a pointer first, a more specific hint next, and only then a small, targeted snippet. Do not introduce concepts beyond the basics listed for this assignment.'
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

  const volatileLines: string[] = [];
  const signal = context.stuckSignal;
  volatileLines.push(
    '',
    `Session signal (a fact to weigh alongside tone — not a trigger by itself): ${signal.messageCount} messages exchanged, ${Math.round(signal.minutesSinceSessionStart)} minute(s) since this chat started, ${signal.hasSucceededSinceSessionStart ? 'the learner HAS succeeded at this since the session started' : 'no success (passing run/completion) yet this session'}.`
  );

  if (opts.isOpeningTurn) {
    if (context.kind === 'problem' || context.kind === 'practiceAttempt') {
      volatileLines.push(
        '',
        'This is the opening message of a new session — you are speaking first, before the learner has said anything. Keep it short (this is an opener, not a lecture). Choose based on what you know:',
        '- If you have no recorded familiarity with this topic for this learner: ask one brief, low-pressure calibration question about how familiar they already are with it.',
        `- If ${memory.daysSinceLastInteraction === null ? 'this is your first-ever interaction with them' : `it's only been ${memory.daysSinceLastInteraction} day(s) since you last talked`}: just continue naturally, no ceremony.`,
        memory.daysSinceLastInteraction !== null && memory.daysSinceLastInteraction >= 7
          ? `- It has been ${memory.daysSinceLastInteraction} days since you last talked — that is a real gap. Greet them briefly and offer a refresher on where they left off before diving in.`
          : ''
      );
    }
    // seqItem never sends `initiate` (see AskTrakPanel.tsx) — the panel opens
    // on a blank slate and Trak only speaks once the learner asks something
    // first, so isOpeningTurn is never true for this kind in practice.
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
  } else if (context.kind === 'practiceAttempt' && context.latestSubmissionResult) {
    volatileLines.push('', 'Result of their most recent Run:', context.latestSubmissionResult);
  }

  if (opts.maxWords) {
    volatileLines.push(
      '',
      `Length: keep this reply under about ${opts.maxWords} words (code included). If there's more to say, ` +
        'cover the most useful part and offer to continue.'
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
