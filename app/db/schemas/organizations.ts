import { sql } from 'drizzle-orm';
import {
  index,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { organizationAiModels } from '../../types/organization';

const organizationAiModelValues = organizationAiModels.map(
  (model) => model.value,
) as [
  (typeof organizationAiModels)[number]['value'],
  ...(typeof organizationAiModels)[number]['value'][],
];

export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id', { length: 36 }).primaryKey(),
    name: text('name', { length: 255 }).notNull(),
    description: text('description'),
    website: text('website', { length: 511 }),
    phone: text('phone', { length: 64 }),
    address: text('address', { length: 511 }),
    preferredModel: text('preferred_model', {
      enum: organizationAiModelValues,
    })
      .notNull()
      .default('llama-3.3-70b-versatile'),
    vat: real('vat').notNull().default(0),
    priceMarkup: real('price_markup').notNull().default(0),
    emailFolder: text('email_folder', { length: 255 })
      .notNull()
      .default('INBOX'),
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
  (table) => [uniqueIndex('organizations_owner_unique').on(table.createdBy)],
);

export const organizationMembers = sqliteTable(
  'organization_members',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('organization_members_user_unique').on(table.userId),
    uniqueIndex('organization_members_org_user_unique').on(
      table.organizationId,
      table.userId,
    ),
    index('organization_members_org_idx').on(table.organizationId),
  ],
);

export const organizationInvitations = sqliteTable(
  'organization_invitations',
  {
    id: text('id', { length: 36 }).primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email', { length: 255 }).notNull(),
    token: text('token', { length: 64 }).notNull(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'revoked'] })
      .notNull()
      .default('pending'),
    expiresAt: text('expires_at').notNull(),
    acceptedBy: text('accepted_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('organization_invitations_token_unique').on(table.token),
    index('organization_invitations_org_idx').on(table.organizationId),
    index('organization_invitations_email_idx').on(table.email),
  ],
);

export type SelectOrganization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type SelectOrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationInvitation =
  typeof organizationInvitations.$inferInsert;
