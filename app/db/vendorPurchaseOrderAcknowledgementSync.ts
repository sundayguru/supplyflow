import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './connection';
import {
  connectedEmailAccounts,
  organizations,
  vendorPurchaseOrderAcknowledgements,
  vendorPurchaseOrders,
} from './schemas';

export const listSentVendorPurchaseOrdersAwaitingAcknowledgement = (
  limit = 50,
) => {
  const db = getDb();
  return db
    .select({
      vendorPurchaseOrderId: vendorPurchaseOrders.id,
      organizationId: vendorPurchaseOrders.organizationId,
      userId: vendorPurchaseOrders.userId,
      reference: vendorPurchaseOrders.reference,
      vendorEmail: vendorPurchaseOrders.vendorEmail,
      threadId: vendorPurchaseOrders.generatedEmailDraftThreadId,
      preferredModel: organizations.preferredModel,
      accountId: connectedEmailAccounts.id,
      accountProvider: connectedEmailAccounts.provider,
      accountEmail: connectedEmailAccounts.email,
      encryptedRefreshToken: connectedEmailAccounts.encryptedRefreshToken,
    })
    .from(vendorPurchaseOrders)
    .innerJoin(
      organizations,
      eq(vendorPurchaseOrders.organizationId, organizations.id),
    )
    .innerJoin(
      connectedEmailAccounts,
      eq(
        vendorPurchaseOrders.generatedEmailDraftAccountId,
        connectedEmailAccounts.id,
      ),
    )
    .leftJoin(
      vendorPurchaseOrderAcknowledgements,
      eq(
        vendorPurchaseOrderAcknowledgements.vendorPurchaseOrderId,
        vendorPurchaseOrders.id,
      ),
    )
    .where(
      and(
        eq(vendorPurchaseOrders.status, 'sent'),
        isNull(vendorPurchaseOrderAcknowledgements.id),
        eq(connectedEmailAccounts.isActive, true),
        eq(connectedEmailAccounts.needsReconnect, false),
      ),
    )
    .limit(limit);
};
