import { decrypt } from '../utils/crypto';
import { IUser } from '../models/User';
import { ISubmission } from '../models/Submission';
import { IProblem } from '../models/Problem';
import { AppError, GithubApiError, GithubNotLinkedError } from '../errors/AppError';

// Portfolio push: puts a passing solution on the learner's own GitHub.
//
// By default every solution lands in ONE repo on their account,
// `trakcode-solutions`, created on first push, as its own folder
// (`python/sum-of-digits/solution.py` + README) in a single commit on the
// default branch. The default branch matters: GitHub's contribution heatmap only
// counts commits there, so a branch-per-solution layout would never show up.
// A learner can instead send a solution to a brand-new repo of its own.
//
// Commits go through the Git Data API (blobs → tree → commit → ref) so each push
// is exactly one commit with both files, authored as the learner, which is
// what makes it count on their heatmap.

export const DEFAULT_PORTFOLIO_REPO = 'trakcode-solutions';

export type PushDestination = 'default' | 'new';

export interface PushOptions {
  title: string; // the learner's name for this push: folder name + commit message
  destination: PushDestination;
  newRepoName?: string; // required when destination === 'new'
}

export interface PushResult {
  repoName: string;
  repoUrl: string;
  url: string; // the folder (default repo) or the repo itself (new repo)
  commitUrl: string;
}

interface GithubUser {
  login: string;
}
interface GithubRepo {
  name: string;
  html_url: string;
  default_branch: string;
}
interface GithubRef {
  object: { sha: string };
}
interface GithubCommit {
  sha: string;
  html_url: string;
  tree: { sha: string };
}
interface GithubTree {
  sha: string;
}

const LANGUAGE_EXTENSION: Record<string, string> = {
  python: 'py',
  typescript: 'ts',
  cpp: 'cpp',
  java: 'java',
};

// Java needs the file named after its public class (Main.java), or it won't
// compile once someone clones the repo. Other languages use solution.<ext>.
export function solutionFileName(language: string, code: string): string {
  const ext = LANGUAGE_EXTENSION[language] ?? 'txt';
  if (language === 'java') {
    const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
    const publicClass = withoutComments.match(/\bpublic\s+(?:(?:final|abstract)\s+)*class\s+([A-Za-z_$][\w$]*)/);
    return `${publicClass?.[1] ?? 'Main'}.java`;
  }
  return `solution.${ext}`;
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: 'Python',
  typescript: 'TypeScript',
  cpp: 'C++',
  java: 'Java',
};

// GitHub repo names: letters, digits, '-', '_', '.', up to 100 characters.
export const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'solution'
  );
}

