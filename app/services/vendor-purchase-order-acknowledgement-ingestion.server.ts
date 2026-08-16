import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  claimEmail,
  completeEmailIngestion,
  failEmailIngestion,
  getEmailIngestionAttempt,
} from '~/db/emailIngestion';
import { getVendorPurchaseOrder } from '~/db/vendorPurchaseOrders';
import { listSentVendorPurchaseOrdersAwaitingAcknowledgement } from '~/db/vendorPurchaseOrderAcknowledgementSync';
import {
  createVendorPurchaseOrderAcknowledgement,
  getVendorPurchaseOrderAcknowledgementBySourceEmail,
  markVendorPurchaseOrderAcknowledged,
} from '~/db/vendorPurchaseOrderAcknowledgements';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import type {
  EmailAttachment,
  EmailClient,
  EmailMessage,
} from '~/services/email/types';
import { createVendorPurchaseOrderAcknowledgementExtractor } from '~/services/vendor-purchase-order-acknowledgement-extraction/index.server';
import type {
  VendorPurchaseOrderAcknowledgementExtractionResult,
  VendorPurchaseOrderAcknowledgementExtractor,
} from '~/services/vendor-purchase-order-acknowledgement-extraction/types';
import { organizationAiModels } from '~/types/organization';
import type { VendorPurchaseOrderAcknowledgementItemInput } from '~/types/vendorPurchaseOrderAcknowledgement';
import { getProviderApiKey } from '~/utils/organization-ai.server';
import { extractRfqPdfText } from '~/utils/rfqPdfExtraction.server';
import { decryptToken } from '~/utils/tokenEncryption.server';

type VendorPurchaseOrderAcknowledgementSyncResult = {
  checked: number;
  created: number;
  skipped: number;
  failed: number;
};

const STALE_PROCESSING_MS = 10 * 60 * 1000;

type ExtractedMessageVendorPurchaseOrderAcknowledgement = {
  result: Extract<
    VendorPurchaseOrderAcknowledgementExtractionResult,
    { isAcknowledgement: true }
  >;
  searchText: string;
};

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(
      `Missing required vendor PO acknowledgement setting: ${name}`,
    );
  }
  return value;
};

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

const isPdfAttachment = (attachment: EmailAttachment) =>
  attachment.contentType === 'application/pdf' ||
  attachment.filename.toLowerCase().endsWith('.pdf');

