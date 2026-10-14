import { Schema, model, Document, Types } from 'mongoose';
import { Stack } from '../types/domain';

// Spec §3.2 `curriculumItems` — Learn Mode skill tree
export type CurriculumLevel = 'intro' | 'intermediate' | 'advanced';

export interface ICurriculumItem extends Document {
  stack: Stack;
  title: string;
  description: string;
  level: CurriculumLevel;
  prerequisites: Types.ObjectId[]; // other curriculumItems
  lessonContent: string; // markdown
  order: number; // display order within stack
  // Short, stable tag (e.g. "recursion") — must be unique within a stack.
  // Threaded straight into findOrGenerateProblem's `topic` param when
  // serving/generating this lesson's practice questions, and used in
  // reverse (Problem.topic + Problem.stack -> this item) to detect which
  // curriculum item a passed submission counts toward. See
  // curriculumPractice.service.ts.
  topic: string;
  // "Learn by doing": live starter code seeded into the lesson's interactive
  // editor — mechanically extracted from the worked example already embedded
  // in lessonContent, not separately-authored content. Language is derived
  // from `stack` (see server/src/services/executionClient.ts's stackToLanguage),
  // not stored separately here.
  starterCode: string;
}

const curriculumItemSchema = new Schema<ICurriculumItem>({
  stack: { type: String, enum: ['python', 'mern', 'cpp'], required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  level: { type: String, enum: ['intro', 'intermediate', 'advanced'], required: true },
  prerequisites: [{ type: Schema.Types.ObjectId, ref: 'CurriculumItem' }],
  lessonContent: { type: String, default: '' },
  order: { type: Number, required: true, default: 0 },
  starterCode: { type: String, default: '' },
  topic: { type: String, required: true, trim: true, index: true },
});

curriculumItemSchema.index({ stack: 1, order: 1 });

export const CurriculumItem = model<ICurriculumItem>('CurriculumItem', curriculumItemSchema, 'curriculumItems');
