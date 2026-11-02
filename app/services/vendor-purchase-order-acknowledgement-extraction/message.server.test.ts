// @vitest-environment node
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expect, it, vi } from 'vitest';
import type { EmailMessage } from '~/services/email/types';
import * as pdfExtraction from '~/utils/rfqPdfExtraction.server';
import { extractMessageVendorPurchaseOrderAcknowledgement } from './message.server';
import { parseVendorPurchaseOrderAcknowledgementExtractionResponse } from './shared.server';

if (!('try' in Promise)) {
  Object.defineProperty(Promise, 'try', {
    configurable: true,
    value: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) =>
      Promise.resolve().then(() => callback(...args)),
  });
}

const acknowledgement = {
  acknowledgementReference: 'CONF-42',
  status: 'received',
  acknowledgedAt: '2026-11-01',
  notes: null,
  items: [
    {
      vendorPurchaseOrderItemId: null,
      quantity: 3,
      price: 1250,
      unit: 'piece',
      description: 'Motor A-42',
      manufacturerPartNumber: 'A-42',
      deliveryDate: '2026-12-01',
      status: 'pending',
      statusReason: null,
      notes: 'Backordered',
    },
  ],
};

const createMessage = async (): Promise<EmailMessage> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(
    'ORDER CONFIRMATION VPO-2026-ABC123\n3 piece Motor A-42 EUR 12.50\nBackordered - delivery 2026-12-01',
    { x: 40, y: 700, font },
  );
  const bytes = new Uint8Array(await pdf.save());
  return {
    id: 'message',
    threadId: null,
    subject: 'Re: Purchase order VPO-2026-ABC123',
    from: { name: 'Vendor', address: 'vendor@example.com' },
    to: [],
    receivedAt: new Date('2026-11-01T10:00:00Z'),
    text: 'Confirmed. Please see the attached confirmation.',
    attachments: [
      {
        id: 'pdf',
        filename: 'confirmation.pdf',
        contentType: 'application/pdf',
        bytes: bytes.buffer,
      },
    ],
  };
};

it('uses the PDF items and delivery details before the email acknowledgement', async () => {
  const message = await createMessage();
  const extract = vi.fn((input: EmailMessage) => {
    expect(input.text).toContain('ORDER CONFIRMATION VPO-2026-ABC123\n');
    expect(input.text).toContain('Backordered - delivery 2026-12-01');
    return Promise.resolve(
      parseVendorPurchaseOrderAcknowledgementExtractionResponse(
        JSON.stringify({
          isAcknowledgement: true,
          confidence: 1,
          reason: 'Vendor confirmation',
          vendorPurchaseOrderReference: 'VPO-2026-ABC123',
          acknowledgement,
        }),
      ),
    );
  });

  const result = await extractMessageVendorPurchaseOrderAcknowledgement(
    message,
    {
      extract,
    },
  );
  expect(result?.result.acknowledgement.items).toEqual(acknowledgement.items);
  expect(extract).toHaveBeenCalledTimes(1);
});

it('does not substitute vendor PO items for an itemless acknowledgement PDF', async () => {
  const message = await createMessage();
  const extract = vi.fn().mockResolvedValue({
    isAcknowledgement: true,
    confidence: 1,
    reason: 'Vendor confirmation',
    vendorPurchaseOrderReference: 'VPO-2026-ABC123',
    acknowledgement: { ...acknowledgement, items: [] },
  });

  await expect(
    extractMessageVendorPurchaseOrderAcknowledgement(message, { extract }),
  ).rejects.toThrow('contains no extracted line items');
  expect(extract).toHaveBeenCalledTimes(1);
});

it('does not accept a truncated acknowledgement PDF as a complete document', async () => {
  const message = await createMessage();
  const pdf = vi.spyOn(pdfExtraction, 'extractPdfText').mockResolvedValueOnce({
    text: 'ORDER CONFIRMATION VPO-2026-ABC123',
    truncated: true,
  });
  const extract = vi.fn().mockResolvedValue({
    isAcknowledgement: true,
    confidence: 1,
    reason: 'Vendor confirmation',
    vendorPurchaseOrderReference: 'VPO-2026-ABC123',
    acknowledgement,
  });

  await expect(
    extractMessageVendorPurchaseOrderAcknowledgement(message, { extract }),
  ).rejects.toThrow('too long to extract all line items');
  pdf.mockRestore();
});

it('retains email-only general acknowledgements when no PDF is attached', async () => {
  const message = { ...(await createMessage()), attachments: [] };
  const extract = vi.fn().mockResolvedValue({
    isAcknowledgement: true,
    confidence: 1,
    reason: 'General confirmation',
    vendorPurchaseOrderReference: 'VPO-2026-ABC123',
    acknowledgement: { ...acknowledgement, items: [] },
  });

  const result = await extractMessageVendorPurchaseOrderAcknowledgement(
    message,
    {
      extract,
    },
  );
  expect(result?.result.acknowledgement.items).toEqual([]);
  expect(extract).toHaveBeenCalledWith(message);
});

it('uses the email when an attached PDF is not an acknowledgement', async () => {
  const message = await createMessage();
  const extract = vi
    .fn()
    .mockResolvedValueOnce({
      isAcknowledgement: false,
      confidence: 1,
      reason: 'Original purchase order',
    })
    .mockResolvedValueOnce({
      isAcknowledgement: true,
      confidence: 1,
      reason: 'General confirmation',
      vendorPurchaseOrderReference: 'VPO-2026-ABC123',
      acknowledgement: { ...acknowledgement, items: [] },
    });

  const result = await extractMessageVendorPurchaseOrderAcknowledgement(
    message,
    {
      extract,
    },
  );
  expect(result?.result.acknowledgement.items).toEqual([]);
  expect(extract).toHaveBeenLastCalledWith(message);
});
