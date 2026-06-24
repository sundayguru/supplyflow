import type {
  EmailAddress,
  EmailAttachment,
  EmailClient,
  EmailMessage,
  CreateDraftReplyInput,
  ListMessagesOptions,
} from './types';

export type GmailClientConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
};

type GmailHeader = { name?: string; value?: string };

type GmailPart = {
  partId?: string;
  filename?: string;
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { attachmentId?: string; data?: string; size?: number };
  parts?: GmailPart[];
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPart;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const createGmailAuthorizationUrl = (input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope:
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: input.state,
  }).toString();
  return url.toString();
};

export const exchangeGmailAuthorizationCode = async (input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Google authorization exchange failed with status ${response.status}`,
    );
  }
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error('Google did not return offline access credentials');
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  };
};

export const getGmailProfile = async (accessToken: string) => {
  const profile = await gmailRequest<{ emailAddress?: string }>(
    '/profile',
    accessToken,
  );
  if (!profile.emailAddress) {
    throw new Error('Gmail profile did not include an email address');
  }
  return { email: profile.emailAddress.toLowerCase() };
};

const decodeBase64UrlBytes = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const encodeBase64UrlBytes = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const encodeBase64Bytes = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const decodeBase64Url = (value: string) => {
  const bytes = decodeBase64UrlBytes(value);
  return new TextDecoder().decode(bytes);
};

const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const findBody = (
  part: GmailPart | undefined,
  mimeType: string,
): string | null => {
  if (!part) {
    return null;
  }
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const body = findBody(child, mimeType);
    if (body) {
      return body;
    }
  }
  return null;
};

const getHeader = (headers: GmailHeader[] | undefined, name: string) =>
  headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value ?? '';

const parseAddress = (value: string): EmailAddress => {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, '').trim() || null,
      address: match[2].trim().toLowerCase(),
    };
  }
  return { name: null, address: value.trim().toLowerCase() };
};

const parseAddresses = (value: string) =>
  value
    .split(',')
    .map((address) => parseAddress(address))
    .filter((address) => address.address);

const sanitizeHeader = (value: string) => value.replace(/[\r\n]/g, ' ').trim();

const encodeMimeHeader = (value: string) => {
  const safeValue = sanitizeHeader(value);
  if (/^[\x20-\x7E]*$/.test(safeValue)) {
    return safeValue;
  }
  return `=?UTF-8?B?${encodeBase64Bytes(new TextEncoder().encode(safeValue))}?=`;
};

const encodeAttachment = (bytes: Uint8Array) =>
  encodeBase64Bytes(bytes)
    .match(/.{1,76}/g)
    ?.join('\r\n') ?? '';

const sanitizeMimeFilename = (value: string) => value.replace(/["\r\n]/g, '-');

const createMultipartDraftMessage = (input: CreateDraftReplyInput) => {
  const boundary = `supplyflow-${crypto.randomUUID()}`;
  const filename = sanitizeMimeFilename(input.attachment.filename);
  const subject = /^re:/i.test(input.subject)
    ? input.subject
    : `Re: ${input.subject}`;
  const message = [
    `To: ${sanitizeHeader(input.to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    input.bodyText,
    '',
    `--${boundary}`,
    `Content-Type: ${input.attachment.contentType}; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    encodeAttachment(input.attachment.bytes),
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return encodeBase64UrlBytes(new TextEncoder().encode(message));
};

const isPdfPart = (part: GmailPart) =>
  part.mimeType === 'application/pdf' ||
  part.filename?.toLowerCase().endsWith('.pdf');

const collectPdfParts = (part: GmailPart | undefined): GmailPart[] => {
  if (!part) {
    return [];
  }
  const parts = part.parts?.flatMap(collectPdfParts) ?? [];
  return isPdfPart(part) ? [part, ...parts] : parts;
};

const gmailRequest = async <ResponseBody>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<ResponseBody> => {
  const response = await fetch(`${GMAIL_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Gmail API request failed with status ${response.status}`);
  }
  return (await response.json()) as ResponseBody;
};

const getAccessToken = async (config: GmailClientConfig) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Google token refresh failed with status ${response.status}`,
    );
  }
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!payload.access_token) {
    throw new Error('Google token response did not include an access token');
  }
  return payload.access_token;
};

const getMessage = async (
  id: string,
  accessToken: string,
): Promise<EmailMessage> => {
  const message = await gmailRequest<GmailMessageResponse>(
    `/messages/${encodeURIComponent(id)}?format=full`,
    accessToken,
  );
  const headers = message.payload?.headers;
  const plainText = findBody(message.payload, 'text/plain');
  const html = plainText ? null : findBody(message.payload, 'text/html');
  const text = (plainText ?? (html ? stripHtml(html) : '')).trim();
  const attachments: EmailAttachment[] = [];
  for (const part of collectPdfParts(message.payload)) {
    const attachmentId = part.body?.attachmentId;
    const data = attachmentId
      ? (
          await gmailRequest<GmailAttachmentResponse>(
            `/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
            accessToken,
          )
        ).data
      : part.body?.data;
    if (!data) {
      continue;
    }
    const bytes = decodeBase64UrlBytes(data);
    const attachmentBytes = new Uint8Array(bytes.byteLength);
    attachmentBytes.set(bytes);
    attachments.push({
      id: attachmentId ?? part.partId ?? crypto.randomUUID(),
      filename: part.filename || 'attachment.pdf',
      contentType: 'application/pdf',
      bytes: attachmentBytes.buffer,
    });
  }

  return {
    id: message.id,
    threadId: message.threadId ?? null,
    subject: getHeader(headers, 'Subject') || '(No subject)',
    from: parseAddress(getHeader(headers, 'From')),
    to: parseAddresses(getHeader(headers, 'To')),
    receivedAt: new Date(Number(message.internalDate ?? Date.now())),
    text: text.slice(0, 60_000),
    attachments,
  };
};

export const createGmailClient = (config: GmailClientConfig): EmailClient => ({
  provider: 'gmail',
  async getMessage(id) {
    return await getMessage(id, await getAccessToken(config));
  },
  async listMessages({ receivedAfter, limit }: ListMessagesOptions) {
    const accessToken = await getAccessToken(config);
    const messageIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const search = new URLSearchParams({
        maxResults: String(Math.min(limit - messageIds.length, 100)),
        q: `in:inbox after:${Math.floor(receivedAfter.getTime() / 1000)}`,
      });
      if (pageToken) {
        search.set('pageToken', pageToken);
      }
      const page = await gmailRequest<GmailListResponse>(
        `/messages?${search.toString()}`,
        accessToken,
      );
      messageIds.push(...(page.messages ?? []).map((message) => message.id));
      pageToken = page.nextPageToken;
    } while (pageToken && messageIds.length < limit);

    const messages: EmailMessage[] = [];
    for (const id of messageIds.slice(0, limit)) {
      messages.push(await getMessage(id, accessToken));
    }
    return messages.sort(
      (left, right) => left.receivedAt.getTime() - right.receivedAt.getTime(),
    );
  },
  async createDraftReply(input) {
    const accessToken = await getAccessToken(config);
    const draft = await gmailRequest<{ id: string }>('/drafts', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          threadId: input.threadId ?? undefined,
          raw: createMultipartDraftMessage(input),
        },
      }),
    });
    return {
      id: draft.id,
      url: `https://mail.google.com/mail/u/${encodeURIComponent(input.accountEmail)}/#drafts/${encodeURIComponent(draft.id)}`,
    };
  },
});
