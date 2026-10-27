import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const plans = sqliteTable('plans', {
  id: text('id', { length: 64 }).primaryKey(),
  name: text('name', { length: 128 }).notNull(),
  description: text('description').notNull().default(''),
  priceLabel: text('price_label', { length: 128 })
    .notNull()
    .default('Contact us'),
  amount: real('amount').notNull().default(0),
  stripePriceId: text('stripe_price_id'),
  inputTokenLimit: integer('input_token_limit').notNull().default(0),
  outputTokenLimit: integer('output_token_limit').notNull().default(0),
  features: text('features', { mode: 'json' })
    .notNull()
    .$type<Record<string, boolean>>(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const billingSettings = sqliteTable('billing_settings', {
  id: integer('id').primaryKey(),
  suggestedPlanId: text('suggested_plan_id').notNull().default('business'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type SelectPlan = typeof plans.$inferSelect;
