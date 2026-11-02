import {
  claimEmail,
  failEmailIngestion,
  getEmailIngestionAttempt,
} from '~/db/emailIngestion';
import { createPurchaseOrderExtractor } from '~/services/purchase-order-extraction/index.server';
import type { ExtractedMessagePurchaseOrder } from '~/services/purchase-order-extraction/message.server';
import { extractMessagePurchaseOrder } from '~/services/purchase-order-extraction/message.server';
import { createRfqExtractor } from '~/services/rfq-extraction/index.server';
import type {
  RfqExtractionResult,
  RfqExtractor,
} from '~/services/rfq-extraction/types';
import { createVendorPurchaseOrderAcknowledgementExtractor } from '~/services/vendor-purchase-order-acknowledgement-extraction/index.server';
import {
  extractMessageVendorPurchaseOrderAcknowledgement,
  type ExtractedMessageVendorPurchaseOrderAcknowledgement,
} from '~/services/vendor-purchase-order-acknowledgement-extraction/message.server';
import type { SelectConnectedEmailAccount } from '~/db/schemas';
import type { EmailAttachment, EmailMessage } from '~/services/email/types';
import { getOpenAICompatibleAiConfig } from '~/utils/organization-ai.server';
import {
  createEmailPdfContextLoader,
  isPdfAttachment,
  type EmailPdfContextLoader,
} from '~/utils/emailPdf.server';
import {
  extractVendorPurchaseOrderReferences,
  normalizeVendorPurchaseOrderReference,
} from '~/utils/vendorPurchaseOrderReferences';

export type { ExtractedMessagePurchaseOrder } from '~/services/purchase-order-extraction/message.server';
export type { ExtractedMessageVendorPurchaseOrderAcknowledgement } from '~/services/vendor-purchase-order-acknowledgement-extraction/message.server';

const STALE_PROCESSING_MS = 10 * 60 * 1000;

export type AwaitingVendorPurchaseOrderAcknowledgement = {
  reference: string;
  threadId: string | null;
};

export const isAwaitingVendorAcknowledgementCandidate = (
  message: EmailMessage,
  awaitingVendorAcknowledgements: AwaitingVendorPurchaseOrderAcknowledgement[],
) => {
  if (
    message.threadId &&
    awaitingVendorAcknowledgements.some(
      (entry) => entry.threadId === message.threadId,
    )
  ) {
    return true;
  }

  const awaitingReferences = new Set(
    awaitingVendorAcknowledgements.map((entry) =>
      normalizeVendorPurchaseOrderReference(entry.reference),
    ),
  );
  return extractVendorPurchaseOrderReferences(message).some((reference) =>
    awaitingReferences.has(reference),
  );
};

export type ExtractedMessageRfq = {
  result: Extract<RfqExtractionResult, { isRfq: true }>;
  sourcePdf: EmailAttachment | null;
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
  priceMarkup: number;
  currency: string;
};

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

