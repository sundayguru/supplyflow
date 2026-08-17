import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import {
  vendorPurchaseOrderAcknowledgementItemStatuses,
  vendorPurchaseOrderAcknowledgementStatuses,
} from '../../types';
import { organizations } from './organizations';
import {
  vendorPurchaseOrderItems,
  vendorPurchaseOrders,
} from './vendorPurchaseOrders';
import { users } from './users';

export const vendorPurchaseOrderAcknowledgements = sqliteTable(
  'vendor_purchase_order_acknowledgements',
  {
    id: text('id', { length: 36 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    vendorPurchaseOrderId: text('vendor_purchase_order_id')
      .notNull()
      .references(() => vendorPurchaseOrders.id, { onDelete: 'cascade' }),
    reference: text('reference', { length: 32 }).notNull().unique(),
    acknowledgementReference: text('acknowledgement_reference', {
      length: 255,
    }),
    status: text('status', { enum: vendorPurchaseOrderAcknowledgementStatuses })
      .notNull()
      .default('received'),
    acknowledgedAt: text('acknowledged_at'),
    notes: text('notes'),
    sourceEmailIngestionId: text('source_email_ingestion_id').unique(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('vendor_po_ack_org_idx').on(table.organizationId),
    index('vendor_po_ack_vendor_po_id_idx').on(table.vendorPurchaseOrderId),
    index('vendor_po_ack_status_idx').on(table.status),
    index('vendor_po_ack_created_at_idx').on(table.createdAt),
  ],
);

export const vendorPurchaseOrderAcknowledgementItems = sqliteTable(
  'vendor_purchase_order_acknowledgement_items',
  {
    id: text('id', { length: 36 }).primaryKey(),
    acknowledgementId: text('acknowledgement_id')
      .notNull()
      .references(() => vendorPurchaseOrderAcknowledgements.id, {
        onDelete: 'cascade',
      }),
    vendorPurchaseOrderItemId: text('vendor_purchase_order_item_id').references(
      () => vendorPurchaseOrderItems.id,
      { onDelete: 'set null' },
    ),
    position: integer('position').notNull().default(0),
    quantity: real('quantity').notNull(),
    price: integer('price').notNull().default(0),
    unit: text('unit', { length: 32 }).notNull(),
    description: text('description').notNull(),
    manufacturerPartNumber: text('manufacturer_part_number', { length: 255 }),
    deliveryDate: text('delivery_date'),
    status: text('status', {
      enum: vendorPurchaseOrderAcknowledgementItemStatuses,
    })
      .notNull()
      .default('acknowledged'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('vendor_po_ack_items_ack_id_idx').on(table.acknowledgementId),
    index('vendor_po_ack_items_vendor_po_item_id_idx').on(
      table.vendorPurchaseOrderItemId,
    ),
    index('vendor_po_ack_items_status_idx').on(table.status),
  ],
);

export const vendorPurchaseOrderAcknowledgementsRelations = relations(
  vendorPurchaseOrderAcknowledgements,
  ({ many, one }) => ({
    items: many(vendorPurchaseOrderAcknowledgementItems),
    vendorPurchaseOrder: one(vendorPurchaseOrders, {
      fields: [vendorPurchaseOrderAcknowledgements.vendorPurchaseOrderId],
      references: [vendorPurchaseOrders.id],
    }),
  }),
);

export const vendorPurchaseOrderAcknowledgementItemsRelations = relations(
  vendorPurchaseOrderAcknowledgementItems,
  ({ one }) => ({
    acknowledgement: one(vendorPurchaseOrderAcknowledgements, {
      fields: [vendorPurchaseOrderAcknowledgementItems.acknowledgementId],
      references: [vendorPurchaseOrderAcknowledgements.id],
    }),
    vendorPurchaseOrderItem: one(vendorPurchaseOrderItems, {
      fields: [
        vendorPurchaseOrderAcknowledgementItems.vendorPurchaseOrderItemId,
      ],
      references: [vendorPurchaseOrderItems.id],
    }),
  }),
);

export type SelectVendorPurchaseOrderAcknowledgement =
  typeof vendorPurchaseOrderAcknowledgements.$inferSelect;
export type InsertVendorPurchaseOrderAcknowledgement =
  typeof vendorPurchaseOrderAcknowledgements.$inferInsert;
export type SelectVendorPurchaseOrderAcknowledgementItem =
  typeof vendorPurchaseOrderAcknowledgementItems.$inferSelect;
export type InsertVendorPurchaseOrderAcknowledgementItem =
  typeof vendorPurchaseOrderAcknowledgementItems.$inferInsert;
