import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection';
import {
  organizationInvitations,
  organizationMembers,
  organizations,
  connectedEmailAccounts,
  rfqs,
  users,
  type InsertOrganization,
} from './schemas';

const now = () => new Date().toISOString();

export const getOrganizationForUser = async (userId: string) => {
  const db = getDb();
  const [result] = await db
    .select({ organization: organizations, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId));

  return result ? { ...result.organization, role: result.role } : null;
};

export const createOrganization = async (
  createdBy: string,
  values: Omit<InsertOrganization, 'id' | 'createdBy'>,
) => {
  const db = getDb();
  const existingOrganization = await getOrganizationForUser(createdBy);
  if (existingOrganization) {
    throw new Error('You already belong to an organization');
  }

  const id = uuidv4();
  await db.insert(organizations).values({ id, createdBy, ...values });
  await db.insert(organizationMembers).values({
    id: uuidv4(),
    organizationId: id,
    userId: createdBy,
    role: 'owner',
  });
  await Promise.all([
    db
      .update(rfqs)
      .set({ organizationId: id })
      .where(and(eq(rfqs.userId, createdBy), isNull(rfqs.organizationId))),
    db
      .update(connectedEmailAccounts)
      .set({ organizationId: id })
      .where(
        and(
          eq(connectedEmailAccounts.userId, createdBy),
          isNull(connectedEmailAccounts.organizationId),
        ),
      ),
  ]);
  return getOrganizationForUser(createdBy);
};

export const updateOrganization = async (
  organizationId: string,
  values: Partial<
    Pick<
      InsertOrganization,
      'name' | 'description' | 'website' | 'phone' | 'address'
    >
  >,
) => {
  const db = getDb();
  await db
    .update(organizations)
    .set({ ...values, updatedAt: now() })
    .where(eq(organizations.id, organizationId));
};

export const getOrganizationUsers = async (organizationId: string) => {
  const db = getDb();
  return await db
    .select({
      membershipId: organizationMembers.id,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));
};

export const updateOrganizationMember = async (
  organizationId: string,
  userId: string,
  values: { firstName: string; lastName: string },
) => {
  const db = getDb();
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    );
  if (!membership) {
    throw new Error('Organization user not found');
  }
  await db
    .update(users)
    .set({ ...values, updatedAt: now() })
    .where(eq(users.id, userId));
};

export const removeOrganizationMember = async (
  organizationId: string,
  userId: string,
) => {
  const db = getDb();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  if (!organization || organization.createdBy === userId) {
    throw new Error('The organization owner cannot be removed');
  }
  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    );
};

export const createOrganizationInvitation = async (
  organizationId: string,
  email: string,
  invitedBy: string,
) => {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (existingUser) {
    const existingMembership = await getOrganizationForUser(existingUser.id);
    if (existingMembership) {
      throw new Error(
        existingMembership.id === organizationId
          ? 'This user already belongs to your organization'
          : 'This user already belongs to another organization',
      );
    }
  }

  await db
    .update(organizationInvitations)
    .set({ status: 'revoked', updatedAt: now() })
    .where(
      and(
        eq(organizationInvitations.organizationId, organizationId),
        eq(organizationInvitations.email, normalizedEmail),
        eq(organizationInvitations.status, 'pending'),
      ),
    );

  const invitation = {
    id: uuidv4(),
    organizationId,
    email: normalizedEmail,
    token: uuidv4().replaceAll('-', ''),
    invitedBy,
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  await db.insert(organizationInvitations).values(invitation);
  return invitation;
};

export const getOrganizationInvitations = async (organizationId: string) => {
  const db = getDb();
  return await db
    .select({
      id: organizationInvitations.id,
      email: organizationInvitations.email,
      token: organizationInvitations.token,
      status: organizationInvitations.status,
      expiresAt: organizationInvitations.expiresAt,
      createdAt: organizationInvitations.createdAt,
    })
    .from(organizationInvitations)
    .where(eq(organizationInvitations.organizationId, organizationId));
};

export const revokeOrganizationInvitation = async (
  organizationId: string,
  invitationId: string,
) => {
  const db = getDb();
  await db
    .update(organizationInvitations)
    .set({ status: 'revoked', updatedAt: now() })
    .where(
      and(
        eq(organizationInvitations.organizationId, organizationId),
        eq(organizationInvitations.id, invitationId),
        eq(organizationInvitations.status, 'pending'),
      ),
    );
};

export const acceptOrganizationInvitation = async (
  token: string,
  userId: string,
  email: string,
) => {
  const db = getDb();
  const [invitation] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.token, token));
  if (!invitation || invitation.status !== 'pending') {
    throw new Error('This invitation is no longer available');
  }
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    throw new Error('This invitation has expired');
  }
  if (invitation.email !== email.trim().toLowerCase()) {
    throw new Error(`This invitation was sent to ${invitation.email}`);
  }
  const existingOrganization = await getOrganizationForUser(userId);
  if (existingOrganization) {
    if (existingOrganization.id === invitation.organizationId) {
      await db
        .update(organizationInvitations)
        .set({ status: 'accepted', acceptedBy: userId, updatedAt: now() })
        .where(eq(organizationInvitations.id, invitation.id));
      return existingOrganization;
    }
    throw new Error('Your account already belongs to another organization');
  }

  await db.insert(organizationMembers).values({
    id: uuidv4(),
    organizationId: invitation.organizationId,
    userId,
    role: 'member',
  });
  await Promise.all([
    db
      .update(rfqs)
      .set({ organizationId: invitation.organizationId })
      .where(and(eq(rfqs.userId, userId), isNull(rfqs.organizationId))),
    db
      .update(connectedEmailAccounts)
      .set({ organizationId: invitation.organizationId })
      .where(
        and(
          eq(connectedEmailAccounts.userId, userId),
          isNull(connectedEmailAccounts.organizationId),
        ),
      ),
  ]);
  await db
    .update(organizationInvitations)
    .set({ status: 'accepted', acceptedBy: userId, updatedAt: now() })
    .where(eq(organizationInvitations.id, invitation.id));
  return getOrganizationForUser(userId);
};
