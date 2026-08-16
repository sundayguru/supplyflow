import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  claimEmail,
  completeEmailIngestion,
  failEmailIngestion,
  getEmailIngestionAttempt,
  saveEmailSyncTime,
} from '~/db/emailIngestion';
import { createPurchaseOrder } from '~/db/purchaseOrders';
import { createRfq, getRfqs, updateRfqStatus } from '~/db/rfqs';
import {
  shouldSkipStoredEmail,
  type ExtractedMessagePurchaseOrder,
} from '~/services/email-classification.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import type { ScheduledMailbox } from '~/services/email-schedule.server';
import { validatePurchaseOrderAgainstRfq } from '~/services/purchase-order-validation.server';
import type { EmailClient, EmailMessage } from '~/services/email/types';
import type { RfqRecord } from '~/types/rfq';
import type {
  PurchaseOrderItemInput,
  PurchaseOrderRecord,
} from '~/types/purchaseOrder';
import { calculateRfqItemAmounts } from '~/utils/rfq';
import { uploadRfqSourcePdf } from '~/utils/rfqSourcePdf.server';

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

type LinkedRfqCandidate = {
  id: string;
  reference: string;
};

const toPurchaseOrderItemFromRfqItem = (
  item: RfqRecord['items'][number],
): PurchaseOrderItemInput => {
  const amounts = calculateRfqItemAmounts(item);
  return {
    quantity: item.quantity,
    price: Math.round(amounts.lineTotal / item.quantity),
    unit: item.unit,
    description: item.description,
    status: 'ordered',
    manufacturerId: item.manufacturerId,
    manufacturerPartNumber: item.manufacturerPartNumber,
    specifications: item.specifications,
  };
};

const resolvePurchaseOrderItems = (
  purchaseOrderExtraction: ExtractedMessagePurchaseOrder,
  linkedRfq: RfqRecord | null,
) => {
  const { items } = purchaseOrderExtraction.result.purchaseOrder;
  if (items.length > 0) {
    return items;
  }
  if (!linkedRfq) {
    throw new Error(
      'Purchase order accepted a quote without items, but no linked RFQ was found',
    );
  }
  return linkedRfq.items.map(toPurchaseOrderItemFromRfqItem);
};

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

const buildPurchaseOrderAcknowledgementBody = (
  purchaseOrder: PurchaseOrderRecord,
  organizationName: string,
) =>
  [
    'Hello,',
    '',
    'Thank you for your purchase order. We have received it and will process it as soon as possible.',
    '',
    `Reference: ${purchaseOrder.reference}`,
    '',
    'Best regards,',
    organizationName,
  ].join('\n');

const sendPurchaseOrderAcknowledgement = async ({
  emailClient,
  message,
  organizationName,
  purchaseOrder,
}: {
  emailClient: EmailClient;
  message: EmailMessage;
  organizationName: string;
  purchaseOrder: PurchaseOrderRecord;
}) => {
  if (!emailClient.sendReply || !message.from.address) {
    return;
  }
  await emailClient.sendReply({
    originalMessageId: message.id,
    threadId: message.threadId,
    to: message.from.address,
    subject: message.subject || purchaseOrder.reference,
    bodyText: buildPurchaseOrderAcknowledgementBody(
      purchaseOrder,
      organizationName,
    ),
  });
};

