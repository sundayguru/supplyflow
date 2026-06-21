import { and, eq, lt, or, sql } from 'drizzle-orm';
import type { EmailMessage } from '~/services/email/types';
import { getDb } from './connection';
import { emailIngestions, emailSyncStates } from './schemas';

const now = () => new Date().toISOString();

export const getEmailSyncTime = async (provider: string) => {
  const db = getDb();
  const state = await db.query.emailSyncStates.findFirst({
    where: eq(emailSyncStates.provider, provider),
  });
  return state ? new Date(state.lastSuccessfulAt) : null;
};

export const saveEmailSyncTime = async (provider: string, date: Date) => {
  const db = getDb();
  await db
    .insert(emailSyncStates)
    .values({ provider, lastSuccessfulAt: date.toISOString() })
    .onConflictDoUpdate({
      target: emailSyncStates.provider,
      set: { lastSuccessfulAt: date.toISOString(), updatedAt: now() },
    });
};

export const claimEmail = async (provider: string, message: EmailMessage) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(emailIngestions)
    .values({
      id,
      provider,
      externalId: message.id,
      threadId: message.threadId,
      subject: message.subject,
      fromAddress: message.from.address,
      receivedAt: message.receivedAt.toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: emailIngestions.id });

  if (created) {
    return created.id;
  }

  const [retried] = await db
    .update(emailIngestions)
    .set({
      status: 'processing',
      error: null,
      attempts: sql`${emailIngestions.attempts} + 1`,
      updatedAt: now(),
    })
    .where(
      and(
        eq(emailIngestions.provider, provider),
        eq(emailIngestions.externalId, message.id),
        or(
          eq(emailIngestions.status, 'failed'),
          and(
            eq(emailIngestions.status, 'processing'),
            lt(
              emailIngestions.updatedAt,
              new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            ),
          ),
        ),
      ),
    )
    .returning({ id: emailIngestions.id });

  return retried?.id ?? null;
};

export const completeEmailIngestion = async (
  id: string,
  outcome: { status: 'processed'; rfqId: string } | { status: 'ignored' },
) => {
  const db = getDb();
  await db
    .update(emailIngestions)
    .set({
      status: outcome.status,
      rfqId: outcome.status === 'processed' ? outcome.rfqId : null,
      error: null,
      updatedAt: now(),
    })
    .where(eq(emailIngestions.id, id));
};

export const failEmailIngestion = async (id: string, error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown ingestion error';
  const db = getDb();
  await db
    .update(emailIngestions)
    .set({ status: 'failed', error: message.slice(0, 2000), updatedAt: now() })
    .where(eq(emailIngestions.id, id));
};
