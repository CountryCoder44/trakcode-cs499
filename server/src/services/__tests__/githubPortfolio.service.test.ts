// Portfolio push against an in-memory fake of the GitHub REST API (global fetch
// stubbed). Checks the things that matter for the learner's GitHub: one shared
// repo, one folder per solution, one commit per push, on the default branch.
import { pushSubmissionToGithub, DEFAULT_PORTFOLIO_REPO, solutionFileName } from '../githubPortfolio.service';
import { encrypt } from '../../utils/crypto';
import type { IUser } from '../../models/User';
import type { ISubmission } from '../../models/Submission';
import type { IProblem } from '../../models/Problem';

const realFetch = global.fetch;

interface FakeRepo {
  name: string;
  branch: string;
  head: string;
  files: Set<string>;
}

function fakeGithub(initialRepos: string[] = []) {
  const repos = new Map<string, FakeRepo>();
  const commits: Array<{ repo: string; message: string; paths: string[] }> = [];
  let n = 0;
  const addRepo = (name: string) => repos.set(name, { name, branch: 'main', head: `sha-init-${name}`, files: new Set(['README.md']) });
  initialRepos.forEach(addRepo);
  const pendingTrees = new Map<string, string[]>();

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    let m: RegExpMatchArray | null;

    if (path === '/user') return json({ login: 'ada' });
    if (path === '/user/repos' && method === 'POST') {
      if (repos.has(body.name)) return json({ message: 'name already exists' }, 422);
      addRepo(body.name);
      return json({ name: body.name, html_url: `https://github.com/ada/${body.name}`, default_branch: 'main' }, 201);
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)$/))) {
      const r = repos.get(m[1]);
      return r ? json({ name: r.name, html_url: `https://github.com/ada/${r.name}`, default_branch: r.branch }) : json({}, 404);
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/git\/ref\/heads\/(.+)$/))) {
      return json({ object: { sha: repos.get(m[1])!.head } });
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/contents\/(.+)$/))) {
      const r = repos.get(m[1])!;
      const prefix = decodeURI(m[2]) + '/';
      return [...r.files].some((f) => f.startsWith(prefix)) ? json([]) : json({}, 404);
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/git\/commits\/(.+)$/)) && method === 'GET') {
      return json({ sha: m[2], html_url: '', tree: { sha: `tree-of-${m[2]}` } });
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/git\/trees$/))) {
      const sha = `tree-${++n}`;
      pendingTrees.set(sha, body.tree.map((t: { path: string }) => t.path));
      return json({ sha }, 201);
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/git\/commits$/))) {
      const sha = `commit-${++n}`;
      const paths = pendingTrees.get(body.tree)!;
      commits.push({ repo: m[1], message: body.message, paths });
      pendingTrees.set(sha, paths);
      return json({ sha, html_url: `https://github.com/ada/${m[1]}/commit/${sha}`, tree: { sha: body.tree } }, 201);
    }
    if ((m = path.match(/^\/repos\/ada\/([^/]+)\/git\/refs\/heads\/(.+)$/)) && method === 'PATCH') {
      const r = repos.get(m[1])!;
      r.head = body.sha;
      pendingTrees.get(body.sha)!.forEach((p) => r.files.add(p));
      return json({});
    }
    throw new Error(`unexpected GitHub call ${method} ${path}`);
  }) as typeof fetch;

  return { repos, commits };
}

afterEach(() => {
  global.fetch = realFetch;
});

const user = { githubAccessToken: encrypt('gho_test') } as unknown as IUser;
const submission = { code: 'print(sum(map(int, input())))', language: 'python' } as unknown as ISubmission;
const problem = { topic: 'digits', difficulty: 'easy', prompt: 'Sum the digits.', type: 'deep_dive' } as unknown as IProblem;

describe('pushSubmissionToGithub', () => {
  it('creates trakcode-solutions on first push and commits the solution as a folder', async () => {
    const gh = fakeGithub();
    const result = await pushSubmissionToGithub(user, submission, problem, { title: 'Sum of Digits', destination: 'default' });

    expect(gh.repos.has(DEFAULT_PORTFOLIO_REPO)).toBe(true);
    expect(gh.commits).toHaveLength(1);
    expect(gh.commits[0].message).toBe('Add Sum of Digits (Python)');
    expect(gh.commits[0].paths.sort()).toEqual(
      ['README.md', 'python/sum-of-digits/README.md', 'python/sum-of-digits/solution.py'].sort()
    );
    expect(result.url).toBe('https://github.com/ada/trakcode-solutions/tree/main/python/sum-of-digits');
  });

  it('adds to the existing repo without rewriting its root README, and never collides on folder names', async () => {
    const gh = fakeGithub([DEFAULT_PORTFOLIO_REPO]);
    await pushSubmissionToGithub(user, submission, problem, { title: 'Sum of Digits', destination: 'default' });
    const second = await pushSubmissionToGithub(user, submission, problem, { title: 'Sum of Digits', destination: 'default' });

    expect(gh.commits).toHaveLength(2);
    expect(gh.commits[0].paths).not.toContain('README.md');
    expect(gh.commits[1].paths).toContain('python/sum-of-digits-2/solution.py');
    expect(second.url).toMatch(/sum-of-digits-2$/);
  });

  it('can create a separate repo with the solution at its root', async () => {
    const gh = fakeGithub();
    const result = await pushSubmissionToGithub(user, submission, problem, {
      title: 'Sum of Digits',
      destination: 'new',
      newRepoName: 'digit-summer',
    });
    expect(gh.repos.has('digit-summer')).toBe(true);
    expect(gh.repos.has(DEFAULT_PORTFOLIO_REPO)).toBe(false);
    expect(gh.commits[0].paths.sort()).toEqual(['README.md', 'solution.py']);
    expect(result.url).toBe('https://github.com/ada/digit-summer');
  });

  it('reports a taken repo name clearly', async () => {
    fakeGithub(['digit-summer']);
    await expect(
      pushSubmissionToGithub(user, submission, problem, { title: 'x', destination: 'new', newRepoName: 'digit-summer' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses without a GitHub token', async () => {
    fakeGithub();
    await expect(
      pushSubmissionToGithub({} as IUser, submission, problem, { title: 'x', destination: 'default' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('solutionFileName', () => {
  it('names a Java file after its public class so it compiles once cloned', () => {
    expect(solutionFileName('java', 'public class Main { public static void main(String[] a) {} }')).toBe('Main.java');
    expect(solutionFileName('java', '// public class Nope\npublic final class Greeter {}')).toBe('Greeter.java');
    expect(solutionFileName('java', 'class Helper {}')).toBe('Main.java');
  });

  it('uses solution.<ext> for other languages', () => {
    expect(solutionFileName('python', 'print(1)')).toBe('solution.py');
    expect(solutionFileName('cpp', 'int main(){}')).toBe('solution.cpp');
  });
});
