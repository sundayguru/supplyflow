import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import {
  purchaseOrderItemStatuses,
  purchaseOrderStatuses,
} from '../../types/purchaseOrder';
import { manufacturers } from './manufacturers';
import { organizations } from './organizations';
import { rfqPdfTemplates } from './rfqPdfTemplates';
import { rfqs } from './rfqs';
import { users } from './users';

export const purchaseOrders = sqliteTable(
  'purchase_orders',
  {
    id: text('id', { length: 36 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    rfqId: text('rfq_id').references(() => rfqs.id, { onDelete: 'set null' }),
    templateId: text('template_id').references(() => rfqPdfTemplates.id, {
      onDelete: 'set null',
    }),
    reference: text('reference', { length: 32 }).notNull().unique(),
    supplierName: text('supplier_name', { length: 255 }).notNull(),
    supplierEmail: text('supplier_email', { length: 255 }),
    status: text('status', { enum: purchaseOrderStatuses })
      .notNull()
      .default('draft'),
    orderDate: text('order_date'),
    expectedDate: text('expected_date'),
    applyVat: integer('apply_vat', { mode: 'boolean' })
      .notNull()
      .default(false),
    currency: text('currency', { length: 3 }).notNull().default('EUR'),
    incoterms: text('incoterms', { length: 64 }),
    deliveryTerms: text('delivery_terms'),
    notes: text('notes'),
    validationSummary: text('validation_summary'),
    proformaInvoiceDraftId: text('proforma_invoice_draft_id', {
      length: 255,
    }),
    proformaInvoiceDraftUpdatedAt: text('proforma_invoice_draft_updated_at'),
    proformaInvoiceSentAt: text('proforma_invoice_sent_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('purchase_orders_user_id_idx').on(table.userId),
    index('purchase_orders_organization_id_idx').on(table.organizationId),
    index('purchase_orders_rfq_id_idx').on(table.rfqId),
    index('purchase_orders_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('purchase_orders_created_at_idx').on(table.createdAt),
  ],
);

export const purchaseOrderItems = sqliteTable(
  'purchase_order_items',
  {
    id: text('id', { length: 36 }).primaryKey(),
    purchaseOrderId: text('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    quantity: real('quantity').notNull(),
    price: integer('price').notNull().default(0),
    unit: text('unit', { length: 32 }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: purchaseOrderItemStatuses })
      .notNull()
      .default('pending'),
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
    index('purchase_order_items_po_id_idx').on(table.purchaseOrderId),
    index('purchase_order_items_status_idx').on(table.status),
    index('purchase_order_items_manufacturer_id_idx').on(table.manufacturerId),
    index('purchase_order_items_manufacturer_part_idx').on(
      table.manufacturerPartNumber,
    ),
  ],
);

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ many, one }) => ({
    items: many(purchaseOrderItems),
    rfq: one(rfqs, {
      fields: [purchaseOrders.rfqId],
      references: [rfqs.id],
    }),
  }),
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderItems.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
  }),
);

export type SelectPurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type SelectPurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
