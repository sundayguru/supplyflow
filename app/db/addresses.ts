import { and, asc, eq } from 'drizzle-orm';
import { getDb } from './connection';
import { addresses } from './schemas';
import type { AddressInput } from '~/types/address';

export const listAddresses = (organizationId: string) => {
  const db = getDb();
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.organizationId, organizationId))
    .orderBy(asc(addresses.name));
};

export const createAddress = async (
  organizationId: string,
  createdBy: string,
  input: AddressInput,
) => {
  const db = getDb();
  const [address] = await db
    .insert(addresses)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      createdBy,
      name: input.name.trim(),
      address: input.address.trim(),
    })
    .returning();
  return address;
};

export const updateAddress = async (
  id: string,
  organizationId: string,
  input: AddressInput,
) => {
  const db = getDb();
  const [address] = await db
    .update(addresses)
    .set({
      name: input.name.trim(),
      address: input.address.trim(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(addresses.id, id), eq(addresses.organizationId, organizationId)),
    )
    .returning();
  return address ?? null;
};

export const deleteAddress = async (id: string, organizationId: string) => {
  const db = getDb();
  const [address] = await db
    .delete(addresses)
    .where(
      and(eq(addresses.id, id), eq(addresses.organizationId, organizationId)),
    )
    .returning({ id: addresses.id });
  return address ?? null;
};
