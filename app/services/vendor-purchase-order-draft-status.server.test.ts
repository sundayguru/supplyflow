// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import type { ScheduledMailbox } from '~/services/email-schedule.server';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  markSent: vi.fn(),
  reconnect: vi.fn(),
}));

vi.mock('~/db/vendorPurchaseOrderDraftStatus', () => ({
  listVendorPurchaseOrdersWithDraftedEmails: mocks.list,
  markVendorPurchaseOrderDraftSent: mocks.markSent,
}));
vi.mock('~/db/connectedEmailAccounts', () => ({
  markConnectedEmailAccountNeedsReconnect: mocks.reconnect,
}));
vi.mock('~/services/email-schedule.server', () => ({
  indexMailboxesByAccountId: (mailboxes: ScheduledMailbox[]) =>
    new Map(mailboxes.map((mailbox) => [mailbox.account.id, mailbox])),
  isEmailAuthenticationError: () => false,
}));

import { runVendorPurchaseOrderDraftSentStatusSync } from './vendor-purchase-order-draft-status.server';

beforeEach(() => {
  vi.resetAllMocks();
});

it.each(['yahoo', 'aol'] as const)(
  'checks sent vendor drafts for %s so acknowledgements become eligible',
  async (provider) => {
    mocks.list.mockResolvedValue([
      {
        vendorPurchaseOrderId: 'vendor-po',
        reference: 'VPO-2026-ABC123',
        vendorEmail: 'vendor@example.com',
        draftId: '42',
        draftUpdatedAt: '2026-11-01T10:00:00Z',
        vendorPurchaseOrderUpdatedAt: '2026-11-01T10:00:00Z',
        threadId: null,
        accountId: 'account',
        accountProvider: provider,
        accountEmail: 'seller@example.com',
      },
    ]);
    mocks.markSent.mockResolvedValue({ id: 'vendor-po' });
    const isDraftSent = vi.fn().mockResolvedValue(true);
    const mailbox = {
      account: { id: 'account' },
      emailClient: { provider, isDraftSent },
    } as unknown as ScheduledMailbox;

    const result = await runVendorPurchaseOrderDraftSentStatusSync([mailbox]);

    expect(isDraftSent).toHaveBeenCalledWith({
      draftId: '42',
      threadId: null,
      trackingId: 'vendor-po',
      recipient: 'vendor@example.com',
      subject: 'Purchase order VPO-2026-ABC123',
      sentAfter: new Date('2026-11-01T09:59:00Z'),
    });
    expect(mocks.markSent).toHaveBeenCalledWith('vendor-po', '42');
    expect(result.sent).toBe(1);
  },
);
