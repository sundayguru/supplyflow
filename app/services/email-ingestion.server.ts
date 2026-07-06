import {
  listActiveConnectedEmailAccounts,
  markConnectedEmailAccountNeedsReconnect,
} from '~/db/connectedEmailAccounts';
import {
  claimEmail,
  completeEmailIngestion,
  failEmailIngestion,
  getEmailIngestionAttempt,
  getEmailSyncTime,
  saveEmailSyncTime,
} from '~/db/emailIngestion';
import { createPurchaseOrder } from '~/db/purchaseOrders';
import { createRfq, getRfqs } from '~/db/rfqs';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
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
import { decryptToken } from '~/utils/tokenEncryption.server';
import type { SelectConnectedEmailAccount } from '~/db/schemas';
import { getOrganizationById } from '~/db/organizations';
import { organizationAiModels } from '~/types/organization';
import type {
  EmailAttachment,
  EmailClient,
  EmailMessage,
} from '~/services/email/types';
import type { RfqRecord } from '~/types/rfq';
import { extractRfqPdfText } from '~/utils/rfqPdfExtraction.server';
import { uploadRfqSourcePdf } from '~/utils/rfqSourcePdf.server';

const FIRST_SYNC_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;
const MAX_MESSAGES_PER_RUN = 25;
const STALE_PROCESSING_MS = 10 * 60 * 1000;

type AccountResult = {
  accountId: string;
  email: string;
  discovered: number;
  processed: number;
  ignored: number;
  failed: number;
  error?: string;
};

