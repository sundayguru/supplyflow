import { env } from 'cloudflare:workers';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });

export const renderBaseEmailTemplate = (input: {
  organizationName: string;
  title: string;
  message: string;
  actorLabel: string;
  actionUrl?: string | null;
  actionLabel?: string;
}) => {
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message);
  const organizationName = escapeHtml(input.organizationName);
  const actorLabel = escapeHtml(input.actorLabel);
  const appBaseUrl = env.BASE_URL?.replace(/\/$/, '');
  const actionHref =
    appBaseUrl && input.actionUrl
      ? new URL(input.actionUrl, appBaseUrl).toString()
      : null;
  const actionLabel = escapeHtml(input.actionLabel ?? 'View details');
  const action = actionHref
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(actionHref)}" style="display:inline-block;background:#5a5a40;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${actionLabel}</a></p>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f5f5f2;font-family:Arial,sans-serif;color:#1a1a1a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden"><tr><td style="background:#5a5a40;padding:20px 28px;color:#fff;font-size:18px;font-weight:700">${organizationName}</td></tr><tr><td style="padding:32px 28px"><h1 style="margin:0 0 16px;font-size:22px">${title}</h1><p style="margin:0;color:#454545;font-size:15px;line-height:1.6">${message}</p>${action}</td></tr><tr><td style="border-top:1px solid #eee;padding:18px 28px;color:#888;font-size:12px">You received this email because you are a member of ${organizationName}.</td></tr></table></td></tr></table></body></html>`;
};

export const sendEmailWithSendGrid = async (input: {
  to: string;
  subject: string;
  html: string;
}) => {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    console.warn('SendGrid is not configured; email notification was skipped.');
    return false;
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: env.SENDGRID_FROM_EMAIL },
      subject: input.subject,
      content: [{ type: 'text/html', value: input.html }],
    }),
  });

  if (!response.ok) {
    console.error('SendGrid email delivery failed', response.status);
    return false;
  }
  return true;
};
