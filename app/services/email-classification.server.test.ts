// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { claimEmail, failEmailIngestion } from '~/db/emailIngestion';
import type { SelectConnectedEmailAccount } from '~/db/schemas';
import type { EmailMessage } from '~/services/email/types';
import { extractPdfText } from '~/utils/rfqPdfExtraction.server';

const mocks = vi.hoisted(() => ({
  extractPurchaseOrder: vi.fn(),
  extractRfq: vi.fn(),
  extractAcknowledgement: vi.fn(),
}));

vi.mock('~/db/emailIngestion', () => ({
  getEmailIngestionAttempt: vi.fn().mockResolvedValue(null),
  claimEmail: vi.fn().mockResolvedValue('ingestion'),
  failEmailIngestion: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~/services/purchase-order-extraction/index.server', () => ({
  createPurchaseOrderExtractor: () => ({ extract: mocks.extractPurchaseOrder }),
}));
vi.mock('~/services/rfq-extraction/index.server', () => ({
  createRfqExtractor: () => ({ extract: mocks.extractRfq }),
}));
vi.mock(
  '~/services/vendor-purchase-order-acknowledgement-extraction/index.server',
  () => ({
    createVendorPurchaseOrderAcknowledgementExtractor: () => ({
      extract: mocks.extractAcknowledgement,
    }),
  }),
);
vi.mock('~/utils/organization-ai.server', () => ({
  getOpenAICompatibleAiConfig: () => ({}),
}));
vi.mock('~/utils/rfqPdfExtraction.server', () => ({
  extractRfqPdfText: vi.fn().mockResolvedValue('PURCHASE ORDER\n7 Motor A-42'),
  extractPdfText: vi.fn().mockResolvedValue({
    text: 'PURCHASE ORDER\n7 Motor A-42',
    truncated: false,
  }),
}));

import { classifyMailboxMessages } from './email-classification.server';

beforeEach(() => {
  vi.clearAllMocks();
});

it('detects a PO PDF before an RFQ when the email subject is generic', async () => {
  const items = [
    {
      quantity: 7,
      price: 1250,
      unit: 'piece',
      description: 'Motor A-42',
      status: 'ordered',
      manufacturerId: null,
      manufacturerPartNumber: 'A-42',
      specifications: '230 V',
    },
  ];
  mocks.extractPurchaseOrder.mockResolvedValue({
    isPurchaseOrder: true,
    confidence: 1,
    reason: 'Purchase order',
    rfqReference: null,
    purchaseOrder: { items },
  });
  const message: EmailMessage = {
    id: 'message',
    threadId: null,
    subject: 'Please see attached',
    from: { name: 'Buyer', address: 'buyer@example.com' },
    to: [],
    receivedAt: new Date('2026-11-01T10:00:00Z'),
    text: 'Please process the attached document.',
    attachments: [
      {
        id: 'pdf',
        filename: 'order.pdf',
        contentType: 'application/pdf',
        bytes: new ArrayBuffer(1),
      },
    ],
  };

  const result = await classifyMailboxMessages({
    account: {
      id: 'account',
      userId: 'user',
      email: 'seller@example.com',
      provider: 'yahoo',
    } as SelectConnectedEmailAccount,
    organization: { id: 'org', priceMarkup: 0, currency: 'EUR' },
    messages: [message],
    env: {} as Env,
    awaitingVendorAcknowledgements: [],
  });

  expect(result.purchaseOrders).toHaveLength(1);
  expect(
    result.purchaseOrders[0].extraction.result.purchaseOrder.items,
  ).toEqual(items);
  expect(mocks.extractRfq).not.toHaveBeenCalled();
});

it('records an unreadable AOL attachment as a failed ingestion', async () => {
  vi.mocked(extractPdfText).mockRejectedValueOnce(
    new Error('No readable text was found in this PDF'),
  );
  const message: EmailMessage = {
    id: 'message',
    threadId: null,
    subject: 'Purchase order',
    from: { name: 'Buyer', address: 'buyer@example.com' },
    to: [],
    receivedAt: new Date('2026-11-01T10:00:00Z'),
    text: 'Please see the attached purchase order.',
    attachments: [
      {
        id: 'pdf',
        filename: 'order.pdf',
        contentType: 'application/pdf',
        bytes: new ArrayBuffer(1),
      },
    ],
  };

  const result = await classifyMailboxMessages({
    account: {
      id: 'account',
      userId: 'user',
      email: 'seller@example.com',
      provider: 'aol',
    } as SelectConnectedEmailAccount,
    organization: { id: 'org', priceMarkup: 0, currency: 'EUR' },
    messages: [message],
    env: {} as Env,
    awaitingVendorAcknowledgements: [],
  });

  expect(result.failed).toBe(1);
  expect(result.purchaseOrders).toHaveLength(0);
  expect(claimEmail).toHaveBeenCalledWith('account', 'aol', message);
  expect(failEmailIngestion).toHaveBeenCalledWith(
    'ingestion',
    expect.any(Error),
  );
});