const processAccount = async (
  mailbox: ScheduledMailbox,
): Promise<AccountResult> => {
  const { account, startedAt, classification } = mailbox;
  if (mailbox.loadError || !mailbox.emailClient || !mailbox.organization) {
    return {
      accountId: account.id,
      email: account.email,
      discovered: 0,
      processed: 0,
      ignored: 0,
      failed: 1,
      error: mailbox.loadError ?? 'Mailbox is not ready',
    };
  }

  const organization = mailbox.organization;
  const emailClient = mailbox.emailClient;
  const linkedRfqCandidates = await getRfqs(organization.id, organization.vat);
  const rfqCandidates = linkedRfqCandidates.map(({ id, reference }) => ({
    id,
    reference,
  }));
  let processed = 0;
  let failed = 0;

  for (const { message, extraction } of classification.purchaseOrders) {
    const attempt = await getEmailIngestionAttempt(account.id, message.id);
    if (shouldSkipStoredEmail(attempt)) {
      continue;
    }
    let ingestionId: string | null = null;
    try {
      ingestionId = await claimEmail(account.id, emailClient.provider, message);
      if (!ingestionId) {
        continue;
      }
      const rfqId = resolveLinkedRfqId(
        extraction.result.rfqReference,
        extraction.searchText,
        rfqCandidates,
      );
      const linkedRfq =
        linkedRfqCandidates.find((rfq) => rfq.id === rfqId) ?? null;
      const purchaseOrderItems = resolvePurchaseOrderItems(
        extraction,
        linkedRfq,
      );
      const shouldUseLinkedRfqTerms =
        extraction.result.purchaseOrder.items.length === 0 ? linkedRfq : null;
      const purchaseOrderInput = {
        ...extraction.result.purchaseOrder,
        currency: shouldUseLinkedRfqTerms
          ? shouldUseLinkedRfqTerms.currency
          : extraction.result.purchaseOrder.currency,
        applyVat: shouldUseLinkedRfqTerms
          ? shouldUseLinkedRfqTerms.applyVat
          : extraction.result.purchaseOrder.applyVat,
        incoterms: shouldUseLinkedRfqTerms
          ? shouldUseLinkedRfqTerms.incoterms
          : extraction.result.purchaseOrder.incoterms,
        deliveryTerms: shouldUseLinkedRfqTerms
          ? shouldUseLinkedRfqTerms.deliveryTerms
          : extraction.result.purchaseOrder.deliveryTerms,
        items: purchaseOrderItems,
        rfqId,
      };
      const validation = validatePurchaseOrderAgainstRfq(
        purchaseOrderInput,
        linkedRfq,
      );
      const purchaseOrder = await createPurchaseOrder(
        organization.id,
        account.userId,
        {
          ...purchaseOrderInput,
          status: validation.status,
        },
        organization.vat,
        { validationSummary: validation.summary },
      );
      if (!purchaseOrder) {
        throw new Error('Purchase order could not be created');
      }
      if (rfqId) {
        await updateRfqStatus(rfqId, organization.id, 'won', organization.vat);
      }
      try {
        await sendPurchaseOrderAcknowledgement({
          emailClient,
          message,
          organizationName: organization.name,
          purchaseOrder,
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
            event: 'purchase_order_acknowledgement_failed',
            accountId: account.id,
            purchaseOrderId: purchaseOrder.id,
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
        purchaseOrderId: purchaseOrder.id,
      });
      processed += 1;
    } catch (error) {
      if (ingestionId) {
        await failEmailIngestion(ingestionId, error);
      }
      failed += 1;
    }
  }

  for (const { message, extraction } of classification.rfqs) {
    const attempt = await getEmailIngestionAttempt(account.id, message.id);
    if (shouldSkipStoredEmail(attempt)) {
      continue;
    }
    let ingestionId: string | null = null;
    try {
      ingestionId = await claimEmail(account.id, emailClient.provider, message);
      if (!ingestionId) {
        continue;
      }
      const sourcePdfKey = extraction.sourcePdf
        ? await uploadRfqSourcePdf(
            organization.id,
            extraction.sourcePdf.bytes,
            extraction.sourcePdf.filename,
          )
        : null;
      const rfq = await createRfq(
        organization.id,
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
    discovered:
      classification.rfqs.length + classification.purchaseOrders.length,
    processed,
    ignored: 0,
    failed,
  };
};

export const runEmailIngestion = async (mailboxes: ScheduledMailbox[]) => {
  const results: AccountResult[] = [];

  for (const mailbox of mailboxes) {
    try {
      results.push(await processAccount(mailbox));
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          mailbox.account.id,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      results.push({
        accountId: mailbox.account.id,
        email: mailbox.account.email,
        discovered: 0,
        processed: 0,
        ignored: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown account error',
      });
    }
  }

  const summary: EmailIngestionResult = {
    accounts: mailboxes.length,
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
