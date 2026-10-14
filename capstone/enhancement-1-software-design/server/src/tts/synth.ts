import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { env } from '../config/env';
import { PreparedSentence, DisplaySegment } from './prepareScript';

// Pluggable narration synthesis for the Sequential Curriculum. Both providers
// return the same shape the pipeline writes to `clips/<id>.<ext>` +
// `clips/<id>.json`. See `Sequential Curriculum/AUDIO.md`.
//
//   elevenlabs  the paid Trak voice — one request per segment against
//               /with-timestamps; sentence timings come from the char alignment.
//   sapi        free, offline Windows Speech API. Synthesizes each sentence to
//               its own WAV, measures its duration, concatenates them, and
//               derives sentence timings from the running offset.

export interface SynthResult {
  audio: Buffer;
  ext: 'mp3' | 'wav';
  durationSec: number;
  sentences: { text: string; start: number; end: number; segments?: DisplaySegment[] }[];
  voiceId: string;
  modelId: string;
}

export function ttsReadiness(): { ready: boolean; provider: string; why: string[] } {
  const provider = env.TTS_PROVIDER;
  if (!env.TTS_ENABLED) return { ready: false, provider, why: ['TTS_ENABLED is not true'] };
  if (provider === 'sapi') {
    return process.platform === 'win32'
      ? { ready: true, provider, why: [] }
      : { ready: false, provider, why: ['TTS_PROVIDER=sapi only runs on Windows'] };
  }
  const why: string[] = [];
  if (!env.ELEVENLABS_API_KEY) why.push('ELEVENLABS_API_KEY is missing');
  if (!env.ELEVENLABS_VOICE_ID) why.push('ELEVENLABS_VOICE_ID is missing');
  return { ready: why.length === 0, provider, why };
}

export async function synthesize(prepared: {
  script: string;
  sentences: PreparedSentence[];
}): Promise<SynthResult> {
  return env.TTS_PROVIDER === 'sapi' ? synthSapi(prepared) : synthElevenLabs(prepared);
}

// ---------------- ElevenLabs ----------------

interface ElevenAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

async function synthElevenLabs(p: {
  script: string;
  sentences: PreparedSentence[];
}): Promise<SynthResult> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}/with-timestamps`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: p.script,
      model_id: env.ELEVENLABS_MODEL_ID,
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: env.ELEVENLABS_STABILITY,
        similarity_boost: env.ELEVENLABS_SIMILARITY,
        style: env.ELEVENLABS_STYLE,
        use_speaker_boost: true,
        speed: env.ELEVENLABS_SPEED,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { audio_base64: string; alignment: ElevenAlignment };
  const starts = json.alignment.character_start_times_seconds;
  const ends = json.alignment.character_end_times_seconds;
  const n = starts.length;
  let offset = 0;
  const sentences = p.sentences.map((s) => {
    const a = Math.min(offset, n - 1);
    const b = Math.min(offset + s.spoken.length - 1, n - 1);
    offset += s.spoken.length + 1; // +1 for the "\n" join
    return {
      text: s.display,
      start: +(starts[a] ?? 0).toFixed(3),
      end: +(ends[b] ?? starts[a] ?? 0).toFixed(3),
      segments: s.segments,
    };
  });
  return {
    audio: Buffer.from(json.audio_base64, 'base64'),
    ext: 'mp3',
    durationSec: +(ends.at(-1) ?? 0).toFixed(3),
    sentences,
    voiceId: env.ELEVENLABS_VOICE_ID as string,
    modelId: env.ELEVENLABS_MODEL_ID,
  };
}

// ---------------- Windows SAPI (free, offline) ----------------

const SR = 22_050; // sample rate
const CH = 1; // mono
const BYTES_PER_SAMPLE = 2; // 16-bit
const HEADER = 44; // canonical WAV header SAPI writes with a forced format

async function synthSapi(p: {
  script: string;
  sentences: PreparedSentence[];
}): Promise<SynthResult> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'trak-sapi-'));
  try {
    const jobs = p.sentences.map((s, i) => ({
      i,
      wav: path.join(tmp, `${i}.wav`),
      text: s.spoken || s.display || ' ',
    }));
    const jobFile = path.join(tmp, 'jobs.json');
    const psFile = path.join(tmp, 'speak.ps1');
    await fs.writeFile(jobFile, JSON.stringify(jobs), 'utf8');
    await fs.writeFile(psFile, PS_SCRIPT, 'utf8');
    await runPowerShell(psFile, jobFile);

    const parts: Buffer[] = [];
    const sentences: { text: string; start: number; end: number; segments?: DisplaySegment[] }[] = [];
    let cursor = 0;
    for (const j of jobs) {
      let pcm: Buffer;
      try {
        pcm = (await fs.readFile(j.wav)).subarray(HEADER);
      } catch {
        pcm = Buffer.alloc(Math.round(SR * CH * BYTES_PER_SAMPLE * 0.35)); // ~0.35s of silence on a miss
      }
      const dur = pcm.length / (SR * CH * BYTES_PER_SAMPLE);
      const start = +cursor.toFixed(3);
      cursor += dur;
      sentences.push({
        text: p.sentences[j.i].display,
        start,
        end: +cursor.toFixed(3),
        segments: p.sentences[j.i].segments,
      });
      parts.push(pcm);
    }
    return {
      audio: wavFromPcm(Buffer.concat(parts)),
      ext: 'wav',
      durationSec: +cursor.toFixed(3),
      sentences,
      voiceId: env.SAPI_VOICE || 'Windows SAPI (default voice)',
      modelId: 'windows-sapi',
    };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

function wavFromPcm(pcm: Buffer): Buffer {
  const h = Buffer.alloc(HEADER);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); // PCM fmt chunk size
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(CH, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * CH * BYTES_PER_SAMPLE, 28); // byte rate
  h.writeUInt16LE(CH * BYTES_PER_SAMPLE, 32); // block align
  h.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34); // bits per sample
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const PS_SCRIPT = `param([Parameter(Mandatory=$true)][string]$JobFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -LiteralPath $JobFile -Encoding UTF8 | ConvertFrom-Json
$syn = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($env:SAPI_VOICE) { try { $syn.SelectVoice($env:SAPI_VOICE) } catch { } }
$rate = 2; if ($env:SAPI_RATE) { [int]::TryParse($env:SAPI_RATE, [ref]$rate) | Out-Null }
$syn.Rate = $rate
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${SR}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($j in $jobs) {
  $syn.SetOutputToWaveFile([string]$j.wav, $fmt)
  $t = [string]$j.text
  if ([string]::IsNullOrWhiteSpace($t)) { $t = ' ' }
  $syn.Speak($t)
}
$syn.SetOutputToNull()
$syn.Dispose()
`;

function runPowerShell(psFile: string, jobFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psFile, '-JobFile', jobFile],
      { env: { ...process.env, SAPI_VOICE: env.SAPI_VOICE ?? '', SAPI_RATE: String(env.SAPI_RATE) } }
    );
    let err = '';
    ps.stderr.on('data', (d) => (err += d.toString()));
    ps.on('error', reject);
    ps.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`SAPI PowerShell exited ${code}: ${err.slice(0, 500)}`))
    );
  });
}
