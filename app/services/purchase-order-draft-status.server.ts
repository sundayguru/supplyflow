import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  listPurchaseOrdersWithDraftedProformaInvoices,
  markPurchaseOrderProformaInvoiceSent,
} from '~/db/purchaseOrderDraftStatus';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import { decryptToken } from '~/utils/tokenEncryption.server';

type DraftStatusResult = {
  checked: number;
  sent: number;
  failed: number;
};

const SENT_CHECK_LOOKBACK_MS = 60 * 1000;

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required draft status setting: ${name}`);
  }
  return value;
};

const sentAfterDate = (value: string | null, fallback: string) =>
  new Date(
    Math.max(0, new Date(value ?? fallback).getTime() - SENT_CHECK_LOOKBACK_MS),
  );

export const runPurchaseOrderDraftSentStatusSync = async (
  env: Env,
): Promise<DraftStatusResult> => {
  const draftedPurchaseOrders =
    await listPurchaseOrdersWithDraftedProformaInvoices();
  let sent = 0;
  let failed = 0;
  console.log('draftedPurchaseOrders', draftedPurchaseOrders);
  for (const draftedPurchaseOrder of draftedPurchaseOrders) {
    if (
      !draftedPurchaseOrder.draftId ||
      draftedPurchaseOrder.accountProvider !== 'gmail'
    ) {
      continue;
    }

    try {
      const refreshToken = await decryptToken(
        draftedPurchaseOrder.encryptedRefreshToken,
        requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
      );
      const emailClient = createEmailClient({
        provider: draftedPurchaseOrder.accountProvider,
        clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
        clientSecret: requireSetting(
          'GOOGLE_CLIENT_SECRET',
          env.GOOGLE_CLIENT_SECRET,
        ),
        refreshToken,
      });

      if (!emailClient.isDraftSent) {
        continue;
      }

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
