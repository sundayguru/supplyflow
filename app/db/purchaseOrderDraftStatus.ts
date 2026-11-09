import { and, eq, isNotNull } from 'drizzle-orm';
import { getDb } from './connection';
import {
  connectedEmailAccounts,
  emailIngestions,
  purchaseOrders,
} from './schemas';

export const listPurchaseOrdersWithDraftedProformaInvoices = (limit = 50) => {
  const db = getDb();
  return db
    .select({
      purchaseOrderId: purchaseOrders.id,
      organizationId: purchaseOrders.organizationId,
      reference: purchaseOrders.reference,
      customerEmail: purchaseOrders.supplierEmail,
      draftId: purchaseOrders.proformaInvoiceDraftId,
      draftUpdatedAt: purchaseOrders.proformaInvoiceDraftUpdatedAt,
      purchaseOrderUpdatedAt: purchaseOrders.updatedAt,
      threadId: emailIngestions.threadId,
      originalMessageId: emailIngestions.externalId,
      subject: emailIngestions.subject,
      recipient: emailIngestions.fromAddress,
      accountId: connectedEmailAccounts.id,
      accountProvider: connectedEmailAccounts.provider,
      accountEmail: connectedEmailAccounts.email,
      encryptedRefreshToken: connectedEmailAccounts.encryptedRefreshToken,
    })
    .from(purchaseOrders)
    .innerJoin(
      emailIngestions,
      eq(emailIngestions.purchaseOrderId, purchaseOrders.id),
    )
    .innerJoin(
      connectedEmailAccounts,
      eq(emailIngestions.accountId, connectedEmailAccounts.id),
    )
    .where(
      and(
        isNotNull(purchaseOrders.proformaInvoiceDraftId),
        eq(purchaseOrders.status, 'review_email'),
        eq(connectedEmailAccounts.isActive, true),
        eq(connectedEmailAccounts.needsReconnect, false),
      ),
    )
    .limit(limit);
};

export const markPurchaseOrderProformaInvoiceSent = async (
  purchaseOrderId: string,
  draftId: string,
) => {
  const db = getDb();
  const sentAt = new Date().toISOString();
  const [updated] = await db
    .update(purchaseOrders)
    .set({
      status: 'acknowledged',
      proformaInvoiceSentAt: sentAt,
      updatedAt: sentAt,
    })
    .where(
      and(
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.status, 'review_email'),
        eq(purchaseOrders.proformaInvoiceDraftId, draftId),
      ),
    )
    .returning({ id: purchaseOrders.id });
  return updated ?? null;
};
