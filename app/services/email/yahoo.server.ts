import { connect } from 'cloudflare:sockets';
import type {
  EmailAddress,
  EmailAttachment,
  EmailClient,
  EmailMessage,
  ListMessagesOptions,
  CreateDraftEmailInput,
  CreateDraftReplyInput,
  UpdateDraftReplyInput,
  SendReplyInput,
} from './types';

export type YahooClientConfig = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accountEmail: string;
  authType?: 'oauth' | 'app_password';
  appPassword?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  imapHost?: string;
  imapFolder?: string | null;
  provider?: 'yahoo' | 'aol';
};

type YahooTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type YahooUserInfoResponse = {
  sub?: string;
  name?: string;
  email?: string;
};

type ImapCommandResult = {
  text: string;
  literals: Uint8Array[];
};

type MimePart = {
  headers: Map<string, string>;
  body: Uint8Array;
  children: MimePart[];
};

export class YahooAuthenticationError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export const isYahooAuthenticationError = (
  error: unknown,
): error is YahooAuthenticationError =>
  error instanceof YahooAuthenticationError;

const YAHOO_AUTHORIZATION_URL =
  'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const YAHOO_USERINFO_URL = 'https://api.login.yahoo.com/openid/v1/userinfo';
const YAHOO_IMAP_HOST = 'imap.mail.yahoo.com';
const YAHOO_IMAP_PORT = 993;
const CRLF = '\r\n';
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export const createYahooAuthorizationUrl = (input: {
  clientId: string;
  redirectUri: string;
  state: string;
  authorizationUrl?: string;
}) => {
  const url = new URL(input.authorizationUrl ?? YAHOO_AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'openid mail-r',
    prompt: 'consent',
    nonce: crypto.randomUUID(),
    state: input.state,
  }).toString();
  return url.toString();
};

export const exchangeYahooAuthorizationCode = async (input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  tokenUrl?: string;
}) => {
  const response = await yahooTokenRequest(
    input.clientId,
    input.clientSecret,
    {
      redirect_uri: input.redirectUri,
      code: input.code,
      grant_type: 'authorization_code',
    },
    input.tokenUrl,
  );
  if (!response.access_token || !response.refresh_token) {
    throw new Error('Yahoo did not return offline access credentials');
  }
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  };
};

export const getYahooProfile = async (
  accessToken: string,
  userinfoUrl = YAHOO_USERINFO_URL,
) => {
  const response = await fetch(userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new YahooAuthenticationError(
      `Yahoo profile request failed with status ${response.status}`,
      response.status,
    );
  }
  const profile = (await response.json()) as YahooUserInfoResponse;
  if (!profile.email) {
    throw new Error('Yahoo profile did not include an email address');
  }
  return {
    providerAccountId: profile.sub ?? profile.email.toLowerCase(),
    email: profile.email.toLowerCase(),
    displayName: profile.name ?? null,
  };
};

const yahooTokenRequest = async (
  clientId: string,
  clientSecret: string,
  body: Record<string, string>,
  tokenUrl = YAHOO_TOKEN_URL,
) => {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBase64String(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new YahooAuthenticationError(
      `Yahoo token request failed with status ${response.status}: ${errorText}`,
      response.status,
    );
  }
  return (await response.json()) as YahooTokenResponse;
};

const getAccessToken = async (config: YahooClientConfig) => {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error('Yahoo OAuth credentials are missing');
  }
  const response = await yahooTokenRequest(
    config.clientId,
    config.clientSecret,
    {
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    },
    config.tokenUrl,
  );
  if (!response.access_token) {
    throw new Error('Yahoo token response did not include an access token');
  }
  return response.access_token;
};

const encodeBase64String = (value: string) =>
  encodeBase64Bytes(textEncoder.encode(value));

const encodeBase64Bytes = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const decodeBase64Bytes = (value: string) => {
  const normalized = value.replace(/\s/g, '');
  return Uint8Array.from(atob(normalized), (character) =>
    character.charCodeAt(0),
  );
};

const concatBytes = (left: Uint8Array, right: Uint8Array) => {
  const bytes = new Uint8Array(left.byteLength + right.byteLength);
  bytes.set(left);
  bytes.set(right, left.byteLength);
  return bytes;
};

