import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { RfqInput, RfqItemInput, RfqRecord, RfqStatus } from '~/types/rfq';
import { getDb } from './connection';
import { purchaseOrders, rfqItems, rfqs } from './schemas';
import { calculateRfqTotals } from '~/utils/rfq';

const createReference = () =>
  `RFQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (
  rfqId: string,
  items: RfqItemInput[],
  defaultPriceMarkup = 0,
) =>
  items.map((item, position) => ({
    ...item,
    priceMarkup: item.priceMarkup ?? defaultPriceMarkup,
    id: crypto.randomUUID(),
    rfqId,
    position,
  }));

const withTotals = <Rfq extends { items: RfqItemInput[]; applyVat: boolean }>(
  rfq: Rfq,
  vatRate: number,
): Rfq & ReturnType<typeof calculateRfqTotals> => ({
  ...rfq,
  ...calculateRfqTotals(rfq.items, vatRate, rfq.applyVat),
});

const getLinkedPurchaseOrdersByRfqIds = async (rfqIds: string[]) => {
  if (!rfqIds.length) {
    return new Map<string, RfqRecord['linkedPurchaseOrders']>();
  }

  const db = getDb();
  const records = await db
    .select({
      id: purchaseOrders.id,
      rfqId: purchaseOrders.rfqId,
      reference: purchaseOrders.reference,
      supplierName: purchaseOrders.supplierName,
    })
    .from(purchaseOrders)
    .where(inArray(purchaseOrders.rfqId, rfqIds))
    .orderBy(desc(purchaseOrders.createdAt));

  return records.reduce((linkedPurchaseOrders, record) => {
    if (!record.rfqId) {
      return linkedPurchaseOrders;
    }
    const existing = linkedPurchaseOrders.get(record.rfqId) ?? [];
    linkedPurchaseOrders.set(record.rfqId, [
      ...existing,
      {
        id: record.id,
        reference: record.reference,
        supplierName: record.supplierName,
      },
    ]);
    return linkedPurchaseOrders;
  }, new Map<string, RfqRecord['linkedPurchaseOrders']>());
};

export const getRfqs = async (
  organizationId: string,
  vatRate: number,
): Promise<RfqRecord[]> => {
  const db = getDb();
  const records = await db.query.rfqs.findMany({
    where: eq(rfqs.organizationId, organizationId),
    orderBy: [desc(rfqs.createdAt)],
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
  const linkedPurchaseOrders = await getLinkedPurchaseOrdersByRfqIds(
    records.map((rfq) => rfq.id),
  );
  return records.map((rfq) =>
    withTotals(
      {
        ...rfq,
        linkedPurchaseOrders: linkedPurchaseOrders.get(rfq.id) ?? [],
      },
      vatRate,
    ),
  );
};

export const getRfq = async (
  id: string,
  organizationId: string,
  vatRate: number,
): Promise<RfqRecord | null> => {
  const db = getDb();
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId)),
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
  if (!rfq) {
    return null;
  }
  const linkedPurchaseOrders = await getLinkedPurchaseOrdersByRfqIds([rfq.id]);
  return withTotals(
    {
      ...rfq,
      linkedPurchaseOrders: linkedPurchaseOrders.get(rfq.id) ?? [],
    },
    vatRate,
  );
};

export const getRfqByReference = async (
  reference: string,
  organizationId: string,
  vatRate: number,
): Promise<RfqRecord | null> => {
  const db = getDb();
  const rfq = await db.query.rfqs.findFirst({
    where: and(
      eq(rfqs.reference, reference),
      eq(rfqs.organizationId, organizationId),
    ),
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
  if (!rfq) {
    return null;
  }
  const linkedPurchaseOrders = await getLinkedPurchaseOrdersByRfqIds([rfq.id]);
  return withTotals(
    {
      ...rfq,
      linkedPurchaseOrders: linkedPurchaseOrders.get(rfq.id) ?? [],
    },
    vatRate,
  );
};

export const createRfq = async (
  organizationId: string,
  userId: string,
  input: RfqInput,
  vatRate: number,
  defaultPriceMarkup = 0,
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const { items, ...rfqInput } = input;

  await db.batch([
    db.insert(rfqs).values({
      ...rfqInput,
      id,
      userId,
      organizationId,
      reference: createReference(),
    }),
    db.insert(rfqItems).values(createItemValues(id, items, defaultPriceMarkup)),
  ]);

  return getRfq(id, organizationId, vatRate);
};

export const updateRfq = async (
  id: string,
  organizationId: string,
  input: RfqInput,
  vatRate: number,
) => {
  const existing = await getRfq(id, organizationId, vatRate);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const { items, ...rfqInput } = input;
  const updatedAt = new Date().toISOString();
  const quotationSentAt =
    input.status === 'sent' && !existing.quotationSentAt
      ? updatedAt
      : existing.quotationSentAt;
  const quoteReminderSentAt =
    input.status === 'sent' && existing.status !== 'sent'
      ? null
      : existing.quoteReminderSentAt;

  await db.batch([
    db
      .update(rfqs)
      .set({ ...rfqInput, quotationSentAt, quoteReminderSentAt, updatedAt })
      .where(and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId))),
    db.delete(rfqItems).where(eq(rfqItems.rfqId, id)),
    db.insert(rfqItems).values(
      createItemValues(id, items).map((item) => ({
        ...item,
        updatedAt,
      })),
    ),
  ]);

  return getRfq(id, organizationId, vatRate);
};

export const updateRfqStatus = async (
  id: string,
  organizationId: string,
  status: RfqStatus,
  vatRate: number,
) => {
  const db = getDb();
  const existing = await getRfq(id, organizationId, vatRate);
  if (!existing) {
    return null;
  }
  const updatedAt = new Date().toISOString();
  const quotationSentAt =
    status === 'sent' && !existing.quotationSentAt
      ? updatedAt
      : existing.quotationSentAt;
  const quoteReminderSentAt =
    status === 'sent' && existing.status !== 'sent'
      ? null
      : existing.quoteReminderSentAt;
  const [updated] = await db
    .update(rfqs)
    .set({ status, quotationSentAt, quoteReminderSentAt, updatedAt })
    .where(and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId)))
    .returning({ id: rfqs.id });
  return updated ? getRfq(updated.id, organizationId, vatRate) : null;
};

export const updateRfqGeneratedReply = async (
  id: string,
  organizationId: string,
  generatedReply: string,
  generatedReplyDraftId: string,
  vatRate: number,
) => {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  const [updated] = await db
    .update(rfqs)
    .set({
      generatedReply,
      generatedReplyDraftId,
      generatedReplyDraftUpdatedAt: updatedAt,
      status: 'review_email',
      updatedAt,
    })
    .where(and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId)))
    .returning({ id: rfqs.id });
  return updated ? getRfq(updated.id, organizationId, vatRate) : null;
};

export const deleteRfq = async (id: string, organizationId: string) => {
  const db = getDb();
  const [rfq] = await db
    .delete(rfqs)
    .where(and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId)))
    .returning({ id: rfqs.id });
  return rfq ?? null;
};

export const getOrganizationRfqItem = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [item] = await db
    .select({ id: rfqItems.id, rfqId: rfqItems.rfqId, currency: rfqs.currency })
    .from(rfqItems)
    .innerJoin(rfqs, eq(rfqItems.rfqId, rfqs.id))
    .where(and(eq(rfqItems.id, id), eq(rfqs.organizationId, organizationId)))
    .limit(1);
  return item ?? null;
};

export const updateRfqItem = async (
  id: string,
  organizationId: string,
  input: RfqItemInput,
  vatRate: number,
) => {
  const existing = await getOrganizationRfqItem(id, organizationId);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const updatedAt = new Date().toISOString();
  await db.batch([
    db
      .update(rfqItems)
      .set({ ...input, updatedAt })
      .where(eq(rfqItems.id, id)),
    db
      .update(rfqs)
      .set({ updatedAt })
      .where(
        and(
          eq(rfqs.id, existing.rfqId),
          eq(rfqs.organizationId, organizationId),
        ),
      ),
  ]);
  const updatedRfq = await getRfq(existing.rfqId, organizationId, vatRate);
  if (updatedRfq && !['sent', 'won', 'lost'].includes(updatedRfq.status)) {
    const nextStatus = updatedRfq.items.every((item) => item.price > 0)
      ? 'quoted'
      : 'pricing';
    if (updatedRfq.status === nextStatus) {
      return updatedRfq;
    }
    const [updated] = await db
      .update(rfqs)
      .set({ status: nextStatus, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(rfqs.id, existing.rfqId),
          eq(rfqs.organizationId, organizationId),
        ),
      )
      .returning({ id: rfqs.id });
    return updated ? getRfq(updated.id, organizationId, vatRate) : updatedRfq;
  }
  return updatedRfq;
};

export type DeleteRfqItemResult =
  | { status: 'deleted'; rfq: RfqRecord }
  | { status: 'last-item' }
  | { status: 'not-found' };

export const deleteRfqItem = async (
  id: string,
  organizationId: string,
  vatRate: number,
): Promise<DeleteRfqItemResult> => {
  const existing = await getOrganizationRfqItem(id, organizationId);
  if (!existing) {
    return { status: 'not-found' };
  }

  const db = getDb();
  const updatedAt = new Date().toISOString();
  const [deleted] = await db
    .delete(rfqItems)
    .where(
      and(
        eq(rfqItems.id, id),
        sql`(SELECT COUNT(*) FROM ${rfqItems} WHERE ${rfqItems.rfqId} = ${existing.rfqId}) > 1`,
      ),
    )
    .returning({ id: rfqItems.id });
  if (!deleted) {
    return { status: 'last-item' };
  }

  await db
    .update(rfqs)
    .set({ updatedAt })
    .where(
      and(eq(rfqs.id, existing.rfqId), eq(rfqs.organizationId, organizationId)),
    );
  const updatedRfq = await getRfq(existing.rfqId, organizationId, vatRate);
  return updatedRfq
    ? { status: 'deleted', rfq: updatedRfq }
    : { status: 'not-found' };
};
