import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { users } from './users';

export const productPrices = sqliteTable(
  'product_prices',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name', { length: 255 }).notNull(),
    manufacturer: text('manufacturer', { length: 255 }),
    partNumber: text('part_number', { length: 255 }),
    price: integer('price').notNull().default(0),
    currency: text('currency', { length: 3 }).notNull().default('EUR'),
    priceLastUpdated: text('price_last_updated'),
    description: text('description'),
    specifications: text('specifications'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('product_prices_organization_idx').on(table.organizationId),
    index('product_prices_manufacturer_part_idx').on(
      table.organizationId,
      table.manufacturer,
      table.partNumber,
    ),
    index('product_prices_updated_at_idx').on(table.updatedAt),
  ],
);

export type SelectProductPrice = typeof productPrices.$inferSelect;
export type InsertProductPrice = typeof productPrices.$inferInsert;