class ImapConnection {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer = new Uint8Array();
  private tagNumber = 0;

  constructor(
    private readonly socket: Socket,
    private readonly imapHost: string,
    private readonly provider: 'yahoo' | 'aol',
  ) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  static async open(imapHost: string, provider: 'yahoo' | 'aol') {
    const socket = connect(
      { hostname: imapHost, port: YAHOO_IMAP_PORT },
      { secureTransport: 'on', allowHalfOpen: false },
    );
    await socket.opened;
    const connection = new ImapConnection(socket, imapHost, provider);
    await connection.readGreeting();
    return connection;
  }

  async close() {
    try {
      await this.command('LOGOUT');
    } catch {
      // The socket may already be closed after a failed command.
    }
    await this.writer.close().catch(() => undefined);
    await this.socket.close().catch(() => undefined);
  }

  async authenticate(email: string, accessToken: string) {
    const capabilities = await this.capability();
    const authenticationFailures: string[] = [];
    if (capabilities.has('AUTH=OAUTHBEARER')) {
      const oauthBearer = encodeBase64String(
        [
          `n,a=${email},`,
          `host=${this.imapHost}`,
          `port=${YAHOO_IMAP_PORT}`,
          `auth=Bearer ${accessToken}`,
          '',
          '',
        ].join('\x01'),
      );
      try {
        await this.command(`AUTHENTICATE OAUTHBEARER ${oauthBearer}`, {
          authenticationCommand: true,
        });
        return;
      } catch (error) {
        authenticationFailures.push(
          `OAUTHBEARER: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    if (capabilities.has('AUTH=XOAUTH2')) {
      const xoauth2 = encodeBase64String(
        `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`,
      );
      try {
        await this.command('AUTHENTICATE XOAUTH2', {
          authenticationCommand: true,
          continuationResponse: xoauth2,
        });
        return;
      } catch (error) {
        authenticationFailures.push(
          `XOAUTH2: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    throw new YahooAuthenticationError(
      authenticationFailures.length > 0
        ? `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP OAuth authentication failed. Reconnect this account to grant mail-r access. ${authenticationFailures.join('; ')}`
        : `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP server does not advertise OAuth authentication support`,
    );
  }

  async authenticatePassword(email: string, appPassword: string) {
    try {
      await this.command(
        `LOGIN ${quoteImapString(email)} ${quoteImapString(appPassword)}`,
        { authenticationCommand: true },
      );
    } catch {
      throw new YahooAuthenticationError(
        `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP authentication failed. Check the email address and app password.`,
      );
    }
  }

  async select(folder: string) {
    await this.command(`SELECT ${quoteImapString(folder || 'INBOX')}`);
  }

  async appendDraft(folder: string, message: Uint8Array) {
    this.tagNumber += 1;
    const tag = `A${String(this.tagNumber).padStart(4, '0')}`;
    await this.writer.write(
      textEncoder.encode(
        `${tag} APPEND ${quoteImapString(folder)} (\\Draft) {${message.byteLength}}${CRLF}`,
      ),
    );
    const continuation = await this.readLine();
    if (!continuation.startsWith('+')) {
      throw new Error(`IMAP server rejected draft upload: ${continuation}`);
    }
    await this.writer.write(concatBytes(message, textEncoder.encode(CRLF)));
    const result = await this.readUntilTag(tag);
    if (!result.startsWith(`${tag} OK`)) {
      const response = result.split(CRLF).filter(Boolean).join(' | ');
      throw new Error(
        `IMAP server could not save the draft${response ? `: ${response}` : ''}`,
      );
    }
    return /\[APPENDUID\s+\d+\s+(\d+)\]/i.exec(result)?.[1] ?? null;
  }

  async deleteDraft(folder: string, uid: string) {
    if (!/^\d+$/.test(uid)) {
      return;
    }
    await this.select(folder);
    await this.command(`UID STORE ${uid} +FLAGS (\\Deleted)`);
    await this.command(`UID EXPUNGE ${uid}`).catch(() => undefined);
  }

  async capability() {
    const result = await this.command('CAPABILITY');
    const capabilityLine = result.text
      .split(CRLF)
      .find((line) => line.startsWith('* CAPABILITY'));
    return new Set(
      capabilityLine
        ?.replace('* CAPABILITY', '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((capability) => capability.toUpperCase()) ?? [],
    );
  }

  async search(options: ListMessagesOptions) {
    const criteria = [
      options.unread ? 'UNSEEN' : 'ALL',
      'SINCE',
      formatImapDate(options.receivedAfter),
    ].join(' ');
    const result = await this.command(`UID SEARCH ${criteria}`);
    const searchLine = result.text
      .split(CRLF)
      .find((line) => line.startsWith('* SEARCH'));
    return (
      searchLine?.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean) ??
      []
    );
  }

  async fetchMessage(uid: string) {
    const result = await this.command(
      `UID FETCH ${uid} (UID INTERNALDATE BODY.PEEK[])`,
    );
    const internalDate = parseInternalDate(result.text);
    const raw = result.literals[0];
    if (!raw) {
      throw new Error(`Yahoo IMAP did not return message body for UID ${uid}`);
    }
    return parseRawMessage(uid, raw, internalDate);
  }

  private async readGreeting() {
    const greeting = await this.readLine();
    if (!greeting.startsWith('* OK')) {
      throw new Error(
        `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP rejected connection: ${greeting}`,
      );
    }
  }

  private async command(
    command: string,
    options?: {
      authenticationCommand?: boolean;
      continuationResponse?: string;
    },
  ): Promise<ImapCommandResult> {
    this.tagNumber += 1;
    const tag = `A${String(this.tagNumber).padStart(4, '0')}`;
    await this.writer.write(textEncoder.encode(`${tag} ${command}${CRLF}`));
    const textParts: string[] = [];
    const literals: Uint8Array[] = [];

    while (true) {
      const line = await this.readLine();
      textParts.push(line);
      if (line.startsWith('+')) {
        await this.writer.write(
          textEncoder.encode(`${options?.continuationResponse ?? ''}${CRLF}`),
        );
        continue;
      }
      const literalLength = parseLiteralLength(line);
      if (literalLength !== null) {
        literals.push(await this.readBytes(literalLength));
        textParts.push(textDecoder.decode(literals[literals.length - 1]));
        const trailingLine = await this.readLine();
        textParts.push(trailingLine);
      }

      if (line.startsWith(`${tag} `)) {
        if (line.startsWith(`${tag} OK`)) {
          return { text: textParts.join(CRLF), literals };
        }
        if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) {
          if (options?.authenticationCommand) {
            throw new YahooAuthenticationError(
              `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP authentication failed: ${line}`,
            );
          }
          throw new Error(`Yahoo IMAP command failed: ${line}`);
        }
      }
    }
  }

  private async readUntilTag(tag: string) {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      lines.push(line);
      if (line.startsWith(`${tag} `)) {
        return lines.join(CRLF);
      }
    }
  }

  private async readLine() {
    while (true) {
      const index = findCrlf(this.buffer);
      if (index >= 0) {
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 2);
        return textDecoder.decode(line);
      }
      await this.readChunk();
    }
  }

