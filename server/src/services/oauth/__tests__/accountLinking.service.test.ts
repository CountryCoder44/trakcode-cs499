// Real ephemeral mongod — the linking rules lean on real query behaviour
// ($elemMatch on identities, the unique partial index), not a mock.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../../models/User';
import { OAuthError } from '../../../errors/AppError';
import { OAuthProfile } from '../providers';
import { resolveOAuthLogin, unlinkIdentity } from '../accountLinking.service';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'oauth_linking_test' } });
  await mongoose.connect(mem.getUri('oauth_linking_test'));
  await User.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

function profile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    provider: 'google',
    providerUserId: 'g-123',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada Lovelace',
    ...overrides,
  };
}

async function withPassword(user: { _id: unknown }) {
  return User.findById(user._id).select('+passwordHash');
}

describe('resolveOAuthLogin', () => {
  it('creates a new, verified account for an unknown verified profile', async () => {
    const { user, isNewUser } = await resolveOAuthLogin(profile());
    expect(isNewUser).toBe(true);
    expect(user.email).toBe('ada@example.com');
    expect(user.emailVerified).toBe(true);
    expect(user.name).toBe('Ada Lovelace');
    expect(user.subscriptionStatus).toBe('none');
    expect(user.identities.map((i) => [i.provider, i.providerUserId])).toEqual([['google', 'g-123']]);
    expect((await withPassword(user))!.passwordHash).toBeUndefined();
  });

  it('signs a returning user back into the same account', async () => {
    const first = await resolveOAuthLogin(profile());
    const second = await resolveOAuthLogin(profile({ email: 'changed@example.com' }));
    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(await User.countDocuments()).toBe(1);
  });

  it('refuses an unverified email instead of matching or creating on it', async () => {
    await User.create({ email: 'ada@example.com', name: 'Ada', passwordHash: 'x' });
    await expect(resolveOAuthLogin(profile({ emailVerified: false }))).rejects.toBeInstanceOf(OAuthError);
    await expect(resolveOAuthLogin(profile({ email: null }))).rejects.toThrow(/verified email/);
    const existing = await User.findOne({ email: 'ada@example.com' });
    expect(existing!.identities).toHaveLength(0);
    expect(await User.countDocuments()).toBe(1);
  });

  it('auto-links a verified email onto an existing password account and clears the unverified password', async () => {
    const existing = await User.create({ email: 'ada@example.com', name: 'Ada', passwordHash: 'hash' });
    const { user, isNewUser } = await resolveOAuthLogin(profile());
    expect(isNewUser).toBe(false);
    expect(user.id).toBe(existing.id);
    const reloaded = await withPassword(existing);
    expect(reloaded!.emailVerified).toBe(true);
    expect(reloaded!.identities).toHaveLength(1);
    // Pre-account-takeover guard.
    expect(reloaded!.passwordHash).toBeUndefined();
  });

  it('keeps the password when the account email was already verified', async () => {
    const existing = await User.create({
      email: 'ada@example.com',
      name: 'Ada',
      passwordHash: 'hash',
      emailVerified: true,
    });
    await resolveOAuthLogin(profile());
    expect((await withPassword(existing))!.passwordHash).toBe('hash');
  });

  it('lets one account collect several providers', async () => {
    const { user } = await resolveOAuthLogin(profile());
    await resolveOAuthLogin(profile({ provider: 'github', providerUserId: '42' }));
    await resolveOAuthLogin(profile({ provider: 'linkedin', providerUserId: 'li-1' }));
    const reloaded = await User.findById(user.id);
    expect(reloaded!.identities.map((i) => i.provider).sort()).toEqual(['github', 'google', 'linkedin']);
    expect(await User.countDocuments()).toBe(1);
  });

  it('links to the signed-in user even when emails differ', async () => {
    const me = await User.create({ email: 'me@school.edu', name: 'Me', passwordHash: 'hash' });
    const { user } = await resolveOAuthLogin(profile({ email: 'personal@gmail.com' }), { linkUserId: me.id });
    expect(user.id).toBe(me.id);
    expect(user.identities).toHaveLength(1);
    // Linking a different email doesn't verify this account's email.
    expect(user.emailVerified).toBe(false);
  });

  it('refuses to link a provider account that already belongs to someone else', async () => {
    await resolveOAuthLogin(profile());
    const other = await User.create({ email: 'other@example.com', name: 'Other', passwordHash: 'hash' });
    await expect(resolveOAuthLogin(profile(), { linkUserId: other.id })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses a second, different account from the same provider', async () => {
    const { user } = await resolveOAuthLogin(profile());
    await expect(
      resolveOAuthLogin(profile({ providerUserId: 'g-999', email: 'alt@example.com' }), { linkUserId: user.id })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('stores an encrypted GitHub token when linking', async () => {
    const me = await User.create({ email: 'me@example.com', name: 'Me', passwordHash: 'hash' });
    await resolveOAuthLogin(profile({ provider: 'github', providerUserId: '7' }), {
      linkUserId: me.id,
      githubAccessToken: 'gho_secret',
    });
    const reloaded = await User.findById(me.id).select('+githubAccessToken');
    expect(reloaded!.githubAccessToken).toBeTruthy();
    expect(reloaded!.githubAccessToken).not.toContain('gho_secret');
  });

  it('the unique index stops two users holding the same provider account', async () => {
    await resolveOAuthLogin(profile());
    await expect(
      User.create({
        email: 'dup@example.com',
        name: 'Dup',
        identities: [{ provider: 'google', providerUserId: 'g-123' }],
      })
    ).rejects.toMatchObject({ code: 11000 });
    // ...while users with no identities never collide with each other.
    await User.create({ email: 'a@example.com', name: 'A', passwordHash: 'x' });
    await User.create({ email: 'b@example.com', name: 'B', passwordHash: 'x' });
  });

  it('stores the GitHub token on sign-up and refreshes it on every sign-in', async () => {
    const gh = profile({ provider: 'github', providerUserId: '55' });
    const { user } = await resolveOAuthLogin(gh, { githubAccessToken: 'gho_first' });
    const first = (await User.findById(user.id).select('+githubAccessToken'))!.githubAccessToken;
    expect(first).toBeTruthy();
    expect(first).not.toContain('gho_first');

    await resolveOAuthLogin(gh, { githubAccessToken: 'gho_second' });
    const second = (await User.findById(user.id).select('+githubAccessToken'))!.githubAccessToken;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });
});

describe('LinkedIn posting token', () => {
  it('stores it encrypted with an expiry, and unlinking clears both', async () => {
    const li = profile({ provider: 'linkedin', providerUserId: 'li-9' });
    const before = Date.now();
    const { user } = await resolveOAuthLogin(li, { linkedinToken: { accessToken: 'AQX_li', expiresIn: 3600 } });

    const stored = await User.findById(user.id).select('+linkedinAccessToken');
    expect(stored!.linkedinAccessToken).toBeTruthy();
    expect(stored!.linkedinAccessToken).not.toContain('AQX_li');
    const ms = stored!.linkedinTokenExpiresAt!.getTime() - before;
    expect(ms).toBeGreaterThanOrEqual(3600 * 1000 - 1000);
    expect(ms).toBeLessThanOrEqual(3600 * 1000 + 5000);

    // Give the account a second sign-in method so LinkedIn can be removed.
    await resolveOAuthLogin(profile(), { linkUserId: user.id });
    await unlinkIdentity(user.id, 'linkedin');
    const after = await User.findById(user.id).select('+linkedinAccessToken');
    expect(after!.linkedinAccessToken).toBeUndefined();
    expect(after!.linkedinTokenExpiresAt).toBeUndefined();
  });
});

describe('unlinkIdentity', () => {
  it('removes a provider when another sign-in method remains', async () => {
    const { user } = await resolveOAuthLogin(profile());
    await resolveOAuthLogin(profile({ provider: 'github', providerUserId: '42' }), {
      linkUserId: user.id,
      githubAccessToken: 'gho_secret',
    });
    const after = await unlinkIdentity(user.id, 'github');
    expect(after.identities.map((i) => i.provider)).toEqual(['google']);
    const reloaded = await User.findById(user.id).select('+githubAccessToken');
    expect(reloaded!.githubAccessToken).toBeUndefined();
  });

  it('refuses to remove the last way to sign in', async () => {
    const { user } = await resolveOAuthLogin(profile());
    await expect(unlinkIdentity(user.id, 'google')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows removing the only provider when a password is set', async () => {
    const me = await User.create({ email: 'me@example.com', name: 'Me', passwordHash: 'hash', emailVerified: true });
    await resolveOAuthLogin(profile({ email: 'me@example.com' }), { linkUserId: me.id });
    const after = await unlinkIdentity(me.id, 'google');
    expect(after.identities).toHaveLength(0);
  });
});
