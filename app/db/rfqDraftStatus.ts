import { and, eq, isNotNull, notInArray } from 'drizzle-orm';
import type { RfqStatus } from '~/types/rfq';
import { getDb } from './connection';
import { connectedEmailAccounts, emailIngestions, rfqs } from './schemas';

const terminalDraftStatuses: RfqStatus[] = ['sent', 'won', 'lost'];

export const listRfqsWithDraftedEmails = (limit = 50) => {
  const db = getDb();
  return db
    .select({
      rfqId: rfqs.id,
      organizationId: rfqs.organizationId,
      reference: rfqs.reference,
      draftId: rfqs.generatedReplyDraftId,
      draftUpdatedAt: rfqs.generatedReplyDraftUpdatedAt,
      rfqUpdatedAt: rfqs.updatedAt,
      threadId: emailIngestions.threadId,
      accountId: connectedEmailAccounts.id,
      accountProvider: connectedEmailAccounts.provider,
      accountEmail: connectedEmailAccounts.email,
      encryptedRefreshToken: connectedEmailAccounts.encryptedRefreshToken,
    })
    .from(rfqs)
    .innerJoin(emailIngestions, eq(emailIngestions.rfqId, rfqs.id))
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .where(
      and(
        isNotNull(rfqs.generatedReplyDraftId),
        notInArray(rfqs.status, terminalDraftStatuses),
        eq(connectedEmailAccounts.isActive, true),
        eq(connectedEmailAccounts.needsReconnect, false),
      ),
    )
    .limit(limit);
};

export const markRfqDraftSent = async (rfqId: string) => {
  const db = getDb();
  const sentAt = new Date().toISOString();
  const [updated] = await db
    .update(rfqs)
    .set({
      status: 'sent',
      quotationSentAt: sentAt,
      quoteReminderSentAt: null,
      updatedAt: sentAt,
    })
    .where(eq(rfqs.id, rfqId))
    .returning({ id: rfqs.id });
  return updated ?? null;
};