async function githubFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TrakCode',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await githubFetch(path, token, init);
  if (!res.ok) {
    if (res.status === 401) {
      throw new GithubNotLinkedError('Your GitHub connection has expired. Reconnect GitHub from your profile, then push again.');
    }
    throw new GithubApiError(`GitHub API ${path} returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function createRepo(token: string, name: string, description: string): Promise<GithubRepo> {
  const res = await githubFetch('/user/repos', token, {
    method: 'POST',
    // auto_init gives the repo a first commit + default branch, so every push
    // (including the first) can be one commit on top of it.
    body: JSON.stringify({ name, description, private: false, auto_init: true }),
  });
  if (res.status === 422) {
    throw new AppError(`You already have a GitHub repo named "${name}". Pick a different name.`, 409);
  }
  if (res.status === 403 || res.status === 404) {
    // A token without public_repo (e.g. granted before GitHub sign-in asked for it).
    throw new GithubNotLinkedError('TrakCode needs permission to create repos. Reconnect GitHub from your profile, then push again.');
  }
  if (!res.ok) throw new GithubApiError(`GitHub API /user/repos returned ${res.status}: ${await res.text()}`);
  return (await res.json()) as GithubRepo;
}

async function getRepo(token: string, owner: string, name: string): Promise<GithubRepo | null> {
  const res = await githubFetch(`/repos/${owner}/${name}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new GithubApiError(`GitHub API /repos/${owner}/${name} returned ${res.status}: ${await res.text()}`);
  return (await res.json()) as GithubRepo;
}

// A freshly auto-initialized repo can take a moment before its branch ref exists.
async function getBranchHead(token: string, owner: string, repo: string, branch: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    if (res.ok) return ((await res.json()) as GithubRef).object.sha;
    if (attempt >= 4 || (res.status !== 404 && res.status !== 409)) {
      throw new GithubApiError(`Could not read ${owner}/${repo}@${branch} (${res.status}): ${await res.text()}`);
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
}

async function pathExists(token: string, owner: string, repo: string, path: string, branch: string): Promise<boolean> {
  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${branch}`, token);
  return res.ok;
}

function problemReadme(title: string, problem: IProblem, language: string): string {
  return [
    `# ${title}`,
    '',
    `**Topic:** ${problem.topic} · **Difficulty:** ${problem.difficulty} · **Language:** ${LANGUAGE_LABEL[language] ?? language}`,
    '',
    '## Problem',
    '',
    problem.prompt,
    '',
    '---',
    'Solved on [TrakCode](https://trakcode.com).',
    '',
  ].join('\n');
}

const PORTFOLIO_REPO_README = [
  '# TrakCode Solutions',
  '',
  'Problems I\'ve solved while learning on [TrakCode](https://trakcode.com).',
  'Each folder is one problem: its prompt in the README and my passing solution next to it.',
  '',
].join('\n');

export interface PortfolioProject {
  language: string; // folder prefix in the shared repo and commit label
  files: { path: string; content: string }[]; // relative to the project folder; README.md included
}

export async function pushSubmissionToGithub(
  user: IUser,
  submission: ISubmission,
  problem: IProblem,
  opts: PushOptions
): Promise<PushResult> {
  return pushProjectToGithub(
    user,
    {
      language: submission.language,
      files: [
        { path: solutionFileName(submission.language, submission.code), content: submission.code },
        { path: 'README.md', content: problemReadme(opts.title.trim(), problem, submission.language) },
      ],
    },
    opts
  );
}

export function languageLabel(language: string): string {
  return LANGUAGE_LABEL[language] ?? language;
}

export function languageExtension(language: string): string {
  return LANGUAGE_EXTENSION[language] ?? 'txt';
}

/** Push a set of project files as one commit: a new folder in the shared repo, or a new repo. */
export async function pushProjectToGithub(user: IUser, project: PortfolioProject, opts: PushOptions): Promise<PushResult> {
  if (!user.githubAccessToken) throw new GithubNotLinkedError();
  const token = decrypt(user.githubAccessToken);
  const { login } = await githubRequest<GithubUser>('/user', token);

  const title = opts.title.trim();

  // 1. The destination repo.
  let repo: GithubRepo;
  let freshDefaultRepo = false;
  if (opts.destination === 'new') {
    const name = opts.newRepoName?.trim() ?? '';
    if (!REPO_NAME_PATTERN.test(name)) {
      throw new AppError('Repo names can only use letters, numbers, "-", "_" and "."', 400);
    }
    repo = await createRepo(token, name, `${title}: solved on TrakCode`);
  } else {
    const existing = await getRepo(token, login, DEFAULT_PORTFOLIO_REPO);
    if (existing) {
      repo = existing;
    } else {
      repo = await createRepo(token, DEFAULT_PORTFOLIO_REPO, 'Problems I solved while learning on TrakCode');
      freshDefaultRepo = true;
    }
  }
  const branch = repo.default_branch || 'main';
  const headSha = await getBranchHead(token, login, repo.name, branch);

  // 2. Where the files go: a unique folder in the shared repo, the root of a new one.
  let folder = '';
  if (opts.destination === 'default') {
    const base = `${project.language}/${slugify(title)}`;
    folder = base;
    for (let n = 2; await pathExists(token, login, repo.name, folder, branch); n++) {
      if (n > 50) throw new GithubApiError(`Too many folders named ${base}`);
      folder = `${base}-${n}`;
    }
  }
  const at = (file: string) => (folder ? `${folder}/${file}` : file);

  const files = project.files.map((f) => ({ path: at(f.path), content: f.content }));
  if (freshDefaultRepo) files.push({ path: 'README.md', content: PORTFOLIO_REPO_README });

  // 3. One commit with every file, on top of the branch head.
  const head = await githubRequest<GithubCommit>(`/repos/${login}/${repo.name}/git/commits/${headSha}`, token);
  const tree = await githubRequest<GithubTree>(`/repos/${login}/${repo.name}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
    }),
  });
  const commit = await githubRequest<GithubCommit>(`/repos/${login}/${repo.name}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify({ message: `Add ${title} (${languageLabel(project.language)})`, tree: tree.sha, parents: [headSha] }),
  });
  await githubRequest(`/repos/${login}/${repo.name}/git/refs/heads/${branch}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  return {
    repoName: repo.name,
    repoUrl: repo.html_url,
    url: folder ? `${repo.html_url}/tree/${branch}/${folder}` : repo.html_url,
    commitUrl: commit.html_url,
  };
}
