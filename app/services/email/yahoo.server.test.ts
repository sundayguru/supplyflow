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

it.each([
  { provider: 'yahoo', filename: "filename*=UTF-8''customer%20order.pdf" },
  { provider: 'aol', filename: "filename*=UTF-8''customer%20order.pdf" },
  {
    provider: 'yahoo',
    filename: "filename*0*=UTF-8''customer%20; filename*1*=order.pdf",
  },
  {
    provider: 'aol',
    filename: "filename*0*=UTF-8''customer%20; filename*1*=order.pdf",
  },
] as const)(
  'preserves binary PDF attachment bytes and encoded filenames for $provider',
  async ({ provider, filename }) => {
    const pdf = new Uint8Array([
      37,
      80,
      68,
      70,
      45,
      49,
      46,
      55,
      10,
      255,
      128,
      0,
      ...encoder.encode('\n--order-boundary-not-a-delimiter\n'),
      13,
    ]);
    const prefix = encoder.encode(
      'From: buyer@example.com\r\nSubject: Order\r\nContent-Type: multipart/mixed; boundary="order-boundary"\r\n\r\n' +
        '--order-boundary\r\nContent-Type: text/plain\r\n\r\nPlease see the PO.\r\n' +
        '--order-boundary\r\nContent-Type: application/octet-stream\r\n' +
        `Content-Disposition: attachment; ${filename}\r\n` +
        'Content-Transfer-Encoding: binary\r\n\r\n',
    );
    const suffix = encoder.encode('\r\n--order-boundary--\r\n');
    const message = new Uint8Array(prefix.length + pdf.length + suffix.length);
    message.set(prefix);
    message.set(pdf, prefix.length);
    message.set(suffix, prefix.length + pdf.length);

    let controller: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
        controller.enqueue(encoder.encode('* OK IMAP ready\r\n'));
      },
    });
    const writable = new WritableStream<Uint8Array>({
      write(bytes) {
        const command = decoder.decode(bytes);
        const tag = command.split(' ')[0];
        if (command.includes(' UID FETCH ')) {
          controller.enqueue(
            encoder.encode(
              `* 1 FETCH (UID 7 INTERNALDATE "01-Nov-2026 10:01:00 +0000" BODY[] {${message.length}}\r\n`,
            ),
          );
          controller.enqueue(message);
          controller.enqueue(
            encoder.encode(`)\r\n${tag} OK FETCH completed\r\n`),
          );
        } else {
          controller.enqueue(encoder.encode(`${tag} OK completed\r\n`));
        }
      },
    });
    vi.mocked(connect).mockReturnValue({
      opened: Promise.resolve(),
      readable,
      writable,
      close: () => Promise.resolve(),
    } as unknown as ReturnType<typeof connect>);

    const client = createYahooClient({
      provider,
      accountEmail: 'seller@example.com',
      authType: 'app_password',
      appPassword: 'password',
      ...(provider === 'aol' ? { imapHost: 'imap.aol.com' } : {}),
    });
    const result = await client.getMessage!('7');

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe('customer order.pdf');
    expect(new Uint8Array(result.attachments[0].bytes)).toEqual(pdf);
  },
);
