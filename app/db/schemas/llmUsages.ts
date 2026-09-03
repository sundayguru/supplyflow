import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { users } from './users';

export const llmUsages = sqliteTable(
  'llm_usages',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    provider: text('provider', { length: 32 }).notNull(),
    model: text('model', { length: 255 }).notNull(),
    feature: text('feature', { length: 64 }).notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('llm_usages_org_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('llm_usages_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export type SelectLlmUsage = typeof llmUsages.$inferSelect;
export type InsertLlmUsage = typeof llmUsages.$inferInsert;