const shouldSkipStoredEmail = (
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

const matchVendorPurchaseOrderItemId = (
  extractedItem: VendorPurchaseOrderAcknowledgementItemInput,
  vendorPurchaseOrderItems: Array<{
    id: string;
    description: string;
    manufacturerPartNumber: string | null;
  }>,
) => {
  const normalizedPartNumber = extractedItem.manufacturerPartNumber
    ?.trim()
    .toLowerCase();
  if (normalizedPartNumber) {
    const partMatch = vendorPurchaseOrderItems.find(
      (item) =>
        item.manufacturerPartNumber?.trim().toLowerCase() ===
        normalizedPartNumber,
    );
    if (partMatch) {
      return partMatch.id;
    }
  }

  const normalizedDescription = extractedItem.description.trim().toLowerCase();
  return (
    vendorPurchaseOrderItems.find(
      (item) => item.description.trim().toLowerCase() === normalizedDescription,
    )?.id ?? null
  );
};

const createAcknowledgementItemFromVendorPoItem = (item: {
  id: string;
  quantity: number;
  unit: string;
  description: string;
  manufacturerPartNumber: string | null;
}): VendorPurchaseOrderAcknowledgementItemInput => ({
  vendorPurchaseOrderItemId: item.id,
  quantity: item.quantity,
  unit: item.unit,
  description: item.description,
  manufacturerPartNumber: item.manufacturerPartNumber,
  deliveryDate: null,
  status: 'acknowledged',
  notes: null,
});

const resolveVendorPurchaseOrderAcknowledgementItems = (
  acknowledgementExtraction: ExtractedMessageVendorPurchaseOrderAcknowledgement,
  vendorPurchaseOrderItems: Array<{
    id: string;
    quantity: number;
    unit: string;
    description: string;
    manufacturerPartNumber: string | null;
  }>,
) => {
  const { items } = acknowledgementExtraction.result.acknowledgement;
  if (!items.length) {
    return vendorPurchaseOrderItems.map(
      createAcknowledgementItemFromVendorPoItem,
    );
  }

  return items.map((item) => ({
    ...item,
    vendorPurchaseOrderItemId:
      item.vendorPurchaseOrderItemId ??
      matchVendorPurchaseOrderItemId(item, vendorPurchaseOrderItems),
  }));
};

const createExtractor = (preferredModel: string, env: Env) => {
  const model = organizationAiModels.find(
    (candidate) => candidate.value === preferredModel,
  );
  if (!model) {
    throw new Error('Organization AI model is not supported');
  }
  const providerApiKey = getProviderApiKey(model.provider, env);
  return createVendorPurchaseOrderAcknowledgementExtractor({
    provider: model.provider,
    apiKey: requireSetting(providerApiKey.name, providerApiKey.value),
    model: model.value,
  });
};

const processThreadMessage = async ({
  accountId,
  accountEmail,
  emailClient,
  extractor,
  message,
  organizationId,
  userId,
  vendorPurchaseOrder,
}: {
  accountId: string;
  accountEmail: string;
  emailClient: EmailClient;
  extractor: VendorPurchaseOrderAcknowledgementExtractor;
  message: EmailMessage;
  organizationId: string;
  userId: string;
  vendorPurchaseOrder: NonNullable<
    Awaited<ReturnType<typeof getVendorPurchaseOrder>>
  >;
}) => {
  if (isOwnOutboundMessage(message, accountEmail)) {
    return 'skipped' as const;
  }

  const attempt = await getEmailIngestionAttempt(accountId, message.id);
  if (shouldSkipStoredEmail(attempt)) {
    return 'skipped' as const;
  }

  let ingestionId: string | null = null;
  try {
    const extraction = await extractMessageVendorPurchaseOrderAcknowledgement(
      message,
      extractor,
    );
    ingestionId = await claimEmail(accountId, emailClient.provider, message);
    if (!ingestionId) {
      return 'skipped' as const;
    }
    if (!extraction) {
      await completeEmailIngestion(ingestionId, { status: 'ignored' });
      return 'skipped' as const;
    }

    const existingAcknowledgement =
      await getVendorPurchaseOrderAcknowledgementBySourceEmail(
        ingestionId,
        organizationId,
      );
    if (existingAcknowledgement) {
      await completeEmailIngestion(ingestionId, { status: 'processed' });
      return 'created' as const;
    }

    const acknowledgement = await createVendorPurchaseOrderAcknowledgement(
      organizationId,
      userId,
      {
        ...extraction.result.acknowledgement,
        vendorPurchaseOrderId: vendorPurchaseOrder.id,
        items: resolveVendorPurchaseOrderAcknowledgementItems(
          extraction,
          vendorPurchaseOrder.items,
        ),
      },
      { sourceEmailIngestionId: ingestionId },
    );
    if (!acknowledgement) {
      throw new Error('Vendor PO acknowledgement could not be created');
    }
    await markVendorPurchaseOrderAcknowledged(
      vendorPurchaseOrder.id,
      organizationId,
    );
    await completeEmailIngestion(ingestionId, { status: 'processed' });
    return 'created' as const;
  } catch (error) {
    if (ingestionId) {
      await failEmailIngestion(ingestionId, error);
    }
    if (isGmailAuthenticationError(error)) {
      await markConnectedEmailAccountNeedsReconnect(
        accountId,
        'Gmail access expired. Reconnect this account to resume inbox checks.',
      );
    }
    throw error;
  }
};

export const runVendorPurchaseOrderAcknowledgementSync = async (
  env: Env,
): Promise<VendorPurchaseOrderAcknowledgementSyncResult> => {
  const awaitingAcknowledgements =
    await listSentVendorPurchaseOrdersAwaitingAcknowledgement();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const vendorPurchaseOrder of awaitingAcknowledgements) {
    if (
      !vendorPurchaseOrder.organizationId ||
      !vendorPurchaseOrder.threadId ||
      vendorPurchaseOrder.accountProvider !== 'gmail'
    ) {
      skipped += 1;
      continue;
    }

    try {
      const refreshToken = await decryptToken(
        vendorPurchaseOrder.encryptedRefreshToken,
        requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
      );
      const emailClient = createEmailClient({
        provider: vendorPurchaseOrder.accountProvider,
        clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
        clientSecret: requireSetting(
          'GOOGLE_CLIENT_SECRET',
          env.GOOGLE_CLIENT_SECRET,
        ),
        refreshToken,
      });
      if (!emailClient.listThreadMessages) {
        skipped += 1;
        continue;
      }

      const record = await getVendorPurchaseOrder(
        vendorPurchaseOrder.vendorPurchaseOrderId,
        vendorPurchaseOrder.organizationId,
      );
      if (!record) {
        skipped += 1;
        continue;
      }

      const extractor = createExtractor(
        vendorPurchaseOrder.preferredModel,
        env,
      );
      const messages = await emailClient.listThreadMessages(
        vendorPurchaseOrder.threadId,
      );
      let createdForVendorPurchaseOrder = false;

      for (const message of messages) {
        const outcome = await processThreadMessage({
          accountId: vendorPurchaseOrder.accountId,
          accountEmail: vendorPurchaseOrder.accountEmail,
          emailClient,
          extractor,
          message,
          organizationId: vendorPurchaseOrder.organizationId,
          userId: vendorPurchaseOrder.userId,
          vendorPurchaseOrder: record,
        });
        if (outcome === 'created') {
          created += 1;
          createdForVendorPurchaseOrder = true;
          break;
        }
        skipped += 1;
      }

      if (!createdForVendorPurchaseOrder && messages.length === 0) {
        skipped += 1;
      }
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          vendorPurchaseOrder.accountId,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'vendor_po_acknowledgement_check_failed',
          vendorPurchaseOrderId: vendorPurchaseOrder.vendorPurchaseOrderId,
          reference: vendorPurchaseOrder.reference,
          accountEmail: vendorPurchaseOrder.accountEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  const summary = {
    checked: awaitingAcknowledgements.length,
    created,
    skipped,
    failed,
  };
  console.log(
    JSON.stringify({
      event: 'vendor_po_acknowledgement_sync_completed',
      ...summary,
    }),
  );
  return summary;
};
