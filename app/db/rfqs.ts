import { and, asc, desc, eq } from 'drizzle-orm';
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

export const getRfqs = (userId: string): Promise<RfqRecord[]> => {
  const db = getDb();
  return db.query.rfqs.findMany({
    where: eq(rfqs.userId, userId),
    orderBy: [desc(rfqs.createdAt)],
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
};

export const getRfq = async (
  id: string,
  userId: string,
): Promise<RfqRecord | null> => {
  const db = getDb();
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, id), eq(rfqs.userId, userId)),
    with: { items: { orderBy: [asc(rfqItems.position)] } },
  });
  return rfq ?? null;
};

export const createRfq = async (userId: string, input: RfqInput) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const { items, ...rfqInput } = input;

  await db.batch([
    db.insert(rfqs).values({
      ...rfqInput,
      id,
      userId,
      reference: createReference(),
    }),
    db.insert(rfqItems).values(createItemValues(id, items)),
  ]);

  return getRfq(id, userId);
};

export const updateRfq = async (
  id: string,
  userId: string,
  input: RfqInput,
) => {
  const existing = await getRfq(id, userId);
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
      .where(and(eq(rfqs.id, id), eq(rfqs.userId, userId))),
    db.delete(rfqItems).where(eq(rfqItems.rfqId, id)),
    db.insert(rfqItems).values(
      createItemValues(id, items).map((item) => ({
        ...item,
        updatedAt,
      })),
    ),
  ]);

  return getRfq(id, userId);
};

export const deleteRfq = async (id: string, userId: string) => {
  const db = getDb();
  const [rfq] = await db
    .delete(rfqs)
    .where(and(eq(rfqs.id, id), eq(rfqs.userId, userId)))
    .returning({ id: rfqs.id });
  return rfq ?? null;
};
