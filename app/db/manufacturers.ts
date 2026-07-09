import { asc, and, eq, sql } from 'drizzle-orm';
import type { ManufacturerInput } from '~/types/manufacturer';
import { getDb } from './connection';
import {
  manufacturers,
  productPrices,
  purchaseOrderItems,
  rfqItems,
  vendorPurchaseOrderItems,
  vendorPurchaseOrders,
} from './schemas';

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

export const listManufacturers = (organizationId: string) => {
  const db = getDb();
  return db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.organizationId, organizationId))
    .orderBy(asc(manufacturers.name));
};

export const getManufacturerByName = async (
  organizationId: string,
  name: string,
) => {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    return null;
  }

  const db = getDb();
  const records = await db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.organizationId, organizationId));
  return (
    records.find(
      (manufacturer) =>
        manufacturer.name.toLowerCase() === normalizedName.toLowerCase(),
    ) ?? null
  );
};

export const getOrCreateManufacturer = async (
  organizationId: string,
  createdBy: string,
  name: string | null,
) => {
  const normalizedName = name ? normalizeName(name) : '';
  if (!normalizedName) {
    return null;
  }

  const existing = await getManufacturerByName(organizationId, normalizedName);
  if (existing) {
    return existing;
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const [manufacturer] = await db
    .insert(manufacturers)
    .values({
      id,
      organizationId,
      createdBy,
      name: normalizedName,
    })
    .returning();
  return manufacturer;
};

export const createManufacturer = async (
  organizationId: string,
  createdBy: string,
  input: ManufacturerInput,
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const [manufacturer] = await db
    .insert(manufacturers)
    .values({
      id,
      organizationId,
      createdBy,
      name: normalizeName(input.name),
      email: input.email,
      contactName: input.contactName,
    })
    .returning();
  return manufacturer;
};

export const updateManufacturer = async (
  id: string,
  organizationId: string,
  input: ManufacturerInput,
) => {
  const db = getDb();
  const [manufacturer] = await db
    .update(manufacturers)
    .set({
      name: normalizeName(input.name),
      email: input.email,
      contactName: input.contactName,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(manufacturers.id, id),
        eq(manufacturers.organizationId, organizationId),
      ),
    )
    .returning();
  return manufacturer ?? null;
};

export const upsertManufacturerFromVendorDetails = async (
  organizationId: string,
  createdBy: string,
  input: ManufacturerInput,
) => {
  const existing = await getManufacturerByName(organizationId, input.name);
  if (!existing) {
    return createManufacturer(organizationId, createdBy, input);
  }
  if (
    existing.email === input.email &&
    existing.contactName === input.contactName
  ) {
    return existing;
  }
  return updateManufacturer(existing.id, organizationId, {
    name: existing.name,
    email: input.email,
    contactName: input.contactName,
  });
};

export const manufacturerHasRelations = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [record] = await db
    .select({
      relationCount: sql<number>`(
        (SELECT COUNT(*) FROM ${productPrices} WHERE ${productPrices.manufacturerId} = ${id} AND ${productPrices.organizationId} = ${organizationId}) +
        (SELECT COUNT(*) FROM ${rfqItems} INNER JOIN rfqs ON rfqs.id = ${rfqItems.rfqId} WHERE ${rfqItems.manufacturerId} = ${id} AND rfqs.organization_id = ${organizationId}) +
        (SELECT COUNT(*) FROM ${purchaseOrderItems} INNER JOIN purchase_orders ON purchase_orders.id = ${purchaseOrderItems.purchaseOrderId} WHERE ${purchaseOrderItems.manufacturerId} = ${id} AND purchase_orders.organization_id = ${organizationId}) +
        (SELECT COUNT(*) FROM ${vendorPurchaseOrderItems} INNER JOIN vendor_purchase_orders ON vendor_purchase_orders.id = ${vendorPurchaseOrderItems.vendorPurchaseOrderId} WHERE ${vendorPurchaseOrderItems.manufacturerId} = ${id} AND vendor_purchase_orders.organization_id = ${organizationId}) +
        (SELECT COUNT(*) FROM ${vendorPurchaseOrders} WHERE ${vendorPurchaseOrders.vendorManufacturerId} = ${id} AND ${vendorPurchaseOrders.organizationId} = ${organizationId})
      )`,
    })
    .from(manufacturers)
    .where(
      and(
        eq(manufacturers.id, id),
        eq(manufacturers.organizationId, organizationId),
      ),
    )
    .limit(1);
  return (record?.relationCount ?? 0) > 0;
};

export const deleteManufacturer = async (
  id: string,
  organizationId: string,
) => {
  if (await manufacturerHasRelations(id, organizationId)) {
    return { success: false as const, reason: 'in_use' as const };
  }

  const db = getDb();
  const [manufacturer] = await db
    .delete(manufacturers)
    .where(
      and(
        eq(manufacturers.id, id),
        eq(manufacturers.organizationId, organizationId),
      ),
    )
    .returning({ id: manufacturers.id });
  return manufacturer
    ? { success: true as const }
    : { success: false as const, reason: 'not_found' as const };
};

export const getManufacturer = async (id: string, organizationId: string) => {
  const db = getDb();
  const [manufacturer] = await db
    .select()
    .from(manufacturers)
    .where(
      and(
        eq(manufacturers.id, id),
        eq(manufacturers.organizationId, organizationId),
      ),
    )
    .limit(1);
  return manufacturer ?? null;
};
