import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  VendorPurchaseOrderAcknowledgementInput,
  VendorPurchaseOrderAcknowledgementItemInput,
  VendorPurchaseOrderAcknowledgementRecord,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import { getDb } from './connection';
import {
  vendorPurchaseOrderAcknowledgementItems,
  vendorPurchaseOrderAcknowledgements,
  vendorPurchaseOrderItems,
  vendorPurchaseOrders,
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

  await db.batch([
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
  ]);

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

  await db.batch([
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
        updatedAt,
      })),
    ),
  ]);

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
