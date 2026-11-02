// @vitest-environment node
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '~/services/email/types';
import type { PurchaseOrderInput } from '~/types/purchaseOrder';
import * as pdfExtraction from '~/utils/rfqPdfExtraction.server';
import { extractMessagePurchaseOrder } from './message.server';
import { parsePurchaseOrderExtractionResponse } from './shared.server';
import type { PurchaseOrderExtractionResult } from './types';

if (!('try' in Promise)) {
  Object.defineProperty(Promise, 'try', {
    configurable: true,
    value: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) =>
      Promise.resolve().then(() => callback(...args)),
  });
}

const purchaseOrder: PurchaseOrderInput = {
  supplierName: 'Buyer',
  supplierEmail: 'buyer@example.com',
  status: 'new',
  orderDate: null,
  expectedDate: null,
  applyVat: false,
  currency: 'EUR',
  templateId: null,
  incoterms: null,
  deliveryTerms: null,
  rfqId: null,
  notes: null,
  items: [
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
    {
      quantity: 2.5,
      price: 329,
      unit: 'metre',
      description: 'Cable B-10',
      status: 'ordered',
      manufacturerId: null,
      manufacturerPartNumber: 'B-10',
      specifications: '3 x 2.5 mm',
    },
  ],
};

const extracted = (
  items = purchaseOrder.items,
): PurchaseOrderExtractionResult => ({
  isPurchaseOrder: true,
  confidence: 1,
  reason: 'Purchase order',
  rfqReference: null,
  purchaseOrder: { ...purchaseOrder, items },
});

const createMessage = async (): Promise<EmailMessage> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(
    'PURCHASE ORDER\n7 piece Motor A-42 230 V EUR 12.50\n2.5 metre Cable B-10 3 x 2.5 mm EUR 3.29',
    {
      x: 40,
      y: 700,
      font,
    },
  );
  const bytes = new Uint8Array(await pdf.save());
  return {
    id: 'message',
    threadId: null,
    subject: 'Quote accepted',
    from: { name: 'Buyer', address: 'buyer@example.com' },
    to: [],
    receivedAt: new Date('2026-11-01T10:00:00Z'),
    text: 'Please proceed with the quoted items.',
    attachments: [
      {
        id: 'pdf',
        filename: 'order.pdf',
        contentType: 'application/pdf',
        bytes: bytes.buffer,
      },
    ],
  };
};

describe('purchase order message extraction', () => {
  it('extracts the attached PDF before an accepting email body', async () => {
    const message = await createMessage();
    const extract = vi.fn((input: EmailMessage) => {
      expect(input.text).toContain('PURCHASE ORDER');
      expect(input.text).toContain('PURCHASE ORDER\n');
      expect(input.text).toContain('Motor A-42');
      return Promise.resolve(
        parsePurchaseOrderExtractionResponse(
          JSON.stringify({
            isPurchaseOrder: true,
            confidence: 1,
            reason: 'Purchase order',
            purchaseOrder,
          }),
          input,
        ),
      );
    });

    const result = await extractMessagePurchaseOrder(message, { extract });
    expect(result?.result.purchaseOrder.items).toEqual(purchaseOrder.items);
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('uses the email when the attached PDF is not a purchase order', async () => {
    const message = await createMessage();
    const extract = vi
      .fn()
      .mockResolvedValueOnce({
        isPurchaseOrder: false,
        confidence: 1,
        reason: 'Not a PO',
      })
      .mockResolvedValueOnce(extracted([]));

    const result = await extractMessagePurchaseOrder(message, { extract });
    expect(result?.result.purchaseOrder.items).toEqual([]);
    expect(extract).toHaveBeenLastCalledWith(message);
  });

  it('does not replace an itemless PO PDF with email or quoted items', async () => {
    const message = await createMessage();
    const extract = vi.fn().mockResolvedValue(extracted([]));

    await expect(
      extractMessagePurchaseOrder(message, { extract }),
    ).rejects.toThrow('contains no extracted line items');
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('rejects a PO when the extracted PDF text was truncated', async () => {
    const message = await createMessage();
    const pdf = vi
      .spyOn(pdfExtraction, 'extractPdfText')
      .mockResolvedValueOnce({
        text: 'PURCHASE ORDER\n7 Motor A-42',
        truncated: true,
      });
    const extract = vi.fn().mockResolvedValue(extracted());

    await expect(
      extractMessagePurchaseOrder(message, { extract }),
    ).rejects.toThrow('too long to extract all line items');
    pdf.mockRestore();
  });

  it('does not use email acceptance when an attached PDF was truncated', async () => {
    const message = await createMessage();
    const pdf = vi
      .spyOn(pdfExtraction, 'extractPdfText')
      .mockResolvedValueOnce({
        text: 'Incomplete document',
        truncated: true,
      });
    const extract = vi
      .fn()
      .mockResolvedValueOnce({
        isPurchaseOrder: false,
        confidence: 1,
        reason: 'Not a PO',
      })
      .mockResolvedValueOnce(extracted([]));

    await expect(
      extractMessagePurchaseOrder(message, { extract }),
    ).rejects.toThrow(
      'too long to rule out additional purchase order line items',
    );
    pdf.mockRestore();
  });
});
