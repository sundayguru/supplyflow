import { relations, sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  activityLogActions,
  activityLogSourceTypes,
} from '../../types/activityLog';
import { organizations } from './organizations';
import { users } from './users';

export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sourceType: text('source_type', { enum: activityLogSourceTypes }).notNull(),
    sourceId: text('source_id', { length: 36 }).notNull(),
    sourceReference: text('source_reference', { length: 64 }).notNull(),
    action: text('action', { enum: activityLogActions }).notNull(),
    fieldPath: text('field_path', { length: 255 }).notNull(),
    previousValue: text('previous_value', { mode: 'json' }),
    newValue: text('new_value', { mode: 'json' }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index('activity_logs_org_created_idx').on(
      table.organizationId,
      table.createdAt,
    ),
    index('activity_logs_source_idx').on(table.sourceType, table.sourceId),
    index('activity_logs_actor_idx').on(table.actorUserId),
    index('activity_logs_action_idx').on(table.action),
  ],
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLogs.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [activityLogs.actorUserId],
    references: [users.id],
  }),
}));

export type SelectActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
