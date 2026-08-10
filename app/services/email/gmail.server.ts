import type {
  EmailAddress,
  EmailAttachment,
  EmailClient,
  EmailMessage,
  CreateDraftEmailInput,
  CreateDraftReplyInput,
  ListMessagesOptions,
  UpdateDraftReplyInput,
  SendReplyInput,
  DraftSentStatusInput,
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
  labelIds?: string[];
  payload?: GmailPart;
};

type GmailThreadResponse = {
  id: string;
  messages?: GmailMessageResponse[];
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

export class GmailAuthenticationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const isGmailAuthenticationError = (
  error: unknown,
): error is GmailAuthenticationError =>
  error instanceof GmailAuthenticationError;

class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SYSTEM_FOLDERS = new Set([
  'INBOX',
  'SENT',
  'DRAFT',
  'SPAM',
  'TRASH',
  'STARRED',
  'IMPORTANT',
  'UNREAD',
]);

const buildGmailFolderQuery = (folder: string) => {
  const normalized = folder.trim() || 'INBOX';
  const upper = normalized.toUpperCase();
  if (GMAIL_SYSTEM_FOLDERS.has(upper)) {
    return `in:${upper.toLowerCase()}`;
  }
  const escaped = normalized.replaceAll('"', '');
  return /\s/.test(escaped) ? `label:"${escaped}"` : `label:${escaped}`;
};

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

const createMultipartDraftMessage = (
  input: CreateDraftReplyInput | CreateDraftEmailInput,
  options: { isReply: boolean },
) => {
  const boundary = `supplyflow-${crypto.randomUUID()}`;
  const filename = sanitizeMimeFilename(input.attachment.filename);
  const subject =
    options.isReply && !/^re:/i.test(input.subject)
      ? `Re: ${input.subject}`
      : input.subject;
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

const createPlainTextReplyMessage = (input: SendReplyInput) => {
  const subject = /^re:/i.test(input.subject)
    ? input.subject
    : `Re: ${input.subject}`;
  const message = [
    `To: ${sanitizeHeader(input.to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    input.bodyText,
    '',
  ].join('\r\n');
  return encodeBase64UrlBytes(new TextEncoder().encode(message));
};

const createDraftUrl = (accountEmail: string) =>
  `https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(accountEmail)}#drafts`;

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
    if (response.status === 401 || response.status === 403) {
      throw new GmailAuthenticationError(
        `Gmail API authentication failed with status ${response.status}`,
        response.status,
      );
    }
    throw new GmailApiError(
      `Gmail API request failed with status ${response.status}`,
      response.status,
    );
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
    const errorText = await response.text();
    throw new GmailAuthenticationError(
      `Google token refresh failed with status ${response.status}: ${errorText}`,
      response.status,
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

const isDraftSent = async (
  input: DraftSentStatusInput,
  accessToken: string,
) => {
  const wasSentAfter = (message: GmailMessageResponse) => {
    const sentAfterMs = input.sentAfter.getTime();
    const internalDate = Number(message.internalDate ?? 0);
    return (
      (message.labelIds?.includes('SENT') ?? false) &&
      internalDate >= sentAfterMs
    );
  };
  try {
    const res = await gmailRequest<{
      id: string;
      message: GmailMessageResponse;
    }>(`/drafts/${encodeURIComponent(input.draftId)}`, accessToken);
    console.log('res.message', res.message);
    if (wasSentAfter(res.message)) {
      return true;
    }
  } catch (error) {
    if (isGmailAuthenticationError(error)) {
      throw error;
    }
  }

  if (!input.threadId) {
    return false;
  }

  try {
    const thread = await gmailRequest<GmailThreadResponse>(
      `/threads/${encodeURIComponent(input.threadId)}?format=metadata`,
      accessToken,
    );
    return thread.messages?.some(wasSentAfter) ?? false;
  } catch (error) {
    if (isGmailAuthenticationError(error)) {
      throw error;
    }
    return false;
  }
};

export const createGmailClient = (config: GmailClientConfig): EmailClient => ({
  provider: 'gmail',
  async getMessage(id) {
    return await getMessage(id, await getAccessToken(config));
  },
  async listMessages({
    receivedAfter,
    limit,
    folder = 'INBOX',
  }: ListMessagesOptions) {
    const accessToken = await getAccessToken(config);
    const messageIds: string[] = [];
    let pageToken: string | undefined;
    const folderQuery = buildGmailFolderQuery(folder);

    do {
      const search = new URLSearchParams({
        maxResults: String(Math.min(limit - messageIds.length, 100)),
        q: `${folderQuery} after:${Math.floor(receivedAfter.getTime() / 1000)}`,
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
          raw: createMultipartDraftMessage(input, { isReply: true }),
        },
      }),
    });
    return {
      id: draft.id,
      url: createDraftUrl(input.accountEmail),
    };
  },
  async createDraftEmail(input) {
    const accessToken = await getAccessToken(config);
    const draft = await gmailRequest<{ id: string }>('/drafts', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          raw: createMultipartDraftMessage(input, { isReply: false }),
        },
      }),
    });
    return {
      id: draft.id,
      url: createDraftUrl(input.accountEmail),
    };
  },
  async updateDraftReply(input: UpdateDraftReplyInput) {
    const accessToken = await getAccessToken(config);
    const draft = await gmailRequest<{ id: string }>(
      `/drafts/${encodeURIComponent(input.draftId)}`,
      accessToken,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: input.draftId,
          message: {
            threadId: input.threadId ?? undefined,
            raw: createMultipartDraftMessage(input, { isReply: true }),
          },
        }),
      },
    );
    return {
      id: draft.id,
      url: createDraftUrl(input.accountEmail),
    };
  },
  async sendReply(input) {
    const accessToken = await getAccessToken(config);
    await gmailRequest('/messages/send', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: input.threadId ?? undefined,
        raw: createPlainTextReplyMessage(input),
      }),
    });
  },
  async isDraftSent(input) {
    return await isDraftSent(input, await getAccessToken(config));
  },
});