  private async readBytes(length: number) {
    while (this.buffer.byteLength < length) {
      await this.readChunk();
    }
    const bytes = this.buffer.slice(0, length);
    this.buffer = this.buffer.slice(length);
    return bytes;
  }

  private async readChunk() {
    const result = await this.reader.read();
    if (result.done) {
      throw new Error(
        `${this.provider === 'aol' ? 'AOL' : 'Yahoo'} IMAP socket closed unexpectedly`,
      );
    }
    this.buffer = concatBytes(this.buffer, result.value);
  }
}

class SmtpConnection {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer = new Uint8Array();

  private constructor(private readonly socket: Socket) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  static async open(host: string) {
    const socket = connect(
      { hostname: host, port: 465 },
      { secureTransport: 'on', allowHalfOpen: false },
    );
    await socket.opened;
    const connection = new SmtpConnection(socket);
    try {
      await connection.expect([220]);
      return connection;
    } catch (error) {
      await connection.close();
      throw error;
    }
  }

  async close() {
    await this.writer.close().catch(() => undefined);
    await this.socket.close().catch(() => undefined);
  }

  async authenticate(email: string, appPassword: string) {
    await this.command('EHLO supplyflow.app', [250]);
    await this.command('AUTH LOGIN', [334]);
    await this.command(encodeBase64String(email), [334]);
    await this.command(encodeBase64String(appPassword), [235]);
  }

