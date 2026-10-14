// LinkedIn milestone posting against a stubbed Posts API (global fetch), with a
// real ephemeral mongod for the user/token lookup.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { encrypt } from '../../utils/crypto';
import { escapeLinkedinText, postToLinkedin } from '../linkedinShare.service';

let mem: MongoMemoryServer;
const realFetch = global.fetch;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'linkedin_share_test' } });
  await mongoose.connect(mem.getUri('linkedin_share_test'));
});

afterAll(async () => {
  global.fetch = realFetch;
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  global.fetch = realFetch;
});

async function linkedinUser(expiresInMs = 24 * 60 * 60 * 1000) {
  return User.create({
    email: 'ada@example.com',
    name: 'Ada',
    identities: [{ provider: 'linkedin', providerUserId: 'abc123' }],
    linkedinAccessToken: encrypt('li_token'),
    linkedinTokenExpiresAt: new Date(Date.now() + expiresInMs),
  });
}

function stubPosts(status = 201) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init! });
    return new Response(status === 201 ? null : 'nope', {
      status,
      headers: status === 201 ? { 'x-restli-id': 'urn:li:share:999' } : {},
    });
  }) as typeof fetch;
  return calls;
}

describe('postToLinkedin', () => {
  it('posts to the member feed with the versioned headers and escaped text', async () => {
    const user = await linkedinUser();
    const calls = stubPosts();

    const result = await postToLinkedin(user.id, 'Hit a 30-day streak on TrakCode (Python)! #coding');

    expect(result).toEqual({ postUrn: 'urn:li:share:999', url: 'https://www.linkedin.com/feed/update/urn:li:share:999/' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.linkedin.com/rest/posts');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer li_token');
    expect(headers['LinkedIn-Version']).toMatch(/^\d{6}$/);
    expect(headers['X-Restli-Protocol-Version']).toBe('2.0.0');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.author).toBe('urn:li:person:abc123');
    expect(body.commentary).toBe('Hit a 30-day streak on TrakCode \\(Python\\)! \\#coding');
    expect(body.visibility).toBe('PUBLIC');
  });

  it('refuses when LinkedIn is not connected or the token has expired', async () => {
    const none = await User.create({ email: 'b@example.com', name: 'B', passwordHash: 'x' });
    await expect(postToLinkedin(none.id, 'hi')).rejects.toMatchObject({ statusCode: 400 });

    await User.deleteMany({});
    const expired = await linkedinUser(-1000);
    await expect(postToLinkedin(expired.id, 'hi')).rejects.toThrow(/expired/);
  });

  it('turns a 403 (no posting permission) into a reconnect message', async () => {
    const user = await linkedinUser();
    stubPosts(403);
    await expect(postToLinkedin(user.id, 'hi')).rejects.toThrow(/Reconnect LinkedIn/);
  });

  it('rejects empty and over-length posts before calling LinkedIn', async () => {
    const user = await linkedinUser();
    const calls = stubPosts();
    await expect(postToLinkedin(user.id, '   ')).rejects.toMatchObject({ statusCode: 400 });
    await expect(postToLinkedin(user.id, 'x'.repeat(3001))).rejects.toMatchObject({ statusCode: 400 });
    expect(calls).toHaveLength(0);
  });
});

describe('escapeLinkedinText', () => {
  it('escapes LinkedIn little-text markup characters and leaves plain text alone', () => {
    expect(escapeLinkedinText('Plain text, 100% done!')).toBe('Plain text, 100% done!');
    expect(escapeLinkedinText('@you [x] {y} <z> *b* _i_ ~s~ a|b \\')).toBe(
      '\\@you \\[x\\] \\{y\\} \\<z\\> \\*b\\* \\_i\\_ \\~s\\~ a\\|b \\\\'
    );
  });
});
