// Real integration test of the social sign-in redirect flow: the real Express
// app, a real ephemeral mongod, real cookies/JWTs. Only the provider's own HTTP
// endpoints (token exchange + userinfo) are stubbed, via global fetch, since
// those need a real Google app and a human clicking "Allow".
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { env } from '../config/env';
import { User } from '../models/User';
import { OAuthLinkTicket } from '../models/OAuthLinkTicket';
import { signToken, verifyToken } from '../utils/jwt';

let mem: MongoMemoryServer;
const app = createApp();
const realFetch = global.fetch;

const FRONTEND = 'http://frontend.test';

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'oauth_flow_test' } });
  await mongoose.connect(mem.getUri('oauth_flow_test'));
  await User.syncIndexes();

  env.FRONTEND_URL = FRONTEND;
  env.OAUTH_CALLBACK_BASE_URL = 'http://api.test/api/auth/oauth';
  env.GOOGLE_CLIENT_ID = 'google-id';
  env.GOOGLE_CLIENT_SECRET = 'google-secret';
  env.GITHUB_CLIENT_ID = undefined;
  env.GITHUB_CLIENT_SECRET = undefined;
  env.LINKEDIN_CLIENT_ID = undefined;
  env.LINKEDIN_CLIENT_SECRET = undefined;
});

afterAll(async () => {
  global.fetch = realFetch;
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await OAuthLinkTicket.deleteMany({});
  global.fetch = realFetch;
});

function stubGoogle(userinfo: Record<string, unknown>) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'ya29.test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
      return new Response(JSON.stringify(userinfo), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return calls;
}

function fragmentOf(location: string): URLSearchParams {
  expect(location.startsWith(`${FRONTEND}/auth/callback#`)).toBe(true);
  return new URLSearchParams(location.split('#')[1]);
}

/** Runs /start and returns the state + the tx cookie the browser would hold. */
async function begin(path = '/api/auth/oauth/google/start') {
  const res = await request(app).get(path);
  expect(res.status).toBe(302);
  const authorize = new URL(res.headers.location);
  const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('trakcode_oauth='))!;
  return { authorize, cookie: cookie.split(';')[0], state: authorize.searchParams.get('state')! };
}