  async send(input: SendReplyInput & { from: string }) {
    await this.command(`MAIL FROM:${formatSmtpAddress(input.from)}`, [250]);
    await this.command(`RCPT TO:${formatSmtpAddress(input.to)}`, [250, 251]);
    await this.command('DATA', [354]);
    const messageId = `<${crypto.randomUUID()}@supplyflow.app>`;
    const body = [
      `From: ${formatSmtpAddress(input.from)}`,
      `To: ${formatSmtpAddress(input.to)}`,
      `Subject: ${encodeMimeHeader(input.subject)}`,
      `Message-ID: ${messageId}`,
      ...(input.originalMessageId
        ? [
            `In-Reply-To: ${input.originalMessageId}`,
            `References: ${input.originalMessageId}`,
          ]
        : []),
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(input.bodyText),
      '.',
      '',
    ].join(CRLF);
    await this.writer.write(textEncoder.encode(body));
    await this.expect([250]);
    await this.command('QUIT', [221]);
  }

  private async command(command: string, expected: number[]) {
    await this.writer.write(textEncoder.encode(`${command}${CRLF}`));
    return await this.expect(expected);
  }

  private async expect(expected: number[]) {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      lines.push(line);
      const match = /^(\d{3})([ -])/.exec(line);
      if (!match || match[2] === '-') {
        continue;
      }
      const code = Number(match[1]);
      if (!expected.includes(code)) {
        throw new Error(`SMTP command failed with status ${code}`);
      }
      return lines.join(CRLF);
    }
  }

  private async readLine() {
    while (true) {
      const text = textDecoder.decode(this.buffer);
      const end = text.indexOf(CRLF);
      if (end >= 0) {
        const line = text.slice(0, end);
        this.buffer = this.buffer.slice(end + CRLF.length);
        return line;
      }
      const { value, done } = await this.reader.read();
      if (done || !value) {
        throw new Error('SMTP server closed the connection');
      }
      this.buffer = concatBytes(this.buffer, value);
    }
  }
}

const formatSmtpAddress = (address: string) => {
  if (/[\r\n<>]/.test(address)) {
    throw new Error('Invalid email address');
  }
  return `<${address}>`;
};

const encodeMimeHeader = (value: string) => {
  if (/[\r\n]/.test(value)) {
    throw new Error('Invalid email subject');
  }
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${encodeBase64String(value)}?=`;
};

const dotStuff = (value: string) =>
  value.replace(/\r?\n/g, CRLF).replace(/(^|\r\n)\./g, '$1..');

const sendYahooReply = async (
  config: YahooClientConfig,
  input: SendReplyInput,
) => {
  if (config.authType !== 'app_password' || !config.appPassword) {
    throw new Error('Yahoo and AOL replies require an app password connection');
  }
  const host =
    config.provider === 'aol' ? 'smtp.aol.com' : 'smtp.mail.yahoo.com';
  const connection = await SmtpConnection.open(host);
  try {
    await connection.authenticate(config.accountEmail, config.appPassword);
    await connection.send({ ...input, from: config.accountEmail });
  } finally {
    await connection.close();
  }
};

const encodeBase64Lines = (bytes: Uint8Array) => {
  const encoded = encodeBase64Bytes(bytes);
  return encoded.match(/.{1,76}/g)?.join(CRLF) ?? '';
};

const createImapDraftMessage = (
  input: CreateDraftEmailInput | CreateDraftReplyInput,
  isReply: boolean,
) => {
  const boundary = `supplyflow-${crypto.randomUUID()}`;
  const headers = [
    `From: ${formatSmtpAddress(input.accountEmail)}`,
    `To: ${formatSmtpAddress(input.to)}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@supplyflow.app>`,
    ...(isReply && 'originalMessageId' in input && input.originalMessageId
      ? [
          `In-Reply-To: ${input.originalMessageId}`,
          `References: ${input.originalMessageId}`,
        ]
      : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.bodyText,
    `--${boundary}`,
    `Content-Type: ${input.attachment.contentType}; name="${input.attachment.filename}"`,
    `Content-Disposition: attachment; filename="${input.attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64Lines(input.attachment.bytes),
    `--${boundary}--`,
    '',
  ];
  return textEncoder.encode(headers.join(CRLF));
};

