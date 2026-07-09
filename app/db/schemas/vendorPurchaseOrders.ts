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
  vendorPurchaseOrderStatuses,
} from '../../types';
import { manufacturers } from './manufacturers';
import { organizations } from './organizations';
import { purchaseOrders } from './purchaseOrders';
import { rfqPdfTemplates } from './rfqPdfTemplates';
import { users } from './users';

export const vendorPurchaseOrders = sqliteTable(
  'vendor_purchase_orders',
  {
    id: text('id', { length: 36 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    purchaseOrderId: text('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    templateId: text('template_id').references(() => rfqPdfTemplates.id, {
      onDelete: 'set null',
    }),
    vendorManufacturerId: text('vendor_manufacturer_id').references(
      () => manufacturers.id,
      { onDelete: 'set null' },
    ),
    reference: text('reference', { length: 32 }).notNull().unique(),
    vendorName: text('vendor_name', { length: 255 }).notNull(),
    vendorEmail: text('vendor_email', { length: 255 }),
    vendorContactName: text('vendor_contact_name', { length: 255 }),
    status: text('status', { enum: vendorPurchaseOrderStatuses })
      .notNull()
      .default('draft'),
    orderDate: text('order_date'),
    expectedDate: text('expected_date'),
    currency: text('currency', { length: 3 }).notNull().default('EUR'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('vendor_purchase_orders_org_idx').on(table.organizationId),
    index('vendor_purchase_orders_po_id_idx').on(table.purchaseOrderId),
    index('vendor_purchase_orders_vendor_manufacturer_id_idx').on(
      table.vendorManufacturerId,
    ),
    index('vendor_purchase_orders_status_idx').on(table.status),
    index('vendor_purchase_orders_created_at_idx').on(table.createdAt),
  ],
);

export const vendorPurchaseOrderItems = sqliteTable(
  'vendor_purchase_order_items',
  {
    id: text('id', { length: 36 }).primaryKey(),
    vendorPurchaseOrderId: text('vendor_purchase_order_id')
      .notNull()
      .references(() => vendorPurchaseOrders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    quantity: real('quantity').notNull(),
    price: integer('price').notNull().default(0),
    unit: text('unit', { length: 32 }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: purchaseOrderItemStatuses })
      .notNull()
      .default('pending'),
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
    index('vendor_po_items_vendor_po_id_idx').on(table.vendorPurchaseOrderId),
    index('vendor_po_items_status_idx').on(table.status),
    index('vendor_po_items_manufacturer_id_idx').on(table.manufacturerId),
  ],
);

export const vendorPurchaseOrdersRelations = relations(
  vendorPurchaseOrders,
  ({ many, one }) => ({
    items: many(vendorPurchaseOrderItems),
    purchaseOrder: one(purchaseOrders, {
      fields: [vendorPurchaseOrders.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
  }),
);

export const vendorPurchaseOrderItemsRelations = relations(
  vendorPurchaseOrderItems,
  ({ one }) => ({
    vendorPurchaseOrder: one(vendorPurchaseOrders, {
      fields: [vendorPurchaseOrderItems.vendorPurchaseOrderId],
      references: [vendorPurchaseOrders.id],
    }),
  }),
);

export type SelectVendorPurchaseOrder =
  typeof vendorPurchaseOrders.$inferSelect;
export type InsertVendorPurchaseOrder =
  typeof vendorPurchaseOrders.$inferInsert;
export type SelectVendorPurchaseOrderItem =
  typeof vendorPurchaseOrderItems.$inferSelect;
export type InsertVendorPurchaseOrderItem =
  typeof vendorPurchaseOrderItems.$inferInsert;
