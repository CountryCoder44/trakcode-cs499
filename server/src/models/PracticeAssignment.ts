import { Schema, model, Document, Types } from 'mongoose';
import type { PracticeLanguage, PracticeMode, PracticeScope } from '../practice/catalog';

// Practice Mode's shared assignment bank (long-form "Practice the basics" and
// "Stretch out" work). Shared content only: learner code and completion live
// on PracticeAttempt. Private material (reference solution, hidden tests,
// tutor notes) never leaves the server through a learner-facing route; see
// practice/views.ts for the public projection.
//
// Only `status: 'published'` assignments are ever matched. Generation that
// fails validation is never stored here at all, and records whose concept
// requirements are unknown (e.g. migrated legacy deep-dive problems) are kept
// as 'quarantined' instead of being treated as unrestricted.

export type AssignmentStatus = 'published' | 'quarantined' | 'disabled';

export interface IPracticeFile {
  path: string;
  content: string;
}

export interface IPracticeTest {
  name: string;
  input: string;
  expectedOutput: string;
  /** Visible tests (input + expected output) are shown to the learner; hidden ones only report pass/fail. */
  visible: boolean;
  files: IPracticeFile[];
  expectedFiles: IPracticeFile[];
}

export interface IRubricItem {
  id: string;
  description: string;
  /** test: verified by running tests; concept: verified by a code check; review: Trak can look at it with you, not auto-checked. */
  kind: 'test' | 'concept' | 'review';
  conceptId?: string;
}

export interface ITutorNotes {
  conceptSupport: { conceptId: string; notes: string }[];
  pitfalls: string[];
  requirementBreakdown: string[];
}

export interface IPracticeAssignment extends Document {
  _id: Types.ObjectId;
  /** Stable across content versions; completion is tracked per family. */
  familyId: Types.ObjectId;
  contentVersion: number;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  foundationConceptIds: string[];
  advancedConceptIds: string[]; // sorted, distinct
  advancedConceptCount: number;
  basicsVersion: string;
  runtimeVersion: string;
  status: AssignmentStatus;

  title: string;
  scenario: string;
  goal: string;
  requirements: string[];
  deliverables: string[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  acceptanceCriteria: string[];
  samples: string; // markdown: a worked sample
  starterCode: string;
  fixtures: IPracticeFile[]; // public, shown read-only and exported to GitHub
  tests: IPracticeTest[];
  rubric: IRubricItem[];

  referenceSolution: string; // private
  tutorNotes: ITutorNotes; // private

  /** Normalized word set of the scenario + requirements, for near-duplicate checks. */
  fingerprint: string[];
  source: 'generated' | 'legacy';
  /** Practice library entry this assignment was built from (practice/library), if any. */
  libraryId?: string;
  generationJobId?: Types.ObjectId;
  legacyProblemId?: Types.ObjectId;
  timesAssigned: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IPracticeFile>({ path: { type: String, required: true }, content: { type: String, default: '' } }, { _id: false });

const testSchema = new Schema<IPracticeTest>(
  {
    name: { type: String, default: '' },
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    visible: { type: Boolean, default: false },
    files: { type: [fileSchema], default: [] },
    expectedFiles: { type: [fileSchema], default: [] },
  },
  { _id: false }
);

const rubricSchema = new Schema<IRubricItem>(
  {
    id: { type: String, required: true },
    description: { type: String, required: true },
    kind: { type: String, enum: ['test', 'concept', 'review'], required: true },
    conceptId: String,
  },
  { _id: false }
);

const practiceAssignmentSchema = new Schema<IPracticeAssignment>(
  {
    familyId: { type: Schema.Types.ObjectId, index: true },
    contentVersion: { type: Number, default: 1, min: 1 },
    language: { type: String, enum: ['python', 'typescript', 'cpp', 'java'], required: true },
    mode: { type: String, enum: ['basics', 'stretch'], required: true },
    scope: { type: String, enum: ['small', 'medium', 'large'], required: true },
    foundationConceptIds: { type: [String], default: [] },
    advancedConceptIds: { type: [String], default: [] },
    advancedConceptCount: { type: Number, required: true, min: 0, max: 3 },
    basicsVersion: { type: String, required: true },
    runtimeVersion: { type: String, required: true },
    status: { type: String, enum: ['published', 'quarantined', 'disabled'], required: true },

    title: { type: String, required: true },
    scenario: { type: String, default: '' },
    goal: { type: String, default: '' },
    requirements: { type: [String], default: [] },
    deliverables: { type: [String], default: [] },
    inputSpec: { type: String, default: '' },
    outputSpec: { type: String, default: '' },
    constraints: { type: [String], default: [] },
    acceptanceCriteria: { type: [String], default: [] },
    samples: { type: String, default: '' },
    starterCode: { type: String, default: '' },
    fixtures: { type: [fileSchema], default: [] },
    tests: { type: [testSchema], default: [] },
    rubric: { type: [rubricSchema], default: [] },

    referenceSolution: { type: String, default: '' },
    tutorNotes: {
      conceptSupport: { type: [{ conceptId: String, notes: String, _id: false }], default: [] },
      pitfalls: { type: [String], default: [] },
      requirementBreakdown: { type: [String], default: [] },
    },

    fingerprint: { type: [String], default: [] },
    source: { type: String, enum: ['generated', 'legacy'], default: 'generated' },
    libraryId: { type: String, index: { sparse: true } },
    generationJobId: { type: Schema.Types.ObjectId },
    legacyProblemId: { type: Schema.Types.ObjectId },
    timesAssigned: { type: Number, default: 0, min: 0 },
    publishedAt: Date,
  },
  { timestamps: true }
);

// A new assignment starts its own family.
practiceAssignmentSchema.pre('validate', function setFamily(next) {
  if (!this.familyId) this.familyId = this._id;
  next();
});

// The matching query's equality fields first, then the variety sort field.
practiceAssignmentSchema.index({ language: 1, mode: 1, scope: 1, status: 1, advancedConceptCount: 1, basicsVersion: 1, timesAssigned: 1 });
practiceAssignmentSchema.index({ legacyProblemId: 1 }, { unique: true, partialFilterExpression: { legacyProblemId: { $exists: true } } });

export const PracticeAssignment = model<IPracticeAssignment>('PracticeAssignment', practiceAssignmentSchema, 'practiceAssignments');
