import { decrypt } from '../utils/crypto';
import { IUser } from '../models/User';
import { ISubmission } from '../models/Submission';
import { IProblem } from '../models/Problem';
import { GithubApiError, GithubNotLinkedError } from '../errors/AppError';

interface GithubUser {
  login: string;
}
interface GithubRepo {
  html_url: string;
}

const LANGUAGE_EXTENSION: Record<string, string> = {
  python: 'py',
  typescript: 'ts',
  cpp: 'cpp',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TrakCode',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new GithubApiError(`GitHub API ${path} returned ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

// Spec §7 "POST /portfolio/push — creates GitHub repo, pushes code". One repo
// per pushed submission, so each solved problem reads as its own portfolio
// piece on the learner's GitHub profile.
export async function pushSubmissionToGithub(
  user: IUser,
  submission: ISubmission,
  problem: IProblem
): Promise<string> {
  if (!user.githubAccessToken) {
    throw new GithubNotLinkedError();
  }
  const token = decrypt(user.githubAccessToken);

  const ghUser = await githubRequest<GithubUser>('/user', token);

  const repoName = `trakcode-${slugify(problem.topic)}-${submission.id.toString().slice(-6)}`;
  const repo = await githubRequest<GithubRepo>('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      description: `TrakCode solution — ${problem.topic} (${problem.difficulty})`,
      private: false,
      auto_init: false,
    }),
  });

  const ext = LANGUAGE_EXTENSION[submission.language] ?? 'txt';
  const readme = [
    `# ${problem.topic}`,
    '',
    problem.prompt,
    '',
    `Solved on TrakCode — ${problem.difficulty} ${problem.type.replace('_', ' ')}.`,
    '',
  ].join('\n');

  await githubRequest(`/repos/${ghUser.login}/${repoName}/contents/solution.${ext}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Add solution from TrakCode',
      content: Buffer.from(submission.code, 'utf8').toString('base64'),
    }),
  });

  await githubRequest(`/repos/${ghUser.login}/${repoName}/contents/README.md`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Add README',
      content: Buffer.from(readme, 'utf8').toString('base64'),
    }),
  });

  return repo.html_url;
}
