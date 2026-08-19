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
  type AwaitingVendorPurchaseOrderAcknowledgement,
  type MailboxClassification,
} from '~/services/email-classification.server';
import { createEmailClient } from '~/services/email/index.server';
import { isGmailAuthenticationError } from '~/services/email/gmail.server';
import {
  getEmailProviderMetadata,
  type EmailProvider,
} from '~/services/email/providers';
import type { EmailClient, EmailMessage } from '~/services/email/types';
import { isYahooAuthenticationError } from '~/services/email/yahoo.server';
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

const getEmailProviderEnv = (env: Env, name: string) =>
  (env as Env & Record<string, string | undefined>)[name];

const getClientConfig = (
  account: SelectConnectedEmailAccount,
  env: Env,
  refreshToken: string,
) => {
  switch (account.provider) {
    case 'gmail':
      return {
        provider: account.provider,
        clientId: requireEmailSetting(
          'GOOGLE_CLIENT_ID',
          getEmailProviderEnv(env, 'GOOGLE_CLIENT_ID'),
        ),
        clientSecret: requireEmailSetting(
          'GOOGLE_CLIENT_SECRET',
          getEmailProviderEnv(env, 'GOOGLE_CLIENT_SECRET'),
        ),
        refreshToken,
      };
    case 'yahoo':
      return {
        provider: account.provider,
        clientId: requireEmailSetting(
          'YAHOO_CLIENT_ID',
          getEmailProviderEnv(env, 'YAHOO_CLIENT_ID'),
        ),
        clientSecret: requireEmailSetting(
          'YAHOO_CLIENT_SECRET',
          getEmailProviderEnv(env, 'YAHOO_CLIENT_SECRET'),
        ),
        refreshToken,
        accountEmail: account.email,
      };
  }
};

const isEmailAuthenticationError = (error: unknown, provider: EmailProvider) =>
  provider === 'gmail'
    ? isGmailAuthenticationError(error)
    : isYahooAuthenticationError(error);

const markAccountNeedsReconnect = async (
  account: SelectConnectedEmailAccount,
  reason?: string,
) =>
  await markConnectedEmailAccountNeedsReconnect(
    account.id,
    reason ?? getEmailProviderMetadata(account.provider).reconnectMessage,
  );

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
  const emailClient = createEmailClient(
    getClientConfig(account, env, refreshToken),
  );
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
      if (isEmailAuthenticationError(error, account.provider)) {
        await markAccountNeedsReconnect(account);
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

const vendorAckAwaitingByAccount = (
  awaitingAcknowledgements: Awaited<
    ReturnType<typeof listSentVendorPurchaseOrdersAwaitingAcknowledgement>
  >,
) => {
  const awaitingByAccount = new Map<
    string,
    AwaitingVendorPurchaseOrderAcknowledgement[]
  >();
  for (const vendorPurchaseOrder of awaitingAcknowledgements) {
    const entry = {
      reference: vendorPurchaseOrder.reference,
      threadId: vendorPurchaseOrder.threadId,
    };
    const existing = awaitingByAccount.get(vendorPurchaseOrder.accountId);
    if (existing) {
      existing.push(entry);
      continue;
    }
    awaitingByAccount.set(vendorPurchaseOrder.accountId, [entry]);
  }
  return awaitingByAccount;
};

const enrichMailboxMessagesWithVendorAckThreads = async (
  mailbox: ScheduledMailbox,
  threadIds: Set<string>,
): Promise<EmailMessage[]> => {
  if (!mailbox.emailClient?.listThreadMessages || threadIds.size === 0) {
    return mailbox.messages;
  }

  const messagesById = new Map(
    mailbox.messages.map((message) => [message.id, message]),
  );

  for (const threadId of threadIds) {
    try {
      const threadMessages =
        await mailbox.emailClient.listThreadMessages(threadId);
      for (const message of threadMessages) {
        if (!messagesById.has(message.id)) {
          messagesById.set(message.id, message);
        }
      }
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: 'vendor_po_ack_thread_load_failed',
          accountId: mailbox.account.id,
          accountEmail: mailbox.account.email,
          threadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  return Array.from(messagesById.values()).sort(
    (left, right) => left.receivedAt.getTime() - right.receivedAt.getTime(),
  );
};

export const classifyScheduledMailboxes = async (
  env: Env,
  mailboxes: ScheduledMailbox[],
): Promise<ScheduledMailbox[]> => {
  const awaitingAcknowledgements =
    await listSentVendorPurchaseOrdersAwaitingAcknowledgement();
  const awaitingByAccount = vendorAckAwaitingByAccount(
    awaitingAcknowledgements,
  );
  const classifiedMailboxes: ScheduledMailbox[] = [];

  for (const mailbox of mailboxes) {
    if (mailbox.loadError || !mailbox.organization) {
      classifiedMailboxes.push(mailbox);
      continue;
    }

    try {
      const awaitingVendorAcknowledgements =
        awaitingByAccount.get(mailbox.account.id) ?? [];
      const vendorAckThreadIds = new Set(
        awaitingVendorAcknowledgements.flatMap((entry) =>
          entry.threadId ? [entry.threadId] : [],
        ),
      );
      const messages = await enrichMailboxMessagesWithVendorAckThreads(
        mailbox,
        vendorAckThreadIds,
      );
      const classification = await classifyMailboxMessages({
        account: mailbox.account,
        organization: mailbox.organization,
        messages,
        env,
        awaitingVendorAcknowledgements,
      });
      classifiedMailboxes.push({ ...mailbox, messages, classification });
    } catch (error) {
      if (isEmailAuthenticationError(error, mailbox.account.provider)) {
        await markAccountNeedsReconnect(mailbox.account);
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