const saveYahooDraft = async (
  config: YahooClientConfig,
  input: CreateDraftEmailInput | CreateDraftReplyInput,
  isReply: boolean,
  previousDraftId?: string,
) => {
  if (config.authType !== 'app_password' || !config.appPassword) {
    throw new Error('Yahoo and AOL drafts require an app password connection');
  }
  const host = config.provider === 'aol' ? 'imap.aol.com' : YAHOO_IMAP_HOST;
  const connection = await ImapConnection.open(
    host,
    config.provider ?? 'yahoo',
  );
  try {
    await connection.authenticatePassword(
      config.accountEmail,
      config.appPassword,
    );
    const folder = config.provider === 'aol' ? 'Drafts' : 'Draft';
    const rawMessage = createImapDraftMessage(input, isReply);
    const uid = await connection.appendDraft(folder, rawMessage);
    if (previousDraftId) {
      await connection.deleteDraft(folder, previousDraftId);
    }
    return {
      id: uid ?? crypto.randomUUID(),
      url: `https://mail.${config.provider === 'aol' ? 'aol' : 'yahoo'}.com/d/folders/${encodeURIComponent(folder)}`,
      ...(isReply && 'threadId' in input ? { threadId: input.threadId } : {}),
    };
  } finally {
    await connection.close();
  }
};

const findCrlf = (bytes: Uint8Array) => {
  for (let index = 0; index < bytes.byteLength - 1; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10) {
      return index;
    }
  }
  return -1;
};

const parseLiteralLength = (line: string) => {
  const match = line.match(/\{(\d+)\}$/);
  return match ? Number(match[1]) : null;
};

const quoteImapString = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const formatImapDate = (date: Date) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getUTCDate()}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
};

const parseInternalDate = (text: string) => {
  const match = text.match(/INTERNALDATE "([^"]+)"/i);
  return match ? new Date(match[1]) : new Date();
};

const splitHeaderBody = (raw: Uint8Array) => {
  for (let index = 0; index < raw.byteLength - 3; index += 1) {
    const isCrLfCrLf =
      raw[index] === 13 &&
      raw[index + 1] === 10 &&
      raw[index + 2] === 13 &&
      raw[index + 3] === 10;
    if (isCrLfCrLf) {
      return {
        headerBytes: raw.slice(0, index),
        body: raw.slice(index + 4),
      };
    }
  }
  return { headerBytes: raw, body: new Uint8Array() };
};

const parseHeaders = (headerBytes: Uint8Array) => {
  const headers = new Map<string, string>();
  const lines = textDecoder.decode(headerBytes).split(/\r?\n/);
  let currentName: string | null = null;
  for (const line of lines) {
    if (/^\s/.test(line) && currentName) {
      headers.set(
        currentName,
        `${headers.get(currentName) ?? ''} ${line.trim()}`,
      );
      continue;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    currentName = line.slice(0, separatorIndex).toLowerCase();
    headers.set(currentName, line.slice(separatorIndex + 1).trim());
  }
  return headers;
};

const getHeader = (headers: Map<string, string>, name: string) =>
  headers.get(name.toLowerCase()) ?? '';

const parseHeaderParameters = (value: string) => {
  const [type = '', ...parameters] = value.split(';');
  const parsed = new Map<string, string>();
  for (const parameter of parameters) {
    const [rawName, ...rawValue] = parameter.split('=');
    const name = rawName?.trim().toLowerCase();
    const parameterValue = rawValue.join('=').trim().replace(/^"|"$/g, '');
    if (name) {
      parsed.set(name, parameterValue);
    }
  }
  return { value: type.trim().toLowerCase(), parameters: parsed };
};

const parseMimePart = (raw: Uint8Array): MimePart => {
  const { headerBytes, body } = splitHeaderBody(raw);
  const headers = parseHeaders(headerBytes);
  const contentType = parseHeaderParameters(getHeader(headers, 'content-type'));
  const boundary = contentType.parameters.get('boundary');
  const children =
    boundary && contentType.value.startsWith('multipart/')
      ? splitMultipartBody(body, boundary).map(parseMimePart)
      : [];
  return { headers, body, children };
};

const splitMultipartBody = (body: Uint8Array, boundary: string) => {
  const text = textDecoder.decode(body);
  const delimiter = `--${boundary}`;
  const parts: Uint8Array[] = [];
  for (const segment of text.split(delimiter).slice(1)) {
    if (segment.startsWith('--')) {
      break;
    }
    const trimmed = segment.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    if (trimmed) {
      parts.push(textEncoder.encode(trimmed));
    }
  }
  return parts;
};

const decodeTransferBody = (part: MimePart) => {
  const encoding = getHeader(part.headers, 'content-transfer-encoding')
    .toLowerCase()
    .trim();
  if (encoding === 'base64') {
    return decodeBase64Bytes(textDecoder.decode(part.body));
  }
  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(textDecoder.decode(part.body));
  }
  return part.body;
};

