import { getUserByEmail } from '~/db/auth';
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

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FIRST_SYNC_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;
const MAX_MESSAGES_PER_RUN = 25;

export type EmailIngestionResult = {
  provider: string;
  discovered: number;
  processed: number;
  ignored: number;
  failed: number;
};

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email ingestion setting: ${name}`);
  }
  return value;
};

export const runEmailIngestion = async (env: Env) => {
  const startedAt = new Date();
  const ownerEmail = requireSetting('RFQ_OWNER_EMAIL', env.RFQ_OWNER_EMAIL);
  const owner = await getUserByEmail(ownerEmail);
  if (!owner) {
    throw new Error(`RFQ owner account was not found for ${ownerEmail}`);
  }

  const emailClient = createEmailClient({
    provider: 'gmail',
    clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
    clientSecret: requireSetting(
      'GOOGLE_CLIENT_SECRET',
      env.GOOGLE_CLIENT_SECRET,
    ),
    refreshToken: requireSetting(
      'GMAIL_REFRESH_TOKEN',
      env.GMAIL_REFRESH_TOKEN,
    ),
  });
  const extractor = createRfqExtractor({
    provider: 'groq',
    apiKey: requireSetting('GROQ_API_KEY', env.GROQ_API_KEY),
    model: env.RFQ_LLM_MODEL || DEFAULT_MODEL,
  });

  const lastSync = await getEmailSyncTime(emailClient.provider);
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
    const ingestionId = await claimEmail(emailClient.provider, message);
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

      const rfq = await createRfq(owner.id, result.rfq);
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
    await saveEmailSyncTime(emailClient.provider, startedAt);
  }
  const summary: EmailIngestionResult = {
    provider: emailClient.provider,
    discovered: messages.length,
    processed,
    ignored,
    failed,
  };
  console.log(
    JSON.stringify({
      event: 'email_ingestion_completed',
      ...summary,
    }),
  );
  return summary;
};
