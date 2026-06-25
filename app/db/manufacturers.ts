import { asc, and, eq } from 'drizzle-orm';
import { getDb } from './connection';
import { manufacturers } from './schemas';

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
