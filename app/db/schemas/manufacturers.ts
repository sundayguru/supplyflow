import { sql } from 'drizzle-orm';
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { users } from './users';

export const manufacturers = sqliteTable(
  'manufacturers',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name', { length: 255 }).notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('manufacturers_organization_name_unique').on(
      table.organizationId,
      table.name,
    ),
    index('manufacturers_organization_idx').on(table.organizationId),
  ],
);

export type SelectManufacturer = typeof manufacturers.$inferSelect;
export type InsertManufacturer = typeof manufacturers.$inferInsert;
