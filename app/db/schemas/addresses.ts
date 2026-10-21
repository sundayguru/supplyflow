import { sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { users } from './users';

export const addresses = sqliteTable(
  'addresses',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name', { length: 255 }).notNull(),
    address: text('address').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index('addresses_organization_idx').on(table.organizationId)],
);

export type SelectAddress = typeof addresses.$inferSelect;
