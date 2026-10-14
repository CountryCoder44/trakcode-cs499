import { OutgoingEmail } from './mailer';

// Account emails. Each has a plain-text version (what some clients show, and
// what spam filters like to see) and a simple, inline-styled HTML version.

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2230;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <div style="font-weight:700;font-size:18px;margin-bottom:20px;">TrakCode</div>
      <h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="font-size:12px;color:#6b7385;margin-top:28px;">TrakCode LLC, New Jersey. Questions? Just reply to this email.</p>
    </div>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

export function passwordResetEmail(to: string, name: string, link: string, minutes: number): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    to,
    subject: 'Reset your TrakCode password',
    text: [
      greeting,
      '',
      'Someone asked to reset the password for your TrakCode account. If it was you, open this link to choose a new password:',
      '',
      link,
      '',
      `The link works once and expires in ${minutes} minutes.`,
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join('\n'),
    html: layout(
      'Reset your password',
      `<p>${escapeHtml(greeting)}</p>
      <p>Someone asked to reset the password for your TrakCode account. If it was you, choose a new password here:</p>
      ${button(link, 'Choose a new password')}
      <p style="font-size:13px;color:#4a5263;">The link works once and expires in ${minutes} minutes. If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all;">${escapeHtml(link)}</span></p>
      <p style="font-size:13px;color:#4a5263;">If you didn't ask for this, ignore this email. Your password won't change.</p>`
    ),
  };
}

export function passwordChangedEmail(to: string, name: string): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    to,
    subject: 'Your TrakCode password was changed',
    text: [
      greeting,
      '',
      'The password for your TrakCode account was just changed.',
      "If this wasn't you, reply to this email right away and we'll help you secure your account.",
    ].join('\n'),
    html: layout(
      'Your password was changed',
      `<p>${escapeHtml(greeting)}</p>
      <p>The password for your TrakCode account was just changed.</p>
      <p>If this wasn't you, reply to this email right away and we'll help you secure your account.</p>`
    ),
  };
}

function longDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

export function accountDeletionScheduledEmail(to: string, name: string, deleteOn: Date): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const when = longDate(deleteOn);
  return {
    to,
    subject: 'Your TrakCode account is scheduled for deletion',
    text: [
      greeting,
      '',
      `As you asked, your TrakCode account will be deleted on ${when}, when your final billing period ends. You can keep using TrakCode until then.`,
      '',
      'Changed your mind? Go to Profile → Account and click "Keep my account" before that date.',
    ].join('\n'),
    html: layout(
      'Your account is scheduled for deletion',
      `<p>${escapeHtml(greeting)}</p>
      <p>As you asked, your TrakCode account will be deleted on <strong>${escapeHtml(when)}</strong>, when your final billing period ends. You can keep using TrakCode until then.</p>
      <p>Changed your mind? Go to <strong>Profile → Account</strong> and click <strong>Keep my account</strong> before that date.</p>`
    ),
  };
}

export function accountDeletedEmail(to: string, name: string): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    to,
    subject: 'Your TrakCode account has been deleted',
    text: [
      greeting,
      '',
      'Your TrakCode account and your learning data have been deleted. Anything you pushed to GitHub is still yours.',
      'If you were a founding member, your discount is tied to this email, so it will still apply if you ever come back.',
      '',
      "Thanks for learning with us. If this wasn't you, reply to this email right away.",
    ].join('\n'),
    html: layout(
      'Your account has been deleted',
      `<p>${escapeHtml(greeting)}</p>
      <p>Your TrakCode account and your learning data have been deleted. Anything you pushed to GitHub is still yours.</p>
      <p>If you were a founding member, your discount is tied to this email, so it will still apply if you ever come back.</p>
      <p>Thanks for learning with us. If this wasn't you, reply to this email right away.</p>`
    ),
  };
}

export function trialCardReusedEmail(to: string, name: string, billingLink: string): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    to,
    subject: "Your TrakCode free trial couldn't start",
    text: [
      greeting,
      '',
      "The card you used has already been used for a TrakCode free trial, so we cancelled this trial right away. You haven't been charged.",
      '',
      "You can still become a member from Billing. You'll be charged when you subscribe:",
      '',
      billingLink,
    ].join('\n'),
    html: layout(
      "Your free trial couldn't start",
      `<p>${escapeHtml(greeting)}</p>
      <p>The card you used has already been used for a TrakCode free trial, so we cancelled this trial right away. <strong>You haven't been charged.</strong></p>
      <p>You can still become a member from Billing. You'll be charged when you subscribe.</p>
      ${button(billingLink, 'Go to Billing')}`
    ),
  };
}