describe('social sign-in flow', () => {
  it('lists only configured providers', async () => {
    const res = await request(app).get('/api/auth/providers');
    expect(res.body).toEqual({ providers: [{ id: 'google', label: 'Google' }] });
  });

  it('start redirects to Google with state, PKCE, and an httpOnly tx cookie', async () => {
    const res = await request(app).get('/api/auth/oauth/google/start');
    const authorize = new URL(res.headers.location);
    expect(authorize.origin + authorize.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authorize.searchParams.get('redirect_uri')).toBe('http://api.test/api/auth/oauth/google/callback');
    expect(authorize.searchParams.get('scope')).toBe('openid email profile');
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('callback creates the account and hands the JWT back in the URL fragment', async () => {
    const { cookie, state } = await begin();
    const calls = stubGoogle({ sub: 'g-1', email: 'Ada@Example.com', email_verified: true, name: 'Ada' });

    const res = await request(app)
      .get(`/api/auth/oauth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(302);
    const frag = fragmentOf(res.headers.location);
    expect(frag.get('error')).toBeNull();
    expect(frag.get('new')).toBe('1');
    const { userId } = verifyToken(frag.get('token')!);
    const user = await User.findById(userId);
    expect(user!.email).toBe('ada@example.com');
    expect(calls).toContain('https://oauth2.googleapis.com/token');
    // The tx cookie is cleared so the same state can't be replayed.
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/trakcode_oauth=;/);
  });

  it('rejects a callback whose state does not match the cookie', async () => {
    const { cookie } = await begin();
    stubGoogle({ sub: 'g-1', email: 'ada@example.com', email_verified: true });
    const res = await request(app).get('/api/auth/oauth/google/callback?code=abc&state=forged').set('Cookie', cookie);
    expect(fragmentOf(res.headers.location).get('error')).toMatch(/expired or was invalid/);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a callback with no tx cookie at all', async () => {
    const { state } = await begin();
    const res = await request(app).get(`/api/auth/oauth/google/callback?code=abc&state=${state}`);
    expect(fragmentOf(res.headers.location).get('error')).toMatch(/expired or was invalid/);
  });

  it('reports a cancelled consent screen', async () => {
    const { cookie } = await begin();
    const res = await request(app).get('/api/auth/oauth/google/callback?error=access_denied').set('Cookie', cookie);
    expect(fragmentOf(res.headers.location).get('error')).toBe('Google sign-in was cancelled.');
  });

  it('surfaces an unverified email as a readable error', async () => {
    const { cookie, state } = await begin();
    stubGoogle({ sub: 'g-1', email: 'ada@example.com', email_verified: false });
    const res = await request(app)
      .get(`/api/auth/oauth/google/callback?code=abc&state=${state}`)
      .set('Cookie', cookie);
    expect(fragmentOf(res.headers.location).get('error')).toMatch(/verified email/);
  });

  it('an unconfigured provider redirects back with an error instead of 500ing', async () => {
    const res = await request(app).get('/api/auth/oauth/linkedin/start');
    expect(fragmentOf(res.headers.location).get('error')).toBe('LinkedIn sign-in is not configured on this server');
  });

  it('links a provider to the signed-in account via a single-use ticket', async () => {
    const me = await User.create({ email: 'me@school.edu', name: 'Me', passwordHash: 'x' });
    const bearer = `Bearer ${signToken({ userId: me.id, role: 'user' })}`;

    const linkRes = await request(app)
      .post('/api/auth/oauth/google/link')
      .set('Authorization', bearer)
      .send({ returnTo: '/settings/profile' });
    expect(linkRes.status).toBe(200);
    const startPath = new URL(linkRes.body.url).pathname + new URL(linkRes.body.url).search;

    const { cookie, state } = await begin(startPath);
    // The ticket is consumed — replaying the same start URL fails.
    const replay = await request(app).get(startPath);
    expect(fragmentOf(replay.headers.location).get('error')).toMatch(/expired/);

    stubGoogle({ sub: 'g-7', email: 'personal@gmail.com', email_verified: true });
    const res = await request(app)
      .get(`/api/auth/oauth/google/callback?code=abc&state=${state}`)
      .set('Cookie', cookie);
    const frag = fragmentOf(res.headers.location);
    expect(frag.get('linked')).toBe('google');
    expect(frag.get('returnTo')).toBe('/settings/profile');
    expect(verifyToken(frag.get('token')!).userId).toBe(me.id);
    expect((await User.findById(me.id))!.identities.map((i) => i.provider)).toEqual(['google']);
  });

  it('rejects an off-site returnTo', async () => {
    const me = await User.create({ email: 'me@school.edu', name: 'Me', passwordHash: 'x' });
    const res = await request(app)
      .post('/api/auth/oauth/google/link')
      .set('Authorization', `Bearer ${signToken({ userId: me.id, role: 'user' })}`)
      .send({ returnTo: '//evil.example' });
    expect(res.status).toBe(400);
  });

  it('password login against a social-only account fails with the generic 401', async () => {
    await User.create({
      email: 'social@example.com',
      name: 'S',
      identities: [{ provider: 'google', providerUserId: 'g-9' }],
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'social@example.com', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('DELETE /auth/identities refuses to remove the last sign-in method', async () => {
    const user = await User.create({
      email: 'social@example.com',
      name: 'S',
      identities: [{ provider: 'google', providerUserId: 'g-9' }],
    });
    const res = await request(app)
      .delete('/api/auth/identities/google')
      .set('Authorization', `Bearer ${signToken({ userId: user.id, role: 'user' })}`);
    expect(res.status).toBe(409);
  });
});
