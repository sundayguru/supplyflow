import {
  listActiveConnectedEmailAccounts,
  markConnectedEmailAccountNeedsReconnect,
} from '~/db/connectedEmailAccounts';
import { getOrganizationById } from '~/db/organizations';
import { listSentVendorPurchaseOrdersAwaitingAcknowledgement } from '~/db/vendorPurchaseOrderAcknowledgementSync';
import type { SelectConnectedEmailAccount } from '~/db/schemas';
import {
  classifyMailboxMessages,
  emptyMailboxClassification,
  type MailboxClassification,
} from '~/services/email-classification.server';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import type { EmailClient, EmailMessage } from '~/services/email/types';
import { decryptToken } from '~/utils/tokenEncryption.server';

export const SCHEDULED_UNREAD_MESSAGE_LIMIT = 25;

export type ScheduledMailbox = {
  account: SelectConnectedEmailAccount;
  organization: Awaited<ReturnType<typeof getOrganizationById>> | null;
  emailClient: EmailClient | null;
  messages: EmailMessage[];
  classification: MailboxClassification;
  startedAt: Date;
  loadError?: string;
};

const getStartOfUtcDay = (date: Date) => {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

export const requireEmailSetting = (
  name: string,
  value: string | undefined,
) => {
  if (!value) {
    throw new Error(`Missing required email setting: ${name}`);
  }
  return value;
};

export const indexMailboxesByAccountId = (mailboxes: ScheduledMailbox[]) =>
  new Map(mailboxes.map((mailbox) => [mailbox.account.id, mailbox]));

const loadMailbox = async (
  account: SelectConnectedEmailAccount,
  env: Env,
  startedAt: Date,
): Promise<ScheduledMailbox> => {
  if (!account.organizationId) {
    return {
      account,
      organization: null,
      emailClient: null,
      messages: [],
      classification: emptyMailboxClassification(),
      startedAt,
      loadError: 'Connected account is not linked to an organization',
    };
  }

  const organization = await getOrganizationById(account.organizationId);
  if (!organization) {
    return {
      account,
      organization: null,
      emailClient: null,
      messages: [],
      classification: emptyMailboxClassification(),
      startedAt,
      loadError: 'Connected account organization was not found',
    };
  }

  const refreshToken = await decryptToken(
    account.encryptedRefreshToken,
    requireEmailSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
  );
  const emailClient = createEmailClient({
    provider: account.provider,
    clientId: requireEmailSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
    clientSecret: requireEmailSetting(
      'GOOGLE_CLIENT_SECRET',
      env.GOOGLE_CLIENT_SECRET,
    ),
    refreshToken,
  });
  const startOfToday = getStartOfUtcDay(startedAt);
  const messages = (
    await emailClient.listMessages({
      receivedAfter: startOfToday,
      limit: SCHEDULED_UNREAD_MESSAGE_LIMIT,
      folder: account.emailFolder || organization.emailFolder || 'INBOX',
      unread: true,
    })
  ).filter((message) => message.receivedAt.getTime() >= startOfToday.getTime());

  return {
    account,
    organization,
    emailClient,
    messages,
    classification: emptyMailboxClassification(),
    startedAt,
  };
};

export const loadScheduledMailboxes = async (
  env: Env,
  organizationId?: string,
): Promise<ScheduledMailbox[]> => {
  const accounts = await listActiveConnectedEmailAccounts(organizationId);
  const startedAt = new Date();
  const mailboxes: ScheduledMailbox[] = [];

  for (const account of accounts) {
    try {
      mailboxes.push(await loadMailbox(account, env, startedAt));
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          account.id,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      mailboxes.push({
        account,
        organization: null,
        emailClient: null,
        messages: [],
        classification: emptyMailboxClassification(),
        startedAt,
        loadError:
          error instanceof Error ? error.message : 'Unknown account error',
      });
    }
  }

  return mailboxes;
};

const vendorAckThreadIdsByAccount = (
  awaitingAcknowledgements: Awaited<
    ReturnType<typeof listSentVendorPurchaseOrdersAwaitingAcknowledgement>
  >,
) => {
  const threadIdsByAccount = new Map<string, Set<string>>();
  for (const vendorPurchaseOrder of awaitingAcknowledgements) {
    if (!vendorPurchaseOrder.threadId) {
      continue;
    }
    const threadIds = threadIdsByAccount.get(vendorPurchaseOrder.accountId);
    if (threadIds) {
      threadIds.add(vendorPurchaseOrder.threadId);
      continue;
    }
    threadIdsByAccount.set(
      vendorPurchaseOrder.accountId,
      new Set([vendorPurchaseOrder.threadId]),
    );
  }
  return threadIdsByAccount;
};

export const classifyScheduledMailboxes = async (
  env: Env,
  mailboxes: ScheduledMailbox[],
): Promise<ScheduledMailbox[]> => {
  const awaitingAcknowledgements =
    await listSentVendorPurchaseOrdersAwaitingAcknowledgement();
  const threadIdsByAccount = vendorAckThreadIdsByAccount(
    awaitingAcknowledgements,
  );
  const classifiedMailboxes: ScheduledMailbox[] = [];

  for (const mailbox of mailboxes) {
    if (mailbox.loadError || !mailbox.organization) {
      classifiedMailboxes.push(mailbox);
      continue;
    }

    try {
      const classification = await classifyMailboxMessages({
        account: mailbox.account,
        organization: mailbox.organization,
        messages: mailbox.messages,
        env,
        vendorAckThreadIds:
          threadIdsByAccount.get(mailbox.account.id) ?? new Set(),
      });
      classifiedMailboxes.push({ ...mailbox, classification });
    } catch (error) {
      if (isGmailAuthenticationError(error)) {
        await markConnectedEmailAccountNeedsReconnect(
          mailbox.account.id,
          'Gmail access expired. Reconnect this account to resume inbox checks.',
        );
      }
      classifiedMailboxes.push({
        ...mailbox,
        classification: emptyMailboxClassification(),
        loadError:
          error instanceof Error
            ? error.message
            : 'Unknown classification error',
      });
    }
  }

  const summary = classifiedMailboxes.reduce(
    (totals, mailbox) => ({
      accounts: totals.accounts + 1,
      rfqs: totals.rfqs + mailbox.classification.rfqs.length,
      purchaseOrders:
        totals.purchaseOrders + mailbox.classification.purchaseOrders.length,
      vendorAcknowledgements:
        totals.vendorAcknowledgements +
        mailbox.classification.vendorAcknowledgements.length,
      ignored: totals.ignored + mailbox.classification.ignored,
      failed: totals.failed + mailbox.classification.failed,
    }),
    {
      accounts: 0,
      rfqs: 0,
      purchaseOrders: 0,
      vendorAcknowledgements: 0,
      ignored: 0,
      failed: 0,
    },
  );
  console.log(
    JSON.stringify({ event: 'email_classification_completed', ...summary }),
  );
  return classifiedMailboxes;
};