export function safetyAlertEmail(
  to: string,
  incident: { severity: string; categories: string[]; userEmail: string; message: string; blocked: boolean; rationale: string },
  reviewLink: string
): OutgoingEmail {
  const summary = `${incident.severity.toUpperCase()}: ${incident.categories.join(', ')}`;
  const excerpt = incident.message.length > 500 ? `${incident.message.slice(0, 500)}...` : incident.message;
  return {
    to,
    subject: `[TrakCode safety] ${summary}`,
    text: [
      `A learner message to Trak was flagged ${summary}.`,
      `Account: ${incident.userEmail}`,
      `Trak replied: ${incident.blocked ? 'no (blocked)' : 'yes'}`,
      `Why: ${incident.rationale}`,
      '',
      'Message:',
      excerpt,
      '',
      'Nothing has been reported to anyone. Review it here:',
      reviewLink,
    ].join('\n'),
    html: layout(
      'A Trak message needs review',
      `<p><strong>${escapeHtml(summary)}</strong></p>
      <p>Account: ${escapeHtml(incident.userEmail)}<br/>Trak replied: ${incident.blocked ? 'no (blocked)' : 'yes'}<br/>Why: ${escapeHtml(incident.rationale)}</p>
      <p style="white-space:pre-wrap;background:#f4f5f8;padding:12px;border-radius:8px;">${escapeHtml(excerpt)}</p>
      <p>Nothing has been reported to anyone.</p>
      ${button(reviewLink, 'Review in Admin')}`
    ),
  };
}

export function misuseWarningEmail(to: string, name: string, flaggedAt: Date, reason: string, termsLink: string): OutgoingEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const when = flaggedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
  return {
    to,
    subject: 'A warning about your use of Trak',
    text: [
      greeting,
      '',
      `On ${when}, you sent Trak a message that our team reviewed and found breaks our Terms of Service: ${reason}.`,
      '',
      "This is a warning. Please keep your conversations with Trak about learning to code. If it happens again, we may close your account, and a closed account isn't refunded.",
      '',
      `Terms of Service: ${termsLink}`,
      '',
      'If you think we got this wrong, just reply to this email.',
    ].join('\n'),
    html: layout(
      'A warning about your use of Trak',
      `<p>${escapeHtml(greeting)}</p>
      <p>On ${escapeHtml(when)}, you sent Trak a message that our team reviewed and found breaks our Terms of Service: <strong>${escapeHtml(reason)}</strong>.</p>
      <p>This is a warning. Please keep your conversations with Trak about learning to code. If it happens again, we may close your account, and a closed account isn't refunded.</p>
      ${button(termsLink, 'Read the Terms of Service')}
      <p>If you think we got this wrong, just reply to this email.</p>`
    ),
  };
}

export function feedbackAlertEmail(
  to: string,
  feedback: { kind: 'bug' | 'idea'; userEmail: string; message: string; pagePath: string; hasScreenshot: boolean },
  inboxLink: string
): OutgoingEmail {
  const label = feedback.kind === 'idea' ? 'Suggestion' : 'Bug report';
  return {
    to,
    subject: `[TrakCode ${label.toLowerCase()}] from ${feedback.userEmail}`,
    text: [
      `New ${label.toLowerCase()} from ${feedback.userEmail}.`,
      `Page: ${feedback.pagePath || '(unknown)'}`,
      `Screenshot: ${feedback.hasScreenshot ? 'yes' : 'no'}`,
      '',
      'Message:',
      feedback.message,
      '',
      'Read and reply here:',
      inboxLink,
    ].join('\n'),
    html: layout(
      `New ${label.toLowerCase()}`,
      `<p>From ${escapeHtml(feedback.userEmail)}<br/>Page: ${escapeHtml(feedback.pagePath || '(unknown)')}<br/>Screenshot: ${feedback.hasScreenshot ? 'yes' : 'no'}</p>
      <p style="white-space:pre-wrap;background:#f4f5f8;padding:12px;border-radius:8px;">${escapeHtml(feedback.message)}</p>
      ${button(inboxLink, 'Reply in Admin')}`
    ),
  };
}
