import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { organizations } from './organizations';
import { rfqPdfTemplates } from './rfqPdfTemplates';
import { manufacturers } from './manufacturers';
import { rfqStatuses } from '../../types/rfq';

export const rfqs = sqliteTable(
  'rfqs',
  {
    id: text('id', { length: 36 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    templateId: text('template_id').references(() => rfqPdfTemplates.id, {
      onDelete: 'set null',
    }),
    sourcePdfKey: text('source_pdf_key', { length: 511 }),
    generatedReply: text('generated_reply'),
    generatedReplyDraftId: text('generated_reply_draft_id', { length: 255 }),
    generatedReplyDraftUpdatedAt: text('generated_reply_draft_updated_at'),
    reference: text('reference', { length: 32 }).notNull().unique(),
    customerName: text('customer_name', { length: 255 }).notNull(),
    customerEmail: text('customer_email', { length: 255 }),
    status: text('status', { enum: rfqStatuses }).notNull().default('new'),
    dueDate: text('due_date'),
    applyVat: integer('apply_vat', { mode: 'boolean' })
      .notNull()
      .default(false),
    currency: text('currency', { length: 3 }).notNull().default('EUR'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('rfqs_user_id_idx').on(table.userId),
    index('rfqs_organization_id_idx').on(table.organizationId),
    index('rfqs_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('rfqs_user_status_idx').on(table.userId, table.status),
    index('rfqs_created_at_idx').on(table.createdAt),
  ],
);

export const rfqItems = sqliteTable(
  'rfq_items',
  {
    id: text('id', { length: 36 }).primaryKey(),
    rfqId: text('rfq_id')
      .notNull()
      .references(() => rfqs.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    quantity: real('quantity').notNull(),
    price: integer('price').notNull().default(0),
    priceMarkup: real('price_markup').notNull().default(0),
    unit: text('unit', { length: 32 }).notNull(),
    description: text('description').notNull(),
    manufacturer: text('manufacturer', { length: 255 }),
    manufacturerId: text('manufacturer_id').references(() => manufacturers.id, {
      onDelete: 'set null',
    }),
    manufacturerPartNumber: text('manufacturer_part_number', { length: 255 }),
    specifications: text('specifications'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('rfq_items_rfq_id_idx').on(table.rfqId),
    index('rfq_items_manufacturer_id_idx').on(table.manufacturerId),
    index('rfq_items_manufacturer_part_idx').on(table.manufacturerPartNumber),
  ],
);

export const rfqsRelations = relations(rfqs, ({ many }) => ({
  items: many(rfqItems),
}));

export const rfqItemsRelations = relations(rfqItems, ({ one }) => ({
  rfq: one(rfqs, {
    fields: [rfqItems.rfqId],
    references: [rfqs.id],
  }),
}));

export type SelectRfq = typeof rfqs.$inferSelect;
export type InsertRfq = typeof rfqs.$inferInsert;
export type SelectRfqItem = typeof rfqItems.$inferSelect;
export type InsertRfqItem = typeof rfqItems.$inferInsert;
