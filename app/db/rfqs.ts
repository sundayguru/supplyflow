import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { RfqInput, RfqItemInput, RfqRecord, RfqStatus } from '~/types/rfq';
import { getDb } from './connection';
import { rfqItems, rfqs } from './schemas';
import { calculateRfqTotals } from '~/utils/rfq';

const createReference = () =>
  `RFQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (rfqId: string, items: RfqItemInput[]) =>
  items.map((item, position) => ({
    ...item,
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
  return records.map((rfq) => withTotals(rfq, vatRate));
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
  return rfq ? withTotals(rfq, vatRate) : null;
};

export const createRfq = async (
  organizationId: string,
  userId: string,
  input: RfqInput,
  vatRate: number,
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
    db.insert(rfqItems).values(createItemValues(id, items)),
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

  await db.batch([
    db
      .update(rfqs)
      .set({ ...rfqInput, updatedAt })
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
  const [updated] = await db
    .update(rfqs)
    .set({ status, updatedAt: new Date().toISOString() })
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
  const [updated] = await db
    .update(rfqs)
    .set({
      generatedReply,
      generatedReplyDraftId,
      status: 'review',
      updatedAt: new Date().toISOString(),
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

const getOrganizationRfqItem = async (id: string, organizationId: string) => {
  const db = getDb();
  const [item] = await db
    .select({ id: rfqItems.id, rfqId: rfqItems.rfqId })
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
  return getRfq(existing.rfqId, organizationId, vatRate);
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