export type EmailIngestionResult = {
  accounts: number;
  discovered: number;
  processed: number;
  ignored: number;
  failed: number;
  results: AccountResult[];
};

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email ingestion setting: ${name}`);
  }
  return value;
};

type ExtractedMessageRfq = {
  result: Extract<RfqExtractionResult, { isRfq: true }>;
  sourcePdf: EmailAttachment | null;
};

type ExtractedMessagePurchaseOrder = {
  result: Extract<PurchaseOrderExtractionResult, { isPurchaseOrder: true }>;
  searchText: string;
};

type LinkedRfqCandidate = {
  id: string;
  reference: string;
};

type EmailIngestionAttempt = Awaited<
  ReturnType<typeof getEmailIngestionAttempt>
>;

const isPdfAttachment = (attachment: EmailAttachment) =>
  attachment.contentType === 'application/pdf' ||
  attachment.filename.toLowerCase().endsWith('.pdf');

const shouldSkipStoredEmail = (attempt: EmailIngestionAttempt) => {
  if (!attempt) {
    return false;
  }
  if (attempt.status === 'processed') {
    return true;
  }
  return (
    attempt.status === 'processing' &&
    new Date(attempt.updatedAt).getTime() > Date.now() - STALE_PROCESSING_MS
  );
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

const resolveLinkedRfqId = (
  extractedReference: string | null,
  searchText: string,
  rfqs: LinkedRfqCandidate[],
) => {
  const normalizedExtractedReference = extractedReference?.trim().toLowerCase();
  if (normalizedExtractedReference) {
    const exactMatch = rfqs.find(
      (rfq) => rfq.reference.toLowerCase() === normalizedExtractedReference,
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  const normalizedSearchText = searchText.toLowerCase();
  return (
    rfqs.find((rfq) =>
      normalizedSearchText.includes(rfq.reference.toLowerCase()),
    )?.id ?? null
  );
};

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

const buildRfqAcknowledgementBody = (
  rfq: RfqRecord,
  organizationName: string,
) =>
  [
    'Hello,',
    '',
    'Thank you for your request for quotation. We have received it and it will be processed as soon as possible.',
    '',
    `Reference: ${rfq.reference}`,
    '',
    'Best regards,',
    organizationName,
  ].join('\n');

const sendRfqAcknowledgement = async ({
  emailClient,
  message,
  organizationName,
  rfq,
}: {
  emailClient: EmailClient;
  message: EmailMessage;
  organizationName: string;
  rfq: RfqRecord;
}) => {
  if (!emailClient.sendReply || !message.from.address) {
    return;
  }
  await emailClient.sendReply({
    originalMessageId: message.id,
    threadId: message.threadId,
    to: message.from.address,
    subject: message.subject || rfq.reference,
    bodyText: buildRfqAcknowledgementBody(rfq, organizationName),
  });
};

const processAccount = async (
  account: SelectConnectedEmailAccount,
  env: Env,
): Promise<AccountResult> => {
  if (!account.organizationId) {
    throw new Error('Connected account is not linked to an organization');
  }
  const organization = await getOrganizationById(account.organizationId);
  if (!organization) {
    throw new Error('Connected account organization was not found');
  }
  const model = organizationAiModels.find(
    (candidate) => candidate.value === organization.preferredModel,
  );
  if (!model) {
    throw new Error('Organization AI model is not supported');
  }
  const extractorConfig = {
    provider: model.provider,
    apiKey: requireSetting(
      model.provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY',
      model.provider === 'gemini' ? env.GEMINI_API_KEY : env.GROQ_API_KEY,
    ),
    model: model.value,
  };
  const extractor: RfqExtractor = createRfqExtractor({
    ...extractorConfig,
    defaultPriceMarkup: organization.priceMarkup,
  });
  const purchaseOrderExtractor: PurchaseOrderExtractor =
    createPurchaseOrderExtractor(extractorConfig);
  const rfqCandidates = (
    await getRfqs(account.organizationId, organization.vat)
  ).map(({ id, reference }) => ({ id, reference }));
  const startedAt = new Date();
  const refreshToken = await decryptToken(
    account.encryptedRefreshToken,
    requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
  );
  const emailClient = createEmailClient({
    provider: account.provider,
    clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
    clientSecret: requireSetting(
      'GOOGLE_CLIENT_SECRET',
      env.GOOGLE_CLIENT_SECRET,
    ),
    refreshToken,
  });
  const lastSync = await getEmailSyncTime(account.id);
  const receivedAfter = new Date(
    (lastSync?.getTime() ?? startedAt.getTime() - FIRST_SYNC_LOOKBACK_MS) -
      OVERLAP_MS,
  );
  const messages = await emailClient.listMessages({
    receivedAfter,
    limit: MAX_MESSAGES_PER_RUN,
  });
  let processed = 0;
  let ignored = 0;
  let failed = 0;

  for (const message of messages) {
    const attempt = await getEmailIngestionAttempt(account.id, message.id);
    if (shouldSkipStoredEmail(attempt)) {
      continue;
    }
    let ingestionId: string | null = null;
    try {
      const extraction = await extractMessageRfq(message, extractor);
      if (!extraction) {
        const purchaseOrderExtraction = await extractMessagePurchaseOrder(
          message,
          purchaseOrderExtractor,
        );
        if (!purchaseOrderExtraction) {
          ignored += 1;
          continue;
        }
        ingestionId = await claimEmail(
          account.id,
          emailClient.provider,
          message,
        );
        if (!ingestionId) {
          continue;
        }
        const rfqId = resolveLinkedRfqId(
          purchaseOrderExtraction.result.rfqReference,
          purchaseOrderExtraction.searchText,
          rfqCandidates,
        );
        const purchaseOrder = await createPurchaseOrder(
          account.organizationId,
          account.userId,
          {
            ...purchaseOrderExtraction.result.purchaseOrder,
            rfqId,
          },
          organization.vat,
        );
        if (!purchaseOrder) {
          throw new Error('Purchase order could not be created');
        }
        await completeEmailIngestion(ingestionId, {
          status: 'processed',
          purchaseOrderId: purchaseOrder.id,
        });
        processed += 1;
        continue;
      }
      ingestionId = await claimEmail(account.id, emailClient.provider, message);
      if (!ingestionId) {
        continue;
      }
      const sourcePdfKey = extraction.sourcePdf
        ? await uploadRfqSourcePdf(
            account.organizationId,
            extraction.sourcePdf.bytes,
            extraction.sourcePdf.filename,
          )
        : null;
      const rfq = await createRfq(
        account.organizationId,
        account.userId,
        { ...extraction.result.rfq, sourcePdfKey },
        organization.vat,
        organization.priceMarkup,
      );
      if (!rfq) {
        throw new Error('RFQ could not be created');
      }
      try {
        await sendRfqAcknowledgement({
          emailClient,
          message,
          organizationName: organization.name,
          rfq,
        });
      } catch (acknowledgementError) {
        if (isGmailAuthenticationError(acknowledgementError)) {
          await markConnectedEmailAccountNeedsReconnect(
            account.id,
            'Gmail access expired. Reconnect this account to resume inbox checks.',
          );
        }
        console.warn(
          JSON.stringify({
            event: 'rfq_acknowledgement_failed',
            accountId: account.id,
            rfqId: rfq.id,
            messageId: message.id,
            error:
              acknowledgementError instanceof Error
                ? acknowledgementError.message
                : 'Unknown acknowledgement error',
          }),
        );
      }
      await completeEmailIngestion(ingestionId, {
        status: 'processed',
        rfqId: rfq.id,
      });
      processed += 1;
    } catch (error) {
      if (ingestionId) {
        await failEmailIngestion(ingestionId, error);
      }
      failed += 1;
    }
  }

  if (failed === 0) {
    await saveEmailSyncTime(account.id, startedAt);
  }
  return {
    accountId: account.id,
    email: account.email,
    discovered: messages.length,
    processed,
    ignored,
    failed,
  };
};

export const runEmailIngestion = async (env: Env, organizationId?: string) => {
  const accounts = await listActiveConnectedEmailAccounts(organizationId);
  const results: AccountResult[] = [];

  for (const account of accounts) {
    try {
      results.push(await processAccount(account, env));
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          account.id,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      results.push({
        accountId: account.id,
        email: account.email,
        discovered: 0,
        processed: 0,
        ignored: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown account error',
      });
    }
  }

  const summary: EmailIngestionResult = {
    accounts: accounts.length,
    discovered: results.reduce((total, result) => total + result.discovered, 0),
    processed: results.reduce((total, result) => total + result.processed, 0),
    ignored: results.reduce((total, result) => total + result.ignored, 0),
    failed: results.reduce((total, result) => total + result.failed, 0),
    results,
  };
  console.log(
    JSON.stringify({ event: 'email_ingestion_completed', ...summary }),
  );
  return summary;
};
