import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id', { length: 36 }).primaryKey(),
  firstName: text({ length: 255 }).notNull(),
  lastName: text({ length: 255 }).notNull(),
  email: text({ length: 255 }).notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text({ length: 511 }),
  passwordHash: text({ length: 511 }),
  isDeactivated: integer('is_deactivated', { mode: 'boolean' })
    .notNull()
    .default(false),
  isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
