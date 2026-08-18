import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type {
  VendorPurchaseOrderInput,
  VendorPurchaseOrderItemInput,
  VendorPurchaseOrderRecord,
  VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { calculatePurchaseOrderTotals } from '~/utils/purchaseOrder';
import { getDb } from './connection';
import {
  purchaseOrders,
  vendorPurchaseOrderAcknowledgements,
  vendorPurchaseOrderItems,
  vendorPurchaseOrders,
} from './schemas';

const createReference = () =>
  `VPO-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (
  vendorPurchaseOrderId: string,
  items: VendorPurchaseOrderItemInput[],
) =>
  items.map((item, position) => ({
    ...item,
    id: crypto.randomUUID(),
    vendorPurchaseOrderId,
    position,
  }));

const withTotals = <
  VendorPurchaseOrder extends {
    items: VendorPurchaseOrderItemInput[];
    purchaseOrder: {
      id: string;
      reference: string;
      supplierName: string;
    };
  },
>(
  vendorPurchaseOrder: VendorPurchaseOrder,
): Omit<VendorPurchaseOrder, 'purchaseOrder'> & {
  linkedPurchaseOrder: VendorPurchaseOrder['purchaseOrder'];
  subtotal: number;
  totalValue: number;
} => {
  const { purchaseOrder, ...record } = vendorPurchaseOrder;
  const totals = calculatePurchaseOrderTotals(
    vendorPurchaseOrder.items,
    0,
    false,
  );
  return {
    ...record,
    linkedPurchaseOrder: purchaseOrder,
    subtotal: totals.subtotal,
    totalValue: totals.totalValue,
  };
};

const getLinkedAcknowledgementsByVendorPurchaseOrderIds = async (
  vendorPurchaseOrderIds: string[],
) => {
  if (!vendorPurchaseOrderIds.length) {
    return new Map<
      string,
      VendorPurchaseOrderRecord['linkedAcknowledgements']
    >();
  }

  const db = getDb();
  const records = await db
    .select({
      id: vendorPurchaseOrderAcknowledgements.id,
      vendorPurchaseOrderId:
        vendorPurchaseOrderAcknowledgements.vendorPurchaseOrderId,
      reference: vendorPurchaseOrderAcknowledgements.reference,
      acknowledgementReference:
        vendorPurchaseOrderAcknowledgements.acknowledgementReference,
    })
    .from(vendorPurchaseOrderAcknowledgements)
    .where(
      inArray(
        vendorPurchaseOrderAcknowledgements.vendorPurchaseOrderId,
        vendorPurchaseOrderIds,
      ),
    )
    .orderBy(desc(vendorPurchaseOrderAcknowledgements.createdAt));

  return records.reduce((linkedAcknowledgements, record) => {
    const existing =
      linkedAcknowledgements.get(record.vendorPurchaseOrderId) ?? [];
    linkedAcknowledgements.set(record.vendorPurchaseOrderId, [
      ...existing,
      {
        id: record.id,
        reference: record.reference,
        acknowledgementReference: record.acknowledgementReference,
      },
    ]);
    return linkedAcknowledgements;
  }, new Map<string, VendorPurchaseOrderRecord['linkedAcknowledgements']>());
};

export const getVendorPurchaseOrders = async (
  organizationId: string,
): Promise<VendorPurchaseOrderRecord[]> => {
  const db = getDb();
  const records = await db.query.vendorPurchaseOrders.findMany({
    where: eq(vendorPurchaseOrders.organizationId, organizationId),
    orderBy: [desc(vendorPurchaseOrders.createdAt)],
    with: {
      items: { orderBy: [asc(vendorPurchaseOrderItems.position)] },
      purchaseOrder: {
        columns: {
          id: true,
          reference: true,
          supplierName: true,
        },
      },
    },
  });
  const linkedAcknowledgements =
    await getLinkedAcknowledgementsByVendorPurchaseOrderIds(
      records.map((record) => record.id),
    );
  return records.map((record) =>
    withTotals({
      ...record,
      linkedAcknowledgements: linkedAcknowledgements.get(record.id) ?? [],
    }),
  );
};

export const getVendorPurchaseOrder = async (
  id: string,
  organizationId: string,
): Promise<VendorPurchaseOrderRecord | null> => {
  const db = getDb();
  const record = await db.query.vendorPurchaseOrders.findFirst({
    where: and(
      eq(vendorPurchaseOrders.id, id),
      eq(vendorPurchaseOrders.organizationId, organizationId),
    ),
    with: {
      items: { orderBy: [asc(vendorPurchaseOrderItems.position)] },
      purchaseOrder: {
        columns: {
          id: true,
          reference: true,
          supplierName: true,
        },
      },
    },
  });
  if (!record) {
    return null;
  }
  const linkedAcknowledgements =
    await getLinkedAcknowledgementsByVendorPurchaseOrderIds([record.id]);
  return withTotals({
    ...record,
    linkedAcknowledgements: linkedAcknowledgements.get(record.id) ?? [],
  });
};

export const createVendorPurchaseOrder = async (
  organizationId: string,
  userId: string,
  input: VendorPurchaseOrderInput,
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const { items, ...vendorPurchaseOrderInput } = input;

  await db.batch([
    db.insert(vendorPurchaseOrders).values({
      ...vendorPurchaseOrderInput,
      id,
      userId,
      organizationId,
      reference: createReference(),
    }),
    db.insert(vendorPurchaseOrderItems).values(createItemValues(id, items)),
  ]);

  return getVendorPurchaseOrder(id, organizationId);
};

export const updateVendorPurchaseOrder = async (
  id: string,
  organizationId: string,
  input: VendorPurchaseOrderInput,
) => {
  const existing = await getVendorPurchaseOrder(id, organizationId);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const { items, ...vendorPurchaseOrderInput } = input;
  const updatedAt = new Date().toISOString();

  await db.batch([
    db
      .update(vendorPurchaseOrders)
      .set({ ...vendorPurchaseOrderInput, updatedAt })
      .where(
        and(
          eq(vendorPurchaseOrders.id, id),
          eq(vendorPurchaseOrders.organizationId, organizationId),
        ),
      ),
    db
      .delete(vendorPurchaseOrderItems)
      .where(eq(vendorPurchaseOrderItems.vendorPurchaseOrderId, id)),
    db.insert(vendorPurchaseOrderItems).values(
      createItemValues(id, items).map((item) => ({
        ...item,
        updatedAt,
      })),
    ),
  ]);

  return getVendorPurchaseOrder(id, organizationId);
};

export const deleteVendorPurchaseOrder = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .delete(vendorPurchaseOrders)
    .where(
      and(
        eq(vendorPurchaseOrders.id, id),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrders.id });
  return record ?? null;
};

export const updateVendorPurchaseOrderStatus = async (
  id: string,
  organizationId: string,
  status: VendorPurchaseOrderStatus,
) => {
  const db = getDb();
  const [record] = await db
    .update(vendorPurchaseOrders)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(vendorPurchaseOrders.id, id),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrders.id });
  return record ? getVendorPurchaseOrder(record.id, organizationId) : null;
};

export const updateVendorPurchaseOrderEmailDraft = async (
  id: string,
  organizationId: string,
  draftId: string,
  draftAccountId: string,
  draftThreadId: string | null,
) => {
  const db = getDb();
  const [record] = await db
    .update(vendorPurchaseOrders)
    .set({
      status: 'review_email',
      generatedEmailDraftId: draftId,
      generatedEmailDraftUpdatedAt: new Date().toISOString(),
      generatedEmailDraftAccountId: draftAccountId,
      generatedEmailDraftThreadId: draftThreadId,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(vendorPurchaseOrders.id, id),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrders.id });
  return record ? await getVendorPurchaseOrder(id, organizationId) : null;
};

export const hasOrganizationPurchaseOrder = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  return !!record;
};
