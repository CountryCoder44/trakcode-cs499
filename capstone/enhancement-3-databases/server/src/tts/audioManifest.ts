import { promises as fs } from 'fs';
import path from 'path';

// Shared knowledge of where lesson-narration audio lives and which segments
// have actually been generated. Used by the Sequential Curriculum importer
// (to attach `audio` to items) and by app.ts (to serve the clips).

const ROOT = path.resolve(__dirname, '..', '..', '..');
export const AUDIO_CLIPS_DIR = path.join(ROOT, 'Sequential Curriculum', 'Python', 'audio', 'clips');
const MANIFEST_PATH = path.join(ROOT, 'Sequential Curriculum', 'Python', 'audio', 'manifest.json');

// URL prefix app.ts serves AUDIO_CLIPS_DIR at.
export const AUDIO_URL_BASE = '/seq-audio';

export interface AudioClipRef {
  src: string; // e.g. "/seq-audio/py-4.1-01.read.mp3"
  timings: string; // e.g. "/seq-audio/py-4.1-01.read.json"
  durationSec: number;
}

interface ManifestSegment {
  status: string;
  audioFile: string | null;
  timingsFile: string | null;
  durationSec?: number;
  hash?: string;
  generatedAt?: string;
}

// A per-clip cache-buster on the URL, so a regenerated clip (served from the
// same path, with `maxAge` set on the static route) isn't masked by a stale
// browser copy. Stable while the clip is unchanged -> unchanged clips stay
// cached; changes on every (re)generation.
function version(seg: ManifestSegment): string {
  const token = `${seg.hash ?? ''}${seg.generatedAt ?? ''}`.replace(/[^a-zA-Z0-9]/g, '').slice(-16);
  return token ? `?v=${token}` : '';
}

/**
 * Map of segmentId ("<itemId>.<field>") -> clip URLs, for segments that have a
 * generated `audioFile`. Empty until `npm run tts:generate` has been run.
 */
export async function loadGeneratedAudio(): Promise<Record<string, AudioClipRef>> {
  let raw: { segments?: Record<string, ManifestSegment> };
  try {
    raw = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
  const out: Record<string, AudioClipRef> = {};
  for (const [id, seg] of Object.entries(raw.segments ?? {})) {
    if (seg.status === 'generated' && seg.audioFile && seg.timingsFile) {
      const v = version(seg);
      out[id] = {
        src: `${AUDIO_URL_BASE}/${path.basename(seg.audioFile)}${v}`,
        timings: `${AUDIO_URL_BASE}/${path.basename(seg.timingsFile)}${v}`,
        durationSec: seg.durationSec ?? 0,
      };
    }
  }
  return out;
}
