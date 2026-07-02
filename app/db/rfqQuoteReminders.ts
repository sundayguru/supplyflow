import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { getDb } from './connection';
import {
  connectedEmailAccounts,
  emailIngestions,
  organizations,
  purchaseOrders,
  rfqs,
} from './schemas';

export const listDueRfqQuoteReminders = (cutoff: Date, limit = 50) => {
  const db = getDb();
  return db
    .select({
      rfqId: rfqs.id,
      organizationId: rfqs.organizationId,
      reference: rfqs.reference,
      customerName: rfqs.customerName,
      customerEmail: rfqs.customerEmail,
      quotationSentAt: rfqs.quotationSentAt,
      externalId: emailIngestions.externalId,
      threadId: emailIngestions.threadId,
      subject: emailIngestions.subject,
      fromAddress: emailIngestions.fromAddress,
      accountId: connectedEmailAccounts.id,
      accountProvider: connectedEmailAccounts.provider,
      accountEmail: connectedEmailAccounts.email,
      encryptedRefreshToken: connectedEmailAccounts.encryptedRefreshToken,
      organizationName: organizations.name,
    })
    .from(rfqs)
    .innerJoin(organizations, eq(rfqs.organizationId, organizations.id))
    .innerJoin(emailIngestions, eq(emailIngestions.rfqId, rfqs.id))
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .leftJoin(purchaseOrders, eq(purchaseOrders.rfqId, rfqs.id))
    .where(
      and(
        eq(rfqs.status, 'sent'),
        isNotNull(rfqs.quotationSentAt),
        lte(rfqs.quotationSentAt, cutoff.toISOString()),
        isNull(rfqs.quoteReminderSentAt),
        isNull(purchaseOrders.id),
        eq(connectedEmailAccounts.isActive, true),
        eq(connectedEmailAccounts.needsReconnect, false),
      ),
    )
    .limit(limit);
};

export const markRfqQuoteReminderSent = async (rfqId: string) => {
  const db = getDb();
  const remindedAt = new Date().toISOString();
  const [updated] = await db
    .update(rfqs)
    .set({ quoteReminderSentAt: remindedAt, updatedAt: remindedAt })
    .where(eq(rfqs.id, rfqId))
    .returning({ id: rfqs.id });
  return updated ?? null;
};
