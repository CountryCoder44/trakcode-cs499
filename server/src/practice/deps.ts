import { executeCode } from '../services/executionClient';
import { DraftGenerator } from './draft';
import { anthropicGenerator } from './anthropicGenerator';

// Practice Mode's two external dependencies, swappable so tests can use a fake
// generator (no real model tokens) and a fake or real sandbox.
export interface PracticeDeps {
  generator: DraftGenerator;
  executor: typeof executeCode;
}

const defaults: PracticeDeps = { generator: anthropicGenerator, executor: executeCode };
let current: PracticeDeps = { ...defaults };

export function practiceDeps(): PracticeDeps {
  return current;
}

/** Test hook. Call with no argument to restore the real dependencies. */
export function setPracticeDeps(overrides?: Partial<PracticeDeps>): void {
  current = overrides ? { ...current, ...overrides } : { ...defaults };
}
