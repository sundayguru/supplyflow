import { markConnectedEmailAccountNeedsReconnect } from '~/db/connectedEmailAccounts';
import {
  listDueRfqQuoteReminders,
  markRfqQuoteReminderSent,
} from '~/db/rfqQuoteReminders';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import { decryptToken } from '~/utils/tokenEncryption.server';

type RfqQuoteReminderResult = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
};

const REMINDER_DELAY_MS = 5 * 24 * 60 * 60 * 1000;

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required quote reminder setting: ${name}`);
  }
  return value;
};

const buildReminderBody = (input: {
  reference: string;
  customerName: string;
  organizationName: string;
}) =>
  [
    `Hello ${input.customerName},`,
    '',
    `We are following up on quotation ${input.reference}. Please let us know if you have any updates, questions, or feedback when you have a moment.`,
    '',
    'Best regards,',
    input.organizationName,
  ].join('\n');

export const runRfqQuoteReminderSync = async (
  env: Env,
): Promise<RfqQuoteReminderResult> => {
  const cutoff = new Date(Date.now() - REMINDER_DELAY_MS);
  const reminders = await listDueRfqQuoteReminders(cutoff);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const recipient = reminder.fromAddress ?? reminder.customerEmail;
    if (!recipient || reminder.accountProvider !== 'gmail') {
      skipped += 1;
      continue;
    }

    try {
      const refreshToken = await decryptToken(
        reminder.encryptedRefreshToken,
        requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
      );
      const emailClient = createEmailClient({
        provider: reminder.accountProvider,
        clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
        clientSecret: requireSetting(
          'GOOGLE_CLIENT_SECRET',
          env.GOOGLE_CLIENT_SECRET,
        ),
        refreshToken,
      });

      if (!emailClient.sendReply) {
        skipped += 1;
        continue;
      }

      await emailClient.sendReply({
        originalMessageId: reminder.externalId,
        threadId: reminder.threadId,
        to: recipient,
        subject: reminder.subject ?? reminder.reference,
        bodyText: buildReminderBody({
          reference: reminder.reference,
          customerName: reminder.customerName,
          organizationName: reminder.organizationName,
        }),
      });

      const updated = await markRfqQuoteReminderSent(reminder.rfqId);
      if (updated) {
        sent += 1;
      }
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          reminder.accountId,
          'Gmail access expired. Reconnect this account to resume quote reminders.',
        );
      }
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'rfq_quote_reminder_failed',
          rfqId: reminder.rfqId,
          reference: reminder.reference,
          accountEmail: reminder.accountEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  const summary = { checked: reminders.length, sent, skipped, failed };
  console.log(
    JSON.stringify({ event: 'rfq_quote_reminder_completed', ...summary }),
  );
  return summary;
};
