import type { EmailMessage } from '~/services/email/types';
import {
  buildPdfContextMessage,
  isPdfAttachment,
} from '~/utils/emailPdf.server';
import { extractPdfText } from '~/utils/rfqPdfExtraction.server';
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
): Promise<ExtractedMessagePurchaseOrder | null> => {
  let truncatedPdf: string | null = null;
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const file = new File([attachment.bytes], attachment.filename, {
      type: 'application/pdf',
    });
    const { text, truncated } = await extractPdfText(file, attachment.bytes);
    const pdfMessage = buildPdfContextMessage(message, attachment, text);
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
