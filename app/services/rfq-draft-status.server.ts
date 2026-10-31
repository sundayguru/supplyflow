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
  unmatched: number;
  unavailable: number;
};

const SENT_CHECK_LOOKBACK_MS = 60 * 1000;

const sentAfterDate = (value: string | null, fallback: string) =>
  new Date(
    Math.max(0, new Date(value ?? fallback).getTime() - SENT_CHECK_LOOKBACK_MS),
  );

export const runRfqDraftSentStatusSync = async (
  mailboxes: ScheduledMailbox[],
  organizationId?: string,
): Promise<DraftStatusResult> => {
  const draftedRfqs = await listRfqsWithDraftedEmails(50, organizationId);
  const mailboxesByAccountId = indexMailboxesByAccountId(mailboxes);
  let sent = 0;
  let failed = 0;
  let unmatched = 0;
  let unavailable = 0;

  for (const draftedRfq of draftedRfqs) {
    if (!draftedRfq.draftId) {
      continue;
    }

    const mailbox = mailboxesByAccountId.get(draftedRfq.accountId);
    const emailClient = mailbox?.emailClient;
    if (!emailClient?.isDraftSent) {
      unavailable += 1;
      console.warn(
        JSON.stringify({
          event: 'rfq_draft_sent_status_unavailable',
          rfqId: draftedRfq.rfqId,
          accountId: draftedRfq.accountId,
          provider: draftedRfq.accountProvider,
          reason: mailbox?.loadError ?? 'Email client unavailable',
        }),
      );
      continue;
    }

    try {
      const isSent = await emailClient.isDraftSent({
        draftId: draftedRfq.draftId,
        threadId: draftedRfq.threadId,
        originalMessageId: draftedRfq.originalMessageId,
        trackingId: draftedRfq.rfqId,
        recipient:
          draftedRfq.recipient ?? draftedRfq.customerEmail ?? undefined,
        subject: draftedRfq.subject ?? draftedRfq.reference,
        sentAfter: sentAfterDate(
          draftedRfq.draftUpdatedAt,
          draftedRfq.rfqUpdatedAt,
        ),
      });
      if (!isSent) {
        unmatched += 1;
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

  const summary = {
    checked: draftedRfqs.length,
    sent,
    failed,
    unmatched,
    unavailable,
  };
  console.log(
    JSON.stringify({ event: 'rfq_draft_sent_status_completed', ...summary }),
  );
  return summary;
};
