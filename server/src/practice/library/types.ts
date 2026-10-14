import type { PracticeLanguage, PracticeMode, PracticeScope } from '../catalog';

/**
 * A practice library entry: a short brief a learner can browse and start.
 * The first start generates a full assignment from the brief (tests, starter
 * code, reference solution) and saves it with `libraryId`; later starts reuse it.
 */
export interface LibraryEntry {
  id: string;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  /** Advanced concept ids, including any the named ones depend on. Empty for basics. */
  concepts: string[];
  title: string;
  scenario: string;
  requirements: string[];
}
