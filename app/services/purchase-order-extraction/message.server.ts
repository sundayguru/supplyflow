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

const pdfShowsChargedVat = (text: string) =>
  text.split(/\r?\n/).some((line) => {
    if (!/\b(?:vat|sales\s+tax|value[ -]added\s+tax)\b/i.test(line)) {
      return false;
    }
    if (
      /\b(?:exempt|tax[ -]?free|zero[ -]?rated|excluded|not\s+included|registration|reg\.?|number|no\.?|id)\b/i.test(
        line,
      )
    ) {
      return false;
    }
    if (/\b(?:included|inclusive)\b/i.test(line)) {
      return !/\b0(?:[.,]0+)?\s*%/.test(line);
    }
    const rate = line.match(/\b(\d+(?:[.,]\d+)?)\s*%/);
    if (rate) {
      return Number(rate[1].replace(',', '.')) > 0;
    }
    const amount = line.match(
      /\b(?:vat|sales\s+tax|value[ -]added\s+tax)\b\s*[:=]?\s*(?:[$€£]\s*)?(\d+(?:[.,]\d+)?)/i,
    );
    return !!amount && Number(amount[1].replace(',', '.')) > 0;
  });

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
    const {
      message: pdfMessage,
      text: pdfText,
      truncated,
    } = await loadPdfContext(attachment);
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
      return {
        result: {
          ...result,
          purchaseOrder: {
            ...result.purchaseOrder,
            applyVat:
              result.purchaseOrder.applyVat || pdfShowsChargedVat(pdfText),
          },
        },
        searchText: pdfMessage.text,
      };
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
