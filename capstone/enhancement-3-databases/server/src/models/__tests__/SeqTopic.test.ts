import {
  flattenItems,
  itemsSatisfied,
  topicItemsAllIn,
  computeOpenItemIds,
  pickDefaultOpenItem,
  SeqItem,
  SeqLesson,
  SeqTopicItemView,
} from '../SeqTopic';

// Zero direct unit tests existed for any of these five functions before this
// file — the only prior coverage was indirect, through one integration test
// with a single-lesson, single-item, no-checkpoint, no-practice-group
// fixture (server/src/__tests__/seq.submit.integration.test.ts). That never
// exercised multi-lesson sequencing, the checkpoint gate, or the
// practice-group "any one of N" logic at all. Closing that gap is part of
// this milestone's "fully unit tested" bar, not scope creep — this is
// exactly the machinery flattenItems' memoization (and every caller of it)
// depends on for correctness.

function item(overrides: Partial<SeqItem> & Pick<SeqItem, 'itemId'>): SeqItem {
  return { type: 'practical', title: overrides.itemId, ...overrides };
}

function lesson(lessonId: string, items: SeqItem[]): SeqLesson {
  return { lessonId, number: lessonId, title: lessonId, items };
}

describe('flattenItems', () => {
  const topic: SeqTopicItemView = {
    lessons: [
      lesson('L1', [item({ itemId: 'a' }), item({ itemId: 'b' })]),
      lesson('L2', [item({ itemId: 'c' })]),
    ],
    checkpoint: item({ itemId: 'CP' }),
  };

  it('returns items in lesson order, checkpoint last', () => {
    const flat = flattenItems(topic);
    expect(flat.map((f) => f.item.itemId)).toEqual(['a', 'b', 'c', 'CP']);
    expect(flat.map((f) => f.lessonId)).toEqual(['L1', 'L1', 'L2', null]);
  });

  it('omits the checkpoint entirely when the topic has none', () => {
    const noCheckpoint: SeqTopicItemView = { lessons: topic.lessons, checkpoint: null };
    expect(flattenItems(noCheckpoint).map((f) => f.item.itemId)).toEqual(['a', 'b', 'c']);
  });

  it('memoizes by object identity: a second call on the same object returns the same array reference', () => {
    const first = flattenItems(topic);
    const second = flattenItems(topic);
    expect(second).toBe(first); // reference equality — proves the cache path was taken, not just equal content
  });

  it('does NOT share the cache across two different objects, even with identical content', () => {
    const clone: SeqTopicItemView = { lessons: topic.lessons, checkpoint: topic.checkpoint };
    const original = flattenItems(topic);
    const cloneResult = flattenItems(clone);
    expect(cloneResult).not.toBe(original); // different identity -> separate cache entry
    expect(cloneResult).toEqual(original); // but same content
  });
});

describe('itemsSatisfied', () => {
  const core = [item({ itemId: 'core-1' }), item({ itemId: 'core-2' })];
  const group = [item({ itemId: 'group-a', practiceGroup: true }), item({ itemId: 'group-b', practiceGroup: true })];

  it('is false when a core item is missing, regardless of the group', () => {
    expect(itemsSatisfied([...core, ...group], new Set(['core-1']))).toBe(false);
  });

  it('is true with all core items present and no group items on the lesson at all', () => {
    expect(itemsSatisfied(core, new Set(['core-1', 'core-2']))).toBe(true);
  });

  it('is false when core is complete but a present group requires at least one pass', () => {
    expect(itemsSatisfied([...core, ...group], new Set(['core-1', 'core-2']))).toBe(false);
  });

  it('is true once core is complete and ANY ONE group item is passed', () => {
    expect(itemsSatisfied([...core, ...group], new Set(['core-1', 'core-2', 'group-b']))).toBe(true);
  });
});

