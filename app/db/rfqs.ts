import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { RfqInput, RfqItemInput, RfqRecord } from '~/types/rfq';
import { getDb } from './connection';
import { rfqItems, rfqs } from './schemas';

const createReference = () =>
  `RFQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const createItemValues = (rfqId: string, items: RfqItemInput[]) =>
  items.map((item, position) => ({
    ...item,
    id: crypto.randomUUID(),
    rfqId,
    position,
  }));

export const getRfqs = (organizationId: string): Promise<RfqRecord[]> => {
  const db = getDb();
  return db.query.rfqs.findMany({
    where: eq(rfqs.organizationId, organizationId),
    orderBy: [desc(rfqs.createdAt)],
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
};

export const getRfq = async (
  id: string,
  organizationId: string,
): Promise<RfqRecord | null> => {
  const db = getDb();
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, id), eq(rfqs.organizationId, organizationId)),
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
  return rfq ?? null;
};

export const createRfq = async (
  organizationId: string,
  userId: string,
  input: RfqInput,
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

  return getRfq(id, organizationId);
};

export const updateRfq = async (
  id: string,
  organizationId: string,
  input: RfqInput,
) => {
  const existing = await getRfq(id, organizationId);
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

  return getRfq(id, organizationId);
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
  return getRfq(existing.rfqId, organizationId);
};

export type DeleteRfqItemResult =
  | { status: 'deleted'; rfq: RfqRecord }
  | { status: 'last-item' }
  | { status: 'not-found' };

export const deleteRfqItem = async (
  id: string,
  organizationId: string,
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
  const updatedRfq = await getRfq(existing.rfqId, organizationId);
  return updatedRfq
    ? { status: 'deleted', rfq: updatedRfq }
    : { status: 'not-found' };
};
