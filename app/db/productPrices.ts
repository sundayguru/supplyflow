import { and, desc, eq } from 'drizzle-orm';
import type { ProductPriceInput } from '~/types/productPrice';
import { getDb } from './connection';
import { productPrices } from './schemas';

export const listProductPrices = (organizationId: string) => {
  const db = getDb();
  return db
    .select()
    .from(productPrices)
    .where(eq(productPrices.organizationId, organizationId))
    .orderBy(desc(productPrices.updatedAt));
};

export const createProductPrice = (
  organizationId: string,
  createdBy: string,
  input: ProductPriceInput,
) => {
  const db = getDb();
  const id = crypto.randomUUID();
  return db
    .insert(productPrices)
    .values({ id, organizationId, createdBy, ...input })
    .returning();
};

export const updateProductPrice = async (
  id: string,
  organizationId: string,
  input: ProductPriceInput,
) => {
  const db = getDb();
  const [productPrice] = await db
    .update(productPrices)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(productPrices.id, id),
        eq(productPrices.organizationId, organizationId),
      ),
    )
    .returning();
  return productPrice ?? null;
};

export const deleteProductPrice = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [productPrice] = await db
    .delete(productPrices)
    .where(
      and(
        eq(productPrices.id, id),
        eq(productPrices.organizationId, organizationId),
      ),
    )
    .returning();
  return productPrice ?? null;
};
