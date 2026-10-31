// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { connect } from 'cloudflare:sockets';
import { createYahooClient } from './yahoo.server';

vi.mock('cloudflare:sockets', () => ({ connect: vi.fn() }));

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const mockImap = (rejectSelect = false, rejectRecipientSearch = false) => {
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      controller.enqueue(encoder.encode('* OK IMAP ready\r\n'));
    },
  });
  const writable = new WritableStream<Uint8Array>({
    write(bytes) {
      const command = decoder.decode(bytes).trim();
      const tag = command.split(' ')[0];
      let response: string;
      if (command.includes(' LIST ')) {
        response = `* LIST (\\Sent) "/" "Sent"\r\n${tag} OK LIST completed\r\n`;
      } else if (command.includes(' SELECT ') && rejectSelect) {
        response = `${tag} NO mailbox unavailable\r\n`;
      } else if (
        command.includes(' UID SEARCH ') &&
        command.includes(' HEADER ')
      ) {
        response = `${tag} BAD unsupported header search\r\n`;
      } else if (command.includes(' UID SEARCH ') && command.includes(' TO ')) {
        response = rejectRecipientSearch
          ? `${tag} BAD unsupported recipient search\r\n`
          : `* SEARCH 42\r\n${tag} OK SEARCH completed\r\n`;
      } else if (command.includes(' UID SEARCH ALL SINCE ')) {
        response = `* SEARCH 42\r\n${tag} OK SEARCH completed\r\n`;
      } else if (command.includes(' UID FETCH ')) {
        const headers = 'To: buyer@example.com\r\nSubject: Re: Quote\r\n\r\n';
        response = `* 1 FETCH (UID 42 INTERNALDATE "01-Nov-2026 10:01:00 +0000" BODY[HEADER] {${encoder.encode(headers).length}}\r\n${headers})\r\n${tag} OK FETCH completed\r\n`;
      } else {
        response = `${tag} OK completed\r\n`;
      }
      streamController.enqueue(encoder.encode(response));
    },
  });
  return {
    opened: Promise.resolve(),
    readable,
    writable,
    close: () => Promise.resolve(),
  } as unknown as ReturnType<typeof connect>;
};

beforeEach(() => {
  vi.mocked(connect).mockReset();
});

it('scans sent headers when Yahoo rejects both header and recipient searches', async () => {
  vi.mocked(connect).mockReturnValue(mockImap(false, true));
  const client = createYahooClient({
    accountEmail: 'seller@example.com',
    authType: 'app_password',
    appPassword: 'password',
  });

  await expect(
    client.isDraftSent!({
      draftId: '7',
      threadId: '<original@example.com>',
      trackingId: 'rfq-id',
      recipient: 'buyer@example.com',
      subject: 'Quote',
      sentAfter: new Date('2026-11-01T10:00:00Z'),
    }),
  ).resolves.toBe(true);
});

it('finds a sent reply by recipient when header searches are rejected', async () => {
  vi.mocked(connect).mockReturnValue(mockImap());
  const client = createYahooClient({
    accountEmail: 'seller@example.com',
    authType: 'app_password',
    appPassword: 'password',
  });

  await expect(
    client.isDraftSent!({
      draftId: '7',
      threadId: '<original@example.com>',
      trackingId: 'rfq-id',
      recipient: 'buyer@example.com',
      subject: 'Quote',
      sentAfter: new Date('2026-11-01T10:00:00Z'),
    }),
  ).resolves.toBe(true);
});

it('reports a failed Sent mailbox selection instead of treating it as unmatched', async () => {
  vi.mocked(connect).mockReturnValue(mockImap(true));
  const client = createYahooClient({
    provider: 'aol',
    accountEmail: 'seller@example.com',
    authType: 'app_password',
    appPassword: 'password',
  });

  await expect(
    client.isDraftSent!({
      draftId: '7',
      threadId: '<original@example.com>',
      sentAfter: new Date('2026-11-01T10:00:00Z'),
    }),
  ).rejects.toThrow('mailbox unavailable');
});
