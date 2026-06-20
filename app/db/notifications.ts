import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './connection';
import { notifications, type InsertNotification } from './schemas';
import { logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { getAllUsers } from './users';

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

export const notifyAllUsers = async (
  notification: Partial<InsertNotification>,
) => {
  try {
    const db = getDb();
    const allUsers = await getAllUsers();
    if (allUsers) {
      const notificationsInsert = allUsers.map((u) => {
        return {
          ...notification,
          userId: u.users.id,
          isRead: false,
          id: uuidv4(),
        } as InsertNotification;
      });

      return await db
        .insert(notifications)
        .values(notificationsInsert)
        .returning();
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
