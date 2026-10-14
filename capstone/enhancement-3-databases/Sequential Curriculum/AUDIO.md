# Lesson narration (TTS)

Every written learning/instruction section in the Sequential Curriculum can be
narrated by a custom ElevenLabs voice ("Trak"), with the text highlighting
sentence-by-sentence as it is read and full play / pause / restart / seek /
speed controls.

**Status:** scaffolded. Scripts are prepared. The final Trak voice is not wired
yet, but you can generate **free placeholder narration** now with the offline
Windows Speech API (`TTS_PROVIDER=sapi`) to review lessons before spending
ElevenLabs credits.

---

## Two providers (`TTS_PROVIDER`)

| | `sapi` (free) | `elevenlabs` (paid) |
|---|---|---|
| Engine | Windows Speech API, offline | ElevenLabs `/with-timestamps` |
| Cost | none | credits per generation |
| Needs | `TTS_ENABLED=true`, Windows; `SAPI_VOICE` optional (`Microsoft Zira Desktop` / `Microsoft David Desktop`) | `TTS_ENABLED=true` + `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |
| Clip | `clips/<id>.wav` — **gitignored**, local review only | `clips/<id>.mp3` — committed |
| Timings | per-sentence, from each sentence's synthesized duration | per-sentence, from the char alignment |

Both write `clips/<id>.json` in the same shape, so the lesson player, the
importer and `/seq-audio/*` don't care which produced a clip.

**Free run (review):**
```bash
npm run tts:scripts -w server                      # refresh scripts + manifest
npm run tts:generate -w server -- --force          # SAPI, all segments, no cost
# restart the API server, open a lesson at /course/python — the ▶ Listen bar appears
```

**Switch to the real voice later:** set `TTS_PROVIDER=elevenlabs` (+ key + voice
id) and re-run `npm run tts:generate -w server -- --force`. The `.wav`
placeholders are ignored by git; a SAPI run also rewrites `manifest.json` and
`clips/*.json` — `git checkout` those (or just regenerate with ElevenLabs)
before committing.

---

## What gets narrated

Per curriculum item, keyed `"<itemId>.<field>"`:

| Field | Where | Example segment id |
|---|---|---|
| `read` | concept items' reading block | `py-4.1-01.read` |
| `question` | concept items' question stem | `py-4.1-01.question` |
| `opt-<letter>` | one per answer choice, keyed by its authored letter | `py-4.1-01.opt-B` |
| `do` | practical items' instruction | `py-4.3-03.do` |
| `brief` | each topic checkpoint's brief | `py-4.CP.brief` |

A concept item is narrated in parts (stem + one clip per choice) so the lesson
player's single **Listen** button can play the choices in the same shuffled order
they're shown. The importer reassembles them into `item.audio` (`read`,
`question`, `options[<letter>]`).

---

## Files

```
Sequential Curriculum/
  tts-lexicon.json              pronunciation rules — EDIT THIS to fix how
                               code / symbols / acronyms are spoken
  Python/audio/
    manifest.json              index: per-segment hash, sentence split,
                               status, and which voice/model produced a clip
    scripts/<segmentId>.txt    the exact text sent to TTS (regenerated — do
                               not hand-edit; tune the lexicon instead)
    clips/<segmentId>.mp3      generated narration (committed once it exists)
    clips/<segmentId>.json     { durationSec, sentences: [{text,start,end}] }
```

Everything here is committed **except** `Python/audio/.tmp/` (gitignored). The
API key lives only in `server/.env.dev` (gitignored) — never in this folder.

---

## Commands

Run these from the repo root. The `-w server --` is required so the flags reach
the script (a bare `npm run` swallows them).

```bash
# Prepare / refresh the spoken scripts + manifest. No API call, safe anytime.
npm run tts:scripts -w server

# Generate audio + timing. Incremental: only segments whose prepared script
# changed (hashed) are (re)generated. Manifest is saved after each clip, so an
# interrupted run resumes. COSTS ElevenLabs credits.
# Requires, in server/.env.dev:  TTS_ENABLED=true
#                                ELEVENLABS_API_KEY=<key>
#                                ELEVENLABS_VOICE_ID=<the Trak voice id>
npm run tts:generate -w server -- --only py-1.1     # just lesson 1.1
npm run tts:generate -w server -- --only py-topic-02  # just Topic 2
npm run tts:generate -w server -- --dry-run         # list, call nothing
npm run tts:generate -w server -- --yes             # whole course (past the size guard)
npm run tts:generate -w server -- --force --yes     # re-narrate everything, even unchanged
```

More than ~12 segments in one run without `--only` / `--dry-run` requires
`--yes`, so a mis-scoped run can't quietly drain a credit quota.

---

## Bringing the Trak voice online

1. Create / clone the voice in the ElevenLabs dashboard; copy its **Voice ID**.
2. In `server/.env.dev` set `ELEVENLABS_VOICE_ID=<that id>` and
   `TTS_ENABLED=true`. (`ELEVENLABS_MODEL_ID` defaults to
   `eleven_multilingual_v2` — good quality for content that is replayed a lot.)
3. `npm run tts:scripts` — sanity-check a few `scripts/*.txt` read naturally.
   Fix any bad pronunciations in `tts-lexicon.json`, re-run.
4. `npm run tts:generate -- --dry-run`, then `npm run tts:generate`.
5. Restart the API server. Boot log will show
   `… — N narration clips attached`. Open a lesson at `/course/python`; the
   reading block now has a **▶ Listen** bar and highlights as it plays.

---

## Pronunciation: `tts-lexicon.json`

The generator turns markdown into a plain "spoken script" before sending it to
ElevenLabs (`server/src/tts/prepareScript.ts`). Rules apply in this order:

1. `regexRules` — drop fenced code, strip bold, `3.14` → "three point one four",
   `IndexError` → "Index Error", `snake_case` → "snake case". A rule tagged
   `"spokenOnly": true` shapes the spoken form only — the read-along panel keeps
   the text as written (`Lesson 2.3`, `ValueError`, `__init__`, `my_var`). Rules
   without the tag (bold strip, fenced-code drop) also change the displayed text.
2. `codeSymbols` — inside `` `inline code` `` only: `s.upper()` →
   "s dot upper open paren close paren", `==` → "double equals", etc.
3. `proseSymbols` — everywhere: bare `!=`, `>>>`, `\n`, …
4. `words` — whole-word swaps: `str` → "string", `REPL` → "repple", `.py` →
   "dot pie", `TrakCode` → "Track Code".

Edit freely and re-run `npm run tts:scripts`; changed segments are re-narrated
on the next `tts:generate`. For a stubborn word, a `words` entry with a
hyphenated respelling ("re-pull") usually beats fighting it.

---

## Highlighting model (v1)

Highlighting is **sentence-level**: the generator records the start/end time of
each sentence from ElevenLabs' character-level alignment and stores the display
sentence text alongside it. The player highlights the sentence under the
playhead and lets you click any sentence to jump there.

Known v1 trade-off: while narrating, the reading panel renders from the timing
file's plain sentence text (inline code is re-wrapped in `<code>` by a simple
token match, but other markdown formatting is flattened). Word-level
highlighting and full markdown-in-place are possible later from the same
alignment data.

---

## Cost / operational notes

- `npm run tts:scripts` reports the total character count to narrate.
- Generation is one HTTP request per segment against
  `/v1/text-to-speech/{voice_id}/with-timestamps` (`mp3_44100_128`).
- Clips are static files served by the API at `/seq-audio/*`; no per-play cost.
- The estimate the script prints is characters, not credits — check the
  ElevenLabs dashboard for actual usage after the first run.
