import { and, desc, eq, gt } from 'drizzle-orm';
import { getDb } from './connection';
import { connectedEmailAccounts, emailAccountOauthStates } from './schemas';

export const listConnectedEmailAccounts = (organizationId: string) => {
  const db = getDb();
  return db
    .select({
      id: connectedEmailAccounts.id,
      provider: connectedEmailAccounts.provider,
      email: connectedEmailAccounts.email,
      displayName: connectedEmailAccounts.displayName,
      isActive: connectedEmailAccounts.isActive,
      needsReconnect: connectedEmailAccounts.needsReconnect,
      reconnectReason: connectedEmailAccounts.reconnectReason,
      reconnectRequiredAt: connectedEmailAccounts.reconnectRequiredAt,
      createdAt: connectedEmailAccounts.createdAt,
      updatedAt: connectedEmailAccounts.updatedAt,
    })
    .from(connectedEmailAccounts)
    .where(eq(connectedEmailAccounts.organizationId, organizationId))
    .orderBy(desc(connectedEmailAccounts.createdAt));
};

export const listActiveConnectedEmailAccounts = (organizationId?: string) => {
  const db = getDb();
  return db
    .select()
    .from(connectedEmailAccounts)
    .where(
      organizationId
        ? and(
            eq(connectedEmailAccounts.isActive, true),
            eq(connectedEmailAccounts.needsReconnect, false),
            eq(connectedEmailAccounts.organizationId, organizationId),
          )
        : and(
            eq(connectedEmailAccounts.isActive, true),
            eq(connectedEmailAccounts.needsReconnect, false),
          ),
    );
};

export const upsertConnectedEmailAccount = async (input: {
  userId: string;
  organizationId: string;
  provider: 'gmail';
  providerAccountId: string;
  email: string;
  displayName: string | null;
  encryptedRefreshToken: string;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const [account] = await db
    .insert(connectedEmailAccounts)
    .values({ ...input, id })
    .onConflictDoUpdate({
      target: [
        connectedEmailAccounts.organizationId,
        connectedEmailAccounts.provider,
        connectedEmailAccounts.providerAccountId,
      ],
      set: {
        email: input.email,
        displayName: input.displayName,
        encryptedRefreshToken: input.encryptedRefreshToken,
        isActive: true,
        needsReconnect: false,
        reconnectReason: null,
        reconnectRequiredAt: null,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning({ id: connectedEmailAccounts.id });
  return account;
};

export const markConnectedEmailAccountNeedsReconnect = async (
  id: string,
  reason: string,
) => {
  const db = getDb();
  const [account] = await db
    .update(connectedEmailAccounts)
    .set({
      needsReconnect: true,
      reconnectReason: reason.slice(0, 511),
      reconnectRequiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(connectedEmailAccounts.id, id))
    .returning({ id: connectedEmailAccounts.id });
  return account ?? null;
};

export const setConnectedEmailAccountActive = async (
  id: string,
  organizationId: string,
  isActive: boolean,
) => {
  const db = getDb();
  const [account] = await db
    .update(connectedEmailAccounts)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(connectedEmailAccounts.id, id),
        eq(connectedEmailAccounts.organizationId, organizationId),
      ),
    )
    .returning({ id: connectedEmailAccounts.id });
  return account ?? null;
};

export const deleteConnectedEmailAccount = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [account] = await db
    .delete(connectedEmailAccounts)
    .where(
      and(
        eq(connectedEmailAccounts.id, id),
        eq(connectedEmailAccounts.organizationId, organizationId),
      ),
    )
    .returning({ id: connectedEmailAccounts.id });
  return account ?? null;
};

export const createEmailAccountOauthState = async (userId: string) => {
  const db = getDb();
  const state = crypto.randomUUID();
  await db.insert(emailAccountOauthStates).values({
    state,
    userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  return state;
};

export const consumeEmailAccountOauthState = async (state: string) => {
  const db = getDb();
  const [record] = await db
    .delete(emailAccountOauthStates)
    .where(
      and(
        eq(emailAccountOauthStates.state, state),
        gt(emailAccountOauthStates.expiresAt, new Date().toISOString()),
      ),
    )
    .returning({ userId: emailAccountOauthStates.userId });
  return record ?? null;
};
