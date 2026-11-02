import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  listVendorPurchaseOrdersWithDraftedEmails,
  markVendorPurchaseOrderDraftSent,
} from '~/db/vendorPurchaseOrderDraftStatus';
import { getEmailProviderMetadata } from '~/services/email/providers';
import {
  indexMailboxesByAccountId,
  isEmailAuthenticationError,
  type ScheduledMailbox,
} from '~/services/email-schedule.server';

type DraftStatusResult = {
  checked: number;
  sent: number;
  failed: number;
};

const SENT_CHECK_LOOKBACK_MS = 60 * 1000;

const sentAfterDate = (value: string | null, fallback: string) =>
  new Date(
    Math.max(0, new Date(value ?? fallback).getTime() - SENT_CHECK_LOOKBACK_MS),
  );

export const runVendorPurchaseOrderDraftSentStatusSync = async (
  mailboxes: ScheduledMailbox[],
): Promise<DraftStatusResult> => {
  const draftedVendorPurchaseOrders =
    await listVendorPurchaseOrdersWithDraftedEmails();
  const mailboxesByAccountId = indexMailboxesByAccountId(mailboxes);
  let sent = 0;
  let failed = 0;

  for (const vendorPurchaseOrder of draftedVendorPurchaseOrders) {
    if (!vendorPurchaseOrder.draftId) {
      continue;
    }

    const emailClient = mailboxesByAccountId.get(
      vendorPurchaseOrder.accountId,
    )?.emailClient;
    if (!emailClient?.isDraftSent) {
      continue;
    }

    try {
      const isSent = await emailClient.isDraftSent({
        draftId: vendorPurchaseOrder.draftId,
        threadId: vendorPurchaseOrder.threadId,
        trackingId: vendorPurchaseOrder.vendorPurchaseOrderId,
        recipient: vendorPurchaseOrder.vendorEmail ?? undefined,
        subject: `Purchase order ${vendorPurchaseOrder.reference}`,
        sentAfter: sentAfterDate(
          vendorPurchaseOrder.draftUpdatedAt,
          vendorPurchaseOrder.vendorPurchaseOrderUpdatedAt,
        ),
      });
      if (!isSent) {
        continue;
      }

      const updated = await markVendorPurchaseOrderDraftSent(
        vendorPurchaseOrder.vendorPurchaseOrderId,
        vendorPurchaseOrder.draftId,
      );
      if (updated) {
        sent += 1;
      }
    } catch (error) {
      if (
        isEmailAuthenticationError(error, vendorPurchaseOrder.accountProvider)
      ) {
        await markConnectedEmailAccountNeedsReconnect(
          vendorPurchaseOrder.accountId,
          getEmailProviderMetadata(vendorPurchaseOrder.accountProvider)
            .reconnectMessage,
        );
      }
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'vendor_po_draft_sent_status_failed',
          vendorPurchaseOrderId: vendorPurchaseOrder.vendorPurchaseOrderId,
          reference: vendorPurchaseOrder.reference,
          accountEmail: vendorPurchaseOrder.accountEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  const summary = {
    checked: draftedVendorPurchaseOrders.length,
    sent,
    failed,
  };
  console.log(
    JSON.stringify({
      event: 'vendor_po_draft_sent_status_completed',
      ...summary,
    }),
  );
  return summary;
};