describe('topicItemsAllIn', () => {
  const topic: SeqTopicItemView = {
    lessons: [lesson('L1', [item({ itemId: 'a' })]), lesson('L2', [item({ itemId: 'b' })])],
    checkpoint: item({ itemId: 'CP' }),
  };

  it('is false for a stub topic with no lessons', () => {
    expect(topicItemsAllIn({ lessons: [], checkpoint: null }, new Set(['anything']))).toBe(false);
  });

  it('is false when every lesson item is passed but the checkpoint is not', () => {
    expect(topicItemsAllIn(topic, new Set(['a', 'b']))).toBe(false);
  });

  it('is true once every lesson item AND the checkpoint are passed', () => {
    expect(topicItemsAllIn(topic, new Set(['a', 'b', 'CP']))).toBe(true);
  });

  it('is true with every lesson item passed when the topic has no checkpoint at all', () => {
    const noCheckpoint: SeqTopicItemView = { lessons: topic.lessons, checkpoint: null };
    expect(topicItemsAllIn(noCheckpoint, new Set(['a', 'b']))).toBe(true);
  });
});

describe('computeOpenItemIds', () => {
  // L1: one core item, then a 2-item practice group. L2: one core item. Checkpoint at the end.
  const topic: SeqTopicItemView = {
    lessons: [
      lesson('L1', [
        item({ itemId: 'l1-core' }),
        item({ itemId: 'group-a', practiceGroup: true }),
        item({ itemId: 'group-b', practiceGroup: true }),
      ]),
      lesson('L2', [item({ itemId: 'l2-core' })]),
    ],
    checkpoint: item({ itemId: 'CP' }),
  };

  it('opens only the first core item on a fresh topic', () => {
    expect(computeOpenItemIds(topic, new Set())).toEqual(new Set(['l1-core']));
  });

  it('opens ALL practice-group items at once, not one at a time, once core is done', () => {
    expect(computeOpenItemIds(topic, new Set(['l1-core']))).toEqual(new Set(['group-a', 'group-b']));
  });

  it('once one group item passes, advances into the next lesson — BOTH group items stay in the open set, passed or not', () => {
    // "open" means unlocked/attemptable, not "still to do" — a passed group
    // item remains open forever (re-attemptable bonus practice), it is
    // never removed once added. A caller that wants "still to do" combines
    // this with its own `passed` set (see pickDefaultOpenItem below).
    const open = computeOpenItemIds(topic, new Set(['l1-core', 'group-a']));
    expect(open).toEqual(new Set(['group-a', 'group-b', 'l2-core']));
  });

  it('opens the checkpoint once every lesson is satisfied — group items from an earlier lesson are still present', () => {
    const open = computeOpenItemIds(topic, new Set(['l1-core', 'group-a', 'l2-core']));
    expect(open).toEqual(new Set(['group-a', 'group-b', 'CP']));
  });

  it('never fully empties once a topic contains a practice group, even when everything (including the checkpoint) is passed', () => {
    const open = computeOpenItemIds(topic, new Set(['l1-core', 'group-a', 'l2-core', 'CP']));
    expect(open).toEqual(new Set(['group-a', 'group-b']));
  });

  it('DOES return an empty set once fully complete for a topic with no practice group at all', () => {
    const noGroupTopic: SeqTopicItemView = {
      lessons: [lesson('L1', [item({ itemId: 'l1-core' })]), lesson('L2', [item({ itemId: 'l2-core' })])],
      checkpoint: item({ itemId: 'CP' }),
    };
    const open = computeOpenItemIds(noGroupTopic, new Set(['l1-core', 'l2-core', 'CP']));
    expect(open).toEqual(new Set());
  });
});

describe('pickDefaultOpenItem', () => {
  const topic: SeqTopicItemView = {
    lessons: [
      lesson('L1', [
        item({ itemId: 'l1-core' }),
        item({ itemId: 'group-a', practiceGroup: true }),
        item({ itemId: 'group-b', practiceGroup: true }),
      ]),
    ],
    checkpoint: null,
  };

  it('prefers the first open-and-unpassed item in file order', () => {
    const passed = new Set(['l1-core']);
    const open = computeOpenItemIds(topic, passed);
    expect(pickDefaultOpenItem(topic, open, passed)).toBe('group-a');
  });

  it('falls back to the first open item at all once everything open has already been passed', () => {
    // Simulate: group-a is open AND already passed (the learner did extra
    // bonus items past what was required) — the docstring's "learner cleared
    // the whole group" fallback case.
    const passed = new Set(['l1-core', 'group-a']);
    const open = new Set(['group-a']); // hand-built: "open" but already passed
    expect(pickDefaultOpenItem(topic, open, passed)).toBe('group-a');
  });

  it('returns null when nothing is open', () => {
    expect(pickDefaultOpenItem(topic, new Set(), new Set())).toBeNull();
  });
});
