import { PracticeLanguage, catalogFor } from './catalog';
import { getCompletedTopicNumbers } from '../services/seqPracticeScope.service';

export interface FoundationDefault {
  /** Skills checked by default on the learner's checklist. */
  foundationIds: string[];
  /** Skills covered by course topics the learner has completed. */
  coveredIds: string[];
  /** False when the learner has no tracked course progress in this language. */
  hasTrackedProgress: boolean;
}

/**
 * The learner's default skill checklist for a language: the basics covered by
 * course topics they've completed. Practice never requires finishing a course,
 * so with no tracked progress at all every basic is allowed by default (the
 * same behaviour Practice Mode already had for learners without progress). The
 * learner can always change the checklist.
 */
export async function defaultFoundationFor(userId: string, language: PracticeLanguage): Promise<FoundationDefault> {
  const cat = catalogFor(language);
  const covered = new Set<string>();
  for (const [course, topicMap] of Object.entries(cat.courseTopicFoundation)) {
    const done = await getCompletedTopicNumbers(userId, course);
    for (const n of done) for (const id of topicMap[n] ?? []) covered.add(id);
  }
  const coveredIds = cat.foundation.map((f) => f.id).filter((id) => covered.has(id));
  return {
    foundationIds: coveredIds.length ? coveredIds : cat.foundation.map((f) => f.id),
    coveredIds,
    hasTrackedProgress: coveredIds.length > 0,
  };
}