const decodeQuotedPrintable = (value: string) => {
  const withoutSoftBreaks = value.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const character = withoutSoftBreaks[index];
    const hex = withoutSoftBreaks.slice(index + 1, index + 3);
    if (character === '=' && /^[0-9a-f]{2}$/i.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }
    bytes.push(character.charCodeAt(0));
  }
  return new Uint8Array(bytes);
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

const decodeMimeHeader = (value: string) =>
  value.replace(
    /=\?([^?]+)\?([bq])\?([^?]+)\?=/gi,
    (_match: string, _charset: string, encoding: string, encoded: string) => {
      if (encoding.toLowerCase() === 'b') {
        return textDecoder.decode(decodeBase64Bytes(encoded));
      }
      return textDecoder.decode(
        decodeQuotedPrintable(encoded.replace(/_/g, ' ')),
      );
    },
  );

const parseAddress = (value: string): EmailAddress => {
  const decoded = decodeMimeHeader(value);
  const match = decoded.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, '').trim() || null,
      address: match[2].trim().toLowerCase(),
    };
  }
  return { name: null, address: decoded.trim().toLowerCase() };
};

const parseAddresses = (value: string) =>
  value
    .split(',')
    .map((address) => parseAddress(address))
    .filter((address) => address.address);

const collectLeafParts = (part: MimePart): MimePart[] =>
  part.children.length > 0 ? part.children.flatMap(collectLeafParts) : [part];

const getFilename = (part: MimePart) => {
  const disposition = parseHeaderParameters(
    getHeader(part.headers, 'content-disposition'),
  );
  const contentType = parseHeaderParameters(
    getHeader(part.headers, 'content-type'),
  );
  return (
    disposition.parameters.get('filename') ??
    contentType.parameters.get('name') ??
    null
  );
};

const parseRawMessage = (
  uid: string,
  raw: Uint8Array,
  receivedAt: Date,
): EmailMessage => {
  const root = parseMimePart(raw);
  const leaves = collectLeafParts(root);
  const textPart = leaves.find(
    (part) =>
      parseHeaderParameters(getHeader(part.headers, 'content-type')).value ===
      'text/plain',
  );
  const htmlPart = leaves.find(
    (part) =>
      parseHeaderParameters(getHeader(part.headers, 'content-type')).value ===
      'text/html',
  );
  const text = textPart
    ? textDecoder.decode(decodeTransferBody(textPart)).trim()
    : htmlPart
      ? stripHtml(textDecoder.decode(decodeTransferBody(htmlPart)))
      : '';
  const attachments: EmailAttachment[] = leaves
    .filter((part) => {
      const contentType = parseHeaderParameters(
        getHeader(part.headers, 'content-type'),
      ).value;
      const filename = getFilename(part);
      return (
        contentType === 'application/pdf' ||
        filename?.toLowerCase().endsWith('.pdf')
      );
    })
    .map((part) => {
      const bytes = decodeTransferBody(part);
      const attachmentBytes = new Uint8Array(bytes.byteLength);
      attachmentBytes.set(bytes);
      return {
        id: crypto.randomUUID(),
        filename: getFilename(part) ?? 'attachment.pdf',
        contentType: 'application/pdf',
        bytes: attachmentBytes.buffer,
      };
    });

  return {
    id: uid,
    threadId: getHeader(root.headers, 'message-id') || null,
    subject:
      decodeMimeHeader(getHeader(root.headers, 'subject')) || '(No subject)',
    from: parseAddress(getHeader(root.headers, 'from')),
    to: parseAddresses(getHeader(root.headers, 'to')),
    receivedAt,
    text: text.slice(0, 60_000),
    attachments,
  };
};

