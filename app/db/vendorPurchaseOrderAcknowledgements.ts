import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type {
  VendorPurchaseOrderAcknowledgementInput,
  VendorPurchaseOrderAcknowledgementItemInput,
  VendorPurchaseOrderAcknowledgementRecord,
  VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import { getDb } from './connection';
import { appendStatusChange } from '~/utils/statusHistory';
import {
  vendorPurchaseOrderAcknowledgementItems,
  vendorPurchaseOrderAcknowledgements,
  vendorPurchaseOrderItems,
  vendorPurchaseOrders,
  purchaseOrderItems,
} from './schemas';

const createReference = () =>
  `VPOA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (
  acknowledgementId: string,
  items: VendorPurchaseOrderAcknowledgementItemInput[],
) =>
  items.map((item, position) => ({
    ...item,
    id: crypto.randomUUID(),
    acknowledgementId,
    position,
  }));

const withLinkedVendorPurchaseOrder = <
  Acknowledgement extends {
    vendorPurchaseOrder: {
      id: string;
      reference: string;
      vendorName: string;
      vendorEmail: string | null;
      currency: string;
    };
  },
>(
  acknowledgement: Acknowledgement,
): Omit<Acknowledgement, 'vendorPurchaseOrder'> & {
  linkedVendorPurchaseOrder: Acknowledgement['vendorPurchaseOrder'];
} => {
  const { vendorPurchaseOrder, ...record } = acknowledgement;
  return {
    ...record,
    linkedVendorPurchaseOrder: vendorPurchaseOrder,
  };
};

export const getVendorPurchaseOrderAcknowledgements = async (
  organizationId: string,
): Promise<VendorPurchaseOrderAcknowledgementRecord[]> => {
  const db = getDb();
  const records = await db.query.vendorPurchaseOrderAcknowledgements.findMany({
    where: eq(
      vendorPurchaseOrderAcknowledgements.organizationId,
      organizationId,
    ),
    orderBy: [desc(vendorPurchaseOrderAcknowledgements.createdAt)],
    with: {
      creator: { columns: { firstName: true, lastName: true } },
      items: {
        orderBy: [asc(vendorPurchaseOrderAcknowledgementItems.position)],
      },
      vendorPurchaseOrder: {
        columns: {
          id: true,
          reference: true,
          vendorName: true,
          vendorEmail: true,
          currency: true,
        },
      },
    },
  });
  return records.map((record) => withLinkedVendorPurchaseOrder(record));
};

export const getVendorPurchaseOrderAcknowledgement = async (
  id: string,
  organizationId: string,
): Promise<VendorPurchaseOrderAcknowledgementRecord | null> => {
  const db = getDb();
  const record = await db.query.vendorPurchaseOrderAcknowledgements.findFirst({
    where: and(
      eq(vendorPurchaseOrderAcknowledgements.id, id),
      eq(vendorPurchaseOrderAcknowledgements.organizationId, organizationId),
    ),
    with: {
      creator: { columns: { firstName: true, lastName: true } },
      items: {
        orderBy: [asc(vendorPurchaseOrderAcknowledgementItems.position)],
      },
      vendorPurchaseOrder: {
        columns: {
          id: true,
          reference: true,
          vendorName: true,
          vendorEmail: true,
          currency: true,
        },
      },
    },
  });
  return record ? withLinkedVendorPurchaseOrder(record) : null;
};

export const updateVendorPurchaseOrderAcknowledgementItem = async (
  itemId: string,
  organizationId: string,
  input: VendorPurchaseOrderAcknowledgementItemInput,
) => {
  const db = getDb();
  const existing =
    await db.query.vendorPurchaseOrderAcknowledgementItems.findFirst({
      where: eq(vendorPurchaseOrderAcknowledgementItems.id, itemId),
    });
  if (!existing) {
    return null;
  }
  const parent = await getVendorPurchaseOrderAcknowledgement(
    existing.acknowledgementId,
    organizationId,
  );
  if (!parent) {
    return null;
  }
  const updatedAt = new Date().toISOString();
  const statusReason =
    existing.status !== input.status && input.statusReason?.trim()
      ? appendStatusChange(existing.statusReason, {
          fromStatus: existing.status,
          toStatus: input.status,
          reason: input.statusReason.trim(),
          changedAt: updatedAt,
        })
      : (input.statusReason ?? existing.statusReason);
  const statements = [
    db
      .update(vendorPurchaseOrderAcknowledgementItems)
      .set({ ...input, statusReason, updatedAt })
      .where(eq(vendorPurchaseOrderAcknowledgementItems.id, itemId)),
  ] as const;
  if (existing.status !== input.status && existing.vendorPurchaseOrderItemId) {
    const vendorPurchaseOrder = await db.query.vendorPurchaseOrders.findFirst({
      where: and(
        eq(vendorPurchaseOrders.id, parent.vendorPurchaseOrderId),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
      with: { items: true },
    });
    const vendorItem = vendorPurchaseOrder?.items.find(
      (item) => item.id === existing.vendorPurchaseOrderItemId,
    );
    const purchaseOrderItemsForVendorOrder = vendorPurchaseOrder
      ? await db.query.purchaseOrderItems.findMany({
          where: eq(
            purchaseOrderItems.purchaseOrderId,
            vendorPurchaseOrder.purchaseOrderId,
          ),
        })
      : [];
    const matchingPurchaseOrderItems = purchaseOrderItemsForVendorOrder
      .filter((purchaseOrderItem) => {
        if (!vendorItem) {
          return false;
        }
        const vendorPartNumber = vendorItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        const purchaseOrderPartNumber = purchaseOrderItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        if (vendorPartNumber && purchaseOrderPartNumber) {
          return vendorPartNumber === purchaseOrderPartNumber;
        }
        return (
          vendorItem.description.trim().toLowerCase() ===
          purchaseOrderItem.description.trim().toLowerCase()
        );
      })
      .map((item) => item);
    if (matchingPurchaseOrderItems.length) {
      const purchaseOrderUpdates = matchingPurchaseOrderItems.map((item) => {
        const purchaseOrderStatusReason =
          input.statusReason?.trim() && item.status !== input.status
            ? appendStatusChange(item.statusReason, {
                fromStatus: item.status,
                toStatus: input.status,
                reason: input.statusReason.trim(),
                changedAt: updatedAt,
              })
            : item.statusReason;
        return db
          .update(purchaseOrderItems)
          .set({
            status: input.status,
            statusReason: purchaseOrderStatusReason,
            updatedAt,
          })
          .where(eq(purchaseOrderItems.id, item.id));
      });
      await db.batch([...statements, ...purchaseOrderUpdates]);
    } else {
      await db.batch(statements);
    }
  } else {
    await db.batch(statements);
  }
  return await getVendorPurchaseOrderAcknowledgement(
    existing.acknowledgementId,
    organizationId,
  );
};

export const getVendorPurchaseOrderAcknowledgementBySourceEmail = async (
  sourceEmailIngestionId: string,
  organizationId: string,
) => {
  const db = getDb();
  return await db.query.vendorPurchaseOrderAcknowledgements.findFirst({
    where: and(
      eq(
        vendorPurchaseOrderAcknowledgements.sourceEmailIngestionId,
        sourceEmailIngestionId,
      ),
      eq(vendorPurchaseOrderAcknowledgements.organizationId, organizationId),
    ),
  });
};

export const createVendorPurchaseOrderAcknowledgement = async (
  organizationId: string,
  userId: string,
  input: VendorPurchaseOrderAcknowledgementInput,
  options: { sourceEmailIngestionId?: string | null } = {},
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const { items, ...acknowledgementInput } = input;
  const vendorPurchaseOrder = await db.query.vendorPurchaseOrders.findFirst({
    where: and(
      eq(vendorPurchaseOrders.id, input.vendorPurchaseOrderId),
      eq(vendorPurchaseOrders.organizationId, organizationId),
    ),
    with: {
      items: true,
    },
  });
  const acknowledgedVendorItems =
    vendorPurchaseOrder?.items.filter((vendorItem) =>
      items.some(
        (ackItem) => ackItem.vendorPurchaseOrderItemId === vendorItem.id,
      ),
    ) ?? [];
  const purchaseOrderItemRecords = vendorPurchaseOrder
    ? await db.query.purchaseOrderItems.findMany({
        where: eq(
          purchaseOrderItems.purchaseOrderId,
          vendorPurchaseOrder.purchaseOrderId,
        ),
      })
    : [];
  const matchingPurchaseOrderItemIds = purchaseOrderItemRecords
    .filter((purchaseOrderItem) =>
      acknowledgedVendorItems.some((vendorItem) => {
        const vendorPartNumber = vendorItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        const purchaseOrderPartNumber = purchaseOrderItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        if (vendorPartNumber && purchaseOrderPartNumber) {
          return vendorPartNumber === purchaseOrderPartNumber;
        }
        return (
          vendorItem.description.trim().toLowerCase() ===
          purchaseOrderItem.description.trim().toLowerCase()
        );
      }),
    )
    .map((item) => item.id);

  const acknowledgementStatements = [
    db.insert(vendorPurchaseOrderAcknowledgements).values({
      ...acknowledgementInput,
      id,
      userId,
      organizationId,
      reference: createReference(),
      sourceEmailIngestionId: options.sourceEmailIngestionId ?? null,
    }),
    db
      .insert(vendorPurchaseOrderAcknowledgementItems)
      .values(createItemValues(id, items)),
  ] as const;
  if (matchingPurchaseOrderItemIds.length) {
    await db.batch([
      ...acknowledgementStatements,
      db
        .update(purchaseOrderItems)
        .set({ status: 'ordered', updatedAt: new Date().toISOString() })
        .where(inArray(purchaseOrderItems.id, matchingPurchaseOrderItemIds)),
    ]);
  } else {
    await db.batch(acknowledgementStatements);
  }

  return getVendorPurchaseOrderAcknowledgement(id, organizationId);
};

export const updateVendorPurchaseOrderAcknowledgement = async (
  id: string,
  organizationId: string,
  input: VendorPurchaseOrderAcknowledgementInput,
) => {
  const existing = await getVendorPurchaseOrderAcknowledgement(
    id,
    organizationId,
  );
  if (!existing) {
    return null;
  }

  const db = getDb();
  const { items, ...acknowledgementInput } = input;
  const updatedAt = new Date().toISOString();
  const vendorPurchaseOrder = await db.query.vendorPurchaseOrders.findFirst({
    where: and(
      eq(vendorPurchaseOrders.id, input.vendorPurchaseOrderId),
      eq(vendorPurchaseOrders.organizationId, organizationId),
    ),
    with: { items: true },
  });
  const purchaseOrderItemsForVendorOrder = vendorPurchaseOrder
    ? await db.query.purchaseOrderItems.findMany({
        where: eq(
          purchaseOrderItems.purchaseOrderId,
          vendorPurchaseOrder.purchaseOrderId,
        ),
      })
    : [];
  const updatedItemStatuses = items.flatMap((acknowledgementItem, position) => {
    const vendorItem = vendorPurchaseOrder?.items.find(
      (item) => item.id === acknowledgementItem.vendorPurchaseOrderItemId,
    );
    if (!vendorItem) {
      return [];
    }
    const matchingItems = purchaseOrderItemsForVendorOrder.filter(
      (purchaseOrderItem) => {
        const vendorPartNumber = vendorItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        const purchaseOrderPartNumber = purchaseOrderItem.manufacturerPartNumber
          ?.trim()
          .toLowerCase();
        if (vendorPartNumber && purchaseOrderPartNumber) {
          return vendorPartNumber === purchaseOrderPartNumber;
        }
        return (
          vendorItem.description.trim().toLowerCase() ===
          purchaseOrderItem.description.trim().toLowerCase()
        );
      },
    );
    return matchingItems.map((purchaseOrderItem) => ({
      id: purchaseOrderItem.id,
      status: acknowledgementItem.status,
      statusReason:
        existing.items[position]?.status !== acknowledgementItem.status &&
        acknowledgementItem.statusReason?.trim()
          ? appendStatusChange(purchaseOrderItem.statusReason, {
              fromStatus: purchaseOrderItem.status,
              toStatus: acknowledgementItem.status,
              reason: acknowledgementItem.statusReason.trim(),
              changedAt: updatedAt,
            })
          : purchaseOrderItem.statusReason,
    }));
  });

  const statements = [
    db
      .update(vendorPurchaseOrderAcknowledgements)
      .set({ ...acknowledgementInput, updatedAt })
      .where(
        and(
          eq(vendorPurchaseOrderAcknowledgements.id, id),
          eq(
            vendorPurchaseOrderAcknowledgements.organizationId,
            organizationId,
          ),
        ),
      ),
    db
      .delete(vendorPurchaseOrderAcknowledgementItems)
      .where(eq(vendorPurchaseOrderAcknowledgementItems.acknowledgementId, id)),
    db.insert(vendorPurchaseOrderAcknowledgementItems).values(
      createItemValues(id, items).map((item) => ({
        ...item,
        statusReason:
          existing.items[item.position]?.status !== item.status &&
          item.statusReason?.trim()
            ? appendStatusChange(existing.items[item.position]?.statusReason, {
                fromStatus: existing.items[item.position]?.status ?? null,
                toStatus: item.status,
                reason: item.statusReason.trim(),
                changedAt: updatedAt,
              })
            : (item.statusReason ??
              existing.items[item.position]?.statusReason ??
              null),
        updatedAt,
      })),
    ),
  ] as const;
  if (updatedItemStatuses.length) {
    const updates = updatedItemStatuses.map(
      ({ id: itemId, status, statusReason }) =>
        db
          .update(purchaseOrderItems)
          .set({ status, statusReason, updatedAt })
          .where(eq(purchaseOrderItems.id, itemId)),
    );
    await db.batch([...statements, ...updates]);
  } else {
    await db.batch(statements);
  }

  return getVendorPurchaseOrderAcknowledgement(id, organizationId);
};

export const deleteVendorPurchaseOrderAcknowledgement = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .delete(vendorPurchaseOrderAcknowledgements)
    .where(
      and(
        eq(vendorPurchaseOrderAcknowledgements.id, id),
        eq(vendorPurchaseOrderAcknowledgements.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrderAcknowledgements.id });
  return record ?? null;
};

export const updateVendorPurchaseOrderAcknowledgementStatus = async (
  id: string,
  organizationId: string,
  status: VendorPurchaseOrderAcknowledgementStatus,
  statusReason: string | null,
) => {
  const db = getDb();
  const existing = await getVendorPurchaseOrderAcknowledgement(
    id,
    organizationId,
  );
  if (!existing) {
    return null;
  }
  const updatedAt = new Date().toISOString();
  const [record] = await db
    .update(vendorPurchaseOrderAcknowledgements)
    .set({
      status,
      statusReason:
        statusReason?.trim() && existing.status !== status
          ? appendStatusChange(existing.statusReason, {
              fromStatus: existing.status,
              toStatus: status,
              reason: statusReason.trim(),
              changedAt: updatedAt,
            })
          : existing.statusReason,
      updatedAt,
    })
    .where(
      and(
        eq(vendorPurchaseOrderAcknowledgements.id, id),
        eq(vendorPurchaseOrderAcknowledgements.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrderAcknowledgements.id });
  return record
    ? getVendorPurchaseOrderAcknowledgement(record.id, organizationId)
    : null;
};

export const hasOrganizationVendorPurchaseOrder = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .select({ id: vendorPurchaseOrders.id })
    .from(vendorPurchaseOrders)
    .where(
      and(
        eq(vendorPurchaseOrders.id, id),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  return !!record;
};

export const getVendorPurchaseOrderByReference = async (
  reference: string,
  organizationId: string,
) => {
  const db = getDb();
  return await db.query.vendorPurchaseOrders.findFirst({
    where: and(
      eq(vendorPurchaseOrders.reference, reference),
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
};

export const markVendorPurchaseOrderAcknowledged = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .update(vendorPurchaseOrders)
    .set({ status: 'acknowledged', updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(vendorPurchaseOrders.id, id),
        eq(vendorPurchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: vendorPurchaseOrders.id });
  return record ?? null;
};
