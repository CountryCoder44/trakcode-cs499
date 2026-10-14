import { env } from '../config/env';
import { decrypt } from '../utils/crypto';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';

// Posts a text update to the learner's own LinkedIn feed, for milestone sharing
// (streaks, practice counts, course completion; which milestones and when is
// configured separately). Uses LinkedIn's Posts API with the member's own token
// (w_member_social, from the "Share on LinkedIn" product).
//
// LinkedIn's API terms expect members to stay in control of what's posted under
// their name, so callers should only post what the learner has opted into or
// confirmed, never silently.

const POSTS_URL = 'https://api.linkedin.com/rest/posts';
const MAX_COMMENTARY_LENGTH = 3000; // LinkedIn's limit for a post's text

export class LinkedinNotConnectedError extends AppError {
  constructor(message = 'Connect LinkedIn from your profile to share milestones.') {
    super(message, 400);
  }
}

export interface LinkedinPostResult {
  postUrn: string; // e.g. urn:li:share:7234…
  url: string; // a link to the post on linkedin.com
}

/**
 * Posts' `commentary` uses LinkedIn's "little text" format, where these
 * characters are markup and must be backslash-escaped to appear literally
 * (an unescaped "(" or "#" can otherwise truncate or reject the post).
 */
export function escapeLinkedinText(text: string): string {
  return text.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
}

export async function postToLinkedin(userId: string, text: string): Promise<LinkedinPostResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new AppError('A LinkedIn post needs some text', 400);
  if (trimmed.length > MAX_COMMENTARY_LENGTH) {
    throw new AppError(`LinkedIn posts are limited to ${MAX_COMMENTARY_LENGTH} characters`, 400);
  }

  const user = await User.findById(userId).select('+linkedinAccessToken');
  const identity = user?.identities.find((i) => i.provider === 'linkedin');
  if (!user || !identity || !user.linkedinAccessToken) throw new LinkedinNotConnectedError();
  if (!user.linkedinTokenExpiresAt || user.linkedinTokenExpiresAt <= new Date()) {
    throw new LinkedinNotConnectedError('Your LinkedIn connection has expired. Reconnect LinkedIn from your profile.');
  }

  const res = await fetch(POSTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${decrypt(user.linkedinAccessToken)}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': env.LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      // The OIDC `sub` we stored as the identity id is the member's person id.
      author: `urn:li:person:${identity.providerUserId}`,
      commentary: escapeLinkedinText(trimmed),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (res.status === 401) {
    throw new LinkedinNotConnectedError('LinkedIn rejected the connection. Reconnect LinkedIn from your profile.');
  }
  if (res.status === 403) {
    // Usually a connection made before posting permission was part of LinkedIn sign-in.
    throw new LinkedinNotConnectedError('TrakCode needs permission to post. Reconnect LinkedIn from your profile.');
  }
  if (!res.ok) {
    throw new AppError(`LinkedIn post failed (${res.status}): ${await res.text()}`, 502);
  }

  // LinkedIn returns the new post's URN in a header, not the body.
  const postUrn = res.headers.get('x-restli-id') ?? '';
  return { postUrn, url: `https://www.linkedin.com/feed/update/${postUrn}/` };
}
