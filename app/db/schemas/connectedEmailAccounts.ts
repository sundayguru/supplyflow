import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { organizations } from './organizations';

export const connectedEmailAccounts = sqliteTable(
  'connected_email_accounts',
  {
    id: text('id', { length: 36 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    provider: text('provider', { enum: ['gmail'] }).notNull(),
    providerAccountId: text('provider_account_id', { length: 255 }).notNull(),
    email: text('email', { length: 255 }).notNull(),
    displayName: text('display_name', { length: 255 }),
    encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('connected_email_accounts_org_provider_unique').on(
      table.organizationId,
      table.provider,
      table.providerAccountId,
    ),
    index('connected_email_accounts_active_idx').on(table.isActive),
    index('connected_email_accounts_user_idx').on(table.userId),
    index('connected_email_accounts_org_idx').on(table.organizationId),
  ],
);

export const emailAccountOauthStates = sqliteTable(
  'email_account_oauth_states',
  {
    state: text('state', { length: 64 }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
);

export type SelectConnectedEmailAccount =
  typeof connectedEmailAccounts.$inferSelect;
