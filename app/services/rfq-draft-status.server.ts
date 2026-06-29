import {
  listRfqsWithDraftedEmails,
  markRfqDraftSent,
} from '~/db/rfqDraftStatus';
import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
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

export const runRfqDraftSentStatusSync = async (
  env: Env,
): Promise<DraftStatusResult> => {
  const draftedRfqs = await listRfqsWithDraftedEmails();
  let sent = 0;
  let failed = 0;

  for (const draftedRfq of draftedRfqs) {
    if (!draftedRfq.draftId || draftedRfq.accountProvider !== 'gmail') {
      continue;
    }

    try {
      const refreshToken = await decryptToken(
        draftedRfq.encryptedRefreshToken,
        requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
      );
      const emailClient = createEmailClient({
        provider: draftedRfq.accountProvider,
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
        draftId: draftedRfq.draftId,
        threadId: draftedRfq.threadId,
        sentAfter: sentAfterDate(
          draftedRfq.draftUpdatedAt,
          draftedRfq.rfqUpdatedAt,
        ),
      });
      if (!isSent) {
        continue;
      }

      const updated = await markRfqDraftSent(draftedRfq.rfqId);
      if (updated) {
        sent += 1;
      }
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          draftedRfq.accountId,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'rfq_draft_sent_status_failed',
          rfqId: draftedRfq.rfqId,
          reference: draftedRfq.reference,
          accountEmail: draftedRfq.accountEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  const summary = { checked: draftedRfqs.length, sent, failed };
  console.log(
    JSON.stringify({ event: 'rfq_draft_sent_status_completed', ...summary }),
  );
  return summary;
};
