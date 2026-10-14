import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SafetyIncident } from '../../models/SafetyIncident';
import { SubscriptionEvent } from '../../models/SubscriptionEvent';
import { TrakPackPurchase } from '../../models/TrakPackPurchase';
import { purgeExpiredSafetyIncidents, purgeOldBillingRecords } from '../retention.service';

let mem: MongoMemoryServer;
const DAY = 86_400_000;
const now = new Date('2030-06-01T12:00:00Z');
const ago = (days: number) => new Date(now.getTime() - days * DAY);

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('safety_retention_test'));
});
afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(() => SafetyIncident.deleteMany({}));

function incident(label: string, fields: Record<string, unknown>) {
  return SafetyIncident.create({
    userId: new mongoose.Types.ObjectId(),
    userEmail: 'a@example.com',
    contextType: 'problem',
    contextId: 'x',
    message: label,
    severity: 'medium',
    createdAt: ago(2000),
    ...fields,
  });
}

const left = async () => (await SafetyIncident.find().lean()).map((i) => i.message).sort();

describe('safety record retention', () => {
  it('keeps each kind of record exactly as long as the Privacy Policy says', async () => {
    await incident('open, never reviewed', { status: 'open' });
    await incident('dismissed 89 days ago', { status: 'dismissed', reviewedAt: ago(89) });
    await incident('dismissed 91 days ago', { status: 'dismissed', reviewedAt: ago(91) });
    await incident('warned 2 years ago', { status: 'reviewed', action: 'warned', reviewedAt: ago(730) });
    await incident('banned 3+ years ago', { status: 'reviewed', action: 'banned', reviewedAt: ago(1100) });
    await incident('dismissed long ago but reported 1 year ago', { status: 'dismissed', reviewedAt: ago(1500), reportedAt: ago(365) });
    await incident('reported 3+ years ago', { status: 'reviewed', action: 'banned', reviewedAt: ago(1200), reportedAt: ago(1100) });
    await incident('dismissed long ago, legal hold', { status: 'dismissed', reviewedAt: ago(1500), legalHold: true });
    await incident('reported long ago, legal hold', { status: 'reviewed', reportedAt: ago(1500), legalHold: true });

    expect(await purgeExpiredSafetyIncidents(now)).toBe(3);
    expect(await left()).toEqual(
      [
        'open, never reviewed',
        'dismissed 89 days ago',
        'warned 2 years ago',
        'dismissed long ago but reported 1 year ago',
        'dismissed long ago, legal hold',
        'reported long ago, legal hold',
      ].sort()
    );
  });
});

describe('billing record retention', () => {
  it('deletes membership changes and pack purchases older than 7 years, keeps newer ones', async () => {
    await SubscriptionEvent.deleteMany({});
    await TrakPackPurchase.deleteMany({});
    const userId = new mongoose.Types.ObjectId();
    await SubscriptionEvent.collection.insertMany([
      { userId, from: 'none', to: 'trial', at: ago(8 * 365) },
      { userId, from: 'trial', to: 'active', at: ago(6 * 365) },
    ]);
    await TrakPackPurchase.create([
      { userId, stripeSessionId: 'cs_old', packId: 'pack-50', questions: 50, amountCents: 249, remaining: 0, createdAt: ago(7 * 366) },
      { userId, stripeSessionId: 'cs_new', packId: 'pack-50', questions: 50, amountCents: 249, remaining: 0, createdAt: ago(30) },
    ]);
    expect(await purgeOldBillingRecords(now)).toBe(2);
    expect(await SubscriptionEvent.countDocuments()).toBe(1);
    expect((await TrakPackPurchase.find().lean()).map((p) => p.stripeSessionId)).toEqual(['cs_new']);
  });
});
