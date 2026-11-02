// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import type { ScheduledMailbox } from '~/services/email-schedule.server';

const mocks = vi.hoisted(() => ({
  listAwaiting: vi.fn(),
  getVendorPo: vi.fn(),
  getAttempt: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  findAcknowledgement: vi.fn(),
  createAcknowledgement: vi.fn(),
  markAcknowledged: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('~/db/connectedEmailAccounts', () => ({
  markConnectedEmailAccountNeedsReconnect: vi.fn(),
}));
vi.mock('~/db/emailIngestion', () => ({
  getEmailIngestionAttempt: mocks.getAttempt,
  claimEmail: mocks.claim,
  completeEmailIngestion: mocks.complete,
  failEmailIngestion: mocks.fail,
}));
vi.mock('~/db/vendorPurchaseOrders', () => ({
  getVendorPurchaseOrder: mocks.getVendorPo,
}));
vi.mock('~/db/vendorPurchaseOrderAcknowledgementSync', () => ({
  listSentVendorPurchaseOrdersAwaitingAcknowledgement: mocks.listAwaiting,
}));
vi.mock('~/db/vendorPurchaseOrderAcknowledgements', () => ({
  getVendorPurchaseOrderAcknowledgementBySourceEmail: mocks.findAcknowledgement,
  createVendorPurchaseOrderAcknowledgement: mocks.createAcknowledgement,
  markVendorPurchaseOrderAcknowledged: mocks.markAcknowledged,
}));
vi.mock('~/services/email-classification.server', () => ({
  shouldSkipStoredEmail: () => false,
}));
vi.mock('~/services/email/gmail.server', () => ({
  isGmailAuthenticationError: () => false,
}));
vi.mock('~/db/notifications', () => ({
  notifyOrganizationMembers: mocks.notify,
}));

import { runVendorPurchaseOrderAcknowledgementSync } from './vendor-purchase-order-acknowledgement-ingestion.server';

const item = {
  vendorPurchaseOrderItemId: null,
  quantity: 3,
  price: 1250,
  unit: 'piece',
  description: 'Motor A-42',
  manufacturerPartNumber: 'A-42',
  deliveryDate: '2026-12-01',
  status: 'pending',
  notes: 'Backordered',
};

const mailbox = (accountId: string) =>
  ({
    account: { id: accountId, email: 'seller@example.com' },
    emailClient: { provider: 'yahoo' },
    classification: {
      vendorAcknowledgements: [
        {
          message: {
            id: 'message',
            threadId: '<yahoo-reply@example.com>',
            subject: 'Confirmation attached',
            text: 'Please see attached.',
          },
          extraction: {
            searchText: 'Vendor acknowledgement\nVPO-2026-ABC123',
            pdfText: 'Vendor acknowledgement\nVPO-2026-ABC123',
            result: {
              isAcknowledgement: true,
              vendorPurchaseOrderReference: null,
              acknowledgement: { status: 'received', items: [item] },
            },
          },
        },
      ],
    },
  }) as unknown as ScheduledMailbox;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.listAwaiting.mockResolvedValue([
    {
      vendorPurchaseOrderId: 'vendor-po',
      organizationId: 'org',
      userId: 'user',
      accountId: 'account',
      reference: 'VPO-2026-ABC123',
      threadId: null,
    },
  ]);
  mocks.getAttempt.mockResolvedValue(null);
  mocks.claim.mockResolvedValue('ingestion');
  mocks.findAcknowledgement.mockResolvedValue(null);
  mocks.getVendorPo.mockResolvedValue({
    id: 'vendor-po',
    items: [
      {
        id: 'vendor-item',
        quantity: 7,
        price: 1250,
        unit: 'piece',
        description: 'Motor A-42',
        manufacturerPartNumber: 'A-42',
      },
    ],
  });
  mocks.createAcknowledgement.mockResolvedValue({
    id: 'ack',
    reference: 'ACK-1',
  });
  mocks.markAcknowledged.mockResolvedValue(undefined);
  mocks.notify.mockResolvedValue(undefined);
  mocks.complete.mockResolvedValue(undefined);
});

it('links a PDF-only reference and preserves its acknowledgement item details', async () => {
  const result = await runVendorPurchaseOrderAcknowledgementSync([
    mailbox('account'),
  ]);

  expect(result.created).toBe(1);
  expect(mocks.createAcknowledgement).toHaveBeenCalledWith(
    'org',
    'user',
    expect.objectContaining({
      vendorPurchaseOrderId: 'vendor-po',
      items: [{ ...item, vendorPurchaseOrderItemId: 'vendor-item' }],
    }),
    { sourceEmailIngestionId: 'ingestion' },
  );
});

it('does not link a matching PDF reference across email accounts', async () => {
  const result = await runVendorPurchaseOrderAcknowledgementSync([
    mailbox('other-account'),
  ]);

  expect(result.skipped).toBe(1);
  expect(mocks.createAcknowledgement).not.toHaveBeenCalled();
});

it('links the VPO named in the PDF instead of a different email thread', async () => {
  mocks.listAwaiting.mockResolvedValue([
    {
      vendorPurchaseOrderId: 'thread-po',
      organizationId: 'org',
      userId: 'user',
      accountId: 'account',
      reference: 'VPO-2026-DEF456',
      threadId: '<yahoo-reply@example.com>',
    },
    {
      vendorPurchaseOrderId: 'pdf-po',
      organizationId: 'org',
      userId: 'user',
      accountId: 'account',
      reference: 'VPO-2026-ABC123',
      threadId: null,
    },
  ]);
  mocks.getVendorPo.mockResolvedValue({ id: 'pdf-po', items: [] });

  await runVendorPurchaseOrderAcknowledgementSync([mailbox('account')]);

  expect(mocks.getVendorPo).toHaveBeenCalledWith('pdf-po', 'org');
  expect(mocks.createAcknowledgement).toHaveBeenCalledWith(
    'org',
    'user',
    expect.objectContaining({ vendorPurchaseOrderId: 'pdf-po' }),
    { sourceEmailIngestionId: 'ingestion' },
  );
});

it('does not attach an unmatched PDF reference to an email thread', async () => {
  mocks.listAwaiting.mockResolvedValue([
    {
      vendorPurchaseOrderId: 'thread-po',
      organizationId: 'org',
      userId: 'user',
      accountId: 'account',
      reference: 'VPO-2026-DEF456',
      threadId: '<yahoo-reply@example.com>',
    },
  ]);

  const result = await runVendorPurchaseOrderAcknowledgementSync([
    mailbox('account'),
  ]);

  expect(result.skipped).toBe(1);
  expect(mocks.createAcknowledgement).not.toHaveBeenCalled();
});