const hasPurchaseOrderSubject = (message: EmailMessage) =>
  /\b(?:purchase\s+order|p\.?\s*o\.?|po\s*(?:#|number|no\.?))\b/i.test(
    message.subject,
  );

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

const extractPdfAttachmentRfq = async (
  message: EmailMessage,
  extractor: RfqExtractor,
  loadPdfContext: EmailPdfContextLoader,
): Promise<ExtractedMessageRfq | null> => {
  for (const attachment of message.attachments) {
    if (!isPdfAttachment(attachment)) {
      continue;
    }
    const context = await loadPdfContext(attachment);
    const result = await extractor.extract(context.message);
    if (result.isRfq) {
      return { result, sourcePdf: attachment };
    }
  }
  return null;
};

const extractMessageRfq = async (
  message: EmailMessage,
  extractor: RfqExtractor,
  loadPdfContext: EmailPdfContextLoader,
): Promise<ExtractedMessageRfq | null> => {
  try {
    const result = await extractor.extract(message);
    if (result.isRfq) {
      return { result, sourcePdf: null };
    }
    return await extractPdfAttachmentRfq(message, extractor, loadPdfContext);
  } catch (error) {
    const pdfResult = await extractPdfAttachmentRfq(
      message,
      extractor,
      loadPdfContext,
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
  awaitingVendorAcknowledgements,
}: {
  account: SelectConnectedEmailAccount;
  organization: ClassificationOrganization;
  messages: EmailMessage[];
  env: Env;
  awaitingVendorAcknowledgements: AwaitingVendorPurchaseOrderAcknowledgement[];
}): Promise<MailboxClassification> => {
  const aiConfig = getOpenAICompatibleAiConfig(env);
  const extractorConfig = {
    ...aiConfig,
    usage: {
      organizationId: organization.id,
      userId: account.userId,
      feature: 'email-classification',
    },
  };
  const rfqExtractor = createRfqExtractor({
    ...extractorConfig,
    defaultPriceMarkup: organization.priceMarkup,
    defaultCurrency: organization.currency,
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

      const loadPdfContext = createEmailPdfContextLoader(message);
      let isVendorAcknowledgement = isAwaitingVendorAcknowledgementCandidate(
        message,
        awaitingVendorAcknowledgements,
      );
      if (!isVendorAcknowledgement && awaitingVendorAcknowledgements.length) {
        for (const attachment of message.attachments) {
          if (!isPdfAttachment(attachment)) {
            continue;
          }
          const context = await loadPdfContext(attachment);
          if (
            isAwaitingVendorAcknowledgementCandidate(
              context.message,
              awaitingVendorAcknowledgements,
            )
          ) {
            isVendorAcknowledgement = true;
            break;
          }
        }
      }
      if (isVendorAcknowledgement) {
        const extraction =
          await extractMessageVendorPurchaseOrderAcknowledgement(
            message,
            vendorAcknowledgementExtractor,
            loadPdfContext,
          );
        if (extraction) {
          classification.vendorAcknowledgements.push({ message, extraction });
        } else {
          classification.ignored += 1;
        }
        continue;
      }

      const purchaseOrderFirst =
        hasPurchaseOrderSubject(message) ||
        message.attachments.some(isPdfAttachment);
      const purchaseOrderExtraction = purchaseOrderFirst
        ? await extractMessagePurchaseOrder(
            message,
            purchaseOrderExtractor,
            loadPdfContext,
          )
        : null;
      if (purchaseOrderExtraction) {
        classification.purchaseOrders.push({
          message,
          extraction: purchaseOrderExtraction,
        });
        continue;
      }

      const rfqExtraction = await extractMessageRfq(
        message,
        rfqExtractor,
        loadPdfContext,
      );
      if (rfqExtraction) {
        classification.rfqs.push({ message, extraction: rfqExtraction });
        continue;
      }

      const fallbackPurchaseOrderExtraction = purchaseOrderFirst
        ? null
        : await extractMessagePurchaseOrder(
            message,
            purchaseOrderExtractor,
            loadPdfContext,
          );
      if (fallbackPurchaseOrderExtraction) {
        classification.purchaseOrders.push({
          message,
          extraction: fallbackPurchaseOrderExtraction,
        });
        continue;
      }

      classification.ignored += 1;
    } catch (error) {
      classification.failed += 1;
      console.error(
        JSON.stringify({
          event: 'email_message_classification_failed',
          accountId: account.id,
          messageId: message.id,
          provider: account.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      try {
        const ingestionId = await claimEmail(
          account.id,
          account.provider,
          message,
        );
        if (ingestionId) {
          await failEmailIngestion(ingestionId, error);
        }
      } catch (recordError) {
        console.error(
          JSON.stringify({
            event: 'email_classification_failure_record_failed',
            accountId: account.id,
            messageId: message.id,
            error:
              recordError instanceof Error
                ? recordError.message
                : 'Unknown error',
          }),
        );
      }
    }
  }

  return classification;
};
