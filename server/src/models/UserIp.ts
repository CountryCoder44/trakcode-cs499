import { Schema, model, Document, Types } from 'mongoose';

// The IP addresses an account signs up, signs in and uses Trak from
// (services/ipLog.service.ts), for abuse investigations and spotting several
// accounts run from one address. One row per account per address; expires 180
// days after the address was last seen. Deleted with the account; an address
// attached to a safety incident is copied onto that incident instead.
export type IpEvent = 'signup' | 'login' | 'trak';

export interface IUserIp extends Document {
  userId: Types.ObjectId;
  ip: string;
  events: IpEvent[];
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const userIpSchema = new Schema<IUserIp>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ip: { type: String, required: true },
  events: [{ type: String, enum: ['signup', 'login', 'trak'] }],
  count: { type: Number, default: 0 },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
});

userIpSchema.index({ userId: 1, ip: 1 }, { unique: true });
userIpSchema.index({ ip: 1 });

export const UserIp = model<IUserIp>('UserIp', userIpSchema, 'userIps');
