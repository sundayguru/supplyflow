import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  PurchaseOrderInput,
  PurchaseOrderItemInput,
  PurchaseOrderItemStatus,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import type { RfqItemRecord } from '~/types/rfq';
import { calculatePurchaseOrderTotals } from '~/utils/purchaseOrder';
import { getDb } from './connection';
import {
  emailIngestions,
  purchaseOrderItems,
  purchaseOrderPaymentConfirmations,
  purchaseOrders,
  rfqItems,
  vendorPurchaseOrderAcknowledgements,
  vendorPurchaseOrders,
} from './schemas';

const createReference = () =>
  `PO-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (
  purchaseOrderId: string,
  items: PurchaseOrderItemInput[],
) =>
  items.map((item, position) => ({
    ...item,
    id: crypto.randomUUID(),
    purchaseOrderId,
    position,
  }));

type CreatePurchaseOrderOptions = {
  validationSummary?: string | null;
};

const withTotals = <
  PurchaseOrder extends {
    items: PurchaseOrderItemInput[];
    applyVat: boolean;
    rfq: {
      id: string;
      reference: string;
      customerName: string;
      items: RfqItemRecord[];
    } | null;
    paymentConfirmations?: Array<{
      id: string;
      purchaseOrderId: string;
      amountPaid: number;
      paymentDate: string;
      paymentReference: string;
      confirmedByUserId: string;
      createdAt: string;
      confirmedBy: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
  },
>(
  purchaseOrder: PurchaseOrder,
  vatRate: number,
) => {
  const { rfq, ...record } = purchaseOrder;
  const totals = calculatePurchaseOrderTotals(
    purchaseOrder.items,
    vatRate,
    purchaseOrder.applyVat,
  );
  const paymentConfirmations = (purchaseOrder.paymentConfirmations ?? []).map(
    (payment) => ({
      id: payment.id,
      purchaseOrderId: payment.purchaseOrderId,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
      paymentReference: payment.paymentReference,
      confirmedByUserId: payment.confirmedByUserId,
      confirmedBy: {
        id: payment.confirmedBy.id,
        name: `${payment.confirmedBy.firstName} ${payment.confirmedBy.lastName}`,
        email: payment.confirmedBy.email,
      },
      createdAt: payment.createdAt,
    }),
  );
  const totalPaid = paymentConfirmations.reduce(
    (total, payment) => total + payment.amountPaid,
    0,
  );
  return {
    ...record,
    paymentConfirmations,
    linkedRfq: rfq,
    ...totals,
    totalPaid,
    outstandingValue: Math.max(0, totals.totalValue - totalPaid),
  };
};

export const getPurchaseOrders = async (
  organizationId: string,
  vatRate: number,
): Promise<PurchaseOrderRecord[]> => {
  const db = getDb();
  const records = await db.query.purchaseOrders.findMany({
    where: eq(purchaseOrders.organizationId, organizationId),
    orderBy: [desc(purchaseOrders.createdAt)],
    with: {
      items: { orderBy: [asc(purchaseOrderItems.position)] },
      paymentConfirmations: {
        orderBy: [desc(purchaseOrderPaymentConfirmations.createdAt)],
        with: {
          confirmedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      rfq: {
        columns: {
          id: true,
          reference: true,
          customerName: true,
        },
        with: {
          items: { orderBy: [asc(rfqItems.position)] },
        },
      },
    },
  });
  return records.map((purchaseOrder) => withTotals(purchaseOrder, vatRate));
};

export const getPurchaseOrder = async (
  id: string,
  organizationId: string,
  vatRate: number,
): Promise<PurchaseOrderRecord | null> => {
  const db = getDb();
  const purchaseOrder = await db.query.purchaseOrders.findFirst({
    where: and(
      eq(purchaseOrders.id, id),
      eq(purchaseOrders.organizationId, organizationId),
    ),
    with: {
      items: { orderBy: [asc(purchaseOrderItems.position)] },
      paymentConfirmations: {
        orderBy: [desc(purchaseOrderPaymentConfirmations.createdAt)],
        with: {
          confirmedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      rfq: {
        columns: {
          id: true,
          reference: true,
          customerName: true,
        },
        with: {
          items: { orderBy: [asc(rfqItems.position)] },
        },
      },
    },
  });
  return purchaseOrder ? withTotals(purchaseOrder, vatRate) : null;
};

export const createPurchaseOrder = async (
  organizationId: string,
  userId: string,
  input: PurchaseOrderInput,
  vatRate: number,
  options: CreatePurchaseOrderOptions = {},
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const { items, ...purchaseOrderInput } = input;

  await db.batch([
    db.insert(purchaseOrders).values({
      ...purchaseOrderInput,
      id,
      userId,
      organizationId,
      reference: createReference(),
      validationSummary: options.validationSummary ?? null,
    }),
    db.insert(purchaseOrderItems).values(createItemValues(id, items)),
  ]);

  return getPurchaseOrder(id, organizationId, vatRate);
};

export const updatePurchaseOrder = async (
  id: string,
  organizationId: string,
  input: PurchaseOrderInput,
  vatRate: number,
) => {
  const existing = await getPurchaseOrder(id, organizationId, vatRate);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const { items, ...purchaseOrderInput } = input;
  const updatedAt = new Date().toISOString();

  await db.batch([
    db
      .update(purchaseOrders)
      .set({ ...purchaseOrderInput, updatedAt })
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.organizationId, organizationId),
        ),
      ),
    db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id)),
    db.insert(purchaseOrderItems).values(
      createItemValues(id, items).map((item) => ({
        ...item,
        updatedAt,
      })),
    ),
  ]);

  return getPurchaseOrder(id, organizationId, vatRate);
};

export const updatePurchaseOrderStatus = async (
  id: string,
  organizationId: string,
  status: PurchaseOrderStatus,
  vatRate: number,
) => {
  const db = getDb();
  const [updated] = await db
    .update(purchaseOrders)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: purchaseOrders.id });
  return updated ? getPurchaseOrder(updated.id, organizationId, vatRate) : null;
};

export const updatePurchaseOrderValidation = async (
  id: string,
  organizationId: string,
  status: Extract<PurchaseOrderStatus, 'validated' | 'exception'>,
  validationSummary: string,
  vatRate: number,
) => {
  const db = getDb();
  const [updated] = await db
    .update(purchaseOrders)
    .set({
      status,
      validationSummary,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: purchaseOrders.id });
  return updated ? getPurchaseOrder(updated.id, organizationId, vatRate) : null;
};

export const updatePurchaseOrderProformaDraft = async (
  id: string,
  organizationId: string,
  draftId: string,
  vatRate: number,
) => {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  const [updated] = await db
    .update(purchaseOrders)
    .set({
      status: 'review_email',
      proformaInvoiceDraftId: draftId,
      proformaInvoiceDraftUpdatedAt: updatedAt,
      updatedAt,
    })
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: purchaseOrders.id });
  return updated ? getPurchaseOrder(updated.id, organizationId, vatRate) : null;
};

export const createPurchaseOrderPaymentConfirmation = async (
  purchaseOrderId: string,
  organizationId: string,
  confirmedByUserId: string,
  input: {
    amountPaid: number;
    paymentDate: string;
    paymentReference: string;
  },
  vatRate: number,
) => {
  const existing = await getPurchaseOrder(
    purchaseOrderId,
    organizationId,
    vatRate,
  );
  if (!existing) {
    return null;
  }
  if (
    existing.status !== 'awaiting_payment' &&
    existing.status !== 'partial_payment'
  ) {
    throw new Error(
      'Payments can only be confirmed for POs awaiting payment or partial payment.',
    );
  }

  const totalPaid = existing.totalPaid + input.amountPaid;
  const nextStatus: PurchaseOrderStatus =
    totalPaid < existing.totalValue ? 'partial_payment' : 'payment_confirmed';
  const now = new Date().toISOString();
  const db = getDb();

  await db.batch([
    db.insert(purchaseOrderPaymentConfirmations).values({
      id: crypto.randomUUID(),
      purchaseOrderId,
      confirmedByUserId,
      amountPaid: input.amountPaid,
      paymentDate: input.paymentDate,
      paymentReference: input.paymentReference,
    }),
    db
      .update(purchaseOrders)
      .set({ status: nextStatus, updatedAt: now })
      .where(
        and(
          eq(purchaseOrders.id, purchaseOrderId),
          eq(purchaseOrders.organizationId, organizationId),
        ),
      ),
  ]);

  return getPurchaseOrder(purchaseOrderId, organizationId, vatRate);
};

export const deletePurchaseOrder = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [existing] = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!existing) {
    return null;
  }

  const linkedVendorPurchaseOrders = await db
    .select({ id: vendorPurchaseOrders.id })
    .from(vendorPurchaseOrders)
    .where(eq(vendorPurchaseOrders.purchaseOrderId, id));
  const vendorPurchaseOrderIds = linkedVendorPurchaseOrders.map(
    (record) => record.id,
  );

  if (vendorPurchaseOrderIds.length) {
    await db
      .delete(vendorPurchaseOrderAcknowledgements)
      .where(
        inArray(
          vendorPurchaseOrderAcknowledgements.vendorPurchaseOrderId,
          vendorPurchaseOrderIds,
        ),
      );
    await db
      .delete(vendorPurchaseOrders)
      .where(inArray(vendorPurchaseOrders.id, vendorPurchaseOrderIds));
  }

  await db
    .update(emailIngestions)
    .set({ purchaseOrderId: null })
    .where(eq(emailIngestions.purchaseOrderId, id));

  const [purchaseOrder] = await db
    .delete(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .returning({ id: purchaseOrders.id });
  return purchaseOrder ?? null;
};

export const getOrganizationPurchaseOrderItem = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [item] = await db
    .select({
      id: purchaseOrderItems.id,
      purchaseOrderId: purchaseOrderItems.purchaseOrderId,
    })
    .from(purchaseOrderItems)
    .innerJoin(
      purchaseOrders,
      eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id),
    )
    .where(
      and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  return item ?? null;
};

export const updatePurchaseOrderItem = async (
  id: string,
  organizationId: string,
  input: PurchaseOrderItemInput,
  vatRate: number,
) => {
  const existing = await getOrganizationPurchaseOrderItem(id, organizationId);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const updatedAt = new Date().toISOString();
  await db.batch([
    db
      .update(purchaseOrderItems)
      .set({ ...input, updatedAt })
      .where(eq(purchaseOrderItems.id, id)),
    db
      .update(purchaseOrders)
      .set({ updatedAt })
      .where(
        and(
          eq(purchaseOrders.id, existing.purchaseOrderId),
          eq(purchaseOrders.organizationId, organizationId),
        ),
      ),
  ]);
  return getPurchaseOrder(existing.purchaseOrderId, organizationId, vatRate);
};

export const updatePurchaseOrderItemStatus = async (
  id: string,
  organizationId: string,
  status: PurchaseOrderItemStatus,
  vatRate: number,
) => {
  const existing = await getOrganizationPurchaseOrderItem(id, organizationId);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const updatedAt = new Date().toISOString();
  await db.batch([
    db
      .update(purchaseOrderItems)
      .set({ status, updatedAt })
      .where(eq(purchaseOrderItems.id, id)),
    db
      .update(purchaseOrders)
      .set({ updatedAt })
      .where(
        and(
          eq(purchaseOrders.id, existing.purchaseOrderId),
          eq(purchaseOrders.organizationId, organizationId),
        ),
      ),
  ]);
  return getPurchaseOrder(existing.purchaseOrderId, organizationId, vatRate);
};

export type DeletePurchaseOrderItemResult =
  | { status: 'deleted'; purchaseOrder: PurchaseOrderRecord }
  | { status: 'last-item' }
  | { status: 'not-found' };

export const deletePurchaseOrderItem = async (
  id: string,
  organizationId: string,
  vatRate: number,
): Promise<DeletePurchaseOrderItemResult> => {
  const existing = await getOrganizationPurchaseOrderItem(id, organizationId);
  if (!existing) {
    return { status: 'not-found' };
  }

  const db = getDb();
  const updatedAt = new Date().toISOString();
  const [deleted] = await db
    .delete(purchaseOrderItems)
    .where(
      and(
        eq(purchaseOrderItems.id, id),
        sql`(SELECT COUNT(*) FROM ${purchaseOrderItems} WHERE ${purchaseOrderItems.purchaseOrderId} = ${existing.purchaseOrderId}) > 1`,
      ),
    )
    .returning({ id: purchaseOrderItems.id });
  if (!deleted) {
    return { status: 'last-item' };
  }

  await db
    .update(purchaseOrders)
    .set({ updatedAt })
    .where(
      and(
        eq(purchaseOrders.id, existing.purchaseOrderId),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    );
  const updatedPurchaseOrder = await getPurchaseOrder(
    existing.purchaseOrderId,
    organizationId,
    vatRate,
  );
  return updatedPurchaseOrder
    ? { status: 'deleted', purchaseOrder: updatedPurchaseOrder }
    : { status: 'not-found' };
};
