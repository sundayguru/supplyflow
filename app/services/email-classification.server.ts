import { getEmailIngestionAttempt } from '~/db/emailIngestion';
import { createPurchaseOrderExtractor } from '~/services/purchase-order-extraction/index.server';
import type {
  PurchaseOrderExtractionResult,
  PurchaseOrderExtractor,
} from '~/services/purchase-order-extraction/types';
import { createRfqExtractor } from '~/services/rfq-extraction/index.server';
import type {
  RfqExtractionResult,
  RfqExtractor,
} from '~/services/rfq-extraction/types';
import { createVendorPurchaseOrderAcknowledgementExtractor } from '~/services/vendor-purchase-order-acknowledgement-extraction/index.server';
import type {
  VendorPurchaseOrderAcknowledgementExtractionResult,
  VendorPurchaseOrderAcknowledgementExtractor,
} from '~/services/vendor-purchase-order-acknowledgement-extraction/types';
import type { SelectConnectedEmailAccount } from '~/db/schemas';
import type { EmailAttachment, EmailMessage } from '~/services/email/types';
import { organizationAiModels } from '~/types/organization';
import { getProviderApiKey } from '~/utils/organization-ai.server';
import { extractRfqPdfText } from '~/utils/rfqPdfExtraction.server';

const STALE_PROCESSING_MS = 10 * 60 * 1000;

export type ExtractedMessageRfq = {
  result: Extract<RfqExtractionResult, { isRfq: true }>;
  sourcePdf: EmailAttachment | null;
};

export type ExtractedMessagePurchaseOrder = {
  result: Extract<PurchaseOrderExtractionResult, { isPurchaseOrder: true }>;
  searchText: string;
};

export type ExtractedMessageVendorPurchaseOrderAcknowledgement = {
  result: Extract<
    VendorPurchaseOrderAcknowledgementExtractionResult,
    { isAcknowledgement: true }
  >;
  searchText: string;
};

export type ClassifiedRfqMessage = {
  message: EmailMessage;
  extraction: ExtractedMessageRfq;
};

export type ClassifiedPurchaseOrderMessage = {
  message: EmailMessage;
  extraction: ExtractedMessagePurchaseOrder;
};

export type ClassifiedVendorAcknowledgementMessage = {
  message: EmailMessage;
  extraction: ExtractedMessageVendorPurchaseOrderAcknowledgement;
};

export type MailboxClassification = {
  rfqs: ClassifiedRfqMessage[];
  purchaseOrders: ClassifiedPurchaseOrderMessage[];
  vendorAcknowledgements: ClassifiedVendorAcknowledgementMessage[];
  ignored: number;
  failed: number;
};

