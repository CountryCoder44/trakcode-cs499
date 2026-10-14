import { PYTHON_LIBRARY } from '../library/python';
import { catalogFor } from '../catalog';
import { isValidCombination } from '../request';

// The placeholder Python practice library against the REAL catalog.
describe('Python practice library', () => {
  const allFoundation = catalogFor('python').foundation.map((f) => f.id);

  it('has 100 entries: 20 basics and 80 stretch, with unique ids', () => {
    expect(PYTHON_LIBRARY).toHaveLength(100);
    expect(PYTHON_LIBRARY.filter((x) => x.mode === 'basics')).toHaveLength(20);
    expect(new Set(PYTHON_LIBRARY.map((x) => x.id)).size).toBe(100);
  });

  it('every stretch entry has 1-3 concepts that form a valid combination', () => {
    const invalid = PYTHON_LIBRARY.filter((x) => x.mode === 'stretch')
      .filter((x) => x.concepts.length < 1 || x.concepts.length > 3 || !isValidCombination('python', x.concepts, allFoundation))
      .map((x) => `${x.id} ${x.concepts.join('+')}`);
    expect(invalid).toEqual([]);
  });

  it('every entry has a title, scenario and requirements', () => {
    for (const entry of PYTHON_LIBRARY) {
      expect(entry.title.length).toBeGreaterThan(3);
      expect(entry.scenario.length).toBeGreaterThan(10);
      expect(entry.requirements.length).toBeGreaterThanOrEqual(3);
      expect(entry.mode === 'basics').toBe(entry.concepts.length === 0);
    }
  });
});
