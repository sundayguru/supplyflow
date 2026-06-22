import { and, count, desc, eq, like, lt, or, sql, type SQL } from 'drizzle-orm';
import type { EmailMessage } from '~/services/email/types';
import { getDb } from './connection';
import {
  connectedEmailAccounts,
  emailAccountSyncStates,
  emailIngestions,
  rfqs,
  type EmailIngestionStatus,
} from './schemas';

export type EmailIngestionFilters = {
  accountId?: string;
  query?: string;
  status?: EmailIngestionStatus;
};

export type EmailIngestionPageInput = EmailIngestionFilters & {
  page: number;
  pageSize: number;
  organizationId: string;
};

const now = () => new Date().toISOString();

export const listEmailIngestions = async ({
  accountId,
  page,
  pageSize,
  query,
  status,
  organizationId,
}: EmailIngestionPageInput) => {
  const db = getDb();
  const conditions: SQL[] = [
    eq(connectedEmailAccounts.organizationId, organizationId),
  ];

  if (accountId) {
    conditions.push(eq(emailIngestions.accountId, accountId));
  }
  if (status) {
    conditions.push(eq(emailIngestions.status, status));
  }
  if (query) {
    const search = `%${query}%`;
    const searchCondition = or(
      like(emailIngestions.subject, search),
      like(emailIngestions.fromAddress, search),
      like(emailIngestions.externalId, search),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const where = and(...conditions);
  const baseQuery = db
    .select({ total: count() })
    .from(emailIngestions)
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .where(where);
  const rowsQuery = db
    .select({
      id: emailIngestions.id,
      provider: emailIngestions.provider,
      externalId: emailIngestions.externalId,
      status: emailIngestions.status,
      subject: emailIngestions.subject,
      fromAddress: emailIngestions.fromAddress,
      receivedAt: emailIngestions.receivedAt,
      error: emailIngestions.error,
      attempts: emailIngestions.attempts,
      createdAt: emailIngestions.createdAt,
      accountEmail: connectedEmailAccounts.email,
      rfqId: emailIngestions.rfqId,
      rfqReference: rfqs.reference,
    })
    .from(emailIngestions)
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .leftJoin(rfqs, eq(emailIngestions.rfqId, rfqs.id))
    .where(where)
    .orderBy(desc(emailIngestions.receivedAt), desc(emailIngestions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [[totalResult], rows] = await Promise.all([baseQuery, rowsQuery]);
  return { rows, total: totalResult?.total ?? 0 };
};

export const getEmailIngestionCounts = async (organizationId: string) => {
  const db = getDb();
  const grouped = await db
    .select({ status: emailIngestions.status, total: count() })
    .from(emailIngestions)
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .where(eq(connectedEmailAccounts.organizationId, organizationId))
    .groupBy(emailIngestions.status);

  const counts: Record<EmailIngestionStatus, number> = {
    processing: 0,
    processed: 0,
    ignored: 0,
    failed: 0,
  };
  grouped.forEach((row) => {
    counts[row.status] = row.total;
  });
  return counts;
};

export const getEmailSyncTime = async (accountId: string) => {
  const db = getDb();
  const state = await db.query.emailAccountSyncStates.findFirst({
    where: eq(emailAccountSyncStates.accountId, accountId),
  });
  return state ? new Date(state.lastSuccessfulAt) : null;
};

export const saveEmailSyncTime = async (accountId: string, date: Date) => {
  const db = getDb();
  await db
    .insert(emailAccountSyncStates)
    .values({ accountId, lastSuccessfulAt: date.toISOString() })
    .onConflictDoUpdate({
      target: emailAccountSyncStates.accountId,
      set: { lastSuccessfulAt: date.toISOString(), updatedAt: now() },
    });
};

export const claimEmail = async (
  accountId: string,
  provider: string,
  message: EmailMessage,
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(emailIngestions)
    .values({
      id,
      accountId,
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
        eq(emailIngestions.accountId, accountId),
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
