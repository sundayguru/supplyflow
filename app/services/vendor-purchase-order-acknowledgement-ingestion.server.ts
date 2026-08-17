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
import {
  extractVendorPurchaseOrderReferences,
  normalizeVendorPurchaseOrderReference,
  shouldSkipStoredEmail,
  type ExtractedMessageVendorPurchaseOrderAcknowledgement,
} from '~/services/email-classification.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import type { EmailClient, EmailMessage } from '~/services/email/types';
import type { ScheduledMailbox } from '~/services/email-schedule.server';
import type { VendorPurchaseOrderAcknowledgementItemInput } from '~/types/vendorPurchaseOrderAcknowledgement';

type VendorPurchaseOrderAcknowledgementSyncResult = {
  checked: number;
  created: number;
  skipped: number;
  failed: number;
};

const awaitingAcknowledgementKey = (accountId: string, threadId: string) =>
  `${accountId}:${threadId}`;

const awaitingAcknowledgementReferenceKey = (
  accountId: string,
  reference: string,
) => `${accountId}:${normalizeVendorPurchaseOrderReference(reference)}`;

const resolveAwaitingVendorPurchaseOrder = ({
  accountId,
  classified,
  awaitingByThread,
  awaitingByReference,
}: {
  accountId: string;
  classified: {
    message: EmailMessage;
    extraction: ExtractedMessageVendorPurchaseOrderAcknowledgement;
  };
  awaitingByThread: Map<
    string,
    Awaited<
      ReturnType<typeof listSentVendorPurchaseOrdersAwaitingAcknowledgement>
    >[number]
  >;
  awaitingByReference: Map<
    string,
    Awaited<
      ReturnType<typeof listSentVendorPurchaseOrdersAwaitingAcknowledgement>
    >[number]
  >;
}) => {
  const threadId = classified.message.threadId;
  if (threadId) {
    const byThread = awaitingByThread.get(
      awaitingAcknowledgementKey(accountId, threadId),
    );
    if (byThread) {
      return byThread;
    }
  }

  const candidateReferences = [
    classified.extraction.result.vendorPurchaseOrderReference,
    ...extractVendorPurchaseOrderReferences(classified.message),
  ]
    .filter((reference): reference is string => Boolean(reference?.trim()))
    .map(normalizeVendorPurchaseOrderReference);

  for (const reference of candidateReferences) {
    const byReference = awaitingByReference.get(
      awaitingAcknowledgementReferenceKey(accountId, reference),
    );
    if (byReference) {
      return byReference;
    }
  }

  return null;
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

const resolveVendorPurchaseOrderItemId = (
  extractedItem: VendorPurchaseOrderAcknowledgementItemInput,
  vendorPurchaseOrderItems: Array<{
    id: string;
    description: string;
    manufacturerPartNumber: string | null;
  }>,
) => {
  const extractedId = extractedItem.vendorPurchaseOrderItemId?.trim();
  if (
    extractedId &&
    vendorPurchaseOrderItems.some((item) => item.id === extractedId)
  ) {
    return extractedId;
  }

  return matchVendorPurchaseOrderItemId(
    extractedItem,
    vendorPurchaseOrderItems,
  );
};

const createAcknowledgementItemFromVendorPoItem = (item: {
  id: string;
  quantity: number;
  price: number;
  unit: string;
  description: string;
  manufacturerPartNumber: string | null;
}): VendorPurchaseOrderAcknowledgementItemInput => ({
  vendorPurchaseOrderItemId: item.id,
  quantity: item.quantity,
  price: item.price,
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
    price: number;
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
    vendorPurchaseOrderItemId: resolveVendorPurchaseOrderItemId(
      item,
      vendorPurchaseOrderItems,
    ),
  }));
};

const processClassifiedAcknowledgement = async ({
  accountId,
  emailClient,
  extraction,
  message,
  organizationId,
  userId,
  vendorPurchaseOrder,
}: {
  accountId: string;
  emailClient: EmailClient;
  extraction: ExtractedMessageVendorPurchaseOrderAcknowledgement;
  message: EmailMessage;
  organizationId: string;
  userId: string;
  vendorPurchaseOrder: NonNullable<
    Awaited<ReturnType<typeof getVendorPurchaseOrder>>
  >;
}) => {
  const attempt = await getEmailIngestionAttempt(accountId, message.id);
  if (shouldSkipStoredEmail(attempt)) {
    return 'skipped' as const;
  }

  let ingestionId: string | null = null;
  try {
    ingestionId = await claimEmail(accountId, emailClient.provider, message);
    if (!ingestionId) {
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
  mailboxes: ScheduledMailbox[],
): Promise<VendorPurchaseOrderAcknowledgementSyncResult> => {
  const awaitingAcknowledgements =
    await listSentVendorPurchaseOrdersAwaitingAcknowledgement();
  const awaitingByThread = new Map(
    awaitingAcknowledgements.flatMap((vendorPurchaseOrder) =>
      vendorPurchaseOrder.threadId
        ? [
            [
              awaitingAcknowledgementKey(
                vendorPurchaseOrder.accountId,
                vendorPurchaseOrder.threadId,
              ),
              vendorPurchaseOrder,
            ] as const,
          ]
        : [],
    ),
  );
  const awaitingByReference = new Map(
    awaitingAcknowledgements.map(
      (vendorPurchaseOrder) =>
        [
          awaitingAcknowledgementReferenceKey(
            vendorPurchaseOrder.accountId,
            vendorPurchaseOrder.reference,
          ),
          vendorPurchaseOrder,
        ] as const,
    ),
  );
  const acknowledgedVendorPurchaseOrderIds = new Set<string>();
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let checked = 0;

  for (const mailbox of mailboxes) {
    const emailClient = mailbox.emailClient;
    if (!emailClient) {
      skipped += mailbox.classification.vendorAcknowledgements.length;
      continue;
    }

    for (const classified of mailbox.classification.vendorAcknowledgements) {
      checked += 1;

      const awaiting = resolveAwaitingVendorPurchaseOrder({
        accountId: mailbox.account.id,
        classified,
        awaitingByThread,
        awaitingByReference,
      });
      if (
        !awaiting?.organizationId ||
        acknowledgedVendorPurchaseOrderIds.has(awaiting.vendorPurchaseOrderId)
      ) {
        skipped += 1;
        continue;
      }

      try {
        const record = await getVendorPurchaseOrder(
          awaiting.vendorPurchaseOrderId,
          awaiting.organizationId,
        );
        if (!record) {
          skipped += 1;
          continue;
        }

        const outcome = await processClassifiedAcknowledgement({
          accountId: mailbox.account.id,
          emailClient,
          extraction: classified.extraction,
          message: classified.message,
          organizationId: awaiting.organizationId,
          userId: awaiting.userId,
          vendorPurchaseOrder: record,
        });
        if (outcome === 'created') {
          created += 1;
          acknowledgedVendorPurchaseOrderIds.add(
            awaiting.vendorPurchaseOrderId,
          );
          continue;
        }
        skipped += 1;
      } catch (error) {
        if (isGmailAuthenticationError(error)) {
          await markConnectedEmailAccountNeedsReconnect(
            mailbox.account.id,
            'Gmail access expired. Reconnect this account to resume inbox checks.',
          );
        }
        failed += 1;
        console.error(
          JSON.stringify({
            event: 'vendor_po_acknowledgement_check_failed',
            vendorPurchaseOrderId: awaiting.vendorPurchaseOrderId,
            reference: awaiting.reference,
            accountEmail: mailbox.account.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }
    }
  }

  const summary = {
    checked,
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