const listYahooMessages = async (
  config: YahooClientConfig,
  options: ListMessagesOptions,
) => {
  const connection = await ImapConnection.open(
    config.imapHost ?? YAHOO_IMAP_HOST,
    config.provider ?? 'yahoo',
  );
  try {
    if (config.authType === 'app_password') {
      if (!config.appPassword) {
        throw new YahooAuthenticationError('IMAP app password is missing.');
      }
      await connection.authenticatePassword(
        config.accountEmail,
        config.appPassword,
      );
    } else {
      const accessToken = await getAccessToken(config);
      await connection.authenticate(config.accountEmail, accessToken);
    }
    await connection.select(options.folder ?? 'INBOX');
    const uids = await connection.search(options);
    const messages: EmailMessage[] = [];
    for (const uid of uids.slice(-options.limit)) {
      messages.push(await connection.fetchMessage(uid));
    }
    return messages
      .filter(
        (message) =>
          message.receivedAt.getTime() >= options.receivedAfter.getTime(),
      )
      .sort(
        (left, right) => left.receivedAt.getTime() - right.receivedAt.getTime(),
      );
  } finally {
    await connection.close();
  }
};

const getYahooMessage = async (config: YahooClientConfig, uid: string) => {
  const host = config.imapHost ?? YAHOO_IMAP_HOST;
  const connection = await ImapConnection.open(
    host,
    config.provider ?? 'yahoo',
  );
  try {
    if (config.authType === 'app_password' && config.appPassword) {
      await connection.authenticatePassword(
        config.accountEmail,
        config.appPassword,
      );
    } else {
      const accessToken = await getAccessToken(config);
      await connection.authenticate(config.accountEmail, accessToken);
    }
    await connection.select(config.imapFolder || 'INBOX');
    return await connection.fetchMessage(uid);
  } finally {
    await connection.close();
  }
};

export const verifyYahooImapCredentials = async (input: {
  provider: 'yahoo' | 'aol';
  email: string;
  appPassword: string;
}) => {
  const imapHost = input.provider === 'aol' ? 'imap.aol.com' : YAHOO_IMAP_HOST;
  const connection = await ImapConnection.open(imapHost, input.provider);
  try {
    await connection.authenticatePassword(input.email, input.appPassword);
  } finally {
    await connection.close();
  }
};

export const createYahooClient = (config: YahooClientConfig): EmailClient => ({
  provider: config.provider ?? 'yahoo',
  async listMessages(options) {
    return await listYahooMessages(config, options);
  },
  async getMessage(id) {
    return await getYahooMessage(config, id);
  },
  async sendReply(input) {
    await sendYahooReply(config, input);
  },
  async createDraftReply(input) {
    return await saveYahooDraft(config, input, true);
  },
  async createDraftEmail(input) {
    return await saveYahooDraft(config, input, false);
  },
  async updateDraftReply(input: UpdateDraftReplyInput) {
    return await saveYahooDraft(config, input, true, input.draftId);
  },
});

export const createAolClient = (config: YahooClientConfig): EmailClient =>
  createYahooClient({
    ...config,
    provider: 'aol',
    authorizationUrl: 'https://api.login.aol.com/oauth2/request_auth',
    tokenUrl: 'https://api.login.aol.com/oauth2/get_token',
    userinfoUrl: 'https://api.login.aol.com/openid/v1/userinfo',
    imapHost: 'imap.aol.com',
  });
