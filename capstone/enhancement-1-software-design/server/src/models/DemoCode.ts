import { Schema, model, Document } from 'mongoose';

// Spec §3.9 `demoCodes`
export interface IDemoCode extends Document {
  code: string;
  issuedTo: string;
  maxUses: number;
  usesRemaining: number;
  expiresAt?: Date;
  createdAt: Date;
}

const demoCodeSchema = new Schema<IDemoCode>({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  },
  issuedTo: { type: String, required: true, trim: true },
  maxUses: { type: Number, required: true, min: 1 },
  usesRemaining: { type: Number, required: true, min: 0 },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export const DemoCode = model<IDemoCode>('DemoCode', demoCodeSchema, 'demoCodes');
