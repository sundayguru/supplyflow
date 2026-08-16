import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  listPurchaseOrdersWithDraftedProformaInvoices,
  markPurchaseOrderProformaInvoiceSent,
} from '~/db/purchaseOrderDraftStatus';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import {
  indexMailboxesByAccountId,
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

export const runPurchaseOrderDraftSentStatusSync = async (
  mailboxes: ScheduledMailbox[],
): Promise<DraftStatusResult> => {
  const draftedPurchaseOrders =
    await listPurchaseOrdersWithDraftedProformaInvoices();
  const mailboxesByAccountId = indexMailboxesByAccountId(mailboxes);
  let sent = 0;
  let failed = 0;
  for (const draftedPurchaseOrder of draftedPurchaseOrders) {
    if (
      !draftedPurchaseOrder.draftId ||
      draftedPurchaseOrder.accountProvider !== 'gmail'
    ) {
      continue;
    }

    const emailClient = mailboxesByAccountId.get(
      draftedPurchaseOrder.accountId,
    )?.emailClient;
    if (!emailClient?.isDraftSent) {
      continue;
    }

    try {
      const isSent = await emailClient.isDraftSent({
        draftId: draftedPurchaseOrder.draftId,
        threadId: draftedPurchaseOrder.threadId,
        sentAfter: sentAfterDate(
          draftedPurchaseOrder.draftUpdatedAt,
          draftedPurchaseOrder.purchaseOrderUpdatedAt,
        ),
      });
      if (!isSent) {
        continue;
      }

      const updated = await markPurchaseOrderProformaInvoiceSent(
        draftedPurchaseOrder.purchaseOrderId,
      );
      if (updated) {
        sent += 1;
      }
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          draftedPurchaseOrder.accountId,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'po_draft_sent_status_failed',
          purchaseOrderId: draftedPurchaseOrder.purchaseOrderId,
          reference: draftedPurchaseOrder.reference,
          accountEmail: draftedPurchaseOrder.accountEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  const summary = { checked: draftedPurchaseOrders.length, sent, failed };
  console.log(
    JSON.stringify({ event: 'po_draft_sent_status_completed', ...summary }),
  );
  return summary;
};
