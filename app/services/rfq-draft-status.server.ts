import {
  listRfqsWithDraftedEmails,
  markRfqDraftSent,
} from '~/db/rfqDraftStatus';
import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import { isYahooAuthenticationError } from '~/services/email/yahoo.server';
import { isAolAuthenticationError } from '~/services/email/aol.server';
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

export const runRfqDraftSentStatusSync = async (
  mailboxes: ScheduledMailbox[],
): Promise<DraftStatusResult> => {
  const draftedRfqs = await listRfqsWithDraftedEmails();
  const mailboxesByAccountId = indexMailboxesByAccountId(mailboxes);
  let sent = 0;
  let failed = 0;

  for (const draftedRfq of draftedRfqs) {
    if (!draftedRfq.draftId) {
      continue;
    }

    const emailClient = mailboxesByAccountId.get(
      draftedRfq.accountId,
    )?.emailClient;
    if (!emailClient?.isDraftSent) {
      continue;
    }

    try {
      const isSent = await emailClient.isDraftSent({
        draftId: draftedRfq.draftId,
        threadId: draftedRfq.threadId,
        originalMessageId: draftedRfq.originalMessageId,
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
      const isAuthenticationError =
        draftedRfq.accountProvider === 'gmail'
          ? isGmailAuthenticationError(error)
          : draftedRfq.accountProvider === 'yahoo'
            ? isYahooAuthenticationError(error)
            : isAolAuthenticationError(error);
      if (isAuthenticationError) {
        await markConnectedEmailAccountNeedsReconnect(
          draftedRfq.accountId,
          `${draftedRfq.accountProvider === 'aol' ? 'AOL' : draftedRfq.accountProvider === 'yahoo' ? 'Yahoo' : 'Gmail'} access expired. Reconnect this account to resume inbox checks.`,
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
