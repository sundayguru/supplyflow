import { sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { users } from './users';

export const rfqPdfTemplates = sqliteTable(
  'rfq_pdf_templates',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name', { length: 255 }).notNull(),
    headerBannerKey: text('header_banner_key', { length: 511 }),
    footerBannerKey: text('footer_banner_key', { length: 511 }),
    termsHtml: text('terms_html').notNull().default(''),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index('rfq_pdf_templates_org_idx').on(table.organizationId)],
);

export type SelectRfqPdfTemplate = typeof rfqPdfTemplates.$inferSelect;
export type InsertRfqPdfTemplate = typeof rfqPdfTemplates.$inferInsert;
