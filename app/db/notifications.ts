import { eq, desc, and, inArray } from 'drizzle-orm';
import { getDb } from './connection';
import {
  notifications,
  organizationMembers,
  organizations,
  plans,
  users,
  type InsertNotification,
} from './schemas';
import { logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  renderBaseEmailTemplate,
  sendEmailWithSendGrid,
} from '~/services/sendgrid.server';

export const createNotification = async (
  notification: Omit<InsertNotification, 'id'>,
) => {
  try {
    const db = getDb();
    const id = uuidv4();
    return await db
      .insert(notifications)
      .values({ ...notification, id })
      .returning();
  } catch (e) {
    logError(e, 'Error creating notification');
    return null;
  }
};

export const notifyOrganizationMembers = async (
  organizationId: string,
  notification: Omit<InsertNotification, 'id' | 'userId'>,
) => {
  try {
    const db = getDb();
    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
    const [organization] = await db
      .select({
        ownerId: organizations.createdBy,
        name: organizations.name,
        features: plans.features,
      })
      .from(organizations)
      .innerJoin(plans, eq(organizations.planId, plans.id))
      .where(eq(organizations.id, organizationId));
    const recipientIds = new Set(members.map((member) => member.userId));
    if (organization) {
      recipientIds.add(organization.ownerId);
    }
    if (recipientIds.size) {
      const notificationsInsert = [...recipientIds].map((userId) => {
        return {
          ...notification,
          userId,
          isRead: false,
          id: uuidv4(),
        } as InsertNotification;
      });

      const created = await db
        .insert(notifications)
        .values(notificationsInsert)
        .returning();
      if (organization?.features.emailNotifications === true) {
        const recipients = await db
          .select({ email: users.email })
          .from(users)
          .where(
            and(
              inArray(users.id, [...recipientIds]),
              eq(users.isDeactivated, false),
              eq(users.isBanned, false),
            ),
          );
        const html = renderBaseEmailTemplate({
          organizationName: organization.name,
          title: notification.title,
          message: notification.message,
          actorLabel:
            notification.actorType === 'system' ? 'System' : 'Team member',
          actionUrl: notification.actionUrl,
        });
        await Promise.all(
          recipients.map(async ({ email }) => {
            try {
              await sendEmailWithSendGrid({
                to: email,
                subject: `${organization.name}: ${notification.title}`,
                html,
              });
            } catch (error) {
              logError(error, 'Error sending notification email');
            }
          }),
        );
      }
      return created;
    }
  } catch (e) {
    logError(e, 'Error creating notification');
    return null;
  }
};

export const getUserNotifications = async (userId: string) => {
  try {
    const db = getDb();
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  } catch (e) {
    logError(e, 'Error getting user notifications');
    return [];
  }
};

export const markNotificationRead = async (id: string, userId: string) => {
  try {
    const db = getDb();
    return await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
  } catch (e) {
    logError(e, 'Error marking notification read');
    return null;
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  try {
    const db = getDb();
    return await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      )
      .returning();
  } catch (e) {
    logError(e, 'Error marking all notifications read');
    return null;
  }
};

export const getUnreadNotificationCount = async (userId: string) => {
  try {
    const db = getDb();
    // Using simple count retrieval
    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
    return unread.length;
  } catch (e) {
    logError(e, 'Error getting unread count');
    return 0;
  }
};
