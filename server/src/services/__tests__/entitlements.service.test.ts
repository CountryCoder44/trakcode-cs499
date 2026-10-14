import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../../config/env';
import { EmailEntitlement } from '../../models/EmailEntitlement';
import {
  emailKey,
  founderWindowEnd,
  isFounderWindowOpen,
  markTrialUsed,
  recordAccountEmail,
} from '../entitlements.service';

describe('emailKey', () => {
  it('lowercases and drops +tags for every provider', () => {
    expect(emailKey('Ada+promo@Example.com')).toBe('ada@example.com');
  });
  it('ignores dots for Gmail only', () => {
    expect(emailKey('a.d.a@gmail.com')).toBe('ada@gmail.com');
    expect(emailKey('a.d.a@googlemail.com')).toBe('ada@gmail.com');
    expect(emailKey('a.d.a@school.edu')).toBe('a.d.a@school.edu');
  });
});

describe('founder window', () => {
  it('is open while no launch date is set', () => {
    expect(founderWindowEnd(undefined)).toBeNull();
    expect(isFounderWindowOpen(new Date('2030-01-01'), undefined)).toBe(true);
  });

  it('closes at the end of the month six months after launch (US Eastern)', () => {
    // Launch Oct 31 2026 → open through Apr 30 2027 (Eastern).
    const end = founderWindowEnd('2026-10-31')!;
    expect(end.toISOString()).toBe('2027-05-01T05:00:00.000Z');
    expect(isFounderWindowOpen(new Date('2027-04-30T23:00:00-05:00'), '2026-10-31')).toBe(true);
    expect(isFounderWindowOpen(new Date('2027-05-01T00:30:00-05:00'), '2026-10-31')).toBe(false);
  });

  it('handles a launch late in the year rolling into the next', () => {
    // Launch Nov 15 2026 → open through May 31 2027.
    expect(founderWindowEnd('2026-11-15')!.toISOString()).toBe('2027-06-01T05:00:00.000Z');
  });
});

describe('recordAccountEmail / markTrialUsed', () => {
  let mem: MongoMemoryServer;
  const originalLaunch = env.FOUNDER_LAUNCH_DATE;

  beforeAll(async () => {
    mem = await MongoMemoryServer.create({ instance: { dbName: 'entitlements_test' } });
    await mongoose.connect(mem.getUri('entitlements_test'));
    await EmailEntitlement.syncIndexes();
  });
  afterAll(async () => {
    env.FOUNDER_LAUNCH_DATE = originalLaunch;
    await mongoose.disconnect();
    await mem.stop();
  });
  beforeEach(async () => {
    await EmailEntitlement.deleteMany({});
    env.FOUNDER_LAUNCH_DATE = '2026-10-31';
  });

  it('makes an account created inside the window a founding member', async () => {
    const rec = await recordAccountEmail('ada@example.com', new Date('2026-11-05'));
    expect(rec.foundingMember).toBe(true);
  });

  it('does not for an account created after the window', async () => {
    const rec = await recordAccountEmail('late@example.com', new Date('2027-06-01'));
    expect(rec.foundingMember).toBe(false);
  });

  it('keeps founding status for the email after the account is gone and recreated later', async () => {
    await recordAccountEmail('ada@example.com', new Date('2026-11-05'));
    const again = await recordAccountEmail('Ada@Example.com', new Date('2028-01-01'));
    expect(again.foundingMember).toBe(true);
    expect(await EmailEntitlement.countDocuments()).toBe(1);
  });

  it('records the trial once per inbox, aliases included', async () => {
    await recordAccountEmail('a.d.a@gmail.com', new Date('2026-11-05'));
    await markTrialUsed('ada+second@gmail.com');
    const rec = await EmailEntitlement.findOne({ emailKey: 'ada@gmail.com' });
    expect(rec!.trialUsedAt).toBeTruthy();
  });
});
