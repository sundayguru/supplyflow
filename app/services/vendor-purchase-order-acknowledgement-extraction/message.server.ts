import type { EmailMessage } from '~/services/email/types';
import {
  createEmailPdfContextLoader,
  isPdfAttachment,
  type EmailPdfContextLoader,
} from '~/utils/emailPdf.server';
import type {
  VendorPurchaseOrderAcknowledgementExtractionResult,
  VendorPurchaseOrderAcknowledgementExtractor,
} from './types';

export type ExtractedMessageVendorPurchaseOrderAcknowledgement = {
  result: Extract<
    VendorPurchaseOrderAcknowledgementExtractionResult,
    { isAcknowledgement: true }
  >;
  searchText: string;
  pdfText?: string;
};

export const extractMessageVendorPurchaseOrderAcknowledgement = async (
  message: EmailMessage,
  extractor: VendorPurchaseOrderAcknowledgementExtractor,
  loadPdfContext: EmailPdfContextLoader = createEmailPdfContextLoader(message),
): Promise<ExtractedMessageVendorPurchaseOrderAcknowledgement | null> => {
  let truncatedPdf: string | null = null;
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const {
      message: pdfMessage,
      text,
      truncated,
    } = await loadPdfContext(attachment);
    const result = await extractor.extract(pdfMessage);
    if (result.isAcknowledgement) {
      if (truncated) {
        throw new Error(
          `Vendor acknowledgement PDF "${attachment.filename}" is too long to extract all line items`,
        );
      }
      if (result.acknowledgement.items.length === 0) {
        throw new Error(
          `Vendor acknowledgement PDF "${attachment.filename}" contains no extracted line items`,
        );
      }
      return { result, searchText: pdfMessage.text, pdfText: text };
    }
    if (truncated) {
      truncatedPdf = attachment.filename;
    }
  }

  const result = await extractor.extract(message);
  if (result.isAcknowledgement && truncatedPdf) {
    throw new Error(
      `PDF "${truncatedPdf}" is too long to rule out vendor acknowledgement line items`,
    );
  }
  return result.isAcknowledgement
    ? { result, searchText: `${message.subject}\n${message.text}` }
    : null;
};
