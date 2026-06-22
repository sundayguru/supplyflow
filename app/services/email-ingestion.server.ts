import { listActiveConnectedEmailAccounts } from '~/db/connectedEmailAccounts';
import {
  claimEmail,
  completeEmailIngestion,
  failEmailIngestion,
  getEmailSyncTime,
  saveEmailSyncTime,
} from '~/db/emailIngestion';
import { createRfq } from '~/db/rfqs';
import { createEmailClient } from '~/services/email/index.server';
import { createRfqExtractor } from '~/services/rfq-extraction/index.server';
import type { RfqExtractor } from '~/services/rfq-extraction/types';
import { decryptToken } from '~/utils/tokenEncryption.server';
import type { SelectConnectedEmailAccount } from '~/db/schemas';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FIRST_SYNC_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;
const MAX_MESSAGES_PER_RUN = 25;

type AccountResult = {
  accountId: string;
  email: string;
  discovered: number;
  processed: number;
  ignored: number;
  failed: number;
  error?: string;
};

export type EmailIngestionResult = {
  accounts: number;
  discovered: number;
  processed: number;
  ignored: number;
  failed: number;
  results: AccountResult[];
};

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email ingestion setting: ${name}`);
  }
  return value;
};

const processAccount = async (
  account: SelectConnectedEmailAccount,
  env: Env,
  extractor: RfqExtractor,
): Promise<AccountResult> => {
  if (!account.organizationId) {
    throw new Error('Connected account is not linked to an organization');
  }
  const startedAt = new Date();
  const refreshToken = await decryptToken(
    account.encryptedRefreshToken,
    requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
  );
  const emailClient = createEmailClient({
    provider: account.provider,
    clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
    clientSecret: requireSetting(
      'GOOGLE_CLIENT_SECRET',
      env.GOOGLE_CLIENT_SECRET,
    ),
    refreshToken,
  });
  const lastSync = await getEmailSyncTime(account.id);
  const receivedAfter = new Date(
    (lastSync?.getTime() ?? startedAt.getTime() - FIRST_SYNC_LOOKBACK_MS) -
      OVERLAP_MS,
  );
  const messages = await emailClient.listMessages({
    receivedAfter,
    limit: MAX_MESSAGES_PER_RUN,
  });
  let processed = 0;
  let ignored = 0;
  let failed = 0;

  for (const message of messages) {
    const ingestionId = await claimEmail(
      account.id,
      emailClient.provider,
      message,
    );
    if (!ingestionId) {
      continue;
    }
    try {
      const result = await extractor.extract(message);
      if (!result.isRfq) {
        await completeEmailIngestion(ingestionId, { status: 'ignored' });
        ignored += 1;
        continue;
      }
      const rfq = await createRfq(
        account.organizationId,
        account.userId,
        result.rfq,
      );
      if (!rfq) {
        throw new Error('RFQ could not be created');
      }
      await completeEmailIngestion(ingestionId, {
        status: 'processed',
        rfqId: rfq.id,
      });
      processed += 1;
    } catch (error) {
      await failEmailIngestion(ingestionId, error);
      failed += 1;
    }
  }

  if (failed === 0) {
    await saveEmailSyncTime(account.id, startedAt);
  }
  return {
    accountId: account.id,
    email: account.email,
    discovered: messages.length,
    processed,
    ignored,
    failed,
  };
};

export const runEmailIngestion = async (env: Env, organizationId?: string) => {
  const accounts = await listActiveConnectedEmailAccounts(organizationId);
  const extractor = createRfqExtractor({
    provider: 'groq',
    apiKey: requireSetting('GROQ_API_KEY', env.GROQ_API_KEY),
    model: env.RFQ_LLM_MODEL || DEFAULT_MODEL,
  });
  const results: AccountResult[] = [];

  for (const account of accounts) {
    try {
      results.push(await processAccount(account, env, extractor));
    } catch (error) {
      results.push({
        accountId: account.id,
        email: account.email,
        discovered: 0,
        processed: 0,
        ignored: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown account error',
      });
    }
  }

  const summary: EmailIngestionResult = {
    accounts: accounts.length,
    discovered: results.reduce((total, result) => total + result.discovered, 0),
    processed: results.reduce((total, result) => total + result.processed, 0),
    ignored: results.reduce((total, result) => total + result.ignored, 0),
    failed: results.reduce((total, result) => total + result.failed, 0),
    results,
  };
  console.log(
    JSON.stringify({ event: 'email_ingestion_completed', ...summary }),
  );
  return summary;
};