type ClassificationOrganization = {
  id: string;
  preferredModel: string;
  priceMarkup: number;
};

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email classification setting: ${name}`);
  }
  return value;
};

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

const isPdfAttachment = (attachment: EmailAttachment) =>
  attachment.contentType === 'application/pdf' ||
  attachment.filename.toLowerCase().endsWith('.pdf');

export const emptyMailboxClassification = (): MailboxClassification => ({
  rfqs: [],
  purchaseOrders: [],
  vendorAcknowledgements: [],
  ignored: 0,
  failed: 0,
});

export const shouldSkipStoredEmail = (
  attempt: Awaited<ReturnType<typeof getEmailIngestionAttempt>>,
) => {
  if (!attempt) {
    return false;
  }
  if (attempt.status === 'processed' || attempt.status === 'ignored') {
    return true;
  }
  return (
    attempt.status === 'processing' &&
    new Date(attempt.updatedAt).getTime() > Date.now() - STALE_PROCESSING_MS
  );
};

const isOwnOutboundMessage = (message: EmailMessage, accountEmail: string) => {
  const fromAddress = normalizeEmail(message.from.address);
  return fromAddress.length > 0 && fromAddress === normalizeEmail(accountEmail);
};

const buildPdfContextMessage = (
  message: EmailMessage,
  attachment: EmailAttachment,
  text: string,
): EmailMessage => ({
  ...message,
  id: `${message.id}:${attachment.id}`,
  subject: `PDF attachment: ${attachment.filename}`,
  text: [
    `Email subject: ${message.subject}`,
    `Email body:`,
    message.text,
    '',
    `PDF filename: ${attachment.filename}`,
    `PDF text:`,
    text,
  ].join('\n'),
  attachments: [],
});

const extractPdfAttachmentRfq = async (
  message: EmailMessage,
  extractor: RfqExtractor,
): Promise<ExtractedMessageRfq | null> => {
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const file = new File([attachment.bytes], attachment.filename, {
      type: 'application/pdf',
    });
    const text = await extractRfqPdfText(file, attachment.bytes);
    const result = await extractor.extract(
      buildPdfContextMessage(message, attachment, text),
    );
    if (result.isRfq) {
      return { result, sourcePdf: attachment };
    }
  }
  return null;
};

const extractMessageRfq = async (
  message: EmailMessage,
  extractor: RfqExtractor,
): Promise<ExtractedMessageRfq | null> => {
  try {
    const result = await extractor.extract(message);
    if (result.isRfq) {
      return { result, sourcePdf: null };
    }
    return await extractPdfAttachmentRfq(message, extractor);
  } catch (error) {
    const pdfResult = await extractPdfAttachmentRfq(message, extractor);
    if (pdfResult) {
      return pdfResult;
    }
    throw error;
  }
};

const extractPdfAttachmentPurchaseOrder = async (
  message: EmailMessage,
  extractor: PurchaseOrderExtractor,
): Promise<ExtractedMessagePurchaseOrder | null> => {
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const file = new File([attachment.bytes], attachment.filename, {
      type: 'application/pdf',
    });
    const text = await extractRfqPdfText(file, attachment.bytes);
    const pdfMessage = buildPdfContextMessage(message, attachment, text);
    const result = await extractor.extract(pdfMessage);
    if (result.isPurchaseOrder) {
      return { result, searchText: pdfMessage.text };
    }
  }
  return null;
};

const extractMessagePurchaseOrder = async (
  message: EmailMessage,
  extractor: PurchaseOrderExtractor,
): Promise<ExtractedMessagePurchaseOrder | null> => {
  try {
    const result = await extractor.extract(message);
    if (result.isPurchaseOrder) {
      return {
        result,
        searchText: `${message.subject}\n${message.text}`,
      };
    }
    return await extractPdfAttachmentPurchaseOrder(message, extractor);
  } catch (error) {
    const pdfResult = await extractPdfAttachmentPurchaseOrder(
      message,
      extractor,
    );
    if (pdfResult) {
      return pdfResult;
    }
    throw error;
  }
};

const extractPdfAttachmentVendorPurchaseOrderAcknowledgement = async (
  message: EmailMessage,
  extractor: VendorPurchaseOrderAcknowledgementExtractor,
): Promise<ExtractedMessageVendorPurchaseOrderAcknowledgement | null> => {
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const file = new File([attachment.bytes], attachment.filename, {
      type: 'application/pdf',
    });
    const text = await extractRfqPdfText(file, attachment.bytes);
    const pdfMessage = buildPdfContextMessage(message, attachment, text);
    const result = await extractor.extract(pdfMessage);
    if (result.isAcknowledgement) {
      return { result, searchText: pdfMessage.text };
    }
  }
  return null;
};

const extractMessageVendorPurchaseOrderAcknowledgement = async (
  message: EmailMessage,
  extractor: VendorPurchaseOrderAcknowledgementExtractor,
): Promise<ExtractedMessageVendorPurchaseOrderAcknowledgement | null> => {
  try {
    const result = await extractor.extract(message);
    if (result.isAcknowledgement) {
      return {
        result,
        searchText: `${message.subject}\n${message.text}`,
      };
    }
    return await extractPdfAttachmentVendorPurchaseOrderAcknowledgement(
      message,
      extractor,
    );
  } catch (error) {
    const pdfResult =
      await extractPdfAttachmentVendorPurchaseOrderAcknowledgement(
        message,
        extractor,
      );
    if (pdfResult) {
      return pdfResult;
    }
    throw error;
  }
};

export const classifyMailboxMessages = async ({
  account,
  organization,
  messages,
  env,
  vendorAckThreadIds,
}: {
  account: SelectConnectedEmailAccount;
  organization: ClassificationOrganization;
  messages: EmailMessage[];
  env: Env;
  vendorAckThreadIds: Set<string>;
}): Promise<MailboxClassification> => {
  const model = organizationAiModels.find(
    (candidate) => candidate.value === organization.preferredModel,
  );
  if (!model) {
    throw new Error('Organization AI model is not supported');
  }
  const providerApiKey = getProviderApiKey(model.provider, env);
  const extractorConfig = {
    provider: model.provider,
    apiKey: requireSetting(providerApiKey.name, providerApiKey.value),
    model: model.value,
  };
  const rfqExtractor = createRfqExtractor({
    ...extractorConfig,
    defaultPriceMarkup: organization.priceMarkup,
  });
  const purchaseOrderExtractor = createPurchaseOrderExtractor(extractorConfig);
  const vendorAcknowledgementExtractor =
    createVendorPurchaseOrderAcknowledgementExtractor(extractorConfig);
  const classification = emptyMailboxClassification();

  for (const message of messages) {
    try {
      const attempt = await getEmailIngestionAttempt(account.id, message.id);
      if (shouldSkipStoredEmail(attempt)) {
        continue;
      }
      if (isOwnOutboundMessage(message, account.email)) {
        classification.ignored += 1;
        continue;
      }

      if (message.threadId && vendorAckThreadIds.has(message.threadId)) {
        const extraction =
          await extractMessageVendorPurchaseOrderAcknowledgement(
            message,
            vendorAcknowledgementExtractor,
          );
        if (extraction) {
          classification.vendorAcknowledgements.push({ message, extraction });
        } else {
          classification.ignored += 1;
        }
        continue;
      }

      const rfqExtraction = await extractMessageRfq(message, rfqExtractor);
      if (rfqExtraction) {
        classification.rfqs.push({ message, extraction: rfqExtraction });
        continue;
      }

      const purchaseOrderExtraction = await extractMessagePurchaseOrder(
        message,
        purchaseOrderExtractor,
      );
      if (purchaseOrderExtraction) {
        classification.purchaseOrders.push({
          message,
          extraction: purchaseOrderExtraction,
        });
        continue;
      }

      classification.ignored += 1;
    } catch {
      classification.failed += 1;
    }
  }

  return classification;
};
