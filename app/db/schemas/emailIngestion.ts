import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { rfqs } from './rfqs';
import { purchaseOrders } from './purchaseOrders';
import { connectedEmailAccounts } from './connectedEmailAccounts';

export const emailIngestionStatuses = [
  'processing',
  'processed',
  'ignored',
  'failed',
] as const;

export const emailIngestions = sqliteTable(
  'email_ingestions',
  {
    id: text('id', { length: 36 }).primaryKey(),
    accountId: text('account_id').references(() => connectedEmailAccounts.id, {
      onDelete: 'cascade',
    }),
    provider: text('provider', { length: 32 }).notNull(),
    externalId: text('external_id', { length: 255 }).notNull(),
    threadId: text('thread_id', { length: 255 }),
    status: text('status', { enum: emailIngestionStatuses })
      .notNull()
      .default('processing'),
    subject: text('subject', { length: 511 }),
    fromAddress: text('from_address', { length: 255 }),
    receivedAt: text('received_at'),
    rfqId: text('rfq_id').references(() => rfqs.id, { onDelete: 'set null' }),
    purchaseOrderId: text('purchase_order_id').references(
      () => purchaseOrders.id,
      { onDelete: 'set null' },
    ),
    error: text('error'),
    attempts: integer('attempts').notNull().default(1),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('email_ingestions_account_external_unique').on(
      table.accountId,
      table.externalId,
    ),
    index('email_ingestions_status_idx').on(table.status),
    index('email_ingestions_received_at_idx').on(table.receivedAt),
  ],
);

export const emailAccountSyncStates = sqliteTable('email_account_sync_states', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => connectedEmailAccounts.id, { onDelete: 'cascade' }),
  lastSuccessfulAt: text('last_successful_at').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type SelectEmailIngestion = typeof emailIngestions.$inferSelect;
export type EmailIngestionStatus = (typeof emailIngestionStatuses)[number];
