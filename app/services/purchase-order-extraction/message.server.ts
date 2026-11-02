import type { EmailMessage } from '~/services/email/types';
import {
  createEmailPdfContextLoader,
  isPdfAttachment,
  type EmailPdfContextLoader,
} from '~/utils/emailPdf.server';
import type {
  PurchaseOrderExtractionResult,
  PurchaseOrderExtractor,
} from './types';

export type ExtractedMessagePurchaseOrder = {
  result: Extract<PurchaseOrderExtractionResult, { isPurchaseOrder: true }>;
  searchText: string;
};

export const extractMessagePurchaseOrder = async (
  message: EmailMessage,
  extractor: PurchaseOrderExtractor,
  loadPdfContext: EmailPdfContextLoader = createEmailPdfContextLoader(message),
): Promise<ExtractedMessagePurchaseOrder | null> => {
  let truncatedPdf: string | null = null;
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const { message: pdfMessage, truncated } = await loadPdfContext(attachment);
    const result = await extractor.extract(pdfMessage);
    if (result.isPurchaseOrder) {
      if (truncated) {
        throw new Error(
          `Purchase order PDF "${attachment.filename}" is too long to extract all line items`,
        );
      }
      if (result.purchaseOrder.items.length === 0) {
        throw new Error(
          `Purchase order PDF "${attachment.filename}" contains no extracted line items`,
        );
      }
      return { result, searchText: pdfMessage.text };
    }
    if (truncated) {
      truncatedPdf = attachment.filename;
    }
  }

  const result = await extractor.extract(message);
  if (result.isPurchaseOrder && truncatedPdf) {
    throw new Error(
      `PDF "${truncatedPdf}" is too long to rule out additional purchase order line items`,
    );
  }
  return result.isPurchaseOrder
    ? { result, searchText: `${message.subject}\n${message.text}` }
    : null;
};
