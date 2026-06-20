import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users, type SelectUser } from './users';

export const profile = sqliteTable('profile', {
  id: text('id', { length: 36 }).primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  bio: text({ length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  isPrivate: integer('is_private', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(users, {
    fields: [profile.userId],
    references: [users.id],
  }),
}));

export type SelectProfile = typeof profile.$inferSelect & {
  user?: SelectUser;
};
export type InsertProfile = typeof profile.$inferInsert;
