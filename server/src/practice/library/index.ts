import type { PracticeLanguage } from '../catalog';
import type { LibraryEntry } from './types';
import { PYTHON_LIBRARY } from './python';

export type { LibraryEntry } from './types';

// Browsable practice libraries, per language. Only Python has entries so far.
export const LIBRARIES: Record<PracticeLanguage, LibraryEntry[]> = {
  python: PYTHON_LIBRARY,
  java: [],
  cpp: [],
  typescript: [],
};

const BY_ID = new Map(Object.values(LIBRARIES).flat().map((entry) => [entry.id, entry]));

export function libraryEntry(id: string): LibraryEntry | undefined {
  return BY_ID.get(id);
}
