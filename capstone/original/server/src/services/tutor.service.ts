import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_REASONING, MODEL_FAST } from './aiClient';
import { executeCode } from './executionClient';
import { TutorContext } from './tutorContext.service';
import { ITopicSkill } from '../models/TutorMemory';
import { logAiUsage } from './aiUsage.service';

// Prefixes each line with its 1-based number so Trak's "the error is on
// line 23" lines up exactly with what CodeEditor's gutter shows the learner
// — same 1-based convention CodeMirror uses by default.
function numberLines(code: string): string {
  return code
    .split('\n')
    .map((line, i) => `${i + 1}| ${line}`)
    .join('\n');
}

// curriculumItem-only opening-turn guidance, branched on how many of the 5
// required questions this learner has already passed unaided this lesson
// attempt (context.unaidedPassCount) — the signal for "which round is this,"
// no separate phase/round field needed. Only ever reached via `initiate`
// (round 0) or a `beginNextRound` retrigger (every round after).
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

// Split into three tiers by how often each part's bytes actually change,
// so this call can use real prompt caching — previously zero cache_control
// existed anywhere in the codebase, meaning every single Trak reply re-sent
// and paid full price for this whole prompt from scratch (see the token-
// usage investigation in CLAUDE.md). Two cache breakpoints:
//   - STABLE: persona/policy + the problem/lesson content itself. Byte-
//     identical for every message in one session (title/content never
//     change mid-session) — this tier should hit on almost every turn.
//   - SEMI-STABLE: memory + curriculum progress. Changes only on the rare
//     exchange that actually updates them (extractMemoryUpdate mostly
//     returns hasUpdate:false) — still a real win turn-to-turn.
//   - VOLATILE (uncached tail): session signal changes every single call
//     (message count, elapsed time), live editor code changes as the
//     learner types, and the opening/transitioning/stricter blocks are
//     specific to this one turn. Putting these after both breakpoints is
//     what makes the breakpoints usable — see shared/prompt-caching.md
//     "Placement patterns": stable content must physically precede volatile
//     content, or a breakpoint just writes a fresh, never-reread entry.
// Content and wording are unchanged from before — this only regroups which
// paragraph goes in which tier; nothing was reworded or removed.
function buildSystemPrompt(
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
    } else {
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

// Marks the newest message with a cache breakpoint so a growing, back-and-
// forth conversation gets cheaper turn over turn: each later call's array is
// this session's prior turns plus exactly one new message, with its own
// breakpoint at ITS new last message — the previous call's breakpoint,
// still present unchanged earlier in the array, is read as a cache hit for
// everything through it, and this call writes a new, longer cached prefix.
// See shared/prompt-caching.md "Multi-turn conversations". `conversation`'s
// messages are always plain-string content in this codebase (built in
// tutor.controller.ts) — the array-content case is left uncached rather
// than guessed at. Returns a new array; never mutates the caller's
// `conversation`.
function withCacheBreakpointOnLastMessage(conversation: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
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

const CODE_BLOCK_RE = /```(?:\w+)?\n([\s\S]*?)```/g;

// Guardrail layer 1 — real execution. Spec §6: "flagging responses that
// contain a complete, directly-pasteable solution (e.g., a code block that
// would pass all test cases if submitted as-is)". Verified by actually
// running the code against the problem's own test cases, not by asking a
// model to judge itself. Only applies where we have test cases to run
// against (problem context) — see layer 2 for curriculum-item coverage.
// Purely a "does this look like a complete solution" detector — it has no
// conversational awareness and never will; consent is judged in layer 2.
async function sandboxGuardrailFlags(responseText: string, context: TutorContext): Promise<boolean> {
  if (context.kind !== 'problem' || !context.problemTestCases || !context.problemLanguage) {
    return false;
  }

  const blocks = [...responseText.matchAll(CODE_BLOCK_RE)].map((m) => m[1]);
  for (const code of blocks) {
    if (code.trim().length < 10) continue; // too short to plausibly be a full solution
    try {
      const result = await executeCode(context.problemLanguage, code, context.problemTestCases, 5000);
      if (result.allPassed) return true;
    } catch {
      // A code block that doesn't even run isn't a leaked solution — ignore execution errors here.
    }
  }
  return false;
}

function renderTranscript(turns: Anthropic.MessageParam[]): string {
  return turns
    .map((m) => {
      const text = typeof m.content === 'string' ? m.content : m.content.map((b) => ('text' in b ? b.text : '')).join(' ');
      return `${m.role === 'assistant' ? 'Trak' : 'Learner'}: ${text}`;
    })
    .join('\n');
}

const solutionClassificationSchema = z.object({
  // Placed first deliberately — structured-output fields are generated in
  // schema order, so this acts as inline chain-of-thought ahead of the more
  // subjective `offeredAndConsented` judgment, without a separate thinking call.
  // 300 was too tight in practice: explaining BOTH "is this a complete
  // solution" and "was it offered-and-consented-to" in the same field
  // regularly ran past it once a real conversation was involved, which threw
  // a validation error out of messages.parse() — caught below and failed
  // open to `consented: false`, silently defeating the whole consent-reveal
  // path even after a clean, explicit offer-and-agreement exchange. Found by
  // live-testing the reveal flow end-to-end, not by inspection. 600 gives
  // real headroom; the "one or two sentences" instruction keeps it from
  // drifting long on its own.
  rationale: z
    .string()
    .max(600)
    .describe(
      'One or two sentences: what in the reply makes it a complete solution or not, and whether an explicit ' +
        'offer-and-consent exchange occurred in the immediately preceding turns. Reason here before answering below.'
    ),
  containsCompleteSolution: z
    .boolean()
    .describe(
      'true only if the response hands the learner a complete, directly-usable solution or answer they could ' +
        'submit as-is to finish the problem/exercise themselves. Hints, conceptual nudges, pointing at a bug, ' +
        'and small pseudo-code fragments are all fine and must NOT be flagged.'
    ),
  offeredAndConsented: z
    .boolean()
    .describe(
      'true only when, in the turns immediately preceding this reply, Trak explicitly offered to show the ' +
        'complete solution (e.g. "want me to just show you a solution?") and the learner explicitly agreed. ' +
        'false whenever containsCompleteSolution is false, or no such explicit offer-and-agreement exchange occurred.'
    ),
});

// Guardrail layer 2 — cheap LLM classification, now conversation-aware. Runs
// for every response (both problem and curriculum-item context), unlike
// layer 1 which needs test cases to execute against. This is the only layer
// that can judge "was this legitimately earned" — layer 1 has no notion of
// conversation history.
async function llmGuardrailFlags(
  responseText: string,
  context: TutorContext,
  recentTurns: Anthropic.MessageParam[]
): Promise<{ solutionDetected: boolean; consented: boolean }> {
  const client = getAnthropicClient();
  if (!client) return { solutionDetected: false, consented: false }; // no key configured — caller already handles this upstream

  const prompt = [
    `A Socratic coding tutor named Trak is talking to a learner working on "${context.title}". Here is the recent conversation, ending with Trak's newest reply:`,
    '---',
    renderTranscript(recentTurns),
    '---',
    'Does the FINAL reply above (the last "Trak:" turn) contain a complete, directly-usable solution or answer? ' +
      'If so, was it legitimately offered by Trak and agreed to by the learner in the turns immediately before it?',
  ].join('\n');

  try {
    const response = await client.messages.parse({
      model: MODEL_FAST,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(solutionClassificationSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_FAST, tier: 'fast', purpose: 'tutor-guardrail', usage: response.usage });
    return {
      solutionDetected: response.parsed_output?.containsCompleteSolution ?? false,
      consented: response.parsed_output?.offeredAndConsented ?? false,
    };
  } catch (err) {
    // NOTE: "fail open" here only means "don't crash the tutor" — it does
    // NOT mean the reply gets waved through. `consented: false` is the safe
    // default, but it also means a classifier error silently blocks any
    // reveal layer 1 already flagged, with no visible trace of why. Logged
    // so a repeat of the .max(300) incident (see rationale's comment above)
    // shows up instead of just looking like "the model won't reveal."
    // eslint-disable-next-line no-console
    console.error('tutor guardrail classification failed, defaulting to not-consented', err);
    return { solutionDetected: false, consented: false };
  }
}

// Cheap, no-API-call pre-filter for the guardrail's Haiku classification
// call (llmGuardrailFlags) — token-usage investigation found this firing on
// literally every single Trak reply, including plain acknowledgments and
// short calibration chit-chat. Per solutionClassificationSchema, a reply can
// only BE "a complete, directly-usable solution or answer" by either
// containing a code block or being long enough to fully spell one out in
// prose — a short reply with no code fence at all is never that. Left
// deliberately conservative: ANY code fence, or ANY length at/above the
// threshold, still goes through full classification — this only skips the
// clear-cut case, and the sandbox layer (real code execution) is unaffected
// since it independently requires a code fence too.
const GUARDRAIL_SKIP_MAX_LENGTH = 200;
function implausibleSolutionLeak(responseText: string): boolean {
  return !responseText.includes('```') && responseText.trim().length < GUARDRAIL_SKIP_MAX_LENGTH;
}

async function evaluateGuardrail(
  responseText: string,
  context: TutorContext,
  recentTurns: Anthropic.MessageParam[]
): Promise<{ flagged: boolean; revealed: boolean }> {
  if (implausibleSolutionLeak(responseText)) {
    return { flagged: false, revealed: false };
  }

  const [sandboxDetected, llmResult] = await Promise.all([
    sandboxGuardrailFlags(responseText, context),
    llmGuardrailFlags(responseText, context, recentTurns),
  ]);
  const solutionPresent = sandboxDetected || llmResult.solutionDetected;
  // Flag only when a solution was detected (by either layer) AND it wasn't
  // legitimately offered-and-consented-to — only layer 2 can judge consent,
  // since sandbox execution has no notion of "was this offered." A reveal
  // actually happened exactly when a solution was present AND it WAS
  // consented to — the accepted case, mutually exclusive with flagged.
  return { flagged: solutionPresent && !llmResult.consented, revealed: solutionPresent && llmResult.consented };
}

const MAX_GUARDRAIL_ATTEMPTS = 2;

export async function generateTutorReply(
  context: TutorContext,
  conversation: Anthropic.MessageParam[],
  opts: { isOpeningTurn: boolean; transitioning?: boolean }
): Promise<{ text: string; revealed: boolean }> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('AI_API_KEY is not configured — the AI tutor is unavailable');
  }

  let stricter = false;

  for (let attempt = 1; attempt <= MAX_GUARDRAIL_ATTEMPTS; attempt++) {
    const response = await client.messages.create({
      model: MODEL_REASONING,
      max_tokens: 1024,
      system: buildSystemPrompt(context, { isOpeningTurn: opts.isOpeningTurn, stricter, transitioning: opts.transitioning }),
      messages: withCacheBreakpointOnLastMessage(conversation),
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_REASONING, tier: 'reasoning', purpose: 'tutor-reply', usage: response.usage });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const recentTurns = [...conversation.slice(-6), { role: 'assistant' as const, content: text }];
    const { flagged, revealed } = await evaluateGuardrail(text, context, recentTurns);
    if (!flagged) return { text, revealed };

    stricter = true;
  }

  // Exhausted retries — never surface a flagged response. Fall back to a
  // safe, level-appropriate nudge instead of leaking a working solution.
  return {
    text:
      "Let's slow down for a second — can you tell me what you've tried so far, and where it's going wrong? " +
      "I want to make sure I point you in the right direction without just handing you the answer.",
    revealed: false,
  };
}

const readinessClassificationSchema = z.object({
  // Rationale first, same inline-chain-of-thought pattern as the guardrail
  // classifier above.
  rationale: z.string().max(300).describe('One sentence: what in the learner\'s reply indicates readiness or not.'),
  learnerReadyToStart: z
    .boolean()
    .describe(
      'true only if the learner has clearly indicated they want to move on / get started / begin the question — ' +
        'not merely that they asked a question or made a comment. false whenever there is any remaining question or ' +
        'ambiguity about whether they want to proceed now.'
    ),
});

// Only invoked by the controller when contextType==='curriculumItem' and the
// learner has no problem currently attached (i.e. every round's calibration,
// not just the first). Fail-open to `false` — a classifier hiccup should
// just mean "ask again next turn," never force an unwanted transition.
export async function classifyReadyForPractice(context: TutorContext, conversation: Anthropic.MessageParam[]): Promise<boolean> {
  const client = getAnthropicClient();
  if (!client) return false;

  const prompt = [
    `A tutor named Trak just gave a learner a brief intro/check-in about "${context.title}" and asked whether they're ready to start the next question or have more to discuss. Here is the recent conversation, ending with the learner's newest reply:`,
    '---',
    renderTranscript(conversation.slice(-6)),
    '---',
    "Is the learner's final reply above a clear signal they want to proceed to the question now?",
  ].join('\n');

  try {
    const response = await client.messages.parse({
      model: MODEL_FAST,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(readinessClassificationSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_FAST, tier: 'fast', purpose: 'tutor-readiness', usage: response.usage });
    return response.parsed_output?.learnerReadyToStart ?? false;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('tutor readiness classification failed, defaulting to not-ready', err);
    return false;
  }
}

const topicSkillLevelEnum = z.enum(['unfamiliar', 'learning', 'comfortable', 'strong']);

const memoryExtractionSchema = z.object({
  hasUpdate: z
    .boolean()
    .describe(
      'true only if this exchange revealed a new or changed durable fact worth remembering — a stated goal, ' +
        'volunteered personal context, or evidence of familiarity with a topic. false for most ordinary exchanges.'
    ),
  goals: z
    .string()
    .max(1500)
    .describe(
      'The full, updated, consolidated goals text. If hasUpdate is false, copy the current goals below unchanged. ' +
        'Rewrite/merge — do not append a new line each time.'
    ),
  personalNotes: z.string().max(1500).describe('Same rewrite-not-append rule, for other durable volunteered facts.'),
  topicSkills: z
    .array(
      z.object({
        topic: z
          .string()
          .max(60)
          .describe(
            'Short, general, lowercase label (e.g. "arrays", "recursion", "react hooks"). Reuse an existing label ' +
              'from the current memory below when it is the same underlying topic — do not create near-duplicate labels.'
          ),
        stack: z.enum(['python', 'mern', 'cpp']).optional(),
        level: topicSkillLevelEnum,
        note: z.string().max(200).optional(),
      })
    )
    .max(40)
    .describe('The FULL updated list — copy forward unchanged entries, update ones this exchange touched, consolidate near-duplicates.'),
});

// Cheap pre-filter for the memory-extraction Haiku call below — token-usage
// investigation found this firing after literally every message, including
// plain "ok"/"thanks"-style filler that carries essentially no chance of
// revealing anything new. Exact-match against a fixed list, NOT a length
// cutoff — a genuinely short but informative message ("I love React") must
// never be silently skipped just for being short. Every filler phrase here
// is short, but not everything short is filler, so the list stays narrow
// and literal rather than a heuristic that could over-match.
const PURE_ACKNOWLEDGMENT_MESSAGES = new Set([
  'ok',
  'okay',
  'k',
  'kk',
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'no',
  'nope',
  'nah',
  'cool',
  'nice',
  'great',
  'awesome',
  'sounds good',
  'got it',
  'gotcha',
  'makes sense',
  'alright',
  'right',
  'thanks',
  'thank you',
  'ty',
  'thx',
  'perfect',
  'good',
  "let's go",
  'lets go',
  'here we go',
  'ready',
  "i'm ready",
  'im ready',
  "let's do it",
  'lets do it',
]);

function isPureAcknowledgment(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[.!?]+$/g, '').trim();
  return PURE_ACKNOWLEDGMENT_MESSAGES.has(normalized);
}

// Called by the controller AFTER generateTutorReply returns its final,
// accepted reply — never from inside the retry loop above, since that would
// run this once per guardrail attempt and could extract from a reply that
// never actually reaches the learner. Fails open (returns null) on any
// error — a memory-capture failure must never surface to the user or break
// the chat.
export async function extractMemoryUpdate(
  context: TutorContext,
  learnerMessage: string,
  replyText: string
): Promise<{ hasUpdate: boolean; goals: string; personalNotes: string; topicSkills: ITopicSkill[] } | null> {
  const client = getAnthropicClient();
  if (!client) return null;
  if (isPureAcknowledgment(learnerMessage)) return null;

  const { memory } = context;
  const prompt = [
    `The learner is working on "${context.title}"${context.stack ? ` (${context.stack})` : ''}.`,
    '',
    'Current memory of this learner:',
    `Goals: ${memory.goals || '(none yet)'}`,
    `Other context: ${memory.personalNotes || '(none yet)'}`,
    memory.topicSkills.length > 0
      ? `Topic familiarity: ${memory.topicSkills.map((t) => `${t.topic}${t.stack ? ` (${t.stack})` : ''}: ${t.level}`).join('; ')}.`
      : 'Topic familiarity: none recorded yet.',
    '',
    'The most recent exchange:',
    `Learner: ${learnerMessage}`,
    `Trak: ${replyText}`,
    '',
    'Does this exchange reveal any new or changed durable fact worth remembering? If so, produce the full updated memory (rewritten/consolidated, not appended). If not, copy the current memory forward unchanged and set hasUpdate to false.',
  ].join('\n');

  try {
    const response = await client.messages.parse({
      model: MODEL_FAST,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(memoryExtractionSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_FAST, tier: 'fast', purpose: 'tutor-memory-extraction', usage: response.usage });
    const parsed = response.parsed_output;
    if (!parsed) return null;
    return {
      hasUpdate: parsed.hasUpdate,
      goals: parsed.goals,
      personalNotes: parsed.personalNotes,
      // Defensive cap, belt-and-suspenders alongside the schema's own .max(40).
      topicSkills: parsed.topicSkills.slice(0, 40).map((t) => ({ ...t, lastUpdated: new Date() })),
    };
  } catch {
    return null;
  }
}
