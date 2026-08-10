import { and, eq, isNotNull } from 'drizzle-orm';
import { getDb } from './connection';
import { connectedEmailAccounts, vendorPurchaseOrders } from './schemas';

export const listVendorPurchaseOrdersWithDraftedEmails = (limit = 50) => {
  const db = getDb();
  return db
    .select({
      vendorPurchaseOrderId: vendorPurchaseOrders.id,
      reference: vendorPurchaseOrders.reference,
      draftId: vendorPurchaseOrders.generatedEmailDraftId,
      draftUpdatedAt: vendorPurchaseOrders.generatedEmailDraftUpdatedAt,
      vendorPurchaseOrderUpdatedAt: vendorPurchaseOrders.updatedAt,
      threadId: vendorPurchaseOrders.generatedEmailDraftThreadId,
      accountId: connectedEmailAccounts.id,
      accountProvider: connectedEmailAccounts.provider,
      accountEmail: connectedEmailAccounts.email,
      encryptedRefreshToken: connectedEmailAccounts.encryptedRefreshToken,
    })
    .from(vendorPurchaseOrders)
    .innerJoin(
      connectedEmailAccounts,
      eq(
        vendorPurchaseOrders.generatedEmailDraftAccountId,
        connectedEmailAccounts.id,
      ),
    )
    .where(
      and(
        isNotNull(vendorPurchaseOrders.generatedEmailDraftId),
        eq(vendorPurchaseOrders.status, 'review_email'),
        eq(connectedEmailAccounts.isActive, true),
        eq(connectedEmailAccounts.needsReconnect, false),
      ),
    )
    .limit(limit);
};

export const markVendorPurchaseOrderDraftSent = async (
  vendorPurchaseOrderId: string,
) => {
  const db = getDb();
  const sentAt = new Date().toISOString();
  const [updated] = await db
    .update(vendorPurchaseOrders)
    .set({ status: 'sent', updatedAt: sentAt })
    .where(eq(vendorPurchaseOrders.id, vendorPurchaseOrderId))
    .returning({ id: vendorPurchaseOrders.id });
  return updated ?? null;
};
